import Link from "next/link"
import { Snowflake } from "lucide-react"

export function SiteHeader() {
  return (
    <header className="border-b border-primary/20 bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-5 sm:px-6 sm:py-6">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-primary sm:gap-4"
        >
          <span
            aria-hidden="true"
            className="flex size-11 shrink-0 items-center justify-center rounded-md border border-primary-foreground/25 bg-primary-foreground/10 sm:size-12"
          >
            <Snowflake className="size-6 text-accent sm:size-7" strokeWidth={1.75} />
          </span>
          <span className="flex flex-col">
            <span className="text-xl font-bold leading-none tracking-[0.18em] sm:text-2xl">RENACLI</span>
            <span className="mt-1.5 text-[11px] font-medium leading-snug text-primary-foreground/75 text-pretty sm:text-sm">
              Registro Nacional de Climatización y Refrigeración
            </span>
          </span>
        </Link>
      </div>
      <div aria-hidden="true" className="h-1 bg-accent" />
    </header>
  )
}
