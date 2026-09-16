"use server"

import crypto from "crypto"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { createClient } from "@supabase/supabase-js"

const COOKIE_NAME = "renacli_admin_session"

const RUTA_MODULO =
  "/administrador/respuestas-automaticas"

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

async function estaAutorizado() {
  const cookieStore =
    await cookies()

  const tokenGuardado =
    cookieStore.get(
      COOKIE_NAME,
    )?.value

  const tokenCorrecto =
    obtenerTokenAdministrador()

  return (
    Boolean(tokenCorrecto) &&
    tokenGuardado === tokenCorrecto
  )
}

async function verificarAdministrador() {
  if (
    !(await estaAutorizado())
  ) {
    redirect(
      "/administrador",
    )
  }
}

function obtenerSupabaseAdmin() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL

  const secret =
    process.env.SUPABASE_SECRET_KEY

  if (!url || !secret) {
    throw new Error(
      "Falta configurar Supabase para respuestas automáticas.",
    )
  }

  return createClient(
    url,
    secret,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  )
}

function texto(
  valor: FormDataEntryValue | null,
  maximo: number,
) {
  return String(
    valor ?? "",
  )
    .trim()
    .slice(
      0,
      maximo,
    )
}

function numero(
  valor: FormDataEntryValue | null,
  defecto: number,
) {
  const resultado =
    Number(valor)

  if (
    !Number.isFinite(resultado)
  ) {
    return defecto
  }

  return Math.trunc(
    resultado,
  )
}

function checkbox(
  valor: FormDataEntryValue | null,
) {
  return valor === "on"
}

function normalizarClave(
  valor: string,
) {
  return valor
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      "_",
    )
    .replace(
      /^_+|_+$/g,
      "",
    )
    .slice(
      0,
      80,
    )
}

function finalizar(
  mensaje?: string,
  error?: string,
): never {
  revalidatePath(
    RUTA_MODULO,
  )

  const parametros =
    new URLSearchParams()

  if (mensaje) {
    parametros.set(
      "mensaje",
      mensaje,
    )
  }

  if (error) {
    parametros.set(
      "error",
      error,
    )
  }

  const query =
    parametros.toString()

  redirect(
    `${RUTA_MODULO}${
      query
        ? `?${query}`
        : ""
    }`,
  )
}


/* ============================================================
   CONFIGURACIÓN / VARIABLES
   ============================================================ */

export async function crearConfiguracion(
  formData: FormData,
) {
  await verificarAdministrador()

  const supabase =
    obtenerSupabaseAdmin()

  const clave =
    normalizarClave(
      texto(
        formData.get("clave"),
        80,
      ),
    )

  const nombre =
    texto(
      formData.get("nombre"),
      150,
    )

  const valor =
    texto(
      formData.get("valor"),
      500,
    )

  const tipo =
    texto(
      formData.get("tipo"),
      30,
    )

  const descripcion =
    texto(
      formData.get(
        "descripcion",
      ),
      1000,
    )

  const orden =
    numero(
      formData.get("orden"),
      100,
    )

  const tiposPermitidos =
    new Set([
      "texto",
      "numero",
      "moneda",
      "porcentaje",
      "booleano",
    ])

  if (
    !clave ||
    !nombre ||
    !tiposPermitidos.has(
      tipo,
    )
  ) {
    finalizar(
      undefined,
      "configuracion",
    )
  }

  const {
    error,
  } = await supabase
    .from(
      "configuracion_respuestas_automaticas",
    )
    .insert({
      clave,
      nombre,
      valor,
      tipo,
      descripcion:
        descripcion || null,
      activo: true,
      orden,
    })

  if (error) {
    console.error(
      "[RENACLI] Error creando variable de respuestas automáticas:",
      error,
    )

    finalizar(
      undefined,
      "configuracion",
    )
  }

  finalizar(
    "configuracion_creada",
  )
}

export async function actualizarConfiguracion(
  formData: FormData,
) {
  await verificarAdministrador()

  const supabase =
    obtenerSupabaseAdmin()

  const id =
    numero(
      formData.get("id"),
      0,
    )

  const nombre =
    texto(
      formData.get("nombre"),
      150,
    )

  const valor =
    texto(
      formData.get("valor"),
      500,
    )

  const tipo =
    texto(
      formData.get("tipo"),
      30,
    )

  const descripcion =
    texto(
      formData.get(
        "descripcion",
      ),
      1000,
    )

  const orden =
    numero(
      formData.get("orden"),
      100,
    )

  const tiposPermitidos =
    new Set([
      "texto",
      "numero",
      "moneda",
      "porcentaje",
      "booleano",
    ])

  if (
    id <= 0 ||
    !nombre ||
    !tiposPermitidos.has(
      tipo,
    )
  ) {
    finalizar(
      undefined,
      "configuracion",
    )
  }

  const {
    error,
  } = await supabase
    .from(
      "configuracion_respuestas_automaticas",
    )
    .update({
      nombre,
      valor,
      tipo,
      descripcion:
        descripcion || null,
      activo:
        checkbox(
          formData.get(
            "activo",
          ),
        ),
      orden,
    })
    .eq(
      "id",
      id,
    )

  if (error) {
    console.error(
      "[RENACLI] Error actualizando variable:",
      error,
    )

    finalizar(
      undefined,
      "configuracion",
    )
  }

  finalizar(
    "configuracion_guardada",
  )
}

