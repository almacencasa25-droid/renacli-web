"use client"

import { useEffect, useState } from "react"

type BotonPdfCarnetProps = {
  matriculadoId: number
  numeroMatricula: string
}

export function BotonPdfCarnet({
  matriculadoId,
  numeroMatricula,
}: BotonPdfCarnetProps) {
  const [generando, setGenerando] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl)
      }
    }
  }, [pdfUrl])

  async function generarPdf() {
    setGenerando(true)
    setError("")

    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl)
      setPdfUrl(null)
    }

    try {
      const respuesta = await fetch(
        `/api/carnet-pdf/${matriculadoId}`,
        {
          method: "GET",
          cache: "no-store",
        },
      )

      if (!respuesta.ok) {
        let mensaje =
          "No se pudo generar el PDF de la credencial."

        try {
          const datos = await respuesta.json()
          if (datos?.error) {
            mensaje = datos.error
          }
        } catch {
          // Si no hay JSON válido, usamos el mensaje general.
        }

        throw new Error(mensaje)
      }

      const blob = await respuesta.blob()
      const url = URL.createObjectURL(blob)

      setPdfUrl(url)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo generar el PDF.",
      )
    } finally {
      setGenerando(false)
    }
  }

  const nombreArchivo =
    `Credencial-RENACLI-${numeroMatricula}.pdf`

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <button
        type="button"
        onClick={generarPdf}
        disabled={generando}
        className="rounded-lg bg-blue-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {generando
          ? "Generando PDF..."
          : "Generar PDF firmado"}
      </button>

      {pdfUrl ? (
        <a
          href={pdfUrl}
          download={nombreArchivo}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-800"
        >
          Descargar PDF
        </a>
      ) : null}

      {error ? (
        <p className="basis-full text-right text-sm font-semibold text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  )
}
