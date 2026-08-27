import { createClient, type SupabaseClient } from "@supabase/supabase-js"

/**
 * Cliente de Supabase para RENACLI.
 *
 * Utiliza las variables de entorno ya configuradas en Vercel:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 *
 * Se emplea únicamente para lecturas públicas (consulta de matrículas),
 * por lo que la clave publicable es suficiente.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

let cliente: SupabaseClient | null = null

export function supabaseConfigurado() {
  return Boolean(url && key)
}

export function getSupabase(): SupabaseClient | null {
  if (!url || !key) return null
  if (!cliente) {
    cliente = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return cliente
}
