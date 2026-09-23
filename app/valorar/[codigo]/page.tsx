import { createClient } from "@supabase/supabase-js"
import { FormularioValoracion } from "./formulario-valoracion"

type Props = { params: Promise<{ codigo: string }> }

export default async function ValorarTrabajoPage({ params }: Props) {
  const { codigo } = await params
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseSecret = process.env.SUPABASE_SECRET_KEY
  let solicitud: { matriculado_id: number; vence_en: string; utilizado_en: string | null } | null = null
  let tecnico: { apellido_nombre: string; numero_matricula: string } | null = null

  if (supabaseUrl && supabaseSecret) {
    const supabase = createClient(supabaseUrl, supabaseSecret, { auth: { persistSession: false } })
    const resultado = await supabase.from("solicitudes_valoracion_trabajo").select("matriculado_id, vence_en, utilizado_en").eq("codigo", codigo).maybeSingle()
    solicitud = resultado.data
    if (solicitud) {
      const resultadoTecnico = await supabase.from("matriculados").select("apellido_nombre, numero_matricula").eq("id", solicitud.matriculado_id).maybeSingle()
      tecnico = resultadoTecnico.data
    }
  }

  const vencida = solicitud ? new Date(solicitud.vence_en).getTime() <= Date.now() : false
  const disponible = Boolean(solicitud && tecnico && !solicitud.utilizado_en && !vencida)

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <section className="mx-auto max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
        <header className="bg-slate-900 px-6 py-6 text-center text-white">
          <div className="text-3xl">❄</div>
          <h1 className="mt-1 text-2xl font-black tracking-wide">RENACLI</h1>
          <p className="mt-1 text-xs font-semibold tracking-wide">VALORACIÓN DE TRABAJO</p>
        </header>
        <div className="p-6">
          {tecnico ? (
            <div className="mb-6 border-b border-slate-200 pb-5 text-center">
              <p className="text-sm text-slate-500">Trabajo realizado por</p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">{tecnico.apellido_nombre}</h2>
              <p className="mt-1 font-bold text-green-700">{tecnico.numero_matricula}</p>
            </div>
          ) : null}
          {disponible ? <FormularioValoracion codigo={codigo} /> : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center">
              <h2 className="font-bold text-slate-900">Código no disponible</h2>
              <p className="mt-2 text-sm text-slate-600">{solicitud?.utilizado_en ? "Esta valoración ya fue enviada." : vencida ? "Este código venció. Pedile al técnico uno nuevo." : "El código no es válido."}</p>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
