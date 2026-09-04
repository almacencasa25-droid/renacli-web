import { createClient } from "@supabase/supabase-js"

const BUCKET_FOTOS = "fotos-matriculados"

function obtenerSupabasePrivado() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secretKey = process.env.SUPABASE_SECRET_KEY

  if (!url || !secretKey) {
    throw new Error(
      "Faltan las variables de entorno de Supabase."
    )
  }

  return createClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

/**
 * Convierte una foto guardada con el sistema anterior
 * (URL pública completa) en la ruta interna del bucket.
 *
 * También acepta directamente rutas nuevas como:
 *   1/foto-123456.jpg
 */
export function obtenerRutaFoto(
  fotoUrl: string | null | undefined
): string | null {
  if (!fotoUrl) return null

  const valor = fotoUrl.trim()

  if (!valor) return null

  const marcador =
    `/storage/v1/object/public/${BUCKET_FOTOS}/`

  const posicion = valor.indexOf(marcador)

  if (posicion >= 0) {
    const ruta = valor.slice(
      posicion + marcador.length
    )

    return ruta
      ? decodeURIComponent(ruta)
      : null
  }

  /*
   * Compatibilidad por si alguna URL firmada
   * llegara a almacenarse accidentalmente.
   */
  const marcadorFirmado =
    `/storage/v1/object/sign/${BUCKET_FOTOS}/`

  const posicionFirmada =
    valor.indexOf(marcadorFirmado)

  if (posicionFirmada >= 0) {
    const rutaConQuery = valor.slice(
      posicionFirmada +
        marcadorFirmado.length
    )

    const ruta =
      rutaConQuery.split("?")[0]

    return ruta
      ? decodeURIComponent(ruta)
      : null
  }

  /*
   * Si no es una URL de Supabase, asumimos
   * que ya es la ruta interna del archivo.
   */
  if (
    !valor.startsWith("http://") &&
    !valor.startsWith("https://")
  ) {
    return valor.replace(/^\/+/, "")
  }

  return null
}

/**
 * Genera una URL temporal para mostrar una foto
 * almacenada en el bucket privado.
 *
 * La URL vence automáticamente.
 */
export async function crearUrlFirmadaFoto(
  fotoUrl: string | null | undefined,
  duracionSegundos = 300
): Promise<string | null> {
  const ruta = obtenerRutaFoto(fotoUrl)

  if (!ruta) return null

  const supabase =
    obtenerSupabasePrivado()

  const {
    data,
    error,
  } = await supabase.storage
    .from(BUCKET_FOTOS)
    .createSignedUrl(
      ruta,
      duracionSegundos
    )

  if (error || !data?.signedUrl) {
    console.error(
      "[RENACLI] Error generando URL firmada de foto:",
      error
    )

    return null
  }

  return data.signedUrl
}

/**
 * Descarga una foto directamente desde Storage
 * utilizando el cliente privado del servidor.
 *
 * Esto es útil para el generador de PDF:
 * no necesita crear ni exponer una URL pública.
 */
export async function descargarFotoPrivada(
  fotoUrl: string | null | undefined
): Promise<ArrayBuffer | null> {
  const ruta = obtenerRutaFoto(fotoUrl)

  if (!ruta) return null

  const supabase =
    obtenerSupabasePrivado()

  const {
    data,
    error,
  } = await supabase.storage
    .from(BUCKET_FOTOS)
    .download(ruta)

  if (error || !data) {
    console.error(
      "[RENACLI] Error descargando foto privada:",
      error
    )

    return null
  }

  return await data.arrayBuffer()
}
