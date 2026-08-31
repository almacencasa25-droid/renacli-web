import { createClient } from "@supabase/supabase-js"

type ConfiguracionPublica = {
  email_contacto: string | null
  telefono_contacto: string | null
  whatsapp: string | null
  horario_atencion: string | null
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
    }
  )
}

function limpiarWhatsApp(
  valor: string
) {
  return valor.replace(/\D/g, "")
}

export async function SiteFooter() {
  let configuracion:
    ConfiguracionPublica | null = null

  const supabase =
    obtenerSupabasePublico()

  if (supabase) {
    const { data } = await supabase
      .from("configuracion_publica")
      .select(
        "email_contacto, telefono_contacto, whatsapp, horario_atencion"
      )
      .eq("id", 1)
      .maybeSingle()

    configuracion = data
  }

  const email =
    configuracion?.email_contacto?.trim() ??
    ""

  const telefono =
    configuracion?.telefono_contacto?.trim() ??
    ""

  const whatsapp =
    configuracion?.whatsapp?.trim() ??
    ""

  const horario =
    configuracion?.horario_atencion?.trim() ??
    ""

  const whatsappLimpio =
    limpiarWhatsApp(whatsapp)

  const hayContacto =
    email ||
    telefono ||
    whatsapp ||
    horario

  return (
    <footer className="mt-16 border-t border-border bg-secondary/50">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="grid gap-7 sm:grid-cols-2">
          <div>
            <p className="text-sm font-bold tracking-[0.18em] text-foreground">
              RENACLI
            </p>

            <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
              Registro Nacional de
              Climatización y Refrigeración
              — sistema privado de
              evaluación, acreditación,
              registro y verificación de
              matrículas de técnicos en
              refrigeración y aire
              acondicionado.
            </p>

            <p className="mt-3 text-xs leading-relaxed text-muted-foreground text-pretty">
              La información publicada
              tiene carácter informativo y
              refleja el estado registral
              al momento de la consulta.
            </p>
          </div>

          {hayContacto ? (
            <div>
              <p className="text-sm font-bold text-foreground">
                Contacto
              </p>

              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                {email ? (
                  <p>
                    <span className="font-semibold text-foreground">
                      Correo:{" "}
                    </span>

                    <a
                      href={`mailto:${email}`}
                      className="hover:underline"
                    >
                      {email}
                    </a>
                  </p>
                ) : null}

                {telefono ? (
                  <p>
                    <span className="font-semibold text-foreground">
                      Teléfono:{" "}
                    </span>
                    {telefono}
                  </p>
                ) : null}

                {whatsapp ? (
                  <p>
                    <span className="font-semibold text-foreground">
                      WhatsApp:{" "}
                    </span>

                    {whatsappLimpio ? (
                      <a
                        href={`https://wa.me/${whatsappLimpio}`}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline"
                      >
                        {whatsapp}
                      </a>
                    ) : (
                      whatsapp
                    )}
                  </p>
                ) : null}

                {horario ? (
                  <p>
                    <span className="font-semibold text-foreground">
                      Horario:{" "}
                    </span>
                    {horario}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </footer>
  )
}
