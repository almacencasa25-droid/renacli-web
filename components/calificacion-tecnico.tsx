"use client"

import { useMemo, useState } from "react"
import { Star } from "lucide-react"

type Reputacion = {
  totalCalificaciones: number
  promedioEstrellas: number | null
  porcentajeValoracion: number | null
  mostrarPublicamente: boolean
}

type Props = {
  matricula: string
  reputacionInicial?: Reputacion
}

type EstadoEnvio = "idle" | "enviando" | "ok" | "error"

export function CalificacionTecnico({
  matricula,
  reputacionInicial,
}: Props) {
  const [puntuacion, setPuntuacion] = useState(0)
  const [hover, setHover] = useState(0)
  const [estado, setEstado] = useState<EstadoEnvio>("idle")
  const [mensaje, setMensaje] = useState("")

  const [reputacion, setReputacion] = useState<Reputacion>(
    reputacionInicial ?? {
      totalCalificaciones: 0,
      promedioEstrellas: null,
      porcentajeValoracion: null,
      mostrarPublicamente: false,
    }
  )

  const valorVisual = hover || puntuacion

  const estrellasPromedio = useMemo(() => {
    if (
      !reputacion.mostrarPublicamente ||
      reputacion.promedioEstrellas == null
    ) {
      return 0
    }

    return Math.max(0, Math.min(5, reputacion.promedioEstrellas))
  }, [reputacion])

  async function enviarCalificacion(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    if (puntuacion < 1 || puntuacion > 5) {
      setEstado("error")
      setMensaje("Seleccioná una calificación de 1 a 5 estrellas.")
      return
    }

    const formulario = event.currentTarget
    const datos = new FormData(formulario)

    datos.set("matricula", matricula)
    datos.set("puntuacion", String(puntuacion))

    setEstado("enviando")
    setMensaje("")

    try {
      const respuesta = await fetch("/api/calificaciones", {
        method: "POST",
        body: datos,
      })

      const resultado = await respuesta.json()

      if (!respuesta.ok) {
        throw new Error(
          resultado?.error ||
            "No se pudo registrar la calificación."
        )
      }

      if (resultado?.reputacion) {
        setReputacion(resultado.reputacion)
      }

      formulario.reset()
      setPuntuacion(0)
      setHover(0)
      setEstado("ok")
      setMensaje("Tu calificación fue registrada correctamente.")

      window.setTimeout(() => {
        window.location.href = "/"
      }, 1500)
    } catch (error) {
      setEstado("error")

      setMensaje(
        error instanceof Error
          ? error.message
          : "No se pudo registrar la calificación."
      )
    }
  }

  return (
    <section
      id="calificacion"
      className="mt-6 scroll-mt-24 rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6"
    >
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Valoración del técnico
        </p>

        <h2 className="mt-1 text-xl font-bold text-foreground">
          Calificá tu experiencia
        </h2>

        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Si recibiste un trabajo de este técnico, podés dejar una
          valoración de 1 a 5 estrellas.
        </p>
      </div>

      <form
        onSubmit={enviarCalificacion}
        className="mt-5 space-y-4"
      >
        <div>
          <span className="mb-2 block text-sm font-semibold text-foreground">
            Tu calificación
          </span>

          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((valor) => {
              const activa = valor <= valorVisual

              return (
                <button
                  key={valor}
                  type="button"
                  onClick={() => setPuntuacion(valor)}
                  onMouseEnter={() => setHover(valor)}
                  onMouseLeave={() => setHover(0)}
                  className="rounded-md p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`${valor} estrella${
                    valor === 1 ? "" : "s"
                  }`}
                >
                  <Star
                    className={`size-8 transition ${
                      activa
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground/40"
                    }`}
                    strokeWidth={1.5}
                  />
                </button>
              )
            })}
          </div>

          {puntuacion > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              Seleccionaste {puntuacion} de 5 estrellas.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-foreground">
              Nombre
            </span>

            <input
              type="text"
              name="nombreCliente"
              maxLength={120}
              className="w-full rounded-lg border border-input bg-background px-3 py-3 text-sm text-foreground outline-none transition focus:border-primary"
              placeholder="Opcional"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-foreground">
              Correo electrónico
            </span>

            <input
              type="email"
              name="emailCliente"
              required
              maxLength={160}
              autoComplete="email"
              className="w-full rounded-lg border border-input bg-background px-3 py-3 text-sm text-foreground outline-none transition focus:border-primary"
              placeholder="correo@ejemplo.com"
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-foreground">
            Comentario
          </span>

          <textarea
            name="comentario"
            maxLength={1000}
            rows={4}
            className="w-full resize-y rounded-lg border border-input bg-background px-3 py-3 text-sm text-foreground outline-none transition focus:border-primary"
            placeholder="Opcional"
          />
        </label>

        <button
          type="submit"
          disabled={estado === "enviando"}
          className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {estado === "enviando"
            ? "Enviando..."
            : "Enviar calificación"}
        </button>

        {mensaje && (
          <p
            className={`text-sm ${
              estado === "ok"
                ? "text-green-700"
                : estado === "error"
                  ? "text-red-700"
                  : "text-muted-foreground"
            }`}
          >
            {mensaje}
          </p>
        )}

        <p className="text-xs leading-relaxed text-muted-foreground">
          El correo electrónico se utiliza únicamente para controlar
          duplicaciones de votos y no se publica.
        </p>
      </form>

      <div className="mt-6 border-t border-border pt-5">
        <p className="text-sm font-semibold text-foreground">
          Reputación pública
        </p>

        {reputacion.mostrarPublicamente ? (
          <div className="mt-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((valor) => {
                  const activa =
                    valor <= Math.round(estrellasPromedio)

                  return (
                    <Star
                      key={valor}
                      className={`size-6 ${
                        activa
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground/35"
                      }`}
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                  )
                })}
              </div>

              <span className="text-sm font-bold text-foreground">
                {reputacion.promedioEstrellas?.toFixed(2)} / 5
              </span>

              <span className="text-sm font-semibold text-primary">
                {reputacion.porcentajeValoracion}% positivo
              </span>
            </div>

            <p className="mt-2 text-xs text-muted-foreground">
              Basado en {reputacion.totalCalificaciones} calificaciones.
            </p>
          </div>
        ) : (
          <div className="mt-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((valor) => (
                <Star
                  key={valor}
                  className="size-5 text-muted-foreground/30"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              ))}
            </div>

            <p className="mt-2 text-sm font-semibold text-foreground">
              Valoración en proceso
            </p>

            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Las calificaciones de los clientes se incorporan
              progresivamente. La valoración pública se habilita cuando
              existe una cantidad suficiente de opiniones para ofrecer un
              resultado representativo.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
