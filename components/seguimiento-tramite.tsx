"use client"

import {
  FileText,
  LogOut,
  Paperclip,
  Search,
  Send,
} from "lucide-react"
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

type Documento = {
  id: number
  mensaje_id: number | null
  nombre_original: string
  mime_type: string
  tamano_bytes: number
  origen: string
  descripcion: string | null
  created_at: string
}

type MensajeChat = {
  id: number
  consulta_id: number
  autor:
    | "solicitante"
    | "administracion"
    | "sistema"
  mensaje: string
  es_mensaje_sistema: boolean
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
  esperando_documentacion: boolean
  ultimo_mensaje_en: string | null
  ultimo_mensaje_origen: string | null
  cerrado_en: string | null
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
  mensajes?: MensajeChat[]
  documentos?: Documento[]
  cerrado?: boolean
  error?: string
}

type ItemChat =
  | {
      tipo: "mensaje"
      fecha: string
      id: string
      autor:
        | "solicitante"
        | "administracion"
        | "sistema"
      mensaje: string
    }
  | {
      tipo: "documento"
      fecha: string
      id: string
      autor:
        | "solicitante"
        | "administracion"
      documento: Documento
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
    matricula:
      "Matrícula RENACLI",
    renovacion: "Renovación",
    documentacion:
      "Documentación",
    evaluacion: "Evaluación",
    reclamo:
      "Reclamo o inconveniente",
    instituciones:
      "Instituciones",
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
      dateStyle: "short",
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

function autorDocumento(
  origen: string,
):
  | "solicitante"
  | "administracion" {
  return origen ===
    "administracion"
    ? "administracion"
    : "solicitante"
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
    mensajes,
    setMensajes,
  ] = useState<MensajeChat[]>([])

  const [
    documentos,
    setDocumentos,
  ] = useState<Documento[]>([])

  const [
    cerrado,
    setCerrado,
  ] = useState(false)

  const [
    numeroTramite,
    setNumeroTramite,
  ] = useState("")

  const [
    email,
    setEmail,
  ] = useState("")

  const [
    textoMensaje,
    setTextoMensaje,
  ] = useState("")

  const [
    archivos,
    setArchivos,
  ] = useState<File[]>([])

  const [
    enviando,
    setEnviando,
  ] = useState(false)

  const [
    ingresando,
    setIngresando,
  ] = useState(false)

  const [
    aviso,
    setAviso,
  ] = useState("")

  const [
    error,
    setError,
  ] = useState("")

  const chatRef =
    useRef<HTMLDivElement | null>(
      null,
    )

  const inputArchivosRef =
    useRef<HTMLInputElement | null>(
      null,
    )

  const itemsChat =
    useMemo<ItemChat[]>(() => {
      const items: ItemChat[] = []

      mensajes.forEach(
        (mensaje) => {
          items.push({
            tipo: "mensaje",
            fecha:
              mensaje.created_at,
            id:
              `mensaje-${mensaje.id}`,
            autor:
              mensaje.autor,
            mensaje:
              mensaje.mensaje,
          })
        },
      )

      documentos.forEach(
        (documento) => {
          items.push({
            tipo: "documento",
            fecha:
              documento.created_at,
            id:
              `documento-${documento.id}`,
            autor:
              autorDocumento(
                documento.origen,
              ),
            documento,
          })
        },
      )

      return items.sort(
        (a, b) => {
          const diferencia =
            new Date(
              a.fecha,
            ).getTime() -
            new Date(
              b.fecha,
            ).getTime()

          if (diferencia !== 0) {
            return diferencia
          }

          return a.id.localeCompare(
            b.id,
          )
        },
      )
    }, [mensajes, documentos])

  function bajarChat() {
    window.setTimeout(() => {
      if (!chatRef.current) {
        return
      }

      chatRef.current.scrollTop =
        chatRef.current.scrollHeight
    }, 50)
  }

  async function cargarSesion(
    moverAbajo = false,
  ) {
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
        setMensajes([])
        setDocumentos([])
        setCerrado(false)
        return
      }

      setAutenticado(true)
      setTramite(
        resultado.tramite,
      )
      setMensajes(
        resultado.mensajes || [],
      )
      setDocumentos(
        resultado.documentos || [],
      )
      setCerrado(
        Boolean(
          resultado.cerrado,
        ),
      )

      if (moverAbajo) {
        bajarChat()
      }
    } catch {
      setAutenticado(false)
      setTramite(null)
      setMensajes([])
      setDocumentos([])
      setCerrado(false)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    let activo = true

    async function prepararAccesoSeguro() {
      try {
        await fetch(
          "/api/tramite",
          {
            method: "DELETE",
            cache: "no-store",
          },
        )
      } finally {
        if (!activo) {
          return
        }

        setAutenticado(false)
        setTramite(null)
        setMensajes([])
        setDocumentos([])
        setCerrado(false)
        setNumeroTramite("")
        setEmail("")
        setTextoMensaje("")
        setArchivos([])
        setAviso("")
        setError("")
        setCargando(false)
      }
    }

    void prepararAccesoSeguro()

    return () => {
      activo = false
    }
  }, [])

  useEffect(() => {
    if (!autenticado) {
      return
    }

    const intervalo =
      window.setInterval(() => {
        if (
          document.visibilityState !== "visible" ||
          enviando ||
          ingresando
        ) {
          return
        }

        void cargarSesion(false)
      }, 5000)

    return () => {
      window.clearInterval(
        intervalo,
      )
    }
  }, [
    autenticado,
    enviando,
    ingresando,
  ])

  useEffect(() => {
    if (
      autenticado &&
      itemsChat.length > 0
    ) {
      bajarChat()
    }
  }, [
    autenticado,
    itemsChat.length,
  ])

  async function ingresar(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    setIngresando(true)
    setAviso("")
    setError("")

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
            body:
              JSON.stringify({
                numeroTramite:
                  numeroTramite.trim(),
                email:
                  email.trim(),
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
      await cargarSesion(true)
    } catch (errorIngreso) {
      setError(
        errorIngreso instanceof
          Error
          ? errorIngreso.message
          : "No se pudo acceder al trámite.",
      )
    } finally {
      setIngresando(false)
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
      setMensajes([])
      setDocumentos([])
      setCerrado(false)
      setNumeroTramite("")
      setEmail("")
      setTextoMensaje("")
      setArchivos([])
      setAviso("")
      setError("")
    }
  }

  function validarArchivos() {
    if (archivos.length > 10) {
      return "Podés seleccionar como máximo 10 archivos."
    }

    const archivoGrande =
      archivos.find(
        (archivo) =>
          archivo.size >
          10 * 1024 * 1024,
      )

    if (archivoGrande) {
      return `El archivo "${archivoGrande.name}" supera el límite de 10 MB.`
    }

    const tiposPermitidos =
      new Set([
        "application/pdf",
        "image/jpeg",
        "image/png",
      ])

    const archivoNoPermitido =
      archivos.find(
        (archivo) =>
          !tiposPermitidos.has(
            archivo.type,
          ),
      )

    if (archivoNoPermitido) {
      return `El archivo "${archivoNoPermitido.name}" no tiene un formato permitido.`
    }

    if (
      documentos.length +
        archivos.length >
      10
    ) {
      return "El trámite admite como máximo 10 archivos activos."
    }

    return ""
  }

  async function subirArchivos() {
    if (archivos.length === 0) {
      return
    }

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
          "El mensaje fue enviado, pero no se pudieron cargar los archivos.",
      )
    }
  }

  async function enviarMensaje(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (cerrado) {
      return
    }

    const texto =
      textoMensaje.trim()

    if (
      !texto &&
      archivos.length === 0
    ) {
      setError(
        "Escribí un mensaje o adjuntá un archivo antes de enviar.",
      )
      return
    }

    const errorArchivos =
      validarArchivos()

    if (errorArchivos) {
      setError(
        errorArchivos,
      )
      return
    }

    setEnviando(true)
    setAviso("")
    setError("")

    let mensajeEnviado =
      false

    try {
      if (texto) {
        const respuesta =
          await fetch(
            "/api/tramite",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body:
                JSON.stringify({
                  accion:
                    "enviar_mensaje",
                  mensaje:
                    texto,
                }),
            },
          )

        const resultado =
          await respuesta.json()

        if (!respuesta.ok) {
          throw new Error(
            resultado?.error ||
              "No se pudo enviar el mensaje.",
          )
        }

        mensajeEnviado = true
        setTextoMensaje("")
      }

      if (
        archivos.length > 0
      ) {
        await subirArchivos()
      }

      setArchivos([])

      if (
        inputArchivosRef.current
      ) {
        inputArchivosRef.current.value =
          ""
      }

      setAviso(
        "Mensaje enviado correctamente.",
      )

      await cargarSesion(true)
    } catch (errorEnvio) {
      if (mensajeEnviado) {
        setError(
          errorEnvio instanceof
            Error
            ? errorEnvio.message
            : "El mensaje fue enviado, pero hubo un problema con los archivos.",
        )

        await cargarSesion(true)
      } else {
        setError(
          errorEnvio instanceof
            Error
            ? errorEnvio.message
            : "No se pudo enviar el mensaje.",
        )
      }
    } finally {
      setEnviando(false)
    }
  }

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
              Ingresá el número de trámite y el mismo correo electrónico usado al realizar la consulta.
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
              placeholder="REN-20260908-123456"
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
            disabled={ingresando}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Search className="size-4" />

            {ingresando
              ? "Ingresando..."
              : "Consultar trámite"}
          </button>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          ) : null}
        </form>
      </div>
    )
  }

  if (!tramite) {
    return null
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-muted/50 px-4 py-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Titular
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {tramite.nombre}
            </p>
          </div>

          <div className="rounded-lg bg-muted/50 px-4 py-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Motivo
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {etiquetaMotivo(
                tramite.motivo,
              )}
            </p>
          </div>

          <div className="rounded-lg bg-muted/50 px-4 py-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Estado
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {cerrado
                ? "Caso cerrado"
                : etiquetaEstado(
                    tramite.estado,
                  )}
            </p>
          </div>
        </div>
      </div>

      {tramite.esperando_documentacion ||
      tramite.estado ===
        "falta_documentacion" ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">
            RENACLI está esperando documentación para continuar con este trámite.
          </p>

          {tramite.detalle_documentacion_faltante ? (
            <p className="mt-1 text-sm text-amber-900">
              {
                tramite.detalle_documentacion_faltante
              }
            </p>
          ) : null}
        </div>
      ) : null}

      {cerrado ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="text-sm font-semibold text-green-900">
            Este caso está cerrado. La conversación queda disponible para consulta.
          </p>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-lg font-bold text-foreground">
            Conversación con RENACLI
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Los mensajes y archivos quedan guardados dentro de este trámite.
          </p>
        </div>

        <div
          ref={chatRef}
          className="h-[460px] overflow-y-auto bg-muted/20 px-4 py-5 sm:px-5"
        >
          {itemsChat.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-center text-sm text-muted-foreground">
                Todavía no hay mensajes en esta conversación.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {itemsChat.map(
                (item) => {
                  const esRenacli =
                    item.autor ===
                    "administracion"

                  const esSistema =
                    item.autor ===
                    "sistema"

                  if (
                    item.tipo ===
                    "mensaje"
                  ) {
                    return (
                      <div
                        key={item.id}
                        className={`flex ${
                          esRenacli
                            ? "justify-start"
                            : esSistema
                              ? "justify-center"
                              : "justify-end"
                        }`}
                      >
                        <div
                          className={
                            esSistema
                              ? "max-w-[92%] rounded-lg border border-border bg-background px-4 py-3 text-center"
                              : esRenacli
                                ? "max-w-[86%] rounded-2xl rounded-tl-sm border border-border bg-background px-4 py-3 shadow-sm sm:max-w-[75%]"
                                : "max-w-[86%] rounded-2xl rounded-tr-sm bg-primary px-4 py-3 text-primary-foreground shadow-sm sm:max-w-[75%]"
                          }
                        >
                          {!esSistema ? (
                            <p
                              className={`mb-1 text-xs font-bold ${
                                esRenacli
                                  ? "text-primary"
                                  : "text-primary-foreground/80"
                              }`}
                            >
                              {esRenacli
                                ? "RENACLI"
                                : "Vos"}
                            </p>
                          ) : null}

                          <p
                            className={`whitespace-pre-wrap text-sm leading-relaxed ${
                              esSistema
                                ? "text-muted-foreground"
                                : esRenacli
                                  ? "text-foreground"
                                  : "text-primary-foreground"
                            }`}
                          >
                            {item.mensaje}
                          </p>

                          <p
                            className={`mt-2 text-[11px] ${
                              esSistema
                                ? "text-muted-foreground"
                                : esRenacli
                                  ? "text-muted-foreground"
                                  : "text-primary-foreground/70"
                            }`}
                          >
                            {fechaArgentina(
                              item.fecha,
                            )}
                          </p>
                        </div>
                      </div>
                    )
                  }

                  const documento =
                    item.documento

                  return (
                    <div
                      key={item.id}
                      className={`flex ${
                        esRenacli
                          ? "justify-start"
                          : "justify-end"
                      }`}
                    >
                      <a
                        href={`/api/tramite/documentos/${documento.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className={
                          esRenacli
                            ? "max-w-[86%] rounded-2xl rounded-tl-sm border border-border bg-background px-4 py-3 shadow-sm transition hover:bg-muted/50 sm:max-w-[75%]"
                            : "max-w-[86%] rounded-2xl rounded-tr-sm border border-primary/20 bg-primary/10 px-4 py-3 shadow-sm transition hover:bg-primary/15 sm:max-w-[75%]"
                        }
                      >
                        <p className="mb-2 text-xs font-bold text-primary">
                          {esRenacli
                            ? "RENACLI adjuntó un archivo"
                            : "Archivo enviado"}
                        </p>

                        <div className="flex items-center gap-3">
                          <FileText className="size-5 shrink-0 text-primary" />

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {
                                documento.nombre_original
                              }
                            </p>

                            <p className="mt-0.5 text-xs text-muted-foreground">
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
                      </a>
                    </div>
                  )
                },
              )}
            </div>
          )}
        </div>

        {!cerrado ? (
          <form
            onSubmit={enviarMensaje}
            className="border-t border-border bg-background p-4"
          >
            <textarea
              value={textoMensaje}
              onChange={(event) =>
                setTextoMensaje(
                  event.target.value,
                )
              }
              rows={3}
              maxLength={5000}
              placeholder="Escribí tu mensaje para RENACLI..."
              className="w-full resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary"
            />

            {archivos.length > 0 ? (
              <div className="mt-3 rounded-lg border border-border bg-muted/40 px-3 py-2">
                <p className="text-xs font-semibold text-foreground">
                  Archivos seleccionados:
                </p>

                <div className="mt-1 space-y-1">
                  {archivos.map(
                    (archivo) => (
                      <p
                        key={`${archivo.name}-${archivo.size}-${archivo.lastModified}`}
                        className="truncate text-xs text-muted-foreground"
                      >
                        {archivo.name}
                        {" · "}
                        {tamanoLegible(
                          archivo.size,
                        )}
                      </p>
                    ),
                  )}
                </div>
              </div>
            ) : null}

            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <input
                  ref={
                    inputArchivosRef
                  }
                  id="archivos-chat-tramite"
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  onChange={(event) =>
                    setArchivos(
                      Array.from(
                        event.target
                          .files || [],
                      ),
                    )
                  }
                  className="sr-only"
                />

                <label
                  htmlFor="archivos-chat-tramite"
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted"
                >
                  <Paperclip className="size-4" />
                  Adjuntar archivo
                </label>
              </div>

              <button
                type="submit"
                disabled={enviando}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Send className="size-4" />

                {enviando
                  ? "Enviando..."
                  : "Enviar mensaje"}
              </button>
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              Archivos permitidos: PDF, JPG, JPEG y PNG. Máximo 10 MB por archivo y hasta 10 archivos activos por trámite.
            </p>
          </form>
        ) : null}
      </div>

      {aviso ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-900">
          {aviso}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}
    </div>
  )
}
