import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import {
  createHmac,
  randomUUID,
  timingSafeEqual,
} from "crypto"

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL

const supabaseSecretKey =
  process.env.SUPABASE_SECRET_KEY

const COOKIE_NAME =
  "renacli_tramite_session"

const BUCKET =
  "documentos-tramites"

const TAMANO_MAXIMO =
  10 * 1024 * 1024

const MAXIMO_DOCUMENTOS =
  10

const TIPOS_PERMITIDOS =
  new Set([
    "application/pdf",
    "image/jpeg",
    "image/png",
  ])

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

function extensionPorMime(
  mime: string,
) {
  if (
    mime ===
    "application/pdf"
  ) {
    return "pdf"
  }

  if (
    mime ===
    "image/jpeg"
  ) {
    return "jpg"
  }

  if (
    mime ===
    "image/png"
  ) {
    return "png"
  }

  return ""
}

function limpiarNombre(
  nombre: string,
) {
  return nombre
    .trim()
    .slice(0, 200)
}

export async function POST(
  request: NextRequest,
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
        `
          id,
          numero_tramite,
          motivo,
          estado,
          requiere_documentacion
        `,
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

    const estadosFinalizados =
      new Set([
        "respondida",
        "aprobado",
        "rechazado",
        "archivada",
      ])

    if (
      estadosFinalizados.has(
        consulta.estado,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Este trámite ya se encuentra finalizado y no admite nuevos documentos.",
        },
        {
          status: 400,
        },
      )
    }

    const formData =
      await request.formData()

    const entradas =
      formData.getAll(
        "documentos",
      )

    const archivos =
      entradas.filter(
        (
          entrada,
        ): entrada is File =>
          entrada instanceof File &&
          entrada.size > 0,
      )

    if (
      archivos.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "Seleccioná al menos un archivo.",
        },
        {
          status: 400,
        },
      )
    }

    for (
      const archivo of archivos
    ) {
      if (
        archivo.size >
        TAMANO_MAXIMO
      ) {
        return NextResponse.json(
          {
            error:
              `El archivo "${archivo.name}" supera el límite de 10 MB.`,
          },
          {
            status: 400,
          },
        )
      }

      if (
        !TIPOS_PERMITIDOS.has(
          archivo.type,
        )
      ) {
        return NextResponse.json(
          {
            error:
              `El archivo "${archivo.name}" no tiene un formato permitido. Solo se aceptan PDF, JPG, JPEG y PNG.`,
          },
          {
            status: 400,
          },
        )
      }
    }

    const {
      count:
        documentosActuales,
      error:
        errorConteo,
    } = await supabase
      .from(
        "documentos_tramites",
      )
      .select(
        "id",
        {
          count: "exact",
          head: true,
        },
      )
      .eq(
        "consulta_id",
        consulta.id,
      )
      .eq(
        "activo",
        true,
      )

    if (errorConteo) {
      console.error(
        "Error contando documentos:",
        errorConteo,
      )

      return NextResponse.json(
        {
          error:
            "No se pudo verificar la cantidad de documentos del trámite.",
        },
        {
          status: 500,
        },
      )
    }

    const cantidadActual =
      documentosActuales || 0

    if (
      cantidadActual +
        archivos.length >
      MAXIMO_DOCUMENTOS
    ) {
      return NextResponse.json(
        {
          error:
            `El trámite admite como máximo 10 archivos activos. Actualmente tiene ${cantidadActual}.`,
        },
        {
          status: 400,
        },
      )
    }

    const documentosGuardados: {
      id: number
      nombre: string
    }[] = []

    for (
      const archivo of archivos
    ) {
      const extension =
        extensionPorMime(
          archivo.type,
        )

      const nombreOriginal =
        limpiarNombre(
          archivo.name,
        ) ||
        `documento.${extension}`

      const storagePath =
        `tramites/${consulta.id}/${randomUUID()}.${extension}`

      const buffer =
        Buffer.from(
          await archivo.arrayBuffer(),
        )

      const {
        error:
          errorStorage,
      } = await supabase.storage
        .from(BUCKET)
        .upload(
          storagePath,
          buffer,
          {
            contentType:
              archivo.type,
            upsert: false,
          },
        )

      if (errorStorage) {
        console.error(
          "Error subiendo documento:",
          errorStorage,
        )

        return NextResponse.json(
          {
            error:
              "No se pudo cargar uno de los documentos. Intentá nuevamente.",
          },
          {
            status: 500,
          },
        )
      }

      const {
        data:
          documentoGuardado,
        error:
          errorRegistro,
      } = await supabase
        .from(
          "documentos_tramites",
        )
        .insert({
          consulta_id:
            consulta.id,
          nombre_original:
            nombreOriginal,
          mime_type:
            archivo.type,
          tamano_bytes:
            archivo.size,
          storage_path:
            storagePath,
          origen:
            "solicitante",
          activo:
            true,
        })
        .select(
          "id, nombre_original",
        )
        .single()

      if (
        errorRegistro ||
        !documentoGuardado
      ) {
        console.error(
          "Error registrando documento:",
          errorRegistro,
        )

        await supabase.storage
          .from(BUCKET)
          .remove([
            storagePath,
          ])

        return NextResponse.json(
          {
            error:
              "No se pudo registrar uno de los documentos.",
          },
          {
            status: 500,
          },
        )
      }

      documentosGuardados.push({
        id:
          documentoGuardado.id,
        nombre:
          documentoGuardado.nombre_original,
      })

      const {
        error:
          errorHistorial,
      } = await supabase
        .from(
          "historial_tramites",
        )
        .insert({
          consulta_id:
            consulta.id,
          tipo_evento:
            "documento_cargado",
          estado_anterior:
            consulta.estado,
          estado_nuevo:
            consulta.estado,
          descripcion:
            `Documento cargado: ${nombreOriginal}`,
          origen:
            "solicitante",
        })

      if (
        errorHistorial
      ) {
        console.error(
          "Error registrando historial de documento:",
          errorHistorial,
        )
      }
    }

    return NextResponse.json({
      ok: true,
      cantidad:
        documentosGuardados.length,
      documentos:
        documentosGuardados,
    })
  } catch (error) {
    console.error(
      "Error en /api/tramite/documentos:",
      error,
    )

    return NextResponse.json(
      {
        error:
          "No se pudo procesar la carga de documentos.",
      },
      {
        status: 500,
      },
    )
  }
}
