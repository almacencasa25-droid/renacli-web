import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY

function textoSeguro(valor: FormDataEntryValue | null, maximo: number) {
  if (typeof valor !== "string") return ""
  return valor.trim().slice(0, maximo)
}

function emailValido(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function POST(request: Request) {
  try {
    if (!supabaseUrl || !supabaseSecretKey) {
      return NextResponse.json(
        { error: "Configuración del servidor incompleta." },
        { status: 500 }
      )
    }

    const formData = await request.formData()

    const nombre = textoSeguro(formData.get("nombre"), 120)
    const email = textoSeguro(formData.get("email"), 160).toLowerCase()
    const telefono = textoSeguro(formData.get("telefono"), 40)
    const motivo = textoSeguro(formData.get("motivo"), 80)
    const mensaje = textoSeguro(formData.get("mensaje"), 2000)

    if (!nombre || !email || !motivo || !mensaje) {
      return NextResponse.json(
        { error: "Completá todos los campos obligatorios." },
        { status: 400 }
      )
    }

    if (!emailValido(email)) {
      return NextResponse.json(
        { error: "Ingresá un correo electrónico válido." },
        { status: 400 }
      )
    }

    if (mensaje.length < 5) {
      return NextResponse.json(
        { error: "El mensaje es demasiado corto." },
        { status: 400 }
      )
    }

    const motivosPermitidos = new Set([
      "matricula",
      "renovacion",
      "documentacion",
      "evaluacion",
      "reclamo",
      "instituciones",
      "otro",
    ])

    if (!motivosPermitidos.has(motivo)) {
      return NextResponse.json(
        { error: "El motivo seleccionado no es válido." },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseSecretKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    const { error } = await supabase.from("consultas_contacto").insert({
      nombre,
      email,
      telefono: telefono || null,
      motivo,
      mensaje,
      estado: "pendiente",
    })

    if (error) {
      console.error("Error guardando consulta RENACLI:", error)

      return NextResponse.json(
        { error: "No se pudo guardar la consulta." },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Error en /api/contacto:", error)

    return NextResponse.json(
      { error: "No se pudo procesar la consulta." },
      { status: 500 }
    )
  }
}
