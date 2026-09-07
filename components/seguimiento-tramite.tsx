"use client"

import { useEffect, useState } from "react"
import {
  FileText,
  LogOut,
  Search,
  Upload,
} from "lucide-react"

type Documento = {
  id: number
  nombre_original: string
  mime_type: string
  tamano_bytes: number
  origen: string
  descripcion: string | null
  created_at: string
}

type Historial = {
  id: number
  tipo_evento: string
  estado_anterior: string | null
  estado_nuevo: string | null
  descripcion: string | null
  origen: string
  created_at: string
}

type Tramite = {
  id: number
  numero_tramite: string
  nombre: string
  motivo: string
  mensaje: string
  estado: string
  respuesta_publica: string | null
  detalle_documentacion_faltante: string | null
  requiere_documentacion: boolean
  created_at: string
  updated_at: string
  fecha_en_revision: string | null
  fecha_ultima_respuesta: string | null
  fecha_aprobacion: string | null
  fecha_rechazo: string | null
}

type RespuestaSesion = {
  autenticado: boolean
  tramite?: Tramite
  documentos?: Documento[]
  historial?: Historial[]
  error?: string
}

function etiquetaEstado(
  estado: string,
) {
  const etiquetas: Record<
    string,
    string
  > = {
    pendiente: "Pendiente",
    en_seguimiento: "En seguimiento",
    en_revision: "En revisión",
    falta_documentacion:
      "Falta documentación",
    respondida: "Respondida",
    aprobado: "Aprobado",
    rechazado: "Rechazado",
    archivada: "Archivada",
  }

  return etiquetas[estado] || estado
}

function etiquetaMotivo(
  motivo: string,
) {
  const etiquetas: Record<
    string,
    string
  > = {
    matricula: "Matrícula RENACLI",
    renovacion: "Renovación",
    documentacion: "Documentación",
    evaluacion: "Evaluación",
    reclamo: "Reclamo o inconveniente",
    instituciones: "Instituciones",
    otro: "Otro",
  }

  return etiquetas[motivo] || motivo
}

function fechaArgentina(
  valor: string | null,
) {
  if (!valor) return "-"

  return new Intl.DateTimeFormat(
    "es-AR",
    {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone:
        "America/Argentina/Buenos_Aires",
    },
  ).format(new Date(valor))
}

function tamanoLegible(
  bytes: number,
) {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 * 1024) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`
  }

  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(1)} MB`
}

