"use client"

import { useState } from "react"
import { Mail, Send } from "lucide-react"

type EstadoEnvio = "idle" | "enviando" | "ok" | "error"

export function FormularioContacto() {
  const [estado, setEstado] = useState<EstadoEnvio>("idle")
  const [mensajeEstado, setMensajeEstado] = useState("")

  async function enviarFormulario(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const formulario = event.currentTarget
    const datos = new FormData(formulario)

    setEstado("enviando")
    setMensajeEstado("")

    try {
      const respuesta = await fetch("/api/contacto", {
        method: "POST",
        body: datos,
      })

      const resultado = await respuesta.json()

      if (!respuesta.ok) {
        throw new Error(
          resultado?.error || "No se pudo enviar la consulta."
        )
      }

      formulario.reset()
      setEstado("ok")
      setMensajeEstado(
        "Tu consulta fue enviada correctamente. RENACLI la recibirá para su revisión."
      )
    } catch (error) {
      setEstado("error")
      setMensajeEstado(
        error instanceof Error
          ? error.message
          : "No se pudo enviar la consulta."
      )
    }
  }

  return (
    <section
      id="contacto"
      className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14"
    >
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-7">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Mail className="size-5" aria-hidden="true" strokeWidth={1.75} />
          </span>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Contacto
            </p>

            <h2 className="mt-1 text-2xl font-bold text-foreground">
              Contacto con RENACLI
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Enviá tu consulta mediante este formulario. RENACLI recibirá el
              mensaje para su revisión y seguimiento.
            </p>
          </div>
        </div>

        <form onSubmit={enviarFormulario} className="mt-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-foreground">
                Nombre y apellido
              </span>

              <input
                type="text"
                name="nombre"
                required
                maxLength={120}
                autoComplete="name"
                className="w-full rounded-lg border border-input bg-background px-3 py-3 text-sm text-foreground outline-none transition focus:border-primary"
                placeholder="Nombre y apellido"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-foreground">
                Correo electrónico
              </span>

              <input
                type="email"
                name="email"
                required
                maxLength={160}
                autoComplete="email"
                className="w-full rounded-lg border border-input bg-background px-3 py-3 text-sm text-foreground outline-none transition focus:border-primary"
                placeholder="correo@ejemplo.com"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-foreground">
                Teléfono
              </span>

              <input
                type="tel"
                name="telefono"
                maxLength={40}
                autoComplete="tel"
                className="w-full rounded-lg border border-input bg-background px-3 py-3 text-sm text-foreground outline-none transition focus:border-primary"
                placeholder="Opcional"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-foreground">
                Motivo de la consulta
              </span>

              <select
                name="motivo"
                required
                defaultValue=""
                className="w-full rounded-lg border border-input bg-background px-3 py-3 text-sm text-foreground outline-none transition focus:border-primary"
              >
                <option value="" disabled>
                  Seleccioná una opción
                </option>
                <option value="matricula">Matrícula RENACLI</option>
                <option value="renovacion">Renovación</option>
                <option value="documentacion">Documentación</option>
                <option value="evaluacion">Evaluación</option>
                <option value="reclamo">Reclamo o inconveniente</option>
                <option value="instituciones">Instituciones</option>
                <option value="otro">Otro</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-foreground">
              Mensaje
            </span>

            <textarea
              name="mensaje"
              required
              minLength={5}
              maxLength={2000}
              rows={6}
              className="w-full resize-y rounded-lg border border-input bg-background px-3 py-3 text-sm text-foreground outline-none transition focus:border-primary"
              placeholder="Escribí tu consulta..."
            />
          </label>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="submit"
              disabled={estado === "enviando"}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send className="size-4" aria-hidden="true" />

              {estado === "enviando" ? "Enviando..." : "Enviar consulta"}
            </button>

            {mensajeEstado && (
              <p
                className={`text-sm ${
                  estado === "ok"
                    ? "text-green-700"
                    : estado === "error"
                      ? "text-red-700"
                      : "text-muted-foreground"
                }`}
              >
                {mensajeEstado}
              </p>
            )}
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground">
            Los datos ingresados serán utilizados únicamente para gestionar y
            responder la consulta enviada a RENACLI.
          </p>
        </form>
      </div>
    </section>
  )
}
