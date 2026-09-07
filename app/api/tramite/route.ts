import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createHmac, timingSafeEqual } from "crypto"

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL

const supabaseSecretKey =
  process.env.SUPABASE_SECRET_KEY

const COOKIE_NAME =
  "renacli_tramite_session"

const DURACION_SESION =
  60 * 60 * 2

type SesionTramite = {
  consultaId: number
  numeroTramite: string
  exp: number
}

function textoSeguro(
  valor: unknown,
  maximo: number,
) {
  if (typeof valor !== "string") {
    return ""
  }

  return valor
    .trim()
    .slice(0, maximo)
}

function emailValido(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email,
  )
}

function obtenerSecreto() {
  return supabaseSecretKey || ""
}

function firmar(valor: string) {
  return createHmac(
    "sha256",
    obtenerSecreto(),
  )
    .update(valor)
    .digest("base64url")
}

function crearToken(
  sesion: SesionTramite,
) {
  const contenido =
    Buffer.from(
      JSON.stringify(sesion),
    ).toString("base64url")

  const firma =
    firmar(contenido)

  return `${contenido}.${firma}`
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

export async function POST(
  request: NextRequest,
) {
  try {
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

    const body =
      await request.json()

    const numeroTramite =
      textoSeguro(
        body?.numeroTramite,
        40,
      ).toUpperCase()

    const email =
      textoSeguro(
        body?.email,
        160,
      ).toLowerCase()

    if (
      !numeroTramite ||
      !email
    ) {
      return NextResponse.json(
        {
          error:
            "Ingresá el número de trámite y el correo electrónico.",
        },
        {
          status: 400,
        },
      )
    }

    if (!emailValido(email)) {
      return NextResponse.json(
        {
          error:
            "Ingresá un correo electrónico válido.",
        },
        {
          status: 400,
        },
      )
    }

    const {
      data: consulta,
      error,
    } = await supabase
      .from(
        "consultas_contacto",
      )
      .select(
        "id, numero_tramite, email",
      )
      .eq(
        "numero_tramite",
        numeroTramite,
      )
      .ilike(
        "email",
        email,
      )
      .maybeSingle()

    if (error) {
      console.error(
        "Error verificando trámite RENACLI:",
        error,
      )

      return NextResponse.json(
        {
          error:
            "No se pudo verificar el trámite.",
        },
        {
          status: 500,
        },
      )
    }

    if (!consulta) {
      return NextResponse.json(
        {
          error:
            "El número de trámite o el correo electrónico no coinciden.",
        },
        {
          status: 401,
        },
      )
    }

    const ahora =
      Math.floor(
        Date.now() / 1000,
      )

    const token =
      crearToken({
        consultaId:
          consulta.id,
        numeroTramite:
          consulta.numero_tramite,
        exp:
          ahora +
          DURACION_SESION,
      })

    const respuesta =
      NextResponse.json({
        ok: true,
      })

    respuesta.cookies.set(
      COOKIE_NAME,
      token,
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV ===
          "production",
        sameSite: "lax",
        path: "/",
        maxAge:
          DURACION_SESION,
      },
    )

    return respuesta
  } catch (error) {
    console.error(
      "Error en /api/tramite:",
      error,
    )

    return NextResponse.json(
      {
        error:
          "No se pudo procesar el acceso al trámite.",
      },
      {
        status: 500,
      },
    )
  }
}

export async function GET(
  request: NextRequest,
) {
  try {
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

    const token =
      request.cookies.get(
        COOKIE_NAME,
      )?.value

    if (!token) {
      return NextResponse.json(
        {
          autenticado: false,
        },
        {
          status: 401,
        },
      )
    }

    const sesion =
      verificarToken(token)

    if (!sesion) {
      const respuesta =
        NextResponse.json(
          {
            autenticado: false,
          },
          {
            status: 401,
          },
        )

      respuesta.cookies.set(
        COOKIE_NAME,
        "",
        {
          httpOnly: true,
          secure:
            process.env.NODE_ENV ===
            "production",
          sameSite: "lax",
          path: "/",
          maxAge: 0,
        },
      )

      return respuesta
    }

    const {
      data: consulta,
      error,
    } = await supabase
      .from(
        "consultas_contacto",
      )
      .select(
        `
          id,
          numero_tramite,
          nombre,
          motivo,
          mensaje,
          estado,
          respuesta_publica,
          detalle_documentacion_faltante,
          requiere_documentacion,
          created_at,
          updated_at,
          fecha_en_revision,
          fecha_ultima_respuesta,
          fecha_aprobacion,
          fecha_rechazo
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
      error ||
      !consulta
    ) {
      if (error) {
        console.error(
          "Error leyendo trámite RENACLI:",
          error,
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
      data: documentos,
      error:
        errorDocumentos,
    } = await supabase
      .from(
        "documentos_tramites",
      )
      .select(
        `
          id,
          nombre_original,
          mime_type,
          tamano_bytes,
          origen,
          descripcion,
          created_at
        `,
      )
      .eq(
        "consulta_id",
        consulta.id,
      )
      .eq(
        "activo",
        true,
      )
      .order(
        "created_at",
        {
          ascending: false,
        },
      )

    if (errorDocumentos) {
      console.error(
        "Error leyendo documentos del trámite:",
        errorDocumentos,
      )
    }

    const {
      data: historial,
      error:
        errorHistorial,
    } = await supabase
      .from(
        "historial_tramites",
      )
      .select(
        `
          id,
          tipo_evento,
          estado_anterior,
          estado_nuevo,
          descripcion,
          origen,
          created_at
        `,
      )
      .eq(
        "consulta_id",
        consulta.id,
      )
      .order(
        "created_at",
        {
          ascending: false,
        },
      )

    if (errorHistorial) {
      console.error(
        "Error leyendo historial del trámite:",
        errorHistorial,
      )
    }

    return NextResponse.json({
      autenticado: true,
      tramite: consulta,
      documentos:
        documentos || [],
      historial:
        historial || [],
    })
  } catch (error) {
    console.error(
      "Error consultando sesión de trámite:",
      error,
    )

    return NextResponse.json(
      {
        error:
          "No se pudo consultar el trámite.",
      },
      {
        status: 500,
      },
    )
  }
}

export async function DELETE() {
  const respuesta =
    NextResponse.json({
      ok: true,
    })

  respuesta.cookies.set(
    COOKIE_NAME,
    "",
    {
      httpOnly: true,
      secure:
        process.env.NODE_ENV ===
        "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    },
  )

  return respuesta
}
