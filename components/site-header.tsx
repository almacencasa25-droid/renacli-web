"use client"

import Link from "next/link"
import { Menu, X } from "lucide-react"
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
          <span className="block w-[min(62vw,260px)] sm:w-[330px]" aria-label="RENACLI — Registro Nacional de Climatización y Refrigeración">
            <svg viewBox="0 0 430 108" className="block h-auto w-full overflow-visible" role="img" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="renacli-azul" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#087bf3" />
                  <stop offset="100%" stopColor="#25e5f1" />
                </linearGradient>
              </defs>
              <g fill="#ffffff" fontFamily="Arial, Helvetica, sans-serif" fontSize="62" fontWeight="900" letterSpacing="-3">
                <text x="0" y="65">REN</text>
                <text x="258" y="65">CLI</text>
              </g>
              <path d="M190 65 L220 5 L242 5 L272 65 L251 65 L231 25 L211 65 Z" fill="url(#renacli-azul)" />
              <g transform="translate(231 52)" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round">
                <path d="M0 -11 V11 M-10 0 H10 M-7.5 -7.5 L7.5 7.5 M7.5 -7.5 L-7.5 7.5" />
              </g>
              <rect x="190" y="75" width="83" height="4" fill="url(#renacli-azul)" />
              <text x="215" y="94" textAnchor="middle" fill="#ffffff" fontFamily="Arial, Helvetica, sans-serif" fontSize="9.5" letterSpacing="2.3">REGISTRO NACIONAL DE</text>
              <text x="215" y="106" textAnchor="middle" fill="#ffffff" fontFamily="Arial, Helvetica, sans-serif" fontSize="9.5" letterSpacing="1.45">CLIMATIZACIÓN Y REFRIGERACIÓN</text>
            </svg>
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
            className="block border-b border-border px-5 py-4 text-sm font-semibold transition hover:bg-muted"
          >
            Política de Privacidad
          </Link>

          <Link
            href="/administrador/acceso"
            onClick={cerrarMenu}
            className="block px-5 py-4 text-sm font-semibold transition hover:bg-muted"
          >
            Administración
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
