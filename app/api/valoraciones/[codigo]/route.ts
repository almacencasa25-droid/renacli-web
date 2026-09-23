import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

type Contexto = { params: Promise<{ codigo: string }> }

export async function POST(request: Request, contexto: Contexto) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseSecret = process.env.SUPABASE_SECRET_KEY

    if (!supabaseUrl || !supabaseSecret) {
      return NextResponse.json({ error: "Configuración incompleta." }, { status: 500 })
    }

    const { codigo } = await contexto.params
    const body = await request.json()
    const puntuacion = Number(body.puntuacion)
    const nombre = String(body.nombre ?? "").trim().slice(0, 120)
    const comentario = String(body.comentario ?? "").trim().slice(0, 1000)

    if (!Number.isInteger(puntuacion) || puntuacion < 1 || puntuacion > 5) {
      return NextResponse.json({ error: "Elegí de 1 a 5 estrellas." }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseSecret, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data, error } = await supabase.rpc("registrar_valoracion_trabajo", {
      p_codigo: codigo,
      p_puntuacion: puntuacion,
      p_nombre: nombre || null,
      p_comentario: comentario || null,
    })

    if (error) {
      console.error("Error registrando valoración por trabajo:", error)
      return NextResponse.json({ error: "No se pudo guardar la valoración." }, { status: 500 })
    }

    const resultado = Array.isArray(data) ? data[0] : null
    if (resultado?.ok === true) return NextResponse.json({ ok: true })

    const mensajes: Record<string, string> = {
      VENCIDA: "Este código venció. Pedile al técnico uno nuevo.",
      YA_UTILIZADA: "Este código ya fue utilizado.",
      NO_ENCONTRADA: "Este código de valoración no es válido.",
      PUNTUACION_INVALIDA: "Elegí de 1 a 5 estrellas.",
    }
    return NextResponse.json(
      { error: mensajes[resultado?.resultado] ?? "No se pudo registrar la valoración." },
      { status: 409 }
    )
  } catch (error) {
    console.error("Error en valoración por trabajo:", error)
    return NextResponse.json({ error: "No se pudo procesar la valoración." }, { status: 500 })
  }
}
