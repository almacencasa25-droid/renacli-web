import { notFound } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"

type PageProps = {
  params: Promise<{
    codigo: string
  }>
}

type EstadoPublico = "vigente" | "vencida" | "suspendida" | "baja"

function fechaHoyArgentina() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

function calcularEstado(
  estado: string | null,
  fechaVencimiento: string | null,
): EstadoPublico {
  const valor = (estado ?? "").trim().toLowerCase()

  if (valor.includes("baja")) {
    return "baja"
  }

  if (valor.includes("suspend")) {
    return "suspendida"
  }

  if (
    fechaVencimiento &&
    fechaVencimiento < fechaHoyArgentina()
  ) {
    return "vencida"
  }

  return "vigente"
}

function textoEstado(estado: EstadoPublico) {
  switch (estado) {
    case "vigente":
      return "MATRÍCULA VIGENTE"
    case "vencida":
      return "MATRÍCULA VENCIDA"
    case "suspendida":
      return "MATRÍCULA SUSPENDIDA"
    case "baja":
      return "MATRÍCULA DADA DE BAJA"
  }
}

function descripcionEstado(estado: EstadoPublico) {
  switch (estado) {
    case "vigente":
      return "El técnico se encuentra registrado y con matrícula vigente."
    case "vencida":
      return "La matrícula se encuentra vencida y pendiente de renovación."
    case "suspendida":
      return "La matrícula se encuentra suspendida por administración del registro."
    case "baja":
      return "Esta acreditación fue dada de baja y ya no se encuentra vigente."
  }
}

function formatearFecha(fecha: string | null) {
  if (!fecha) return "No informada"

  const [anio, mes, dia] = fecha.split("-")

  if (!anio || !mes || !dia) {
    return fecha
  }

  return `${dia}/${mes}/${anio}`
}

function obtenerSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secretKey = process.env.SUPABASE_SECRET_KEY

  if (!url || !secretKey) {
    throw new Error(
      "Faltan las variables de entorno de Supabase.",
    )
  }

  return createClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export default async function VerificarCodigoPage({
  params,
}: PageProps) {
  const { codigo } = await params
  const codigoLimpio = codigo.trim()

  if (!codigoLimpio) {
    notFound()
  }

  const supabase = obtenerSupabaseAdmin()

  const { data: historial, error: errorHistorial } =
    await supabase
      .from("historial_matriculas")
      .select(
        "id, numero_matricula, matriculado_id, estado, fecha_asignacion, fecha_liberacion, codigo_verificacion",
      )
      .eq("codigo_verificacion", codigoLimpio)
      .maybeSingle()

  if (errorHistorial || !historial) {
    notFound()
  }

  const { data: matriculado, error: errorMatriculado } =
    await supabase
      .from("matriculados")
      .select(
        "id, numero_matricula, apellido_nombre, localidad, provincia, especialidad, telefono, foto_url, fecha_emision, fecha_vencimiento, estado",
      )
      .eq("id", historial.matriculado_id)
      .maybeSingle()

  if (errorMatriculado || !matriculado) {
    notFound()
  }

  const acreditacionActual =
    historial.estado === "asignada" &&
    !historial.fecha_liberacion &&
    matriculado.numero_matricula === historial.numero_matricula

  const estado = acreditacionActual
    ? calcularEstado(
        matriculado.estado,
        matriculado.fecha_vencimiento,
      )
    : "baja"

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteHeader />

      <main className="flex-1">
        <section className="border-b border-border bg-secondary/40">
          <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Verificación oficial RENACLI
            </p>

            <h1 className="mt-2 text-3xl font-bold text-foreground">
              Verificación de credencial
            </h1>

            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Esta página fue abierta mediante el código único de
              verificación de una acreditación.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="border-b border-border p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Estado de la matrícula
              </p>

              <h2 className="mt-2 text-2xl font-bold text-foreground">
                {textoEstado(estado)}
              </h2>

              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {descripcionEstado(estado)}
              </p>
            </div>

            <div className="grid gap-5 p-6 sm:grid-cols-2 sm:p-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Matrícula
                </p>
                <p className="mt-1 text-xl font-bold text-foreground">
                  {historial.numero_matricula}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Apellido y nombre
                </p>
                <p className="mt-1 font-semibold text-foreground">
                  {matriculado.apellido_nombre || "No informado"}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Especialidad
                </p>
                <p className="mt-1 text-sm text-foreground">
                  {matriculado.especialidad || "No informada"}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Localidad / Provincia
                </p>
                <p className="mt-1 text-sm text-foreground">
                  {[matriculado.localidad, matriculado.provincia]
                    .filter(Boolean)
                    .join(", ") || "No informado"}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Fecha de emisión
                </p>
                <p className="mt-1 text-sm text-foreground">
                  {formatearFecha(matriculado.fecha_emision)}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Vencimiento
                </p>
                <p className="mt-1 text-sm text-foreground">
                  {formatearFecha(matriculado.fecha_vencimiento)}
                </p>
              </div>

              {matriculado.telefono ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Teléfono profesional
                  </p>
                  <p className="mt-1 text-sm text-foreground">
                    {matriculado.telefono}
                  </p>
                </div>
              ) : null}
            </div>

            {!acreditacionActual ? (
              <div className="border-t border-border bg-muted/60 px-6 py-4 sm:px-8">
                <p className="text-sm font-semibold text-foreground">
                  Atención: este código pertenece a una acreditación anterior que fue liberada o reemplazada.
                </p>
              </div>
            ) : null}
          </div>

          <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
            Por razones de privacidad, esta verificación no muestra
            DNI, domicilio particular, correo electrónico ni
            observaciones administrativas.
          </p>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
