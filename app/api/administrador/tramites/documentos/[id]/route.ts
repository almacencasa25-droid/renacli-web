import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL

const supabaseSecretKey =
  process.env.SUPABASE_SECRET_KEY

const BUCKET =
  "documentos-tramites"

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
    params:
      Promise<{
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

    const sesionAdmin =
      request.cookies.get(
        "renacli_admin_session",
      )?.value

    if (!sesionAdmin) {
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
          "Error buscando documento de trámite:",
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
          "Error verificando consulta del documento:",
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
          "Error descargando documento del trámite:",
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
        },
      },
    )
  } catch (error) {
    console.error(
      "Error abriendo documento desde administrador:",
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
