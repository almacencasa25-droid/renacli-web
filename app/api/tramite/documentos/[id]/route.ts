import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createHmac, timingSafeEqual } from "crypto"

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL

const supabaseSecretKey =
  process.env.SUPABASE_SECRET_KEY

const COOKIE_NAME =
  "renacli_tramite_session"

const BUCKET =
  "documentos-tramites"

type SesionTramite = {
  consultaId: number
  numeroTramite: string
  exp: number
}

function firmar(valor: string) {
  return createHmac(
    "sha256",
    supabaseSecretKey || "",
  )
    .update(valor)
    .digest("base64url")
}

function verificarToken(
  token: string,
): SesionTramite | null {
  try {
    const partes =
      token.split(".")

    if (partes.length !== 2) {
      return null
    }

    const [
      contenido,
      firmaRecibida,
    ] = partes

    const firmaEsperada =
      firmar(contenido)

    const recibida =
      Buffer.from(
        firmaRecibida,
      )

    const esperada =
      Buffer.from(
        firmaEsperada,
      )

    if (
      recibida.length !==
      esperada.length
    ) {
      return null
    }

    if (
      !timingSafeEqual(
        recibida,
        esperada,
      )
    ) {
      return null
    }

    const datos =
      JSON.parse(
        Buffer.from(
          contenido,
          "base64url",
        ).toString("utf8"),
      ) as SesionTramite

    if (
      !datos.consultaId ||
      !datos.numeroTramite ||
      !datos.exp
    ) {
      return null
    }

    if (
      datos.exp <
      Math.floor(
        Date.now() / 1000,
      )
    ) {
      return null
    }

    return datos
  } catch {
    return null
  }
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

function nombreDescarga(
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

    const token =
      request.cookies.get(
        COOKIE_NAME,
      )?.value

    if (!token) {
      return NextResponse.json(
        {
          error:
            "La sesión del trámite no es válida.",
        },
        {
          status: 401,
        },
      )
    }

    const sesion =
      verificarToken(token)

    if (!sesion) {
      return NextResponse.json(
        {
          error:
            "La sesión del trámite venció. Ingresá nuevamente.",
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
      data: consulta,
      error:
        errorConsulta,
    } = await supabase
      .from(
        "consultas_contacto",
      )
      .select(
        "id, numero_tramite",
      )
      .eq(
        "id",
        sesion.consultaId,
      )
      .eq(
        "numero_tramite",
        sesion.numeroTramite,
      )
      .maybeSingle()

    if (
      errorConsulta ||
      !consulta
    ) {
      if (errorConsulta) {
        console.error(
          "Error verificando trámite:",
          errorConsulta,
        )
      }

      return NextResponse.json(
        {
          error:
            "No se pudo encontrar el trámite.",
        },
        {
          status: 404,
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
        "consulta_id",
        consulta.id,
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
          "Error buscando documento:",
          errorDocumento,
        )
      }

      return NextResponse.json(
        {
          error:
            "El documento no existe o no pertenece a este trámite.",
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
          "Error descargando documento:",
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
      nombreDescarga(
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
      "Error abriendo documento del trámite:",
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
