"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

const INTERVALO_ACTUALIZACION =
  5000

function hayCampoEnEdicion() {
  const activo =
    document.activeElement

  if (!activo) {
    return false
  }

  const etiqueta =
    activo.tagName.toLowerCase()

  return (
    etiqueta === "input" ||
    etiqueta === "textarea" ||
    etiqueta === "select" ||
    activo.getAttribute(
      "contenteditable",
    ) === "true"
  )
}

export default function AutoActualizarComunicaciones() {
  const router =
    useRouter()

  useEffect(() => {
    const intervalo =
      window.setInterval(() => {
        if (
          document.visibilityState !==
            "visible" ||
          hayCampoEnEdicion()
        ) {
          return
        }

        router.refresh()
      }, INTERVALO_ACTUALIZACION)

    return () => {
      window.clearInterval(
        intervalo,
      )
    }
  }, [router])

  return null
}
