export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-secondary/50">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-8 sm:px-6">
        <p className="text-sm font-bold tracking-[0.18em] text-foreground">RENACLI</p>
        <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
          Registro Nacional de Climatización y Refrigeración — Servicio público de verificación de matrículas de
          técnicos en refrigeración y aire acondicionado.
        </p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground text-pretty">
          La información publicada tiene carácter informativo y refleja el estado registral al momento de la consulta.
        </p>
      </div>
    </footer>
  )
}
