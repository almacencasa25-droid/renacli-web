import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@supabase/supabase-js"
import { createHash, timingSafeEqual } from "crypto"

export const runtime = "nodejs"

const COOKIE_ADMIN = "renacli_admin_session"

type RouteProps = {
  params: Promise<{
    id: string
  }>
}

function obtenerSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secretKey = process.env.SUPABASE_SECRET_KEY

  if (!url || !secretKey) {
    throw new Error(
      "Faltan las variables de entorno de Supabase.",
    )
  }

  return createClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

function crearTokenAdmin(password: string) {
  return createHash("sha256")
    .update(password)
    .digest("hex")
}

async function adminAutorizado() {
  const cookieStore = await cookies()

  const sesion =
    cookieStore.get(COOKIE_ADMIN)?.value

  const password =
    process.env.RENACLI_ADMIN_PASSWORD

  if (!sesion || !password) {
    return false
  }

  const esperado = crearTokenAdmin(password)

  const a = Buffer.from(sesion)
  const b = Buffer.from(esperado)

  if (a.length !== b.length) {
    return false
  }

  return timingSafeEqual(a, b)
}

export async function GET(
  _request: Request,
  { params }: RouteProps,
) {
  try {
    const autorizado = await adminAutorizado()

    if (!autorizado) {
      return NextResponse.json(
        {
          error: "No autorizado.",
        },
        {
          status: 401,
        },
      )
    }

    const { id } = await params
    const matriculadoId = Number(id)

    if (
      !Number.isInteger(matriculadoId) ||
      matriculadoId <= 0
    ) {
      return NextResponse.json(
        {
          error: "ID inválido.",
        },
        {
          status: 400,
        },
      )
    }

    const supabase = obtenerSupabaseAdmin()

    const {
      data: documento,
      error: errorDocumento,
    } = await supabase
      .from("documentos_pdf_renacli")
      .select(
        "codigo_documento, numero_matricula, pdf_path",
      )
      .eq("matriculado_id", matriculadoId)
      .eq("activo", true)
      .order("generado_en", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle()

    if (errorDocumento) {
      console.error(
        "Error buscando PDF vigente:",
        errorDocumento,
      )

      return NextResponse.json(
        {
          error:
            "No se pudo consultar el PDF vigente.",
        },
        {
          status: 500,
        },
      )
    }

    if (!documento) {
      return NextResponse.json(
        {
          error:
            "No existe un PDF vigente para este técnico.",
        },
        {
          status: 404,
        },
      )
    }

    if (!documento.pdf_path) {
      return NextResponse.json(
        {
          error:
            "El PDF vigente fue generado antes de habilitar el almacenamiento del archivo. Debe generar uno nuevo para poder visualizarlo.",
        },
        {
          status: 404,
        },
      )
    }

    const {
      data: archivo,
      error: errorArchivo,
    } = await supabase.storage
      .from("credenciales-pdf")
      .download(documento.pdf_path)

    if (errorArchivo || !archivo) {
      console.error(
        "Error descargando PDF vigente:",
        errorArchivo,
      )

      return NextResponse.json(
        {
          error:
            "No se encontró el archivo PDF vigente.",
        },
        {
          status: 404,
        },
      )
    }

    const bytes = await archivo.arrayBuffer()

    const matriculaSegura = (
      documento.numero_matricula || "RENACLI"
    ).replace(
      /[^A-Za-z0-9_-]/g,
      "_",
    )

    return new NextResponse(
      Buffer.from(bytes),
      {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition":
            `inline; filename="Credencial-RENACLI-${matriculaSegura}.pdf"`,
          "Cache-Control":
            "private, no-store, max-age=0",
          "X-RENACLI-Document-Code":
            documento.codigo_documento,
        },
      },
    )
  } catch (error) {
    console.error(
      "Error mostrando PDF vigente:",
      error,
    )

    return NextResponse.json(
      {
        error:
          "No se pudo abrir el PDF vigente.",
      },
      {
        status: 500,
      },
    )
  }
}
