import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
import { createHash, timingSafeEqual } from "crypto"
import QRCode from "qrcode"
import { BotonPdfCarnet } from "@/components/boton-pdf-carnet"
import { crearUrlFirmadaFoto } from "@/lib/fotos"

const COOKIE_ADMIN = "renacli_admin_session"

type PageProps = {
  params: Promise<{ id: string }>
}

type CategoriaTecnica =
  | "base"
  | "inverter"
  | "superior"

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

function crearTokenAdmin(password: string) {
  return createHash("sha256")
    .update(password)
    .digest("hex")
}

async function adminAutorizado() {
  const cookieStore = await cookies()

  const sesion =
    cookieStore.get(COOKIE_ADMIN)?.value

  const password =
    process.env.RENACLI_ADMIN_PASSWORD

  if (!sesion || !password) {
    return false
  }

  const esperado =
    crearTokenAdmin(password)

  const a = Buffer.from(sesion)
  const b = Buffer.from(esperado)

  if (a.length !== b.length) {
    return false
  }

  return timingSafeEqual(a, b)
}

function formatearFecha(fecha: string | null) {
  if (!fecha) return "No informada"

  const [anio, mes, dia] = fecha.split("-")

  if (!anio || !mes || !dia) {
    return fecha
  }

  return `${dia}/${mes}/${anio}`
}

function obtenerEstadoEfectivo(
  estadoOriginal: string | null,
  fechaVencimiento: string | null,
) {
  const estadoNormalizado = (
    estadoOriginal || "vigente"
  )
    .trim()
    .toLowerCase()

  if (
    estadoNormalizado !== "vigente" ||
    !fechaVencimiento
  ) {
    return estadoNormalizado
  }

  const partes =
    fechaVencimiento
      .substring(0, 10)
      .split("-")

  if (partes.length !== 3) {
    return estadoNormalizado
  }

  const anio = Number(partes[0])
  const mes = Number(partes[1])
  const dia = Number(partes[2])

  if (
    !Number.isFinite(anio) ||
    !Number.isFinite(mes) ||
    !Number.isFinite(dia)
  ) {
    return estadoNormalizado
  }

  const ahora = new Date()

  const hoyUTC = Date.UTC(
    ahora.getFullYear(),
    ahora.getMonth(),
    ahora.getDate(),
  )

  const vencimientoUTC = Date.UTC(
    anio,
    mes - 1,
    dia,
  )

  if (vencimientoUTC < hoyUTC) {
    return "vencida"
  }

  return estadoNormalizado
}

function normalizarCategoria(
  categoria: string | null,
): CategoriaTecnica {
  const valor = (
    categoria || "base"
  )
    .trim()
    .toLowerCase()

  if (valor === "inverter") {
    return "inverter"
  }

  if (valor === "superior") {
    return "superior"
  }

  return "base"
}

function obtenerConfiguracionCategoria(
  categoria: CategoriaTecnica,
) {
  if (categoria === "inverter") {
    return {
      nombre: "INVERTER",
      descripcion:
        "Técnico con conocimientos en tecnología Inverter.",
      logo: "bg-emerald-800",
      titulo: "text-emerald-900",
      subtitulo: "text-emerald-700",
      destacado: "text-emerald-900",
      insignia:
        "border-emerald-200 bg-emerald-50 text-emerald-800",
      footer:
        "border-emerald-200 bg-emerald-50",
      footerTitulo: "text-emerald-900",
    }
  }

  if (categoria === "superior") {
    return {
      nombre: "SUPERIOR",
      descripcion:
        "Incluye conocimientos de categoría Base e Inverter, equipos piso-techo, sistemas centrales y cámaras frigoríficas.",
      logo: "bg-amber-700",
      titulo: "text-amber-800",
      subtitulo: "text-amber-700",
      destacado: "text-amber-800",
      insignia:
        "border-amber-300 bg-amber-50 text-amber-800",
      footer:
        "border-amber-200 bg-amber-50",
      footerTitulo: "text-amber-800",
    }
  }

  return {
    nombre: "BASE",
    descripcion:
      "Acreditación técnica Base RENACLI.",
    logo: "bg-blue-950",
    titulo: "text-blue-950",
    subtitulo: "text-blue-800",
    destacado: "text-blue-950",
    insignia:
      "border-blue-200 bg-blue-50 text-blue-900",
    footer:
      "border-slate-200 bg-slate-50",
    footerTitulo: "text-blue-950",
  }
}