export function SeguimientoTramite() {
  const [
    cargando,
    setCargando,
  ] = useState(true)

  const [
    autenticado,
    setAutenticado,
  ] = useState(false)

  const [
    tramite,
    setTramite,
  ] = useState<Tramite | null>(null)

  const [
    documentos,
    setDocumentos,
  ] = useState<Documento[]>([])

  const [
    historial,
    setHistorial,
  ] = useState<Historial[]>([])

  const [
    numeroTramite,
    setNumeroTramite,
  ] = useState("")

  const [
    email,
    setEmail,
  ] = useState("")

  const [
    mensaje,
    setMensaje,
  ] = useState("")

  const [
    enviando,
    setEnviando,
  ] = useState(false)

  const [
    subiendo,
    setSubiendo,
  ] = useState(false)

  const [
    archivos,
    setArchivos,
  ] = useState<File[]>([])

  async function cargarSesion() {
    try {
      const respuesta =
        await fetch(
          "/api/tramite",
          {
            method: "GET",
            cache: "no-store",
          },
        )

      const resultado =
        (await respuesta.json()) as RespuestaSesion

      if (
        !respuesta.ok ||
        !resultado.autenticado ||
        !resultado.tramite
      ) {
        setAutenticado(false)
        setTramite(null)
        setDocumentos([])
        setHistorial([])
        return
      }

      setAutenticado(true)

      setTramite(
        resultado.tramite,
      )

      setDocumentos(
        resultado.documentos || [],
      )

      setHistorial(
        resultado.historial || [],
      )
    } catch {
      setAutenticado(false)
      setTramite(null)
      setDocumentos([])
      setHistorial([])
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargarSesion()
  }, [])

  async function ingresar(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    setEnviando(true)
    setMensaje("")

    try {
      const respuesta =
        await fetch(
          "/api/tramite",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              numeroTramite:
                numeroTramite.trim(),
              email: email.trim(),
            }),
          },
        )

      const resultado =
        await respuesta.json()

      if (!respuesta.ok) {
        throw new Error(
          resultado?.error ||
            "No se pudo acceder al trámite.",
        )
      }

      setCargando(true)
      await cargarSesion()
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? error.message
          : "No se pudo acceder al trámite.",
      )
    } finally {
      setEnviando(false)
    }
  }

  async function salir() {
    try {
      await fetch(
        "/api/tramite",
        {
          method: "DELETE",
        },
      )
    } finally {
      setAutenticado(false)
      setTramite(null)
      setDocumentos([])
      setHistorial([])
      setNumeroTramite("")
      setEmail("")
      setMensaje("")
      setArchivos([])
    }
  }

  async function subirDocumentos(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (
      archivos.length === 0
    ) {
      setMensaje(
        "Seleccioná al menos un archivo.",
      )
      return
    }

    if (archivos.length > 10) {
      setMensaje(
        "Podés seleccionar como máximo 10 archivos.",
      )
      return
    }

    const archivoGrande =
      archivos.find(
        (archivo) =>
          archivo.size >
          10 * 1024 * 1024,
      )

    if (archivoGrande) {
      setMensaje(
        `El archivo "${archivoGrande.name}" supera el límite de 10 MB.`,
      )
      return
    }

    setSubiendo(true)
    setMensaje("")

    try {
      const formData =
        new FormData()

      archivos.forEach(
        (archivo) => {
          formData.append(
            "documentos",
            archivo,
          )
        },
      )

      const respuesta =
        await fetch(
          "/api/tramite/documentos",
          {
            method: "POST",
            body: formData,
          },
        )

      const resultado =
        await respuesta.json()

      if (!respuesta.ok) {
        throw new Error(
          resultado?.error ||
            "No se pudieron cargar los documentos.",
        )
      }

      setArchivos([])

      const input =
        document.getElementById(
          "documentos-tramite",
        ) as HTMLInputElement | null

      if (input) {
        input.value = ""
      }

      setMensaje(
        "Documentación cargada correctamente.",
      )

      await cargarSesion()
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los documentos.",
      )
    } finally {
      setSubiendo(false)
    }
  }

  const permiteCarga =
    tramite &&
    ![
      "respondida",
      "aprobado",
      "rechazado",
      "archivada",
    ].includes(tramite.estado) &&
    (
      tramite.motivo ===
        "documentacion" ||
      tramite.requiere_documentacion ||
      tramite.estado ===
        "falta_documentacion"
    )

  if (cargando) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          Cargando...
        </p>
      </div>
    )
  }

  if (!autenticado) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-5 sm:p-7">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Search
              className="size-5"
              aria-hidden="true"
            />
          </span>

          <div>
            <h2 className="text-xl font-bold text-foreground">
              Acceso al seguimiento
            </h2>

            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              El número de trámite y el correo deben coincidir con los datos registrados.
            </p>
          </div>
        </div>

        <form
          onSubmit={ingresar}
          className="mt-6 space-y-4"
        >
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-foreground">
              Número de trámite
            </span>

            <input
              type="text"
              required
              value={numeroTramite}
              onChange={(event) =>
                setNumeroTramite(
                  event.target.value,
                )
              }
              className="w-full rounded-lg border border-input bg-background px-3 py-3 text-sm uppercase text-foreground outline-none transition focus:border-primary"
              placeholder="REN-20260907-123456"
              autoComplete="off"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-foreground">
              Correo electrónico
            </span>

            <input
              type="email"
              required
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value,
                )
              }
              className="w-full rounded-lg border border-input bg-background px-3 py-3 text-sm text-foreground outline-none transition focus:border-primary"
              placeholder="correo@ejemplo.com"
              autoComplete="email"
            />
          </label>

          <button
            type="submit"
            disabled={enviando}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Search className="size-4" />

            {enviando
              ? "Ingresando..."
              : "Consultar trámite"}
          </button>

          {mensaje ? (
            <p className="text-sm text-red-700">
              {mensaje}
            </p>
          ) : null}
        </form>
      </div>
    )
  }

  if (!tramite) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Número de trámite
          </p>

          <p className="mt-1 text-xl font-black text-foreground">
            {tramite.numero_tramite}
          </p>
        </div>

        <button
          type="button"
          onClick={salir}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
        >
          <LogOut className="size-4" />
          Salir
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Titular
          </p>

          <p className="mt-1 font-semibold text-foreground">
            {tramite.nombre}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Estado
          </p>

          <p className="mt-1 font-semibold text-foreground">
            {etiquetaEstado(
              tramite.estado,
            )}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Motivo
          </p>

          <p className="mt-1 font-semibold text-foreground">
            {etiquetaMotivo(
              tramite.motivo,
            )}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Fecha de inicio
          </p>

          <p className="mt-1 font-semibold text-foreground">
            {fechaArgentina(
              tramite.created_at,
            )}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Consulta enviada
        </p>

        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {tramite.mensaje}
        </p>
      </div>

      {tramite.respuesta_publica ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-green-800">
            Respuesta de RENACLI
          </p>

          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-green-950">
            {tramite.respuesta_publica}
          </p>
        </div>
      ) : null}

      {tramite.detalle_documentacion_faltante ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
            Documentación solicitada
          </p>

          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-amber-950">
            {
              tramite.detalle_documentacion_faltante
            }
          </p>
        </div>
      ) : null}

      {permiteCarga ? (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Upload className="size-5" />
            </span>

            <div>
              <h2 className="font-bold text-foreground">
                Adjuntar documentación
              </h2>

              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Se aceptan PDF, JPG, JPEG y PNG. Máximo 10 MB por archivo y hasta 10 archivos activos por trámite.
              </p>
            </div>
          </div>

          <form
            onSubmit={subirDocumentos}
            className="mt-4 space-y-4"
          >
            <input
              id="documentos-tramite"
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              onChange={(event) =>
                setArchivos(
                  Array.from(
                    event.target.files ||
                      [],
                  ),
                )
              }
              className="block w-full rounded-lg border border-input bg-background px-3 py-3 text-sm text-foreground"
            />

            <button
              type="submit"
              disabled={subiendo}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Upload className="size-4" />

              {subiendo
                ? "Subiendo..."
                : "Subir documentación"}
            </button>
          </form>
        </div>
      ) : null}

      {mensaje ? (
        <div className="rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-foreground">
          {mensaje}
        </div>
      ) : null}

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-bold text-foreground">
          Documentos del trámite
        </h2>

        {documentos.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Todavía no hay documentos cargados.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {documentos.map(
              (documento) => (
                <a
                  key={documento.id}
                  href={`/api/tramite/documentos/${documento.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 transition hover:bg-muted/50"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <FileText className="size-5 shrink-0 text-primary" />

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {
                          documento.nombre_original
                        }
                      </p>

                      <p className="text-xs text-muted-foreground">
                        {tamanoLegible(
                          documento.tamano_bytes,
                        )}
                        {" · "}
                        {fechaArgentina(
                          documento.created_at,
                        )}
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-semibold text-primary">
                    Abrir
                  </span>
                </a>
              ),
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-bold text-foreground">
          Historial del trámite
        </h2>

        {historial.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Todavía no hay movimientos registrados.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {historial.map(
              (evento) => (
                <div
                  key={evento.id}
                  className="rounded-lg border border-border px-4 py-3"
                >
                  <p className="text-sm font-semibold text-foreground">
                    {evento.estado_nuevo
                      ? etiquetaEstado(
                          evento.estado_nuevo,
                        )
                      : evento.tipo_evento}
                  </p>

                  {evento.descripcion ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {evento.descripcion}
                    </p>
                  ) : null}

                  <p className="mt-2 text-xs text-muted-foreground">
                    {fechaArgentina(
                      evento.created_at,
                    )}
                  </p>
                </div>
              ),
            )}
          </div>
        )}
      </div>
    </div>
  )
}
