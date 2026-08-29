import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
import QRCode from "qrcode"

const COOKIE_ADMIN = "renacli_admin_session"

type PageProps = {
  params: Promise<{ id: string }>
}

function obtenerSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secretKey = process.env.SUPABASE_SECRET_KEY

  if (!url || !secretKey) {
    throw new Error("Faltan las variables de entorno de Supabase.")
  }

  return createClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

function formatearFecha(fecha: string | null) {
  if (!fecha) return "No informada"

  const [anio, mes, dia] = fecha.split("-")

  if (!anio || !mes || !dia) {
    return fecha
  }

  return `${dia}/${mes}/${anio}`
}

export default async function CarnetPage({ params }: PageProps) {
  const cookieStore = await cookies()
  const sesion = cookieStore.get(COOKIE_ADMIN)?.value

  if (!sesion) {
    redirect("/administrador")
  }

  const { id } = await params
  const matriculadoId = Number(id)

  if (!Number.isInteger(matriculadoId) || matriculadoId <= 0) {
    notFound()
  }

  const supabase = obtenerSupabaseAdmin()

  const { data: matriculado, error: errorMatriculado } = await supabase
    .from("matriculados")
    .select(
      "id, numero_matricula, apellido_nombre, localidad, provincia, especialidad, telefono, foto_url, fecha_emision, fecha_vencimiento, estado",
    )
    .eq("id", matriculadoId)
    .maybeSingle()

  if (errorMatriculado || !matriculado || !matriculado.numero_matricula) {
    notFound()
  }

  const { data: codigoData, error: errorCodigo } = await supabase.rpc(
    "obtener_codigo_qr_actual",
    {
      p_matriculado_id: matriculadoId,
    },
  )

  if (errorCodigo || !codigoData || codigoData.length === 0) {
    notFound()
  }

  const codigo = codigoData[0].codigo_verificacion as string
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://renacli-web.vercel.app"

  const urlVerificacion = `${baseUrl}/verificar/${codigo}`

  const qrDataUrl = await QRCode.toDataURL(urlVerificacion, {
    width: 420,
    margin: 1,
    errorCorrectionLevel: "M",
  })

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <a
            href="/administrador"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold"
          >
            Volver al administrador
          </a>

          <p className="text-sm text-slate-600">
            Para imprimir o guardar como PDF, use Ctrl+P.
          </p>
        </div>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl print:shadow-none">
          <header className="border-b border-slate-200 px-7 py-7 sm:px-10">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-950 text-3xl font-black text-white">
                R
              </div>

              <div>
                <h1 className="text-4xl font-black tracking-wide text-blue-950">
                  RENACLI
                </h1>

                <p className="mt-1 text-sm font-bold uppercase tracking-wider text-slate-600">
                  Registro Nacional de Climatización y Refrigeración
                </p>
              </div>
            </div>
          </header>

          <div className="grid gap-8 p-7 sm:grid-cols-[1fr_240px] sm:p-10">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-blue-800">
                Credencial de técnico matriculado
              </p>

              <h2 className="mt-3 text-3xl font-black">
                {matriculado.apellido_nombre}
              </h2>

              <div className="mt-7 grid gap-5 sm:grid-cols-2">
                <Dato
                  titulo="Matrícula"
                  valor={matriculado.numero_matricula}
                  destacado
                />

                <Dato
                  titulo="Estado"
                  valor={(matriculado.estado || "vigente").toUpperCase()}
                />

                <Dato
                  titulo="Especialidad"
                  valor={matriculado.especialidad || "No informada"}
                />

                <Dato
                  titulo="Localidad / Provincia"
                  valor={
                    [matriculado.localidad, matriculado.provincia]
                      .filter(Boolean)
                      .join(", ") || "No informado"
                  }
                />

                <Dato
                  titulo="Emisión"
                  valor={formatearFecha(matriculado.fecha_emision)}
                />

                <Dato
                  titulo="Vencimiento"
                  valor={formatearFecha(matriculado.fecha_vencimiento)}
                />

                {matriculado.telefono ? (
                  <Dato
                    titulo="Teléfono"
                    valor={matriculado.telefono}
                  />
                ) : null}
              </div>
            </div>

            <aside className="flex flex-col items-center justify-start">
              {matriculado.foto_url ? (
                <img
                  src={matriculado.foto_url}
                  alt={`Foto de ${matriculado.apellido_nombre}`}
                  className="mb-5 h-44 w-36 rounded-xl border border-slate-200 object-cover"
                />
              ) : (
                <div className="mb-5 flex h-44 w-36 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 text-center text-xs text-slate-500">
                  Foto no cargada
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <img
                  src={qrDataUrl}
                  alt="Código QR de verificación"
                  className="h-48 w-48"
                />
              </div>

              <p className="mt-3 text-center text-xs font-semibold text-slate-600">
                Escanee para verificar la matrícula
              </p>
            </aside>
          </div>

          <footer className="border-t border-slate-200 bg-slate-50 px-7 py-5 text-center sm:px-10">
            <p className="text-sm font-bold text-blue-950">
              RENACLI · Registro Nacional de Climatización y Refrigeración
            </p>

            <p className="mt-1 text-xs text-slate-600">
              La autenticidad de esta credencial se verifica mediante su código QR único.
            </p>
          </footer>
        </section>
      </div>
    </main>
  )
}

function Dato({
  titulo,
  valor,
  destacado = false,
}: {
  titulo: string
  valor: string
  destacado?: boolean
}) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
        {titulo}
      </p>

      <p
        className={
          destacado
            ? "mt-1 text-xl font-black text-blue-950"
            : "mt-1 text-base font-semibold text-slate-900"
        }
      >
        {valor}
      </p>
    </div>
  )
}
