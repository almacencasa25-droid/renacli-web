import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { SeguimientoTramite } from "@/components/seguimiento-tramite"

export default function TramitePage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteHeader />

      <main className="flex-1">
        <section className="border-b border-border bg-secondary/40">
          <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Seguimiento RENACLI
            </p>

            <h1 className="mt-2 text-3xl font-bold leading-tight text-foreground sm:text-4xl">
              Consultar mi trámite
            </h1>

            <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Ingresá tu número de trámite y el correo electrónico utilizado al enviar la consulta.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
          <SeguimientoTramite />
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