export async function eliminarConfiguracion(
  formData: FormData,
) {
  await verificarAdministrador()

  const supabase =
    obtenerSupabaseAdmin()

  const id =
    numero(
      formData.get("id"),
      0,
    )

  if (id <= 0) {
    finalizar(
      undefined,
      "configuracion",
    )
  }

  const {
    data: item,
    error: errorItem,
  } = await supabase
    .from(
      "configuracion_respuestas_automaticas",
    )
    .select(
      "id, clave",
    )
    .eq(
      "id",
      id,
    )
    .maybeSingle()

  if (
    errorItem ||
    !item
  ) {
    finalizar(
      undefined,
      "configuracion",
    )
  }

  const protegidas =
    new Set([
      "automatizacion_habilitada",
      "fallback_habilitado",
      "notificar_telegram_respuesta_automatica",
    ])

  if (
    protegidas.has(
      item.clave,
    )
  ) {
    finalizar(
      undefined,
      "variable_protegida",
    )
  }

  const {
    count,
    error: errorUso,
  } = await supabase
    .from(
      "respuestas_automaticas",
    )
    .select(
      "id",
      {
        count: "exact",
        head: true,
      },
    )
    .ilike(
      "respuesta_plantilla",
      `%{{${item.clave}}}%`,
    )

  if (errorUso) {
    console.error(
      "[RENACLI] Error comprobando uso de variable:",
      errorUso,
    )

    finalizar(
      undefined,
      "configuracion",
    )
  }

  if (
    (count ?? 0) > 0
  ) {
    finalizar(
      undefined,
      "variable_en_uso",
    )
  }

  const {
    error,
  } = await supabase
    .from(
      "configuracion_respuestas_automaticas",
    )
    .delete()
    .eq(
      "id",
      id,
    )

  if (error) {
    console.error(
      "[RENACLI] Error eliminando variable:",
      error,
    )

    finalizar(
      undefined,
      "configuracion",
    )
  }

  finalizar(
    "configuracion_eliminada",
  )
}


/* ============================================================
   RESPUESTAS
   ============================================================ */

export async function crearRespuesta(
  formData: FormData,
) {
  await verificarAdministrador()

  const supabase =
    obtenerSupabaseAdmin()

  const titulo =
    texto(
      formData.get("titulo"),
      150,
    )

  const categoria =
    texto(
      formData.get(
        "categoria",
      ),
      80,
    ) || "general"

  const respuestaPlantilla =
    texto(
      formData.get(
        "respuesta_plantilla",
      ),
      5000,
    )

  const prioridad =
    numero(
      formData.get(
        "prioridad",
      ),
      100,
    )

  if (
    !titulo ||
    !respuestaPlantilla
  ) {
    finalizar(
      undefined,
      "respuesta",
    )
  }

  const base =
    normalizarClave(
      titulo,
    ) ||
    "respuesta"

  const codigo =
    `${base}_${Date.now().toString(36)}`

  const {
    error,
  } = await supabase
    .from(
      "respuestas_automaticas",
    )
    .insert({
      codigo,
      titulo,
      categoria,
      respuesta_plantilla:
        respuestaPlantilla,
      prioridad,
      activo: true,
      es_fallback: false,
      requiere_intervencion:
        checkbox(
          formData.get(
            "requiere_intervencion",
          ),
        ),
    })

  if (error) {
    console.error(
      "[RENACLI] Error creando respuesta automática:",
      error,
    )

    finalizar(
      undefined,
      "respuesta",
    )
  }

  finalizar(
    "respuesta_creada",
  )
}

export async function actualizarRespuesta(
  formData: FormData,
) {
  await verificarAdministrador()

  const supabase =
    obtenerSupabaseAdmin()

  const id =
    numero(
      formData.get("id"),
      0,
    )

  const titulo =
    texto(
      formData.get("titulo"),
      150,
    )

  const categoria =
    texto(
      formData.get(
        "categoria",
      ),
      80,
    ) || "general"

  const respuestaPlantilla =
    texto(
      formData.get(
        "respuesta_plantilla",
      ),
      5000,
    )

  const prioridad =
    numero(
      formData.get(
        "prioridad",
      ),
      100,
    )

  if (
    id <= 0 ||
    !titulo ||
    !respuestaPlantilla
  ) {
    finalizar(
      undefined,
      "respuesta",
    )
  }

  const {
    error,
  } = await supabase
    .from(
      "respuestas_automaticas",
    )
    .update({
      titulo,
      categoria,
      respuesta_plantilla:
        respuestaPlantilla,
      prioridad,
      activo:
        checkbox(
          formData.get(
            "activo",
          ),
        ),
      requiere_intervencion:
        checkbox(
          formData.get(
            "requiere_intervencion",
          ),
        ),
    })
    .eq(
      "id",
      id,
    )

  if (error) {
    console.error(
      "[RENACLI] Error actualizando respuesta automática:",
      error,
    )

    finalizar(
      undefined,
      "respuesta",
    )
  }

  finalizar(
    "respuesta_guardada",
  )
}

