import crypto from "node:crypto"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
export const dynamic = "force-dynamic"
type Props = { params: Promise<{ codigo: string }>; searchParams?: Promise<{ guardado?: string; error?: string }> }
function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  if (!url || !key) throw new Error("Supabase sin configurar")
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}
async function autorizado() {
  const password = process.env.RENACLI_ADMIN_PASSWORD
  if (!password) return false
  return (await cookies()).get("renacli_admin_session")?.value === crypto.createHash("sha256").update(password).digest("hex")
}
async function guardar(form: FormData) {
  "use server"
  if (!(await autorizado())) redirect("/administrador")
  const codigo = String(form.get("codigo") ?? "").trim().toUpperCase()
  if (!/^RNC-EVAL-[0-9]{6}$/.test(codigo)) redirect("/administrador/evaluaciones")
  const intentos = Number(form.get("intentos"))
  const dni = String(form.get("dni") ?? "").replace(/\D/g, "")
  const activa = form.get("habilitada") === "on"
  const url = "/administrador/evaluaciones/" + encodeURIComponent(codigo) + "/online"
  if (!Number.isInteger(intentos) || intentos < 1 || intentos > 100 || (dni && !/^[0-9]{7,9}$/.test(dni)))
    redirect(url + "?error=datos")
  const db = supabase()
  const { data: anterior } = await db.from("evaluaciones").select("id,numero_tramite_snapshot,dni_acceso_online").eq("codigo", codigo).maybeSingle()
  if (!anterior) redirect(url + "?error=datos")
  const dniFinal = dni || String(anterior.dni_acceso_online ?? "")
  if (activa && (!anterior.numero_tramite_snapshot || !/^[0-9]{7,9}$/.test(dniFinal))) redirect(url + "?error=datos")
  const { error } = await db.from("evaluaciones").update({
    intentos_maximos: intentos, dni_acceso_online: dniFinal || null, online_habilitada: activa
  }).eq("id", anterior.id)
  if (error) { console.error("Error configurando evaluación online", error); redirect(url + "?error=guardar") }
  redirect(url + "?guardado=1")
}
export default async function EvaluacionOnlineAdmin({ params, searchParams }: Props) {
  if (!(await autorizado())) redirect("/administrador")
  const codigo = decodeURIComponent((await params).codigo).toUpperCase()
  if (!/^RNC-EVAL-[0-9]{6}$/.test(codigo)) redirect("/administrador/evaluaciones")
  const db = supabase()
  const { data: e, error } = await db.from("evaluaciones").select("id,codigo,apellido_nombre_snapshot,numero_tramite_snapshot,numero_matricula_snapshot,dni_acceso_online,online_habilitada,intentos_maximos,estado,aprobado").eq("codigo", codigo).maybeSingle()
  if (error || !e) redirect("/administrador/evaluaciones")
  const { data: intentos } = await db.from("evaluacion_intentos_online").select("numero_intento,porcentaje,aprobado,fecha_finalizacion,correctas,incorrectas").eq("evaluacion_id", e.id).order("numero_intento", { ascending: false })
  const query = searchParams ? await searchParams : {}
  const input = "mt-1 w-full rounded-lg border border-slate-400 bg-slate-100 p-3 text-lg text-slate-900"
  return <main className="min-h-screen bg-slate-100 p-4 text-slate-900 sm:p-8">
    <div className="mx-auto max-w-2xl">
      <a href={"/administrador/evaluaciones/" + encodeURIComponent(codigo)} className="text-blue-800 underline">← Volver a la evaluación</a>
      <h1 className="mt-5 text-2xl font-bold">RENACLI · Evaluación online</h1>
      <p className="mt-2 text-slate-600">Configurá el ingreso por trámite y DNI y cuántas oportunidades puede utilizar el aspirante.</p>
      <section className="mt-6 rounded-xl border bg-white p-5 shadow-sm">
        <p className="text-lg font-bold">{e.apellido_nombre_snapshot || "Aspirante"}</p>
        <p>Evaluación: {e.codigo}</p>
        <p>Trámite: {e.numero_tramite_snapshot || "No asociado a un trámite"}</p>
        <p>Estado: {e.estado}</p>
        {query.guardado && <p className="mt-3 rounded bg-green-100 p-3 font-semibold text-green-800">Configuración guardada correctamente.</p>}
        {query.error && <p className="mt-3 rounded bg-red-100 p-3 font-semibold text-red-800">No se pudieron guardar los datos. Verificá DNI, trámite e intentos.</p>}
        <form action={guardar} className="mt-5 space-y-5">
          <input type="hidden" name="codigo" value={codigo}/>
          <label className="block font-semibold">DNI de acceso (sin puntos)
            <input name="dni" defaultValue={e.dni_acceso_online || ""} inputMode="numeric" pattern="[0-9]{7,9}" maxLength={9} placeholder="Ej.: 30123456" className={input}/>
          </label>
          <label className="block font-semibold">Cantidad de intentos permitidos
            <input name="intentos" type="number" min={1} max={100} required defaultValue={e.intentos_maximos} className={input}/>
          </label>
          <label className="flex items-center gap-3 rounded-lg bg-slate-100 p-4 font-semibold">
            <input type="checkbox" name="habilitada" defaultChecked={e.online_habilitada} className="h-5 w-5"/>
            Habilitar evaluación desde el teléfono
          </label>
          {!e.numero_tramite_snapshot && <p className="rounded bg-amber-50 p-3 text-amber-900">Este examen no tiene número de trámite. Para ingresar con trámite y DNI, generá una evaluación asociada a un trámite.</p>}
          <button className="w-full rounded-lg bg-[#0d4f7c] p-4 font-bold text-white">Guardar configuración</button>
        </form>
        <p className="mt-4 text-sm text-slate-500">Para autorizar otro intento, aumentá la cantidad permitida y guardá. El historial no se elimina. Si el examen ya está aprobado, no se habilitan más intentos.</p>
        <p className="mt-4 font-semibold">Acceso público para compartir:</p>
        <a className="break-all text-blue-700 underline" href="https://www.renacli.com.ar/evaluacion" target="_blank" rel="noreferrer">https://www.renacli.com.ar/evaluacion</a>
      </section>
      <section className="mt-5 rounded-xl border bg-white p-5">
        <h2 className="text-xl font-bold">Historial de intentos ({intentos?.length || 0})</h2>
        {!(intentos?.length) ? <p className="mt-3 text-slate-500">Todavía no realizó intentos online.</p> :
          <div className="mt-3 space-y-3">{intentos.map(i => <div key={i.numero_intento} className="rounded-lg border bg-slate-50 p-3">
            <b>Intento {i.numero_intento}: </b><span className={i.aprobado ? "font-bold text-green-700" : "font-bold text-red-700"}>{i.aprobado ? "APROBADO" : "NO APROBADO"}</span>
            <p>{i.porcentaje}% · {i.correctas} correctas · {i.incorrectas} incorrectas</p>
            <p className="text-sm text-slate-500">{new Intl.DateTimeFormat("es-AR", { timeZone: "America/Argentina/Buenos_Aires", dateStyle: "short", timeStyle: "short" }).format(new Date(i.fecha_finalizacion))}</p>
          </div>)}</div>}
      </section>
    </div>
  </main>
}
