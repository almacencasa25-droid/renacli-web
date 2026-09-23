"use client"

import { FormEvent, useState } from "react"
import { Star } from "lucide-react"

export function FormularioValoracion({ codigo }: { codigo: string }) {
  const [puntuacion, setPuntuacion] = useState(0)
  const [enviando, setEnviando] = useState(false)
  const [mensaje, setMensaje] = useState("")
  const [completada, setCompletada] = useState(false)

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (puntuacion < 1) {
      setMensaje("Elegí de 1 a 5 estrellas.")
      return
    }
    const datos = new FormData(event.currentTarget)
    setEnviando(true)
    setMensaje("")
    try {
      const respuesta = await fetch(`/api/valoraciones/${codigo}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          puntuacion,
          nombre: datos.get("nombre"),
          comentario: datos.get("comentario"),
        }),
      })
      const resultado = await respuesta.json()
      if (!respuesta.ok) throw new Error(resultado.error)
      setCompletada(true)
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : "No se pudo enviar.")
    } finally {
      setEnviando(false)
    }
  }

  if (completada) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
        <div className="text-4xl">✓</div>
        <h2 className="mt-2 text-xl font-bold text-green-900">¡Gracias por tu valoración!</h2>
        <p className="mt-2 text-sm text-green-800">Tu opinión fue registrada correctamente.</p>
      </div>
    )
  }

  return (
    <form onSubmit={enviar} className="space-y-5">
      <div>
        <p className="text-sm font-semibold">¿Cómo fue el trabajo realizado?</p>
        <div className="mt-2 flex justify-center gap-1">
          {[1, 2, 3, 4, 5].map(valor => (
            <button key={valor} type="button" onClick={() => setPuntuacion(valor)} className="rounded-lg p-1" aria-label={`${valor} estrellas`}>
              <Star className={`size-10 ${valor <= puntuacion ? "fill-yellow-400 text-yellow-500" : "text-slate-300"}`} />
            </button>
          ))}
        </div>
      </div>
      <label className="block text-sm font-semibold">
        Nombre <span className="font-normal text-slate-500">(opcional)</span>
        <input name="nombre" maxLength={120} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-3 font-normal outline-none focus:border-green-600" />
      </label>
      <label className="block text-sm font-semibold">
        Comentario <span className="font-normal text-slate-500">(opcional)</span>
        <textarea name="comentario" rows={4} maxLength={1000} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-3 font-normal outline-none focus:border-green-600" />
      </label>
      <button disabled={enviando} className="w-full rounded-lg bg-green-700 px-5 py-3 font-bold text-white disabled:opacity-60">
        {enviando ? "Enviando..." : "Enviar valoración"}
      </button>
      {mensaje ? <p className="text-center text-sm font-semibold text-red-700">{mensaje}</p> : null}
      <p className="text-center text-xs text-slate-500">No necesitás instalar una aplicación ni ingresar tu correo.</p>
    </form>
  )
}
