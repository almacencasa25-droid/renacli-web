"use client"

import type { FormEvent } from "react"

type Props = {
  id: number
  action: (formData: FormData) => Promise<void>
}

export default function BotonCerrarTramite({ id, action }: Props) {
  function confirmarCierre(event: FormEvent<HTMLFormElement>) {
    const confirmado = window.confirm(
      "¿Deseás cerrar este trámite?\n\n" +
        "El trámite saldrá de pendientes y pasará al archivo de trámites terminados.\n\n" +
        "Presioná Aceptar para cerrarlo o Cancelar para continuar con el trámite."
    )

    if (!confirmado) {
      event.preventDefault()
    }
  }

  return (
    <form
      action={action}
      onSubmit={confirmarCierre}
      style={{
        marginTop: "14px",
        paddingTop: "14px",
        borderTop: "1px solid #e2e8f0",
      }}
    >
      <input type="hidden" name="id" value={id} />

      <button
        type="submit"
        style={{
          padding: "10px 15px",
          borderRadius: "8px",
          border: 0,
          background: "#475569",
          color: "white",
          fontWeight: "bold",
          cursor: "pointer",
        }}
      >
        Trámite terminado
      </button>

      <p
        style={{
          margin: "7px 0 0",
          color: "#64748b",
          fontSize: "12px",
        }}
      >
        Usalo únicamente cuando ya terminaste la gestión. El trámite saldrá de
        pendientes y pasará automáticamente al archivo de trámites terminados.
      </p>
    </form>
  )
}
