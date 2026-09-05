import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY

function textoSeguro(
  valor: FormDataEntryValue | null,
  maximo: number
) {
  if (typeof valor !== "string") return ""
  return valor.trim().slice(0, maximo)
}

function emailValido(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function normalizarMatricula(valor: string) {
  const limpio = valor
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")

  if (/^RNC-\d{6}$/.test(limpio)) {
    return limpio
  }

  const numeros = limpio.replace(/\D/g, "")

  if (numeros.length === 6) {
    return `RNC-${numeros}`
  }

  return limpio
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

    const matriculaRecibida = textoSeguro(
      formData.get("matricula"),
      40
    )

    const matricula = normalizarMatricula(
      matriculaRecibida
    )

    const nombreCliente = textoSeguro(
      formData.get("nombreCliente"),
      120
    )

    const emailCliente = textoSeguro(
      formData.get("emailCliente"),
      160
    ).toLowerCase()

    const comentario = textoSeguro(
      formData.get("comentario"),
      1000
    )

    const puntuacionTexto = textoSeguro(
      formData.get("puntuacion"),
      1
    )

    const puntuacion = Number(puntuacionTexto)

    if (!matricula || !emailCliente || !puntuacionTexto) {
      return NextResponse.json(
        { error: "Faltan datos obligatorios." },
        { status: 400 }
      )
    }

    if (
      !Number.isInteger(puntuacion) ||
      puntuacion < 1 ||
      puntuacion > 5
    ) {
      return NextResponse.json(
        {
          error:
            "La calificación debe ser de 1 a 5 estrellas.",
        },
        { status: 400 }
      )
    }

    if (!emailValido(emailCliente)) {
      return NextResponse.json(
        {
          error:
            "Ingresá un correo electrónico válido.",
        },
        { status: 400 }
      )
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseSecretKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    )

    const { data: matriculado, error: errorMatriculado } =
      await supabase
        .from("matriculados")
        .select("id, numero_matricula")
        .eq("numero_matricula", matricula)
        .maybeSingle()

    if (errorMatriculado) {
      console.error(
        "Error buscando matrícula para calificación:",
        errorMatriculado
      )

      return NextResponse.json(
        {
          error:
            "No se pudo verificar la matrícula.",
        },
        { status: 500 }
      )
    }

    if (!matriculado) {
      return NextResponse.json(
        {
          error:
            "No se encontró el técnico matriculado.",
        },
        { status: 404 }
      )
    }

    const { error: errorInsert } = await supabase
      .from("calificaciones_tecnicos")
      .insert({
        matriculado_id: matriculado.id,
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
        {
          error:
            "No se pudo guardar la calificación.",
        },
        { status: 500 }
      )
    }

    const { data: reputacion, error: errorReputacion } =
      await supabase
        .from("reputacion_matriculados")
        .select(
          "total_calificaciones, promedio_estrellas, porcentaje_valoracion, mostrar_publicamente"
        )
        .eq("matriculado_id", matriculado.id)
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
            : Number(
                reputacion.promedio_estrellas
              ),
        porcentajeValoracion:
          reputacion?.porcentaje_valoracion == null
            ? null
            : Number(
                reputacion.porcentaje_valoracion
              ),
        mostrarPublicamente:
          reputacion?.mostrar_publicamente === true,
      },
    })
  } catch (error) {
    console.error(
      "Error en /api/calificaciones:",
      error
    )

    return NextResponse.json(
      {
        error:
          "No se pudo procesar la calificación.",
      },
      { status: 500 }
    )
  }
}
