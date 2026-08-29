"use client"

import { useActionState } from "react"
import { AlertCircle, IdCard, Loader2, Search, SearchX } from "lucide-react"
import { verificarMatricula } from "@/app/actions"
import { consultaInicial } from "@/lib/consulta"
import { FichaMatriculado } from "@/components/ficha-matriculado"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function Verificador() {
  const [estado, accion, pendiente] = useActionState(
    verificarMatricula,
    consultaInicial,
  )

  return (
    <div className="flex flex-col gap-8">
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-7">
        <form action={accion} className="flex flex-col gap-5">
          <input type="hidden" name="tipo" value="matricula" />

          <div className="flex items-center gap-2 rounded-lg border border-primary bg-primary px-4 py-3 text-sm font-medium text-primary-foreground">
            <IdCard className="size-4" aria-hidden="true" />
            Consulta por número de matrícula
          </div>

          <div className="flex flex-col gap-2">
            <Label
              htmlFor="termino"
              className="text-sm font-semibold text-foreground"
            >
              Número de matrícula
            </Label>

            <Input
              id="termino"
              name="termino"
              key={estado.termino}
              defaultValue={estado.termino}
              required
              autoComplete="off"
              inputMode="text"
              placeholder="Ej.: RNC-000001"
              className="h-12 bg-background font-mono text-base tracking-wide sm:text-base"
            />

            <p className="text-xs leading-relaxed text-muted-foreground">
              Puede ingresar el número completo o solamente los dígitos que
              figuran en el carnet.
            </p>
          </div>

          <Button
            type="submit"
            disabled={pendiente}
            className="h-13 w-full text-base font-semibold"
          >
            {pendiente ? (
              <>
                <Loader2
                  className="size-5 animate-spin"
                  aria-hidden="true"
                />
                Verificando…
              </>
            ) : (
              <>
                <Search
                  className="size-5"
                  aria-hidden="true"
                />
                Verificar matrícula
              </>
            )}
          </Button>
        </form>
      </div>

      <div
        aria-live="polite"
        className="flex flex-col gap-5"
      >
        {estado.error ? (
          <div className="flex items-start gap-3 rounded-lg border border-destructive/35 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle
              className="mt-0.5 size-5 shrink-0"
              aria-hidden="true"
            />
            <p className="text-pretty">
              {estado.error}
            </p>
          </div>
        ) : null}

        {estado.consultado &&
        estado.resultados.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center shadow-sm sm:p-8">
            <SearchX
              className="mx-auto size-8 text-muted-foreground"
              aria-hidden="true"
              strokeWidth={1.5}
            />
            <h2 className="mt-3 text-base font-bold text-foreground">
              Sin resultados
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground text-pretty">
              No se encontraron matriculados que
              coincidan con «{estado.termino}».
              Verifique el número ingresado o consulte
              con el registro.
            </p>
          </div>
        ) : null}

        {estado.resultados.length > 0 ? (
          <>
            <p className="text-sm text-muted-foreground">
              {estado.resultados.length === 1
                ? "1 resultado encontrado"
                : `${estado.resultados.length} resultados encontrados`}
            </p>

            {estado.resultados.map(
              (matriculado) => (
                <FichaMatriculado
                  key={matriculado.matricula}
                  matriculado={matriculado}
                  mostrarEnlace
                />
              ),
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}
