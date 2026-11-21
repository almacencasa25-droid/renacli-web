"use client"

import { useEffect } from "react"

// Mantiene el lugar de lectura al refrescar, filtrar, confirmar o eliminar.
// El almacenamiento es por pestaña y no incluye información del aspirante.
export function ConservarPosicionEvaluaciones() {
  useEffect(() => {
    const clave = "renacli:posicion:" + window.location.pathname
    const anterior = window.history.scrollRestoration
    window.history.scrollRestoration = "manual"

    let pendiente = 0
    let restaurando = true
    const guardar = () => {
      if (!restaurando) {
        window.sessionStorage.setItem(clave, String(window.scrollY))
      }
    }
    const guardarEnScroll = () => {
      if (restaurando || pendiente) return
      pendiente = window.requestAnimationFrame(() => {
        pendiente = 0
        guardar()
      })
    }
    const guardado = Number(window.sessionStorage.getItem(clave))
    const posicion = Number.isFinite(guardado) && guardado >= 0 ? guardado : 0

    // Esperar al primer diseño evita que se pierda la restauración por la
    // hidratación de Next.js. No se utiliza desplazamiento suave.
    const primerFrame = window.requestAnimationFrame(() => {
      const segundoFrame = window.requestAnimationFrame(() => {
        window.scrollTo({ top: posicion, behavior: "auto" })
        restaurando = false
      })
      pendiente = segundoFrame
    })
    window.addEventListener("scroll", guardarEnScroll, { passive: true })
    window.addEventListener("pagehide", guardar)
    window.addEventListener("beforeunload", guardar)

    return () => {
      window.removeEventListener("scroll", guardarEnScroll)
      window.removeEventListener("pagehide", guardar)
      window.removeEventListener("beforeunload", guardar)
      window.cancelAnimationFrame(primerFrame)
      if (pendiente) window.cancelAnimationFrame(pendiente)
      window.history.scrollRestoration = anterior
    }
  }, [])

  return null
}
