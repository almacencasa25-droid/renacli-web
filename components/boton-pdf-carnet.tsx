"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

type BotonPdfCarnetProps = {
  matriculadoId: number
  numeroMatricula: string
  codigoPdfVigente?: string | null
}

export function BotonPdfCarnet({
  matriculadoId,
  numeroMatricula,
  codigoPdfVigente = null,
}: BotonPdfCarnetProps) {
  const router = useRouter()

  const [generando, setGenerando] =
    useState(false)

  const [pdfUrl, setPdfUrl] =
    useState<string | null>(null)

  const [error, setError] =
    useState("")

  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl)
      }
    }
  }, [pdfUrl])

  async function generarPdf() {
    if (codigoPdfVigente) {
      const confirmar = window.confirm(
        "Ya existe un PDF vigente para este técnico.\n\n" +
          "Si genera uno nuevo, el PDF vigente actual será anulado.\n\n" +
          "¿Desea generar un nuevo PDF?",
      )

      if (!confirmar) {
        return
      }
    }

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
          const datos =
            await respuesta.json()

          if (datos?.error) {
            mensaje = datos.error
          }
        } catch {
          // Se mantiene el mensaje general.
        }

        throw new Error(mensaje)
      }

      const blob =
        await respuesta.blob()

      const url =
        URL.createObjectURL(blob)

      setPdfUrl(url)

      router.refresh()
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
      {codigoPdfVigente ? (
        <a
          href={`/verificar-documento/${encodeURIComponent(
            codigoPdfVigente,
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-blue-950 bg-white px-4 py-2 text-sm font-bold text-blue-950 transition hover:bg-blue-50"
        >
          Ver PDF vigente
        </a>
      ) : null}

      <button
        type="button"
        onClick={generarPdf}
        disabled={generando}
        className="rounded-lg bg-blue-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {generando
          ? "Generando PDF..."
          : codigoPdfVigente
            ? "Generar otro PDF"
            : "Generar PDF"}
      </button>

      {pdfUrl ? (
        <a
          href={pdfUrl}
          download={nombreArchivo}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-800"
        >
          Descargar nuevo PDF
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
