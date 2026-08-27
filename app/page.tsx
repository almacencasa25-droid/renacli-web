import { QrCode, ShieldCheck, Thermometer } from "lucide-react"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { Verificador } from "@/components/verificador"

const INFORMACION = [
  {
    icono: ShieldCheck,
    titulo: "Consulta oficial",
    texto: "Verifique si un técnico se encuentra matriculado y habilitado por el registro.",
  },
  {
    icono: Thermometer,
    titulo: "Refrigeración y climatización",
    texto: "Matrículas de técnicos en refrigeración, aire acondicionado y climatización.",
  },
  {
    icono: QrCode,
    titulo: "Carnet con código QR",
    texto: "Cada carnet posee un código QR que abre directamente la ficha del matriculado.",
  },
]

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteHeader />

      <main className="flex-1">
        <section className="border-b border-border bg-secondary/40">
          <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Consulta pública de matrículas
            </p>
            <h1 className="mt-2 text-3xl font-bold leading-tight text-foreground text-balance sm:text-4xl">
              Verificación de Matrícula
            </h1>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground text-pretty sm:text-lg">
              Consulte el estado de un técnico matriculado.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
          <Verificador />
        </div>

        <section className="mx-auto max-w-5xl px-4 pb-4 sm:px-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {INFORMACION.map((item) => {
              const Icono = item.icono
              return (
                <div key={item.titulo} className="rounded-xl border border-border bg-card p-5">
                  <Icono className="size-5 text-primary" aria-hidden="true" strokeWidth={1.75} />
                  <h2 className="mt-3 text-sm font-bold text-foreground">{item.titulo}</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground text-pretty">{item.texto}</p>
                </div>
              )
            })}
          </div>
          <p className="mt-6 rounded-lg border border-border bg-muted/60 px-4 py-3 text-xs leading-relaxed text-muted-foreground text-pretty">
            Aviso: la información exhibida proviene del registro oficial de RENACLI. Por razones de privacidad no se
            publican el DNI, el domicilio particular, el correo electrónico ni las observaciones administrativas del
            matriculado.
          </p>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
