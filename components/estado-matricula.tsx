import { AlertTriangle, Ban, CheckCircle2, CircleSlash } from "lucide-react"
import { cn } from "@/lib/utils"
import { ESTADOS, type EstadoMatricula } from "@/lib/matriculados"

const ESTILOS: Record<EstadoMatricula, { contenedor: string; icono: typeof CheckCircle2 }> = {
  vigente: {
    contenedor: "border-success/35 bg-success/10 text-success",
    icono: CheckCircle2,
  },
  vencida: {
    contenedor: "border-warning/45 bg-warning/15 text-warning-foreground",
    icono: AlertTriangle,
  },
  suspendida: {
    contenedor: "border-destructive/35 bg-destructive/10 text-destructive",
    icono: Ban,
  },
  baja: {
    contenedor: "border-border bg-muted text-muted-foreground",
    icono: CircleSlash,
  },
}

export function EstadoMatriculaBanner({
  estado,
  className,
}: {
  estado: EstadoMatricula
  className?: string
}) {
  const info = ESTADOS[estado]
  const estilo = ESTILOS[estado]
  const Icono = estilo.icono

  return (
    <div
      role="status"
      className={cn("flex items-start gap-3 rounded-lg border px-4 py-3", estilo.contenedor, className)}
    >
      <Icono className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-sm font-bold uppercase tracking-wider text-pretty sm:text-base">{info.etiqueta}</p>
        <p className="mt-0.5 text-xs leading-relaxed opacity-90 text-pretty sm:text-sm">{info.descripcion}</p>
      </div>
    </div>
  )
}

export function EstadoMatriculaChip({ estado }: { estado: EstadoMatricula }) {
  const estilo = ESTILOS[estado]
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider",
        estilo.contenedor,
      )}
    >
      {ESTADOS[estado].etiqueta}
    </span>
  )
}
