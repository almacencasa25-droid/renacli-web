import Link from "next/link"
import { createClient } from "@supabase/supabase-js"

type PageProps = {
  params: Promise<{
    codigo: string
  }>
}

type DocumentoVerificado = {
  codigo_documento: string
  numero_matricula: string
  estado_documento: string | null
  fecha_emision: string | null
  fecha_vencimiento: string | null
  generado_en: string
  activo: boolean
}

function obtenerSupabaseServidor() {
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

function formatearFecha(fecha: string | null) {
  if (!fecha) return "-"

  const partes = fecha.slice(0, 10).split("-")

  if (partes.length !== 3) {
    return fecha
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`
}

function formatearFechaHora(fecha: string) {
  return new Date(fecha).toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
  })
}

export default async function VerificarDocumentoPage({
  params,
}: PageProps) {
  const { codigo } = await params
  const codigoNormalizado = decodeURIComponent(codigo)
    .trim()
    .toUpperCase()

  const supabase = obtenerSupabaseServidor()

  const {
    data,
    error,
  } = await supabase.rpc(
    "verificar_documento_pdf_renacli",
    {
      p_codigo_documento: codigoNormalizado,
    },
  )

  const documento =
    !error &&
    Array.isArray(data) &&
    data.length > 0
      ? (data[0] as DocumentoVerificado)
      : null

  if (!documento) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#eef5fa",
          fontFamily: "Arial, sans-serif",
          color: "#172033",
        }}
      >
        <header
          style={{
            background: "#0d4f7c",
            color: "white",
            padding: "24px 28px",
            borderBottom: "4px solid #35c4cf",
          }}
        >
          <div
            style={{
              maxWidth: "820px",
              margin: "0 auto",
            }}
          >
            <h1
              style={{
                margin: 0,
                letterSpacing: "4px",
              }}
            >
              RENACLI
            </h1>

            <p
              style={{
                margin: "6px 0 0",
              }}
            >
              Verificación de documento
            </p>
          </div>
        </header>

        <section
          style={{
            maxWidth: "820px",
            margin: "42px auto",
            padding: "0 20px",
          }}
        >
          <div
            style={{
              background: "white",
              border: "1px solid #fecaca",
              borderRadius: "16px",
              padding: "28px",
              boxShadow:
                "0 4px 14px rgba(15,23,42,0.06)",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                borderRadius: "999px",
                padding: "7px 11px",
                background: "#fee2e2",
                color: "#991b1b",
                fontSize: "12px",
                fontWeight: "bold",
              }}
            >
              DOCUMENTO NO RECONOCIDO
            </div>

            <h2
              style={{
                marginTop: "18px",
                marginBottom: "8px",
              }}
            >
              No se encontró un documento RENACLI con ese código
            </h2>

            <p
              style={{
                color: "#475569",
                lineHeight: 1.6,
              }}
            >
              El código consultado no figura entre los documentos PDF
              registrados como emitidos por RENACLI.
            </p>

            <div
              style={{
                marginTop: "18px",
                padding: "14px",
                borderRadius: "10px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                fontFamily: "monospace",
                wordBreak: "break-all",
              }}
            >
              {codigoNormalizado || "Sin código"}
            </div>

            <Link
              href="/"
              style={{
                display: "inline-block",
                marginTop: "22px",
                padding: "11px 16px",
                borderRadius: "9px",
                background: "#0d5689",
                color: "white",
                textDecoration: "none",
                fontWeight: "bold",
              }}
            >
              Volver a RENACLI
            </Link>
          </div>
        </section>
      </main>
    )
  }

  const documentoActivo =
    documento.activo === true

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#eef5fa",
        fontFamily: "Arial, sans-serif",
        color: "#172033",
      }}
    >
      <header
        style={{
          background: "#0d4f7c",
          color: "white",
          padding: "24px 28px",
          borderBottom: "4px solid #35c4cf",
        }}
      >
        <div
          style={{
            maxWidth: "820px",
            margin: "0 auto",
          }}
        >
          <h1
            style={{
              margin: 0,
              letterSpacing: "4px",
            }}
          >
            RENACLI
          </h1>

          <p
            style={{
              margin: "6px 0 0",
            }}
          >
            Verificación de documento
          </p>
        </div>
      </header>

      <section
        style={{
          maxWidth: "820px",
          margin: "42px auto",
          padding: "0 20px",
        }}
      >
        <div
          style={{
            background: "white",
            border: documentoActivo
              ? "1px solid #bbf7d0"
              : "1px solid #fecaca",
            borderRadius: "16px",
            padding: "28px",
            boxShadow:
              "0 4px 14px rgba(15,23,42,0.06)",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              borderRadius: "999px",
              padding: "7px 11px",
              background: documentoActivo
                ? "#dcfce7"
                : "#fee2e2",
              color: documentoActivo
                ? "#166534"
                : "#991b1b",
              fontSize: "12px",
              fontWeight: "bold",
            }}
          >
            {documentoActivo
              ? "DOCUMENTO EMITIDO POR RENACLI · ACTIVO"
              : "DOCUMENTO EMITIDO POR RENACLI · ANULADO"}
          </div>

          <h2
            style={{
              marginTop: "18px",
              marginBottom: "8px",
            }}
          >
            Credencial PDF registrada
          </h2>

          <p
            style={{
              color: "#475569",
              lineHeight: 1.6,
            }}
          >
            Este código corresponde a un documento PDF que fue
            registrado por el sistema RENACLI al momento de su
            generación.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(210px,1fr))",
              gap: "14px",
              marginTop: "24px",
            }}
          >
            <Dato
              titulo="Código del documento"
              valor={documento.codigo_documento}
            />

            <Dato
              titulo="Matrícula"
              valor={documento.numero_matricula}
            />

            <Dato
              titulo="Estado al emitir"
              valor={
                documento.estado_documento ||
                "-"
              }
            />

            <Dato
              titulo="Fecha de emisión"
              valor={formatearFecha(
                documento.fecha_emision,
              )}
            />

            <Dato
              titulo="Vencimiento"
              valor={formatearFecha(
                documento.fecha_vencimiento,
              )}
            />

            <Dato
              titulo="Documento generado"
              valor={formatearFechaHora(
                documento.generado_en,
              )}
            />
          </div>

          {!documentoActivo ? (
            <div
              style={{
                marginTop: "22px",
                padding: "14px",
                borderRadius: "10px",
                background: "#fff1f2",
                border: "1px solid #fecdd3",
                color: "#9f1239",
                fontWeight: "bold",
                lineHeight: 1.5,
              }}
            >
              Este documento figura como anulado en RENACLI.
            </div>
          ) : null}

          <div
            style={{
              marginTop: "24px",
              padding: "14px",
              borderRadius: "10px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              color: "#475569",
              fontSize: "13px",
              lineHeight: 1.55,
            }}
          >
            Esta verificación confirma que el código consultado
            corresponde a un PDF registrado por RENACLI. La vigencia
            actual de la matrícula debe verificarse por separado en el
            verificador de matrícula.
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
              marginTop: "22px",
            }}
          >
            <Link
              href={`/matriculado/${encodeURIComponent(
                documento.numero_matricula,
              )}`}
              style={{
                display: "inline-block",
                padding: "11px 16px",
                borderRadius: "9px",
                background: "#0d5689",
                color: "white",
                textDecoration: "none",
                fontWeight: "bold",
              }}
            >
              Verificar matrícula actual
            </Link>

            <Link
              href="/"
              style={{
                display: "inline-block",
                padding: "11px 16px",
                borderRadius: "9px",
                background: "white",
                border: "1px solid #cbd5e1",
                color: "#172033",
                textDecoration: "none",
                fontWeight: "bold",
              }}
            >
              Volver al inicio
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}

function Dato({
  titulo,
  valor,
}: {
  titulo: string
  valor: string
}) {
  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: "10px",
        padding: "14px",
        background: "#f8fafc",
      }}
    >
      <div
        style={{
          color: "#64748b",
          fontSize: "11px",
          fontWeight: "bold",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {titulo}
      </div>

      <div
        style={{
          marginTop: "6px",
          color: "#172033",
          fontWeight: "bold",
          wordBreak: "break-word",
        }}
      >
        {valor}
      </div>
    </div>
  )
}
