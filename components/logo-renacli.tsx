"use client"

import { useState } from "react"
import { Snowflake } from "lucide-react"

export default function LogoRenacli() {
  const [disponible, setDisponible] = useState(true)
  return disponible ? (
    <img
      src="/api/identidad/logo"
      alt="RENACLI — Registro Nacional de Climatización y Refrigeración"
      className="block h-auto max-h-[70px] w-auto max-w-[min(65vw,280px)] object-contain object-left sm:max-h-[85px] sm:max-w-[350px]"
      onError={() => setDisponible(false)}
    />
  ) : (
    <>
      <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-md border border-primary-foreground/25 bg-primary-foreground/10 sm:size-12">
        <Snowflake className="size-6 text-accent sm:size-7" strokeWidth={1.75} />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-xl font-bold leading-none tracking-[0.18em] sm:text-2xl">RENACLI</span>
        <span className="mt-1.5 hidden text-[11px] font-medium leading-snug text-primary-foreground/75 sm:block sm:text-sm">
          Registro Nacional de Climatización y Refrigeración
        </span>
      </span>
    </>
  )
}
