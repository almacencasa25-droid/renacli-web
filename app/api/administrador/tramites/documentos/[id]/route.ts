import crypto from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL

const supabaseSecretKey =
  process.env.SUPABASE_SECRET_KEY

const COOKIE_NAME =
  "renacli_admin_session"

const BUCKET =
  "documentos-tramites"

function obtenerTokenAdministrador() {
  const password =
    process.env.RENACLI_ADMIN_PASSWORD

  if (!password) {
    return null
  }

  return crypto
    .createHash("sha256")
    .update(password)
    .digest("hex")
}

function administradorAutorizado(
  request: NextRequest,
) {
  const tokenGuardado =
    request.cookies.get(
      COOKIE_NAME,
    )?.value

  const tokenCorrecto =
    obtenerTokenAdministrador()

  return Boolean(
    tokenCorrecto &&
      tokenGuardado &&
      tokenGuardado ===
        tokenCorrecto,
  )
}

function crearSupabase() {
  if (
    !supabaseUrl ||
    !supabaseSecretKey
  ) {
    return null
  }

  return createClient(
    supabaseUrl,
    supabaseSecretKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  )
}

function nombreSeguro(
  nombre: string,
) {
  return nombre
    .replace(
      /[\r\n"]/g,
      "",
    )
    .slice(0, 200)
}

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string
    }>
  },
) {
  try {
    if (
      !supabaseUrl ||
      !supabaseSecretKey
    ) {
      return NextResponse.json(
        {
          error:
            "Configuración del servidor incompleta.",
        },
        {
          status: 500,
        },
      )
    }

    if (
      !administradorAutorizado(
        request,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Acceso no autorizado.",
        },
        {
          status: 401,
        },
      )
    }

    const {
      id,
    } = await context.params

    const documentoId =
      Number(id)

    if (
      !Number.isInteger(
        documentoId,
      ) ||
      documentoId <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Documento no válido.",
        },
        {
          status: 400,
        },
      )
    }

    const supabase =
      crearSupabase()

    if (!supabase) {
      return NextResponse.json(
        {
          error:
            "Configuración del servidor incompleta.",
        },
        {
          status: 500,
        },
      )
    }

    const {
      data: documento,
      error:
        errorDocumento,
    } = await supabase
      .from(
        "documentos_tramites",
      )
      .select(
        `
          id,
          consulta_id,
          nombre_original,
          mime_type,
          storage_path,
          activo
        `,
      )
      .eq(
        "id",
        documentoId,
      )
      .eq(
        "activo",
        true,
      )
      .maybeSingle()

    if (
      errorDocumento ||
      !documento
    ) {
      if (errorDocumento) {
        console.error(
          "[RENACLI] Error buscando documento de trámite:",
          errorDocumento,
        )
      }

      return NextResponse.json(
        {
          error:
            "No se encontró el documento.",
        },
        {
          status: 404,
        },
      )
    }

    const {
      data: consulta,
      error:
        errorConsulta,
    } = await supabase
      .from(
        "consultas_contacto",
      )
      .select(
        "id",
      )
      .eq(
        "id",
        documento.consulta_id,
      )
      .maybeSingle()

    if (
      errorConsulta ||
      !consulta
    ) {
      if (errorConsulta) {
        console.error(
          "[RENACLI] Error verificando consulta del documento:",
          errorConsulta,
        )
      }

      return NextResponse.json(
        {
          error:
            "El documento no pertenece a un trámite válido.",
        },
        {
          status: 404,
        },
      )
    }

    const {
      data: archivo,
      error:
        errorDescarga,
    } = await supabase.storage
      .from(BUCKET)
      .download(
        documento.storage_path,
      )

    if (
      errorDescarga ||
      !archivo
    ) {
      if (errorDescarga) {
        console.error(
          "[RENACLI] Error descargando documento del trámite:",
          errorDescarga,
        )
      }

      return NextResponse.json(
        {
          error:
            "No se pudo abrir el documento.",
        },
        {
          status: 500,
        },
      )
    }

    const buffer =
      await archivo.arrayBuffer()

    const nombre =
      nombreSeguro(
        documento.nombre_original,
      )

    return new NextResponse(
      buffer,
      {
        status: 200,
        headers: {
          "Content-Type":
            documento.mime_type ||
            "application/octet-stream",

          "Content-Disposition":
            `inline; filename="${nombre}"`,

          "Cache-Control":
            "private, no-store, max-age=0",

          Pragma:
            "no-cache",

          "X-Content-Type-Options":
            "nosniff",
        },
      },
    )
  } catch (error) {
    console.error(
      "[RENACLI] Error abriendo documento desde administrador:",
      error,
    )

    return NextResponse.json(
      {
        error:
          "No se pudo procesar el documento.",
      },
      {
        status: 500,
      },
    )
  }
}
