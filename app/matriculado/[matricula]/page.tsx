import Link from "next/link"
import type { Metadata } from "next"
import { ArrowLeft, SearchX } from "lucide-react"
import { FichaMatriculado } from "@/components/ficha-matriculado"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { normalizarMatricula, obtenerMatriculado } from "@/lib/matriculados"

type Props = { params: Promise<{ matricula: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { matricula } = await params
  const matriculado = await obtenerMatriculado(matricula)

  if (!matriculado) {
    return { title: "Matrícula no encontrada | RENACLI" }
  }

  return {
    title: `${matriculado.apellido}, ${matriculado.nombre} — ${matriculado.matricula} | RENACLI`,
    description: `Ficha pública del técnico matriculado ${matriculado.matricula} del Registro Nacional de Climatización y Refrigeración.`,
  }
}

export default async function FichaPage({ params }: Props) {
  const { matricula } = await params
  const matriculado = await obtenerMatriculado(matricula)

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteHeader />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Volver a la verificación de matrícula
        </Link>

        <h1 className="mt-5 text-2xl font-bold leading-tight text-foreground text-balance sm:text-3xl">
          Ficha del matriculado
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
          Constancia pública de inscripción en el Registro Nacional de Climatización y Refrigeración.
        </p>

        <div className="mt-6">
          {matriculado ? (
            <FichaMatriculado matriculado={matriculado} />
          ) : (
            <div className="rounded-xl border border-border bg-card p-6 text-center shadow-sm sm:p-10">
              <SearchX className="mx-auto size-9 text-muted-foreground" aria-hidden="true" strokeWidth={1.5} />
              <h2 className="mt-4 text-lg font-bold text-foreground">Matrícula no encontrada</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground text-pretty">
                No existe ninguna matrícula registrada con el número{" "}
                <span className="font-mono font-semibold text-foreground">
                  {normalizarMatricula(decodeURIComponent(matricula))}
                </span>
                . Verifique el número del carnet o realice una nueva consulta.
              </p>
              <Link
                href="/"
                className="mt-5 inline-flex h-11 items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Realizar una nueva consulta
              </Link>
            </div>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
