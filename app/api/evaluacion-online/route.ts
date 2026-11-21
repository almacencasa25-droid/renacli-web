import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createHmac, timingSafeEqual } from "node:crypto"

export const dynamic = "force-dynamic"
const COOKIE = "renacli_evaluacion_online"
const DURACION = 3 * 60 * 60

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  if (!url || !key) throw new Error("Falta configuración de Supabase")
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}
function secret() {
  const key = process.env.RENACLI_ADMIN_PASSWORD || process.env.SUPABASE_SECRET_KEY
  if (!key) throw new Error("Falta clave de firma")
  return key
}
function sign(body: string) {
  return createHmac("sha256", secret()).update(body).digest("base64url")
}
function tokenFor(id: number) {
  const b = Buffer.from(JSON.stringify({ id, exp: Date.now() + DURACION * 1000 })).toString("base64url")
  return b + "." + sign(b)
}
function session(request: NextRequest): number | null {
  try {
    const token = request.cookies.get(COOKIE)?.value || ""
    const [b, signature, extra] = token.split(".")
    if (!b || !signature || extra) return null
    const x = Buffer.from(signature), y = Buffer.from(sign(b))
    if (x.length !== y.length || !timingSafeEqual(x, y)) return null
    const payload = JSON.parse(Buffer.from(b, "base64url").toString())
    return Number.isSafeInteger(payload.id) && payload.id > 0 && payload.exp > Date.now() ? payload.id : null
  } catch { return null }
}
function normalizeDni(dni: unknown) {
  return String(dni ?? "").replace(/[^0-9]/g, "")
}
function normalizeTramite(tramite: unknown) {
  return String(tramite ?? "").trim().toUpperCase()
}
const noCache = { "Cache-Control": "no-store" }
async function state(id: number) {
  const { data, error } = await db().rpc("preparar_intento_evaluacion_online", {
    p_evaluacion_id: id,
  })
  if (error) {
    if (/EVALUACION_NO_DISPONIBLE/.test(error.message || "")) return null
    throw error
  }
  return data
}
export async function GET(request: NextRequest) {
  const id = session(request)
  if (!id) return NextResponse.json({ error: "Ingresá nuevamente con tus datos." }, { status: 401, headers: noCache })
  try {
    const result = await state(id)
    if (!result) return NextResponse.json({ error: "Evaluación no habilitada." }, { status: 403, headers: noCache })
    return NextResponse.json(result, { headers: noCache })
  } catch (error) { console.error("Evaluacion online GET", error); return NextResponse.json({ error: "No se pudo cargar el examen." }, { status: 500, headers: noCache }) }
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (body?.accion === "ingresar") {
      const tramite = normalizeTramite(body.tramite)
      const dni = normalizeDni(body.dni)
      if (!/^[A-Z0-9-]{4,40}$/.test(tramite) || !/^[0-9]{7,9}$/.test(dni))
        return NextResponse.json({ error: "Verificá el número de trámite y DNI." }, { status: 400, headers: noCache })
      const supabase = db()
      const { data, error } = await supabase.from("evaluaciones")
        .select("id").eq("numero_tramite_snapshot", tramite).eq("dni_acceso_online", dni)
        .eq("online_habilitada", true).order("fecha_generacion", { ascending: false }).limit(1).maybeSingle()
      if (error) throw error
      if (!data) return NextResponse.json({ error: "Datos incorrectos o evaluación no habilitada. Consultá con RENACLI." }, { status: 401, headers: noCache })
      const result = await state(data.id)
      if (!result) return NextResponse.json({ error: "Evaluación no habilitada." }, { status: 403, headers: noCache })
      const response = NextResponse.json(result, { headers: noCache })
      response.cookies.set(COOKIE, tokenFor(data.id), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/api/evaluacion-online", maxAge: DURACION })
      return response
    }
    if (body?.accion === "finalizar") {
      const id = session(request)
      if (!id) return NextResponse.json({ error: "La sesión venció. Volvé a ingresar." }, { status: 401, headers: noCache })
      if (!body.respuestas || typeof body.respuestas !== "object" || Array.isArray(body.respuestas))
        return NextResponse.json({ error: "Respuestas inválidas." }, { status: 400, headers: noCache })
      const respuestas = body.respuestas as Record<string,unknown>
      if (Object.keys(respuestas).length > 200 || Object.keys(respuestas).some(k => !/^\d+$/.test(k) || !["A","B","C","D"].includes(String(respuestas[k]))))
        return NextResponse.json({ error: "Respuestas inválidas." }, { status: 400, headers: noCache })
      const { data, error } = await db().rpc("registrar_intento_evaluacion_online", { p_evaluacion_id: id, p_respuestas: respuestas })
      if (error) {
        const msg = error.message || ""
        if (/INTENTOS_AGOTADOS|EVALUACION_YA_APROBADA|EVALUACION_NO_DISPONIBLE/.test(msg))
          return NextResponse.json({ error: "Ya no hay intentos disponibles para esta evaluación." }, { status: 409, headers: noCache })
        if (/RESPUESTAS_INCOMPLETAS|RESPUESTAS_INVALIDAS/.test(msg))
          return NextResponse.json({ error: "Respondé todas las preguntas antes de finalizar." }, { status: 400, headers: noCache })
        throw error
      }
      return NextResponse.json({ terminado: true, ...data, usados: data.intento, maximos: data.intento + data.restantes }, { headers: noCache })
    }
    return NextResponse.json({ error: "Acción inválida." }, { status: 400, headers: noCache })
  } catch (error) { console.error("Evaluacion online POST", error); return NextResponse.json({ error: "No se pudo procesar la evaluación." }, { status: 500, headers: noCache }) }
}