export default async function CarnetPage({
  params,
}: PageProps) {
  const autorizado =
    await adminAutorizado()

  if (!autorizado) {
    redirect("/administrador")
  }

  const { id } = await params
  const matriculadoId = Number(id)

  if (
    !Number.isInteger(matriculadoId) ||
    matriculadoId <= 0
  ) {
    notFound()
  }

  const supabase =
    obtenerSupabaseAdmin()

  const {
    data: matriculado,
    error: errorMatriculado,
  } = await supabase
    .from("matriculados")
    .select(
      "id, numero_matricula, apellido_nombre, localidad, provincia, especialidad, telefono, foto_url, fecha_emision, fecha_ultima_acreditacion, fecha_vencimiento, estado, categoria_tecnica",
    )
    .eq("id", matriculadoId)
    .maybeSingle()

  if (
    errorMatriculado ||
    !matriculado ||
    !matriculado.numero_matricula
  ) {
    notFound()
  }

  const {
    data: codigoData,
    error: errorCodigo,
  } = await supabase.rpc(
    "obtener_codigo_qr_actual",
    {
      p_matriculado_id:
        matriculadoId,
    },
  )

  if (
    errorCodigo ||
    !codigoData ||
    codigoData.length === 0
  ) {
    notFound()
  }

  const {
    data: pdfVigente,
  } = await supabase
    .from("documentos_pdf_renacli")
    .select("codigo_documento")
    .eq(
      "matriculado_id",
      matriculadoId,
    )
    .eq("activo", true)
    .order("generado_en", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle()

  const codigoPdfVigente =
    pdfVigente?.codigo_documento ||
    null

  const codigo =
    codigoData[0]
      .codigo_verificacion as string

  const baseUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://www.renacli.com.ar"
  ).replace(/\/+$/, "")

  const urlVerificacion =
    `${baseUrl}/verificar/${codigo}`

  const qrDataUrl =
    await QRCode.toDataURL(
      urlVerificacion,
      {
        width: 420,
        margin: 1,
        errorCorrectionLevel: "M",
      },
    )

  const fechaEmisionCredencial =
    matriculado
      .fecha_ultima_acreditacion ||
    matriculado.fecha_emision

  const estadoEfectivo =
    obtenerEstadoEfectivo(
      matriculado.estado,
      matriculado.fecha_vencimiento,
    )

  const fotoUrlFirmada =
    matriculado.foto_url
      ? await crearUrlFirmadaFoto(
          matriculado.foto_url,
          300,
        )
      : null

  const categoria =
    normalizarCategoria(
      matriculado.categoria_tecnica,
    )

  const estiloCategoria =
    obtenerConfiguracionCategoria(
      categoria,
    )

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

          <BotonPdfCarnet
            matriculadoId={
              matriculadoId
            }
            numeroMatricula={
              matriculado.numero_matricula
            }
            codigoPdfVigente={
              codigoPdfVigente
            }
          />
        </div>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl print:shadow-none">
          <header className="border-b border-slate-200 px-7 py-7 sm:px-10">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-2xl text-3xl font-black text-white ${estiloCategoria.logo}`}
                >
                  R
                </div>

                <div>
                  <h1
                    className={`text-4xl font-black tracking-wide ${estiloCategoria.titulo}`}
                  >
                    RENACLI
                  </h1>

                  <p className="mt-1 text-sm font-bold uppercase tracking-wider text-slate-600">
                    Registro Nacional de
                    Climatización y
                    Refrigeración
                  </p>
                </div>
              </div>

              <div
                className={`rounded-full border px-4 py-2 text-sm font-black tracking-wider ${estiloCategoria.insignia}`}
              >
                CATEGORÍA{" "}
                {estiloCategoria.nombre}
              </div>
            </div>
          </header>

          <div className="grid gap-8 p-7 sm:grid-cols-[1fr_240px] sm:p-10">
            <div>
              <p
                className={`text-xs font-bold uppercase tracking-widest ${estiloCategoria.subtitulo}`}
              >
                Credencial de técnico
                matriculado
              </p>

              <h2 className="mt-3 text-3xl font-black">
                {
                  matriculado
                    .apellido_nombre
                }
              </h2>

              <div
                className={`mt-5 rounded-xl border px-4 py-3 text-sm font-semibold leading-relaxed ${estiloCategoria.insignia}`}
              >
                <span className="font-black">
                  Categoría{" "}
                  {estiloCategoria.nombre}:
                </span>{" "}
                {
                  estiloCategoria.descripcion
                }
              </div>

              <div className="mt-7 grid gap-5 sm:grid-cols-2">
                <Dato
                  titulo="Matrícula"
                  valor={
                    matriculado
                      .numero_matricula
                  }
                  destacado
                  destacadoClass={
                    estiloCategoria.destacado
                  }
                />

                <Dato
                  titulo="Categoría técnica"
                  valor={
                    estiloCategoria.nombre
                  }
                />

                <Dato
                  titulo="Estado"
                  valor={estadoEfectivo.toUpperCase()}
                />

                <Dato
                  titulo="Especialidad"
                  valor={
                    matriculado.especialidad ||
                    "No informada"
                  }
                />

                <Dato
                  titulo="Localidad / Provincia"
                  valor={
                    [
                      matriculado.localidad,
                      matriculado.provincia,
                    ]
                      .filter(Boolean)
                      .join(", ") ||
                    "No informado"
                  }
                />

                <Dato
                  titulo="Emisión"
                  valor={formatearFecha(
                    fechaEmisionCredencial,
                  )}
                />

                <Dato
                  titulo="Vencimiento"
                  valor={formatearFecha(
                    matriculado
                      .fecha_vencimiento,
                  )}
                />

                {matriculado.telefono ? (
                  <Dato
                    titulo="Teléfono"
                    valor={
                      matriculado.telefono
                    }
                  />
                ) : null}
              </div>
            </div>

            <aside className="flex flex-col items-center justify-start">
              {fotoUrlFirmada ? (
                <img
                  src={fotoUrlFirmada}
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
                Escanee para verificar
                la matrícula
              </p>
            </aside>
          </div>

          <footer
            className={`border-t px-7 py-5 text-center sm:px-10 ${estiloCategoria.footer}`}
          >
            <p
              className={`text-sm font-bold ${estiloCategoria.footerTitulo}`}
            >
              RENACLI · Registro
              Nacional de
              Climatización y
              Refrigeración
            </p>

            <p className="mt-1 text-xs text-slate-600">
              La autenticidad de esta
              credencial se verifica
              mediante su código QR
              único.
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
  destacadoClass =
    "text-blue-950",
}: {
  titulo: string
  valor: string
  destacado?: boolean
  destacadoClass?: string
}) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
        {titulo}
      </p>

      <p
        className={
          destacado
            ? `mt-1 text-xl font-black ${destacadoClass}`
            : "mt-1 text-base font-semibold text-slate-900"
        }
      >
        {valor}
      </p>
    </div>
  )
}
