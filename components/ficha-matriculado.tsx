import Link from "next/link"
import { ArrowUpRight, MapPin, Phone, ShieldCheck, User, Wrench } from "lucide-react"
import { EstadoMatriculaBanner } from "@/components/estado-matricula"
import { formatearFecha, type MatriculadoPublico } from "@/lib/matriculados"

function Dato({
  etiqueta,
  valor,
  destacado = false,
}: {
  etiqueta: string
  valor: string
  destacado?: boolean
}) {
  return (
    <div className="border-t border-border py-3 first:border-t-0 first:pt-0 sm:border-t-0 sm:py-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{etiqueta}</dt>
      <dd
        className={
          destacado
            ? "mt-1 font-mono text-base font-semibold tracking-wide text-foreground"
            : "mt-1 text-sm leading-relaxed text-foreground text-pretty"
        }
      >
        {valor}
      </dd>
    </div>
  )
}

export function FichaMatriculado({
  matriculado,
  mostrarEnlace = false,
}: {
  matriculado: MatriculadoPublico
  mostrarEnlace?: boolean
}) {
  const iniciales = `${matriculado.apellido.charAt(0)}${matriculado.nombre.charAt(0)}`.toUpperCase()

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex flex-col gap-5 border-b border-border bg-secondary/60 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
        <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-card sm:size-28">
          {matriculado.foto_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={matriculado.foto_url || "/placeholder.svg"}
              alt={`Fotografía de ${matriculado.apellido}, ${matriculado.nombre}`}
              className="size-full object-cover"
            />
          ) : (
            <span className="flex flex-col items-center gap-1 text-muted-foreground">
              <User className="size-7" aria-hidden="true" strokeWidth={1.5} />
              <span className="text-lg font-semibold tracking-widest">{iniciales}</span>
              <span className="sr-only">Sin fotografía disponible</span>
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Técnico matriculado
          </p>
          <h2 className="mt-1 text-xl font-bold leading-tight text-foreground text-balance sm:text-2xl">
            {matriculado.apellido}, {matriculado.nombre}
          </h2>
          <p className="mt-2 font-mono text-sm font-semibold tracking-widest text-primary">{matriculado.matricula}</p>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <EstadoMatriculaBanner estado={matriculado.estado} />

        <dl className="mt-5 grid grid-cols-1 gap-0 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-5">
          <Dato etiqueta="Número de matrícula" valor={matriculado.matricula} destacado />
          <Dato etiqueta="Especialidad" valor={matriculado.especialidad} />
          <Dato etiqueta="Fecha de emisión" valor={formatearFecha(matriculado.fecha_emision)} />
          <Dato etiqueta="Fecha de vencimiento" valor={formatearFecha(matriculado.fecha_vencimiento)} />
          <Dato etiqueta="Localidad" valor={matriculado.localidad} />
          <Dato etiqueta="Provincia" valor={matriculado.provincia} />
          <Dato etiqueta="Teléfono de contacto" valor={matriculado.telefono} />
        </dl>

        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Wrench className="size-3.5" aria-hidden="true" />
            {matriculado.especialidad}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-3.5" aria-hidden="true" />
            {matriculado.localidad}, {matriculado.provincia}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Phone className="size-3.5" aria-hidden="true" />
            {matriculado.telefono}
          </span>
        </div>

        {mostrarEnlace ? (
          <Link
            href={`/matriculado/${matriculado.matricula}`}
            className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Ver ficha completa del matriculado
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        ) : null}
      </div>

      <p className="flex items-start gap-2 border-t border-border bg-muted/60 px-5 py-3 text-xs leading-relaxed text-muted-foreground sm:px-6">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span className="text-pretty">
          Esta ficha exhibe únicamente información pública del registro. No se publican datos personales como DNI,
          domicilio particular, correo electrónico ni observaciones administrativas.
        </span>
      </p>
    </article>
  )
}
