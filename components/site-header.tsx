"use client"

import Link from "next/link"
import { Menu, Snowflake, X } from "lucide-react"
import { useState } from "react"

export function SiteHeader() {
  const [menuAbierto, setMenuAbierto] =
    useState(false)

  function cerrarMenu() {
    setMenuAbierto(false)
  }

  return (
    <header className="relative border-b border-primary/20 bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-5 sm:px-6 sm:py-6">
        <Link
          href="/"
          onClick={cerrarMenu}
          className="flex min-w-0 items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-primary sm:gap-4"
        >
          <span
            aria-hidden="true"
            className="flex size-11 shrink-0 items-center justify-center rounded-md border border-primary-foreground/25 bg-primary-foreground/10 sm:size-12"
          >
            <Snowflake
              className="size-6 text-accent sm:size-7"
              strokeWidth={1.75}
            />
          </span>

          <span className="flex min-w-0 flex-col">
            <span className="text-xl font-bold leading-none tracking-[0.18em] sm:text-2xl">
              RENACLI
            </span>

            <span className="mt-1.5 hidden text-[11px] font-medium leading-snug text-primary-foreground/75 text-pretty sm:block sm:text-sm">
              Registro Nacional de
              Climatización y Refrigeración
            </span>
          </span>
        </Link>

        <button
          type="button"
          onClick={() =>
            setMenuAbierto(
              (abierto) => !abierto
            )
          }
          aria-label={
            menuAbierto
              ? "Cerrar menú"
              : "Abrir menú"
          }
          aria-expanded={menuAbierto}
          aria-controls="menu-renacli"
          className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-primary-foreground/25 bg-primary-foreground/10 transition hover:bg-primary-foreground/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {menuAbierto ? (
            <X
              className="size-6"
              aria-hidden="true"
            />
          ) : (
            <Menu
              className="size-6"
              aria-hidden="true"
            />
          )}
        </button>
      </div>

      {menuAbierto ? (
        <nav
          id="menu-renacli"
          aria-label="Menú principal RENACLI"
          className="absolute right-4 top-[76px] z-50 w-[min(290px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border bg-background text-foreground shadow-xl sm:right-6 sm:top-[88px]"
        >
          <Link
            href="/"
            onClick={cerrarMenu}
            className="block border-b border-border px-5 py-4 text-sm font-semibold transition hover:bg-muted"
          >
            Inicio / Verificar matrícula
          </Link>

          <Link
            href="/reglamento"
            onClick={cerrarMenu}
            className="block border-b border-border px-5 py-4 text-sm font-semibold transition hover:bg-muted"
          >
            Reglamento General
          </Link>

          <Link
            href="/privacidad"
            onClick={cerrarMenu}
            className="block px-5 py-4 text-sm font-semibold transition hover:bg-muted"
          >
            Política de Privacidad
          </Link>
        </nav>
      ) : null}

      <div
        aria-hidden="true"
        className="h-1 bg-accent"
      />
    </header>
  )
}
