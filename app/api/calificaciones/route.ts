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

function numeroSeguro(valor: FormDataEntryValue | null) {
  if (typeof valor !== "string") return null

  const numero = Number(valor)

  if (!Number.isFinite(numero)) return null

  return numero
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

    const matriculadoId = numeroSeguro(formData.get("matriculadoId"))
    const matricula = textoSeguro(formData.get("matricula"), 40)
    const nombreCliente = textoSeguro(formData.get("nombreCliente"), 120)
    const emailCliente = textoSeguro(
      formData.get("emailCliente"),
      160
    ).toLowerCase()
    const comentario = textoSeguro(formData.get("comentario"), 1000)
    const puntuacion = numeroSeguro(formData.get("puntuacion"))

    if (!matriculadoId || !matricula || !emailCliente || !puntuacion) {
      return NextResponse.json(
        { error: "Faltan datos obligatorios." },
        { status: 400 }
      )
    }

    if (!Number.isInteger(matriculadoId) || matriculadoId <= 0) {
      return NextResponse.json(
        { error: "La matrícula no es válida." },
        { status: 400 }
      )
    }

    if (!Number.isInteger(puntuacion) || puntuacion < 1 || puntuacion > 5) {
      return NextResponse.json(
        { error: "La calificación debe ser de 1 a 5 estrellas." },
        { status: 400 }
      )
    }

    if (!emailValido(emailCliente)) {
      return NextResponse.json(
        { error: "Ingresá un correo electrónico válido." },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseSecretKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    const { data: matriculado, error: errorMatriculado } = await supabase
      .from("matriculados")
      .select("id, numero_matricula")
      .eq("id", matriculadoId)
      .maybeSingle()

    if (errorMatriculado || !matriculado) {
      return NextResponse.json(
        { error: "No se encontró el técnico matriculado." },
        { status: 404 }
      )
    }

    const numeroMatriculaBase = String(
      matriculado.numero_matricula || ""
    ).toUpperCase()

    if (numeroMatriculaBase !== matricula.toUpperCase()) {
      return NextResponse.json(
        { error: "Los datos de la matrícula no coinciden." },
        { status: 400 }
      )
    }

    const { error: errorInsert } = await supabase
      .from("calificaciones_tecnicos")
      .insert({
        matriculado_id: matriculadoId,
        nombre_cliente: nombreCliente || null,
        email_cliente: emailCliente,
        puntuacion,
        comentario: comentario || null,
        estado: "activa",
      })

    if (errorInsert) {
      if (errorInsert.code === "23505") {
        return NextResponse.json(
          {
            error:
              "Este correo electrónico ya calificó anteriormente a este técnico.",
          },
          { status: 409 }
        )
      }

      console.error(
        "Error guardando calificación RENACLI:",
        errorInsert
      )

      return NextResponse.json(
        { error: "No se pudo guardar la calificación." },
        { status: 500 }
      )
    }

    const { data: reputacion, error: errorReputacion } = await supabase
      .from("reputacion_matriculados")
      .select(
        "total_calificaciones, promedio_estrellas, porcentaje_valoracion, mostrar_publicamente"
      )
      .eq("matriculado_id", matriculadoId)
      .maybeSingle()

    if (errorReputacion) {
      console.error(
        "Error obteniendo reputación RENACLI:",
        errorReputacion
      )
    }

    return NextResponse.json({
      ok: true,
      reputacion: {
        totalCalificaciones: Number(
          reputacion?.total_calificaciones ?? 0
        ),
        promedioEstrellas:
          reputacion?.promedio_estrellas == null
            ? null
            : Number(reputacion.promedio_estrellas),
        porcentajeValoracion:
          reputacion?.porcentaje_valoracion == null
            ? null
            : Number(reputacion.porcentaje_valoracion),
        mostrarPublicamente:
          reputacion?.mostrar_publicamente === true,
      },
    })
  } catch (error) {
    console.error("Error en /api/calificaciones:", error)

    return NextResponse.json(
      { error: "No se pudo procesar la calificación." },
      { status: 500 }
    )
  }
}