export async function eliminarRespuesta(
  formData: FormData,
) {
  await verificarAdministrador()

  const supabase =
    obtenerSupabaseAdmin()

  const id =
    numero(
      formData.get("id"),
      0,
    )

  if (id <= 0) {
    finalizar(
      undefined,
      "respuesta",
    )
  }

  const {
    data: respuesta,
    error: errorRespuesta,
  } = await supabase
    .from(
      "respuestas_automaticas",
    )
    .select(
      "id, es_fallback",
    )
    .eq(
      "id",
      id,
    )
    .maybeSingle()

  if (
    errorRespuesta ||
    !respuesta
  ) {
    finalizar(
      undefined,
      "respuesta",
    )
  }

  if (
    respuesta.es_fallback
  ) {
    finalizar(
      undefined,
      "fallback_no_eliminar",
    )
  }

  const {
    error,
  } = await supabase
    .from(
      "respuestas_automaticas",
    )
    .delete()
    .eq(
      "id",
      id,
    )

  if (error) {
    console.error(
      "[RENACLI] Error eliminando respuesta automática:",
      error,
    )

    finalizar(
      undefined,
      "respuesta",
    )
  }

  finalizar(
    "respuesta_eliminada",
  )
}


/* ============================================================
   FRASES DE DETECCIÓN
   ============================================================ */

export async function agregarFrase(
  formData: FormData,
) {
  await verificarAdministrador()

  const supabase =
    obtenerSupabaseAdmin()

  const respuestaId =
    numero(
      formData.get(
        "respuesta_id",
      ),
      0,
    )

  const frase =
    texto(
      formData.get("frase"),
      500,
    )

  const tipo =
    texto(
      formData.get(
        "tipo_coincidencia",
      ),
      30,
    )

  const tiposPermitidos =
    new Set([
      "exacta",
      "contiene",
      "todas_palabras",
    ])

  if (
    respuestaId <= 0 ||
    !frase ||
    !tiposPermitidos.has(
      tipo,
    )
  ) {
    finalizar(
      undefined,
      "frase",
    )
  }

  const {
    error,
  } = await supabase
    .from(
      "frases_respuestas_automaticas",
    )
    .insert({
      respuesta_id:
        respuestaId,
      frase,
      tipo_coincidencia:
        tipo,
      activo: true,
    })

  if (error) {
    console.error(
      "[RENACLI] Error agregando frase de detección:",
      error,
    )

    finalizar(
      undefined,
      "frase",
    )
  }

  finalizar(
    "frase_creada",
  )
}

export async function actualizarFrase(
  formData: FormData,
) {
  await verificarAdministrador()

  const supabase =
    obtenerSupabaseAdmin()

  const id =
    numero(
      formData.get("id"),
      0,
    )

  const frase =
    texto(
      formData.get("frase"),
      500,
    )

  const tipo =
    texto(
      formData.get(
        "tipo_coincidencia",
      ),
      30,
    )

  const tiposPermitidos =
    new Set([
      "exacta",
      "contiene",
      "todas_palabras",
    ])

  if (
    id <= 0 ||
    !frase ||
    !tiposPermitidos.has(
      tipo,
    )
  ) {
    finalizar(
      undefined,
      "frase",
    )
  }

  const {
    error,
  } = await supabase
    .from(
      "frases_respuestas_automaticas",
    )
    .update({
      frase,
      tipo_coincidencia:
        tipo,
      activo:
        checkbox(
          formData.get(
            "activo",
          ),
        ),
    })
    .eq(
      "id",
      id,
    )

  if (error) {
    console.error(
      "[RENACLI] Error actualizando frase de detección:",
      error,
    )

    finalizar(
      undefined,
      "frase",
    )
  }

  finalizar(
    "frase_guardada",
  )
}

export async function eliminarFrase(
  formData: FormData,
) {
  await verificarAdministrador()

  const supabase =
    obtenerSupabaseAdmin()

  const id =
    numero(
      formData.get("id"),
      0,
    )

  if (id <= 0) {
    finalizar(
      undefined,
      "frase",
    )
  }

  const {
    error,
  } = await supabase
    .from(
      "frases_respuestas_automaticas",
    )
    .delete()
    .eq(
      "id",
      id,
    )

  if (error) {
    console.error(
      "[RENACLI] Error eliminando frase de detección:",
      error,
    )

    finalizar(
      undefined,
      "frase",
    )
  }

  finalizar(
    "frase_eliminada",
  )
}
