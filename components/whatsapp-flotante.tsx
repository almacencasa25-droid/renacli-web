import { createClient } from "@supabase/supabase-js"

type ConfiguracionPublica = {
  whatsapp: string | null
}

function WhatsAppIcon() {
  return (
    <svg
      className="size-7 sm:size-8"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M16.04 3C8.86 3 3.03 8.72 3.03 15.78c0 2.25.6 4.45 1.74 6.38L3 28.68l6.77-1.73a13.14 13.14 0 0 0 6.27 1.59h.01c7.17 0 13.02-5.72 13.02-12.77C29.07 8.72 23.22 3 16.04 3Zm0 23.38h-.01a10.9 10.9 0 0 1-5.56-1.5l-.4-.23-4.02 1.03 1.08-3.84-.26-.39a10.44 10.44 0 0 1-1.69-5.67c0-5.88 4.87-10.66 10.86-10.66 5.99 0 10.86 4.78 10.86 10.66 0 5.88-4.87 10.6-10.86 10.6Zm5.96-7.96c-.33-.16-1.93-.94-2.23-1.05-.3-.11-.52-.16-.74.16-.22.33-.85 1.05-1.04 1.27-.19.22-.38.25-.71.08-.33-.16-1.38-.5-2.63-1.6a9.93 9.93 0 0 1-1.82-2.22c-.19-.33-.02-.5.14-.66.15-.15.33-.38.49-.57.16-.19.22-.33.33-.55.11-.22.05-.41-.03-.57-.08-.16-.74-1.76-1.02-2.41-.27-.65-.54-.56-.74-.57h-.63c-.22 0-.57.08-.87.41-.3.33-1.14 1.1-1.14 2.68 0 1.58 1.17 3.11 1.33 3.33.16.22 2.3 3.45 5.57 4.84.78.33 1.39.53 1.86.68.78.24 1.49.21 2.05.13.63-.09 1.93-.78 2.2-1.53.27-.76.27-1.41.19-1.54-.08-.13-.3-.21-.63-.37Z"
      />
    </svg>
  )
}

function obtenerSupabasePublico() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL

  const publishableKey =
    process.env
      .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!url || !publishableKey) {
    return null
  }

  return createClient(
    url,
    publishableKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  )
}

function normalizarWhatsApp(
  valor: string,
) {
  let numero =
    valor.replace(/\D/g, "")

  if (!numero) {
    return ""
  }

  if (numero.startsWith("00")) {
    numero = numero.slice(2)
  }

  if (numero.startsWith("549")) {
    return numero
  }

  if (numero.startsWith("54")) {
    return numero
  }

  if (numero.startsWith("0")) {
    numero = numero.slice(1)
  }

  if (numero.length === 10) {
    return `549${numero}`
  }

  return numero
}

export async function WhatsAppFlotante() {
  const supabase =
    obtenerSupabasePublico()

  if (!supabase) {
    return null
  }

  const { data } = await supabase
    .from("configuracion_publica")
    .select("whatsapp")
    .eq("id", 1)
    .maybeSingle()

  const whatsapp =
    data?.whatsapp?.trim() ?? ""

  const numero =
    normalizarWhatsApp(whatsapp)

  if (!numero) {
    return null
  }

  const mensaje =
    "Hola, me comunico desde la página de RENACLI y quisiera realizar una consulta."

  const enlace =
    `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`

  return (
    <a
      href={enlace}
      target="_blank"
      rel="noreferrer"
      aria-label="Contactar a RENACLI por WhatsApp"
      title="Contactar por WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:scale-105 hover:opacity-95 focus:outline-none focus:ring-4 focus:ring-[#25D366]/30 sm:bottom-6 sm:right-6 sm:size-16"
    >
      <WhatsAppIcon />
    </a>
  )
}
