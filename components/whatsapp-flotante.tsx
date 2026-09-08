import { createClient } from "@supabase/supabase-js"
import { MessageCircle } from "lucide-react"

type ConfiguracionPublica = {
  whatsapp: string | null
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
      <MessageCircle
        className="size-7 sm:size-8"
        aria-hidden="true"
        strokeWidth={2.2}
      />
    </a>
  )
}
