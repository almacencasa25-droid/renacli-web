"use client"

import { useActionState, useState } from "react"

type EstadoClave = {
  ok: boolean
  mensaje: string
}

type Props = {
  matriculadoId: number
  numeroMatricula: string
  action: (
    estadoAnterior: EstadoClave,
    formData: FormData
  ) => Promise<EstadoClave>
}

const estadoInicial: EstadoClave = {
  ok: false,
  mensaje: "",
}

function generarClaveSegura() {
  const caracteres =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"

  const valores = new Uint32Array(10)
  crypto.getRandomValues(valores)

  return Array.from(
    valores,
    (valor) => caracteres[valor % caracteres.length]
  ).join("")
}

export default function ClaveAppTecnico({
  matriculadoId,
  numeroMatricula,
  action,
}: Props) {
  const [clave, setClave] = useState("")
  const [copiado, setCopiado] = useState(false)
  const [estado, formAction, pendiente] = useActionState(
    action,
    estadoInicial
  )

  function nuevaClave() {
    setClave(generarClaveSegura())
    setCopiado(false)
  }

  async function copiarClave() {
    if (!clave) return

    try {
      await navigator.clipboard.writeText(clave)
      setCopiado(true)
      window.setTimeout(() => setCopiado(false), 1800)
    } catch {
      setCopiado(false)
    }
  }

  return (
    <div
      style={{
        margin: "0 0 22px",
        padding: "16px",
        border: "1px solid #bfdbfe",
        borderRadius: "12px",
        background: "#eff6ff",
      }}
    >
      <p
        style={{
          margin: 0,
          color: "#1e40af",
          fontSize: "12px",
          fontWeight: "bold",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        Acceso a la app del técnico
      </p>

      <p
        style={{
          margin: "6px 0 0",
          color: "#172033",
          fontWeight: "bold",
        }}
      >
        Generar o reemplazar clave
      </p>

      <p
        style={{
          margin: "7px 0 14px",
          color: "#475569",
          fontSize: "13px",
          lineHeight: 1.45,
        }}
      >
        Matrícula: <strong>{numeroMatricula}</strong>. Al guardar una
        nueva clave se desvincula el teléfono anterior y el técnico podrá
        vincular un nuevo dispositivo.
      </p>

      <form action={formAction}>
        <input
          type="hidden"
          name="matriculado_id"
          value={matriculadoId}
        />

        <input
          type="hidden"
          name="clave"
          value={clave}
        />

        <div
          style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <input
            value={clave}
            readOnly
            placeholder="Primero generá una clave"
            aria-label="Nueva clave de acceso"
            style={{
              flex: "1 1 210px",
              minWidth: 0,
              border: "1px solid #cbd5e1",
              borderRadius: "9px",
              padding: "10px 12px",
              background: "white",
              color: "#172033",
              fontSize: "15px",
              fontWeight: "bold",
              letterSpacing: "0.04em",
            }}
          />

          <button
            type="button"
            onClick={nuevaClave}
            style={{
              border: "1px solid #2563eb",
              borderRadius: "9px",
              padding: "10px 13px",
              background: "white",
              color: "#1d4ed8",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Generar nueva clave
          </button>

          <button
            type="button"
            onClick={copiarClave}
            disabled={!clave}
            style={{
              border: "1px solid #cbd5e1",
              borderRadius: "9px",
              padding: "10px 13px",
              background: "white",
              color: clave ? "#334155" : "#94a3b8",
              fontWeight: "bold",
              cursor: clave ? "pointer" : "not-allowed",
            }}
          >
            {copiado ? "Copiada" : "Copiar"}
          </button>
        </div>

        <button
          type="submit"
          disabled={!clave || pendiente}
          style={{
            marginTop: "12px",
            border: 0,
            borderRadius: "9px",
            padding: "10px 14px",
            background:
              !clave || pendiente ? "#94a3b8" : "#2563eb",
            color: "white",
            fontWeight: "bold",
            cursor:
              !clave || pendiente ? "not-allowed" : "pointer",
          }}
        >
          {pendiente
            ? "Guardando..."
            : "Guardar / reemplazar clave"}
        </button>

        {estado.mensaje && (
          <p
            style={{
              margin: "12px 0 0",
              padding: "10px 12px",
              borderRadius: "9px",
              background: estado.ok ? "#dcfce7" : "#fee2e2",
              color: estado.ok ? "#166534" : "#991b1b",
              fontSize: "13px",
              fontWeight: "bold",
            }}
          >
            {estado.mensaje}
          </p>
        )}

        <p
          style={{
            margin: "10px 0 0",
            color: "#64748b",
            fontSize: "12px",
            lineHeight: 1.45,
          }}
        >
          Importante: copiá o anotá la clave antes de salir de esta
          pantalla. RENACLI guarda solamente su versión protegida y no
          puede mostrarla nuevamente.
        </p>
      </form>
    </div>
  )
}
