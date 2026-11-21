"use client"
import { useEffect, useState } from "react"
type Pregunta = { id: number; enunciado: string; opciones: { letra: string; texto: string }[] }
type Estado = { terminado: boolean; aprobado?: boolean; porcentaje?: number; nombre?: string; usados?: number; maximos?: number; preguntas?: Pregunta[]; correctas?: number; total?: number; restantes?: number }
const base = "/api/evaluacion-online"
export default function EvaluacionOnlinePage() {
  const [tramite, setTramite] = useState("")
  const [dni, setDni] = useState("")
  const [estado, setEstado] = useState<Estado | null>(null)
  const [respuestas, setRespuestas] = useState<Record<string,string>>({})
  const [indice, setIndice] = useState(0)
  const [error, setError] = useState("")
  const [cargando, setCargando] = useState(false)
  const [confirmar, setConfirmar] = useState(false)
  useEffect(() => { fetch(base, { cache: "no-store" }).then(async r => { if (r.ok) setEstado(await r.json()) }).catch(() => {}) }, [])
  async function enviar(accion: string, payload: object) {
    setCargando(true); setError("")
    try {
      const response = await fetch(base, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accion, ...payload }), cache: "no-store" })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "No se pudo completar la solicitud.")
      setEstado(result)
      setConfirmar(false)
      if (accion === "finalizar") setRespuestas({})
    } catch (e) { setError(e instanceof Error ? e.message : "Error de conexión.") }
    finally { setCargando(false) }
  }
  const preguntas = estado?.preguntas || []
  const actual = preguntas[indice]
  const respondidas = preguntas.filter(p => respuestas[String(p.id)]).length
  const terminado = Boolean(estado?.terminado)
  const bloque = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
  return <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900">
    <div className="mx-auto max-w-xl">
      <header className="mb-6 rounded-2xl bg-[#0d4f7c] p-6 text-white">
        <h1 className="text-3xl font-bold tracking-widest">RENACLI</h1>
        <p className="mt-2 text-sm text-cyan-100">Evaluación técnica online · Desde tu teléfono o computadora</p>
      </header>
      {!estado ? <section className={bloque}>
        <h2 className="text-xl font-bold">Ingresar a la evaluación</h2>
        <p className="mt-2 text-sm text-slate-600">Ingresá exactamente el número de trámite y DNI informados a RENACLI.</p>
        <form className="mt-5 space-y-4" onSubmit={e => { e.preventDefault(); void enviar("ingresar", { tramite, dni }) }}>
          <label className="block text-sm font-semibold">Número de trámite
            <input required autoComplete="off" value={tramite} onChange={e => setTramite(e.target.value.toUpperCase())} placeholder="Número de trámite" className="mt-1 w-full rounded-lg border border-slate-400 bg-slate-100 p-3 text-lg" />
          </label>
          <label className="block text-sm font-semibold">DNI sin puntos
            <input required inputMode="numeric" pattern="[0-9]{7,9}" maxLength={9} value={dni} onChange={e => setDni(e.target.value.replace(/\D/g,""))} placeholder="Ej.: 30123456" className="mt-1 w-full rounded-lg border border-slate-400 bg-slate-100 p-3 text-lg" />
          </label>
          <button disabled={cargando} className="w-full rounded-lg bg-[#0d4f7c] p-4 text-lg font-bold text-white disabled:opacity-60">{cargando ? "Verificando…" : "Ingresar"}</button>
        </form>
      </section> : terminado ? <section className={bloque}>
        <h2 className={"text-2xl font-bold " + (estado.aprobado ? "text-green-700" : "text-red-700")}>{estado.aprobado ? "APROBADO" : "NO APROBADO"}</h2>
        <p className="mt-4 text-lg">Calificación: <strong>{estado.porcentaje ?? 0}%</strong></p>
        <p className="mt-2 text-sm">Intentos utilizados: {estado.usados ?? "—"} de {estado.maximos ?? "—"}</p>
        <p className="mt-4 text-slate-600">Para consultar tu resultado o solicitar otra oportunidad, comunicate con RENACLI.</p>
      </section> : <section className={bloque}>
        <div className="flex items-center justify-between gap-3 text-sm text-slate-600"><span>Evaluación de {estado.nombre || "aspirante"}</span><span>Intento {(estado.usados || 0) + 1} de {estado.maximos}</span></div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-cyan-600" style={{ width: (preguntas.length ? respondidas / preguntas.length * 100 : 0) + "%" }}/></div>
        <p className="mt-5 text-sm font-semibold text-[#0d4f7c]">Pregunta {indice + 1} de {preguntas.length}</p>
        <h2 className="mt-3 text-xl font-semibold leading-relaxed">{actual?.enunciado}</h2>
        <div className="mt-5 space-y-3">{actual?.opciones.map(o => <label key={o.letra} className={"flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-base " + (respuestas[String(actual.id)] === o.letra ? "border-cyan-700 bg-cyan-50" : "border-slate-300 bg-slate-50")}>
          <input type="radio" name={"pregunta_" + actual.id} checked={respuestas[String(actual.id)] === o.letra} onChange={() => setRespuestas(v => ({ ...v, [actual.id]: o.letra }))} className="mt-1 h-5 w-5" />
          <span><b>{o.letra}.</b> {o.texto}</span>
        </label>)}</div>
        <div className="mt-7 flex gap-3">
          <button type="button" disabled={indice === 0} onClick={() => setIndice(i => i-1)} className="flex-1 rounded-lg border border-slate-400 p-3 font-semibold disabled:opacity-40">Anterior</button>
          {indice + 1 < preguntas.length ?
            <button type="button" onClick={() => setIndice(i => i+1)} className="flex-1 rounded-lg bg-[#0d4f7c] p-3 font-bold text-white">Siguiente</button> :
            <button type="button" onClick={() => setConfirmar(true)} disabled={respondidas !== preguntas.length || cargando} className="flex-1 rounded-lg bg-green-700 p-3 font-bold text-white disabled:opacity-40">Finalizar</button>}
        </div>
        <p className="mt-4 text-center text-sm text-slate-500">Respondidas: {respondidas} / {preguntas.length}. Podés volver a las preguntas anteriores.</p>
        {confirmar && <div role="dialog" aria-modal="true" className="mt-5 rounded-xl border-2 border-amber-400 bg-amber-50 p-4">
          <p className="font-semibold">¿Confirmás que querés entregar la evaluación? Este intento quedará registrado.</p>
          <div className="mt-4 flex gap-2"><button className="flex-1 rounded-lg border border-slate-400 p-3" onClick={() => setConfirmar(false)}>Volver</button>
            <button disabled={cargando} className="flex-1 rounded-lg bg-green-700 p-3 font-bold text-white disabled:opacity-50" onClick={() => void enviar("finalizar", { respuestas })}>{cargando ? "Corrigiendo…" : "Entregar"}</button></div>
        </div>}
      </section>}
      {error && <div role="alert" className="mt-4 rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">{error}</div>}
      <p className="mt-6 text-center text-sm text-slate-500">RENACLI · Registro Nacional de Climatización y Refrigeración</p>
    </div>
  </main>
}
