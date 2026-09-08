import crypto from "crypto"
import Link from "next/link"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { createClient } from "@supabase/supabase-js"
import BotonCerrarTramite from "./BotonCerrarTramite"

const COOKIE_NAME = "renacli_admin_session"

type EstadoConsulta =
  | "pendiente"
  | "en_seguimiento"
  | "en_revision"
  | "falta_documentacion"
  | "respondida"
  | "aprobado"
  | "rechazado"
  | "archivada"

type ConsultaContacto = {
  id: number
  numero_tramite: string | null
  nombre: string
  email: string
  telefono: string | null
  motivo: string
  mensaje: string
  estado: EstadoConsulta
  respuesta_interna: string | null
  respuesta_publica: string | null
  detalle_documentacion_faltante: string | null
  requiere_documentacion: boolean
  esperando_documentacion: boolean
  ultimo_mensaje_en: string | null
  ultimo_mensaje_origen: string | null
  cerrado_en: string | null
  fecha_en_revision: string | null
  fecha_ultima_respuesta: string | null
  fecha_aprobacion: string | null
  fecha_rechazo: string | null
  created_at: string
  updated_at: string
}

type MensajeTramite = {
  id: number
  consulta_id: number
  autor: "solicitante" | "administracion" | "sistema"
  mensaje: string
  visible_solicitante: boolean
  es_mensaje_sistema: boolean
  created_at: string
}

type DocumentoTramite = {
  id: number
  consulta_id: number
  mensaje_id: number | null
  nombre_original: string
  mime_type: string
  tamano_bytes: number
  origen: "solicitante" | "administracion"
  descripcion: string | null
  activo: boolean
  created_at: string
}

type HistorialTramite = {
  id: number
  consulta_id: number
  tipo_evento: string
  estado_anterior: string | null
  estado_nuevo: string | null
  descripcion: string | null
  origen: "solicitante" | "administracion" | "sistema"
  created_at: string
}

type CalificacionTecnico = {
  id: number
  matriculado_id: number
  nombre_cliente: string | null
  email_cliente: string
  puntuacion: number
  comentario: string | null
  estado: "activa" | "anulada"
  motivo_anulacion: string | null
  created_at: string
  updated_at: string
}

type MatriculadoReferencia = {
  id: number
  numero_matricula: string | null
  apellido_nombre: string | null
  categoria_tecnica?: string | null
}

type SolicitudCredencialPdf = {
  matriculado_id: number
  estado: "solicitada" | "disponible" | "entregada"
  categoria_tecnica: string | null
  pdf_path: string | null
  codigo_documento: string | null
  solicitado_en: string
  aprobado_en: string | null
  entregado_en: string | null
  created_at: string
  updated_at: string
}

type ReputacionTecnico = {
  matriculado_id: number
  numero_matricula: string | null
  total_calificaciones: number | null
  promedio_estrellas: number | null
  porcentaje_valoracion: number | null
  mostrar_publicamente: boolean | null
}

type Props = {
  searchParams?: Promise<{
    tab?: string
    tecnico?: string
    mensaje?: string
    error?: string
    tramite?: string
  }>
}

function obtenerTokenAdministrador() {
  const password = process.env.RENACLI_ADMIN_PASSWORD
  if (!password) return null

  return crypto
    .createHash("sha256")
    .update(password)
    .digest("hex")
}

async function estaAutorizado() {
  const cookieStore = await cookies()
  const tokenGuardado = cookieStore.get(COOKIE_NAME)?.value
  const tokenCorrecto = obtenerTokenAdministrador()

  return Boolean(tokenCorrecto) && tokenGuardado === tokenCorrecto
}

function obtenerSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secret = process.env.SUPABASE_SECRET_KEY

  if (!url || !secret) {
    throw new Error("Falta configurar Supabase para el administrador.")
  }

  return createClient(url, secret, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

function formatearFechaHora(valor: string | null) {
  if (!valor) return "-"

  try {
    return new Intl.DateTimeFormat("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(valor))
  } catch {
    return valor
  }
}

function etiquetaMotivo(motivo: string) {
  const etiquetas: Record<string, string> = {
    matricula: "Matrícula",
    renovacion: "Renovación",
    documentacion: "Documentación",
    evaluacion: "Evaluación",
    reclamo: "Reclamo",
    instituciones: "Instituciones",
    otro: "Otro",
  }

  return etiquetas[motivo] ?? motivo
}

function etiquetaEstadoConsulta(estado: EstadoConsulta) {
  if (estado === "en_seguimiento") return "En seguimiento"
  if (estado === "en_revision") return "En revisión"
  if (estado === "falta_documentacion") return "Falta documentación"
  if (estado === "respondida") return "Respondida"
  if (estado === "aprobado") return "Aprobado"
  if (estado === "rechazado") return "Rechazado"
  if (estado === "archivada") return "Archivada"
  return "Pendiente"
}

async function enviarMensajeAdministrador(formData: FormData) {
  "use server"

  if (!(await estaAutorizado())) {
    redirect("/administrador")
  }

  const id = Number(formData.get("id") ?? 0)
  const mensaje = String(formData.get("mensaje") ?? "")
    .trim()
    .slice(0, 5000)
  const archivos = formData
    .getAll("documentos")
    .filter(item => item instanceof File && item.size > 0) as File[]

  if (
    !Number.isInteger(id) ||
    id <= 0 ||
    (!mensaje && archivos.length === 0)
  ) {
    redirect(
      "/administrador/comunicaciones?tab=notificaciones&error=chat#notificaciones"
    )
  }

  if (archivos.length > 10) {
    redirect(
      "/administrador/comunicaciones?tab=notificaciones&error=archivos#notificaciones"
    )
  }

  const tiposPermitidos = new Set([
    "application/pdf",
    "image/jpeg",
    "image/png",
  ])

  for (const archivo of archivos) {
    if (
      archivo.size > 10 * 1024 * 1024 ||
      !tiposPermitidos.has(archivo.type)
    ) {
      redirect(
        "/administrador/comunicaciones?tab=notificaciones&error=archivos#notificaciones"
      )
    }
  }

  const supabase = obtenerSupabaseAdmin()
  const { data: consulta, error: errorConsulta } = await supabase
    .from("consultas_contacto")
    .select("id, estado, cerrado_en")
    .eq("id", id)
    .maybeSingle()

  if (errorConsulta || !consulta) {
    console.error(
      "[RENACLI] Error leyendo trámite para enviar mensaje:",
      errorConsulta
    )
    redirect(
      "/administrador/comunicaciones?tab=notificaciones&error=chat#notificaciones"
    )
  }

  if (consulta.cerrado_en) {
    redirect(
      "/administrador/comunicaciones?tab=notificaciones&error=cerrado#notificaciones"
    )
  }

  if (archivos.length > 0) {
    const { count, error: errorConteo } = await supabase
      .from("documentos_tramites")
      .select("id", { count: "exact", head: true })
      .eq("consulta_id", id)
      .eq("activo", true)

    if (errorConteo || (count ?? 0) + archivos.length > 10) {
      redirect(
        "/administrador/comunicaciones?tab=notificaciones&error=archivos#notificaciones"
      )
    }
  }

  const ahora = new Date().toISOString()
  let mensajeId: number | null = null
  const archivosCreados: Array<{ id: number; path: string }> = []

  try {
    if (mensaje) {
      const { data: mensajeCreado, error: errorMensaje } = await supabase
        .from("mensajes_tramites")
        .insert({
          consulta_id: id,
          autor: "administracion",
          mensaje,
          visible_solicitante: true,
          es_mensaje_sistema: false,
          created_at: ahora,
        })
        .select("id")
        .single()

      if (errorMensaje || !mensajeCreado) {
        throw errorMensaje || new Error("No se pudo crear el mensaje.")
      }

      mensajeId = mensajeCreado.id
    }

    for (const archivo of archivos) {
      const extension =
        archivo.type === "application/pdf"
          ? "pdf"
          : archivo.type === "image/png"
            ? "png"
            : "jpg"

      const storagePath =
        `tramites/${id}/${crypto.randomUUID()}.${extension}`

      const bytes = Buffer.from(await archivo.arrayBuffer())

      const { error: errorStorage } = await supabase.storage
        .from("documentos-tramites")
        .upload(storagePath, bytes, {
          contentType: archivo.type,
          upsert: false,
        })

      if (errorStorage) {
        throw errorStorage
      }

      const { data: documento, error: errorDocumento } = await supabase
        .from("documentos_tramites")
        .insert({
          consulta_id: id,
          mensaje_id: mensajeId,
          nombre_original: archivo.name.slice(0, 255),
          mime_type: archivo.type,
          tamano_bytes: archivo.size,
          storage_path: storagePath,
          origen: "administracion",
          descripcion: null,
          activo: true,
          created_at: ahora,
          updated_at: ahora,
        })
        .select("id")
        .single()

      if (errorDocumento || !documento) {
        await supabase.storage
          .from("documentos-tramites")
          .remove([storagePath])

        throw errorDocumento || new Error("No se pudo registrar el archivo.")
      }

      archivosCreados.push({
        id: documento.id,
        path: storagePath,
      })
    }
  } catch (error) {
    console.error(
      "[RENACLI] Error enviando mensaje o archivos:",
      error
    )

    if (archivosCreados.length > 0) {
      await supabase
        .from("documentos_tramites")
        .delete()
        .in(
          "id",
          archivosCreados.map(item => item.id)
        )

      await supabase.storage
        .from("documentos-tramites")
        .remove(
          archivosCreados.map(item => item.path)
        )
    }

    if (mensajeId) {
      await supabase
        .from("mensajes_tramites")
        .delete()
        .eq("id", mensajeId)
    }

    redirect(
      "/administrador/comunicaciones?tab=notificaciones&error=chat#notificaciones"
    )
  }

  const estadoNuevo =
    consulta.estado === "pendiente"
      ? "en_seguimiento"
      : consulta.estado

  const { error: errorActualizar } = await supabase
    .from("consultas_contacto")
    .update({
      estado: estadoNuevo,
      respuesta_publica: mensaje || undefined,
      fecha_ultima_respuesta: mensaje ? ahora : undefined,
      ultimo_mensaje_en: ahora,
      ultimo_mensaje_origen: "administracion",
      updated_at: ahora,
    })
    .eq("id", id)

  if (errorActualizar) {
    console.error(
      "[RENACLI] Error actualizando trámite después del mensaje:",
      errorActualizar
    )
  }

  const eventos: Array<Record<string, unknown>> = []

  if (mensaje) {
    eventos.push({
      consulta_id: id,
      tipo_evento: "mensaje",
      estado_anterior: consulta.estado,
      estado_nuevo: estadoNuevo,
      descripcion: "RENACLI envió un mensaje al solicitante.",
      origen: "administracion",
      created_at: ahora,
    })
  }

  for (const archivoCreado of archivosCreados) {
    eventos.push({
      consulta_id: id,
      tipo_evento: "documento_cargado",
      estado_anterior: estadoNuevo,
      estado_nuevo: estadoNuevo,
      descripcion: "RENACLI adjuntó un archivo al trámite.",
      origen: "administracion",
      created_at: ahora,
    })
  }

  if (eventos.length > 0) {
    const { error: errorHistorial } = await supabase
      .from("historial_tramites")
      .insert(eventos)

    if (errorHistorial) {
      console.error(
        "[RENACLI] Error registrando historial del chat:",
        errorHistorial
      )
    }
  }

  revalidatePath("/administrador/comunicaciones")

  redirect(
    `/administrador/comunicaciones?tab=notificaciones&mensaje=chat_enviado&tramite=${id}#respuesta-${id}`
  )
}

async function pedirDocumentacionAdministrador(formData: FormData) {
  "use server"

  if (!(await estaAutorizado())) {
    redirect("/administrador")
  }

  const id = Number(formData.get("id") ?? 0)
  const mensaje = String(formData.get("mensaje_documentacion") ?? "")
    .trim()
    .slice(0, 3000)

  if (!Number.isInteger(id) || id <= 0 || !mensaje) {
    redirect(
      "/administrador/comunicaciones?tab=notificaciones&error=documentacion#notificaciones"
    )
  }

  const supabase = obtenerSupabaseAdmin()
  const { data: consulta, error: errorConsulta } = await supabase
    .from("consultas_contacto")
    .select("id, estado, cerrado_en")
    .eq("id", id)
    .maybeSingle()

  if (errorConsulta || !consulta || consulta.cerrado_en) {
    redirect(
      "/administrador/comunicaciones?tab=notificaciones&error=documentacion#notificaciones"
    )
  }

  const ahora = new Date().toISOString()
  const textoChat = `Documentación solicitada por RENACLI:\n${mensaje}`

  const { error: errorMensaje } = await supabase
    .from("mensajes_tramites")
    .insert({
      consulta_id: id,
      autor: "administracion",
      mensaje: textoChat,
      visible_solicitante: true,
      es_mensaje_sistema: false,
      created_at: ahora,
    })

  if (errorMensaje) {
    console.error(
      "[RENACLI] Error enviando pedido de documentación:",
      errorMensaje
    )
    redirect(
      "/administrador/comunicaciones?tab=notificaciones&error=documentacion#notificaciones"
    )
  }

  const { error: errorActualizar } = await supabase
    .from("consultas_contacto")
    .update({
      estado: "falta_documentacion",
      requiere_documentacion: true,
      esperando_documentacion: true,
      detalle_documentacion_faltante: mensaje,
      respuesta_publica: textoChat,
      fecha_ultima_respuesta: ahora,
      ultimo_mensaje_en: ahora,
      ultimo_mensaje_origen: "administracion",
      updated_at: ahora,
    })
    .eq("id", id)

  if (errorActualizar) {
    console.error(
      "[RENACLI] Error actualizando pedido de documentación:",
      errorActualizar
    )
  }

  const { error: errorHistorial } = await supabase
    .from("historial_tramites")
    .insert({
      consulta_id: id,
      tipo_evento: "pedido_documentacion",
      estado_anterior: consulta.estado,
      estado_nuevo: "falta_documentacion",
      descripcion: "RENACLI solicitó documentación adicional.",
      origen: "administracion",
      created_at: ahora,
    })

  if (errorHistorial) {
    console.error(
      "[RENACLI] Error registrando pedido de documentación:",
      errorHistorial
    )
  }

  revalidatePath("/administrador/comunicaciones")

  redirect(
    `/administrador/comunicaciones?tab=notificaciones&mensaje=documentacion_solicitada&tramite=${id}#tramite-${id}`
  )
}

async function cerrarTramiteAdministrador(formData: FormData) {
  "use server"

  if (!(await estaAutorizado())) {
    redirect("/administrador")
  }

  const id = Number(formData.get("id") ?? 0)

  if (!Number.isInteger(id) || id <= 0) {
    redirect(
      "/administrador/comunicaciones?tab=notificaciones&error=cierre#notificaciones"
    )
  }

  const supabase = obtenerSupabaseAdmin()
  const { data: consulta, error: errorConsulta } = await supabase
    .from("consultas_contacto")
    .select("id, estado, cerrado_en")
    .eq("id", id)
    .maybeSingle()

  if (errorConsulta || !consulta) {
    redirect(
      "/administrador/comunicaciones?tab=notificaciones&error=cierre#notificaciones"
    )
  }

  if (consulta.cerrado_en) {
    redirect(
      `/administrador/comunicaciones?tab=notificaciones#tramite-${id}`
    )
  }

  const ahora = new Date().toISOString()

  const { error: errorActualizar } = await supabase
    .from("consultas_contacto")
    .update({
      estado: "respondida",
      cerrado_en: ahora,
      esperando_documentacion: false,
      requiere_documentacion: false,
      updated_at: ahora,
    })
    .eq("id", id)

  if (errorActualizar) {
    console.error(
      "[RENACLI] Error cerrando trámite:",
      errorActualizar
    )
    redirect(
      "/administrador/comunicaciones?tab=notificaciones&error=cierre#notificaciones"
    )
  }

  const { error: errorSistema } = await supabase
    .from("mensajes_tramites")
    .insert({
      consulta_id: id,
      autor: "sistema",
      mensaje: "RENACLI marcó este trámite como terminado.",
      visible_solicitante: true,
      es_mensaje_sistema: true,
      created_at: ahora,
    })

  if (errorSistema) {
    console.error(
      "[RENACLI] Error agregando cierre al chat:",
      errorSistema
    )
  }

  const { error: errorHistorial } = await supabase
    .from("historial_tramites")
    .insert({
      consulta_id: id,
      tipo_evento: "cierre",
      estado_anterior: consulta.estado,
      estado_nuevo: "respondida",
      descripcion: "RENACLI marcó el trámite como terminado.",
      origen: "administracion",
      created_at: ahora,
    })

  if (errorHistorial) {
    console.error(
      "[RENACLI] Error registrando cierre:",
      errorHistorial
    )
  }

  revalidatePath("/administrador/comunicaciones")

  redirect(
    "/administrador/comunicaciones?tab=notificaciones&mensaje=tramite_cerrado#notificaciones"
  )
}

async function aprobarSolicitudPdf(formData: FormData) {
  "use server"

  if (!(await estaAutorizado())) {
    redirect("/administrador")
  }

  const matriculadoId = Number(formData.get("matriculado_id") ?? 0)

  if (!Number.isInteger(matriculadoId) || matriculadoId <= 0) {
    redirect(
      "/administrador/comunicaciones?tab=notificaciones&error=pdf_solicitud"
    )
  }

  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value

  if (!token) {
    redirect("/administrador")
  }

  const baseUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://www.renacli.com.ar"
  ).replace(/\/$/, "")

  try {
    const respuesta = await fetch(
      `${baseUrl}/api/carnet-pdf/${matriculadoId}?solicitud=1`,
      {
        method: "GET",
        cache: "no-store",
        headers: {
          Cookie: `${COOKIE_NAME}=${token}`,
        },
      }
    )

    if (!respuesta.ok) {
      let detalle = ""

      try {
        const datos = await respuesta.json()
        detalle = String(datos?.error ?? "")
      } catch {
        // Si no hay JSON, conservamos el mensaje general.
      }

      console.error(
        "[RENACLI] Error aprobando solicitud PDF:",
        respuesta.status,
        detalle
      )

      redirect(
        "/administrador/comunicaciones?tab=notificaciones&error=pdf_solicitud"
      )
    }
  } catch (error) {
    console.error(
      "[RENACLI] Error generando PDF solicitado:",
      error
    )

    redirect(
      "/administrador/comunicaciones?tab=notificaciones&error=pdf_solicitud"
    )
  }

  redirect(
    "/administrador/comunicaciones?tab=notificaciones&mensaje=pdf_aprobado#solicitudes-pdf"
  )
}

async function anularCalificacion(formData: FormData) {
  "use server"

  if (!(await estaAutorizado())) {
    redirect("/administrador")
  }

  const id = Number(formData.get("id") ?? 0)
  const matriculadoId = Number(formData.get("matriculado_id") ?? 0)
  const motivo = String(formData.get("motivo_anulacion") ?? "")
    .trim()
    .slice(0, 500)

  if (
    !Number.isInteger(id) ||
    id <= 0 ||
    !Number.isInteger(matriculadoId) ||
    matriculadoId <= 0 ||
    !motivo
  ) {
    redirect(
      "/administrador/comunicaciones?tab=calificaciones&error=calificacion"
    )
  }

  const supabase = obtenerSupabaseAdmin()

  const { error } = await supabase
    .from("calificaciones_tecnicos")
    .update({
      estado: "anulada",
      motivo_anulacion: motivo,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) {
    console.error(
      "[RENACLI] Error anulando calificación:",
      error
    )
    redirect(
      `/administrador/comunicaciones?tab=calificaciones&tecnico=${matriculadoId}&error=calificacion`
    )
  }

  redirect(
    `/administrador/comunicaciones?tab=calificaciones&tecnico=${matriculadoId}&mensaje=calificacion_anulada#tecnico-${matriculadoId}`
  )
}

async function restaurarCalificacion(formData: FormData) {
  "use server"

  if (!(await estaAutorizado())) {
    redirect("/administrador")
  }

  const id = Number(formData.get("id") ?? 0)
  const matriculadoId = Number(formData.get("matriculado_id") ?? 0)

  if (
    !Number.isInteger(id) ||
    id <= 0 ||
    !Number.isInteger(matriculadoId) ||
    matriculadoId <= 0
  ) {
    redirect(
      "/administrador/comunicaciones?tab=calificaciones&error=calificacion"
    )
  }

  const supabase = obtenerSupabaseAdmin()

  const { error } = await supabase
    .from("calificaciones_tecnicos")
    .update({
      estado: "activa",
      motivo_anulacion: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) {
    console.error(
      "[RENACLI] Error restaurando calificación:",
      error
    )
    redirect(
      `/administrador/comunicaciones?tab=calificaciones&tecnico=${matriculadoId}&error=calificacion`
    )
  }

  redirect(
    `/administrador/comunicaciones?tab=calificaciones&tecnico=${matriculadoId}&mensaje=calificacion_restaurada#tecnico-${matriculadoId}`
  )
}

export default async function ComunicacionesPage({
  searchParams,
}: Props) {
  const parametros = searchParams ? await searchParams : {}

  if (!(await estaAutorizado())) {
    redirect("/administrador")
  }

  const tab =
    parametros.tab === "notificaciones"
      ? "notificaciones"
      : "calificaciones"

  const tecnicoSeleccionado = Number(parametros.tecnico ?? 0)
  const tramiteSeleccionado = Number(parametros.tramite ?? 0)
  const supabase = obtenerSupabaseAdmin()

  const {
    data: consultasData,
    error: errorConsultas,
  } = await supabase
    .from("consultas_contacto")
    .select(
      "id, numero_tramite, nombre, email, telefono, motivo, mensaje, estado, respuesta_interna, respuesta_publica, detalle_documentacion_faltante, requiere_documentacion, esperando_documentacion, ultimo_mensaje_en, ultimo_mensaje_origen, cerrado_en, fecha_en_revision, fecha_ultima_respuesta, fecha_aprobacion, fecha_rechazo, created_at, updated_at"
    )
    .order("created_at", { ascending: false })
    .limit(500)

  const {
    data: mensajesTramitesData,
    error: errorMensajesTramites,
  } = await supabase
    .from("mensajes_tramites")
    .select(
      "id, consulta_id, autor, mensaje, visible_solicitante, es_mensaje_sistema, created_at"
    )
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(10000)

  const {
    data: documentosTramitesData,
    error: errorDocumentosTramites,
  } = await supabase
    .from("documentos_tramites")
    .select(
      "id, consulta_id, mensaje_id, nombre_original, mime_type, tamano_bytes, origen, descripcion, activo, created_at"
    )
    .eq("activo", true)
    .order("created_at", { ascending: false })
    .limit(5000)

  const {
    data: historialTramitesData,
    error: errorHistorialTramites,
  } = await supabase
    .from("historial_tramites")
    .select(
      "id, consulta_id, tipo_evento, estado_anterior, estado_nuevo, descripcion, origen, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(5000)

  const {
    data: calificacionesData,
    error: errorCalificaciones,
  } = await supabase
    .from("calificaciones_tecnicos")
    .select(
      "id, matriculado_id, nombre_cliente, email_cliente, puntuacion, comentario, estado, motivo_anulacion, created_at, updated_at"
    )
    .order("created_at", { ascending: false })
    .limit(1000)

  const {
    data: solicitudesPdfData,
    error: errorSolicitudesPdf,
  } = await supabase
    .from("solicitudes_credencial_pdf")
    .select(
      "matriculado_id, estado, categoria_tecnica, pdf_path, codigo_documento, solicitado_en, aprobado_en, entregado_en, created_at, updated_at"
    )
    .order("solicitado_en", { ascending: false })
    .limit(1000)

  if (errorConsultas) {
    console.error(
      "[RENACLI] Error obteniendo consultas:",
      errorConsultas
    )
  }

  if (errorMensajesTramites) {
    console.error(
      "[RENACLI] Error obteniendo mensajes de trámites:",
      errorMensajesTramites
    )
  }

  if (errorDocumentosTramites) {
    console.error(
      "[RENACLI] Error obteniendo documentos de trámites:",
      errorDocumentosTramites
    )
  }

  if (errorHistorialTramites) {
    console.error(
      "[RENACLI] Error obteniendo historial de trámites:",
      errorHistorialTramites
    )
  }

  if (errorCalificaciones) {
    console.error(
      "[RENACLI] Error obteniendo calificaciones:",
      errorCalificaciones
    )
  }

  if (errorSolicitudesPdf) {
    console.error(
      "[RENACLI] Error obteniendo solicitudes PDF:",
      errorSolicitudesPdf
    )
  }

  const consultas = (consultasData ?? []) as ConsultaContacto[]
  const mensajesTramites =
    (mensajesTramitesData ?? []) as MensajeTramite[]
  const documentosTramites =
    (documentosTramitesData ?? []) as DocumentoTramite[]
  const historialTramites =
    (historialTramitesData ?? []) as HistorialTramite[]
  const calificaciones =
    (calificacionesData ?? []) as CalificacionTecnico[]
  const solicitudesPdf =
    (solicitudesPdfData ?? []) as SolicitudCredencialPdf[]

  const idsMatriculados = Array.from(
    new Set([
      ...calificaciones.map(item => item.matriculado_id),
      ...solicitudesPdf.map(item => item.matriculado_id),
    ])
  )

  let matriculados: MatriculadoReferencia[] = []

  if (idsMatriculados.length > 0) {
    const {
      data: matriculadosData,
      error: errorMatriculados,
    } = await supabase
      .from("matriculados")
      .select("id, numero_matricula, apellido_nombre, categoria_tecnica")
      .in("id", idsMatriculados)

    if (errorMatriculados) {
      console.error(
        "[RENACLI] Error obteniendo matriculados:",
        errorMatriculados
      )
    } else {
      matriculados =
        (matriculadosData ?? []) as MatriculadoReferencia[]
    }
  }

  const { data: reputacionData } = await supabase
    .from("reputacion_matriculados")
    .select(
      "matriculado_id, numero_matricula, total_calificaciones, promedio_estrellas, porcentaje_valoracion, mostrar_publicamente"
    )

  const reputaciones =
    (reputacionData ?? []) as ReputacionTecnico[]

  const matriculadosPorId = new Map<
    number,
    MatriculadoReferencia
  >()

  for (const matriculado of matriculados) {
    matriculadosPorId.set(matriculado.id, matriculado)
  }

  const reputacionPorId = new Map<number, ReputacionTecnico>()

  for (const reputacion of reputaciones) {
    reputacionPorId.set(reputacion.matriculado_id, reputacion)
  }

  const calificacionesPorTecnico = new Map<
    number,
    CalificacionTecnico[]
  >()

  for (const calificacion of calificaciones) {
    const existentes =
      calificacionesPorTecnico.get(calificacion.matriculado_id) ?? []
    existentes.push(calificacion)
    calificacionesPorTecnico.set(
      calificacion.matriculado_id,
      existentes
    )
  }

  const tecnicosConCalificaciones = Array.from(
    calificacionesPorTecnico.keys()
  )
    .map(id => {
      const tecnico = matriculadosPorId.get(id)
      const items = calificacionesPorTecnico.get(id) ?? []
      const activas = items.filter(item => item.estado === "activa")
      const anuladas = items.filter(item => item.estado === "anulada")
      const reputacion = reputacionPorId.get(id)

      return {
        id,
        nombre:
          tecnico?.apellido_nombre || "Técnico matriculado",
        matricula:
          tecnico?.numero_matricula ||
          reputacion?.numero_matricula ||
          "Matrícula no disponible",
        total: items.length,
        activas: activas.length,
        anuladas: anuladas.length,
        promedio:
          reputacion?.promedio_estrellas ??
          (activas.length > 0
            ? activas.reduce(
                (suma, item) => suma + item.puntuacion,
                0
              ) / activas.length
            : 0),
        items,
      }
    })
    .sort((a, b) =>
      a.nombre.localeCompare(b.nombre, "es", {
        sensitivity: "base",
      })
    )

  const mensajesPorConsulta = new Map<number, MensajeTramite[]>()
  for (const mensaje of mensajesTramites) {
    const actuales = mensajesPorConsulta.get(mensaje.consulta_id) ?? []
    actuales.push(mensaje)
    mensajesPorConsulta.set(mensaje.consulta_id, actuales)
  }

  const documentosPorConsulta = new Map<number, DocumentoTramite[]>()
  for (const documento of documentosTramites) {
    const actuales = documentosPorConsulta.get(documento.consulta_id) ?? []
    actuales.push(documento)
    documentosPorConsulta.set(documento.consulta_id, actuales)
  }

  const historialPorConsulta = new Map<number, HistorialTramite[]>()
  for (const evento of historialTramites) {
    const actuales = historialPorConsulta.get(evento.consulta_id) ?? []
    actuales.push(evento)
    historialPorConsulta.set(evento.consulta_id, actuales)
  }

  const abiertos = consultas
    .filter(item => !item.cerrado_en)
    .sort((a, b) => {
      const fechaA = new Date(
        a.ultimo_mensaje_en || a.updated_at || a.created_at
      ).getTime()
      const fechaB = new Date(
        b.ultimo_mensaje_en || b.updated_at || b.created_at
      ).getTime()
      return fechaB - fechaA
    })


  const cerrados = consultas
    .filter(item => Boolean(item.cerrado_en))
    .sort((a, b) => {
      const fechaA = new Date(
        a.cerrado_en || a.updated_at || a.created_at
      ).getTime()
      const fechaB = new Date(
        b.cerrado_en || b.updated_at || b.created_at
      ).getTime()
      return fechaB - fechaA
    })

  const solicitudesPendientes = solicitudesPdf.filter(
    item => item.estado === "solicitada"
  )
  const solicitudesDisponibles = solicitudesPdf.filter(
    item => item.estado === "disponible"
  )
  const solicitudesEntregadas = solicitudesPdf.filter(
    item => item.estado === "entregada"
  )

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#eef5fa",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <header
        style={{
          background: "#0d4f7c",
          color: "white",
          padding: "25px 40px",
          borderBottom: "4px solid #35c4cf",
        }}
      >
        <div
          style={{
            maxWidth: "1150px",
            margin: "0 auto",
          }}
        >
          <h1 style={{ margin: 0, letterSpacing: "4px" }}>
            RENACLI
          </h1>
          <p style={{ margin: "6px 0 0" }}>
            Registro Nacional de Climatización y Refrigeración
          </p>
        </div>
      </header>

      <section
        style={{
          maxWidth: "1150px",
          margin: "35px auto",
          padding: "0 20px 50px",
        }}
      >
        <Link
          href="/administrador"
          style={{
            display: "inline-block",
            marginBottom: "22px",
            color: "#0d5689",
            fontWeight: "bold",
            textDecoration: "none",
          }}
        >
          ← Volver al panel de administración
        </Link>

        <p
          style={{
            color: "#64748b",
            fontSize: "13px",
            fontWeight: "bold",
            letterSpacing: "1px",
            marginBottom: "6px",
          }}
        >
          ADMINISTRACIÓN
        </p>

        <h2
          style={{
            marginTop: 0,
            marginBottom: "8px",
            color: "#172033",
            fontSize: "32px",
          }}
        >
          Comunicaciones y calificaciones
        </h2>

        <p
          style={{
            color: "#64748b",
            lineHeight: 1.6,
            marginTop: 0,
            marginBottom: "24px",
          }}
        >
          Panel organizado para trabajar con grandes cantidades de
          consultas y valoraciones sin mezclar la información.
        </p>

        {parametros.mensaje === "consulta_actualizada" && (
          <Aviso
            tipo="ok"
            texto="Estado de la notificación actualizado correctamente."
          />
        )}
        {parametros.mensaje === "gestion_guardada" && (
          <Aviso
            tipo="ok"
            texto="Gestión del trámite guardada correctamente."
          />
        )}
        {parametros.mensaje === "chat_enviado" && (
          <Aviso
            tipo="ok"
            texto="Mensaje enviado correctamente al solicitante."
          />
        )}
        {parametros.mensaje === "documentacion_solicitada" && (
          <Aviso
            tipo="ok"
            texto="Pedido de documentación enviado correctamente."
          />
        )}
        {parametros.mensaje === "tramite_cerrado" && (
          <Aviso
            tipo="ok"
            texto="Trámite terminado y archivado correctamente."
          />
        )}
        {parametros.mensaje === "calificacion_anulada" && (
          <Aviso
            tipo="ok"
            texto="Calificación anulada correctamente."
          />
        )}
        {parametros.mensaje === "calificacion_restaurada" && (
          <Aviso
            tipo="ok"
            texto="Calificación restaurada correctamente."
          />
        )}
        {parametros.error === "consulta" && (
          <Aviso
            tipo="error"
            texto="No fue posible actualizar la notificación."
          />
        )}
        {parametros.error === "chat" && (
          <Aviso
            tipo="error"
            texto="No fue posible enviar el mensaje."
          />
        )}
        {parametros.error === "archivos" && (
          <Aviso
            tipo="error"
            texto="No fue posible adjuntar los archivos. Revisá formato, tamaño y cantidad."
          />
        )}
        {parametros.error === "documentacion" && (
          <Aviso
            tipo="error"
            texto="No fue posible enviar el pedido de documentación."
          />
        )}
        {parametros.error === "cierre" && (
          <Aviso
            tipo="error"
            texto="No fue posible cerrar el caso."
          />
        )}
        {parametros.error === "cerrado" && (
          <Aviso
            tipo="error"
            texto="El caso ya está cerrado y no admite nuevos mensajes."
          />
        )}
        {parametros.error === "calificacion" && (
          <Aviso
            tipo="error"
            texto="No fue posible modificar la calificación."
          />
        )}
        {parametros.mensaje === "pdf_aprobado" && (
          <Aviso
            tipo="ok"
            texto="La credencial PDF fue generada y quedó disponible para el técnico."
          />
        )}
        {parametros.error === "pdf_solicitud" && (
          <Aviso
            tipo="error"
            texto="No fue posible aprobar o generar la credencial PDF solicitada."
          />
        )}

        <nav
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: "10px",
            marginBottom: "28px",
          }}
        >
          <Link
            href="/administrador/comunicaciones?tab=calificaciones"
            style={{
              ...solapa,
              ...(tab === "calificaciones"
                ? solapaActiva
                : solapaInactiva),
            }}
          >
            Calificaciones
            <span style={contadorSolapa}>
              {calificaciones.length}
            </span>
          </Link>

          <Link
            href="/administrador/comunicaciones?tab=notificaciones"
            style={{
              ...solapa,
              ...(tab === "notificaciones"
                ? solapaActiva
                : solapaInactiva),
            }}
          >
            Notificaciones
            <span style={contadorSolapa}>
              {abiertos.length + solicitudesPendientes.length + solicitudesDisponibles.length}
            </span>
          </Link>
        </nav>

        {tab === "calificaciones" ? (
          <section id="calificaciones">
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "12px",
                marginBottom: "22px",
              }}
            >
              <Resumen
                numero={tecnicosConCalificaciones.length}
                texto="Técnicos con calificaciones"
              />
              <Resumen
                numero={calificaciones.filter(
                  item => item.estado === "activa"
                ).length}
                texto="Calificaciones activas"
              />
              <Resumen
                numero={calificaciones.filter(
                  item => item.estado === "anulada"
                ).length}
                texto="Calificaciones anuladas"
              />
            </div>

            <h3 style={tituloSeccion}>Matriculados</h3>
            <p style={textoAyuda}>
              Seleccioná un matriculado para ver solamente sus
              calificaciones.
            </p>

            {tecnicosConCalificaciones.length === 0 ? (
              <Vacio texto="Todavía no hay calificaciones registradas." />
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: "10px",
                }}
              >
                {tecnicosConCalificaciones.map(tecnico => {
                  const abierto =
                    tecnicoSeleccionado === tecnico.id

                  return (
                    <div
                      key={tecnico.id}
                      id={`tecnico-${tecnico.id}`}
                      style={{
                        ...tarjeta,
                        padding: 0,
                        overflow: "hidden",
                        scrollMarginTop: "20px",
                      }}
                    >
                      <Link
                        href={
                          abierto
                            ? "/administrador/comunicaciones?tab=calificaciones"
                            : `/administrador/comunicaciones?tab=calificaciones&tecnico=${tecnico.id}#tecnico-${tecnico.id}`
                        }
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "minmax(180px, 1fr) auto",
                          gap: "16px",
                          alignItems: "center",
                          padding: "18px 20px",
                          textDecoration: "none",
                          color: "inherit",
                          background: abierto
                            ? "#f8fbfd"
                            : "white",
                        }}
                      >
                        <div>
                          <strong
                            style={{
                              display: "block",
                              color: "#172033",
                              fontSize: "17px",
                              marginBottom: "5px",
                            }}
                          >
                            {tecnico.nombre}
                          </strong>
                          <span
                            style={{
                              color: "#64748b",
                              fontSize: "14px",
                            }}
                          >
                            {tecnico.matricula}
                          </span>
                        </div>

                        <div
                          style={{
                            textAlign: "right",
                            minWidth: "130px",
                          }}
                        >
                          <div
                            style={{
                              fontWeight: "bold",
                              color: "#0d5689",
                            }}
                          >
                            {tecnico.activas > 0
                              ? `${Number(tecnico.promedio).toFixed(2)} / 5`
                              : "Sin activas"}
                          </div>
                          <div
                            style={{
                              marginTop: "4px",
                              color: "#64748b",
                              fontSize: "13px",
                            }}
                          >
                            {tecnico.total} calificación
                            {tecnico.total === 1 ? "" : "es"}{" "}
                            {abierto ? "▲" : "▼"}
                          </div>
                        </div>
                      </Link>

                      {abierto && (
                        <div
                          style={{
                            borderTop: "1px solid #e2e8f0",
                            padding: "18px",
                            background: "#f8fafc",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              gap: "10px",
                              flexWrap: "wrap",
                              marginBottom: "16px",
                            }}
                          >
                            <Pildora
                              texto={`${tecnico.activas} activas`}
                              tipo="verde"
                            />
                            <Pildora
                              texto={`${tecnico.anuladas} anuladas`}
                              tipo="gris"
                            />
                          </div>

                          {tecnico.items.map(calificacion => (
                            <CalificacionCard
                              key={calificacion.id}
                              calificacion={calificacion}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        ) : (
          <section id="notificaciones">
            <section id="solicitudes-pdf" style={{ scrollMarginTop: "20px" }}>
              <h3 style={tituloSeccion}>Solicitudes de credencial PDF</h3>
              <p style={textoAyuda}>
                Solicitudes realizadas desde la credencial digital. RENACLI
                genera el documento solamente después de la aprobación del
                administrador.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "12px",
                  marginBottom: "18px",
                }}
              >
                <Resumen
                  numero={solicitudesPendientes.length}
                  texto="PDF por aprobar"
                />
                <Resumen
                  numero={solicitudesDisponibles.length}
                  texto="PDF disponibles"
                />
                <Resumen
                  numero={solicitudesEntregadas.length}
                  texto="PDF entregados"
                />
              </div>

              {solicitudesPendientes.length === 0 ? (
                <Vacio texto="No hay solicitudes de credencial PDF pendientes." />
              ) : (
                solicitudesPendientes.map(solicitud => (
                  <SolicitudPdfCard
                    key={solicitud.matriculado_id}
                    solicitud={solicitud}
                    tecnico={matriculadosPorId.get(solicitud.matriculado_id)}
                  />
                ))
              )}

              {solicitudesDisponibles.length > 0 && (
                <details
                  style={{
                    ...tarjeta,
                    marginTop: "16px",
                    padding: 0,
                    overflow: "hidden",
                  }}
                >
                  <summary
                    style={{
                      cursor: "pointer",
                      padding: "16px 18px",
                      fontWeight: "bold",
                      color: "#172033",
                      listStylePosition: "inside",
                    }}
                  >
                    Disponibles para el técnico ({solicitudesDisponibles.length})
                  </summary>
                  <div
                    style={{
                      padding: "14px 18px 4px",
                      borderTop: "1px solid #e2e8f0",
                      background: "#f8fafc",
                    }}
                  >
                    {solicitudesDisponibles.map(solicitud => (
                      <SolicitudPdfCard
                        key={solicitud.matriculado_id}
                        solicitud={solicitud}
                        tecnico={matriculadosPorId.get(solicitud.matriculado_id)}
                      />
                    ))}
                  </div>
                </details>
              )}

              {solicitudesEntregadas.length > 0 && (
                <details
                  style={{
                    ...tarjeta,
                    marginTop: "16px",
                    marginBottom: "30px",
                    padding: 0,
                    overflow: "hidden",
                  }}
                >
                  <summary
                    style={{
                      cursor: "pointer",
                      padding: "16px 18px",
                      fontWeight: "bold",
                      color: "#172033",
                      listStylePosition: "inside",
                    }}
                  >
                    Historial de PDF entregados ({solicitudesEntregadas.length})
                  </summary>
                  <div
                    style={{
                      padding: "14px 18px 4px",
                      borderTop: "1px solid #e2e8f0",
                      background: "#f8fafc",
                    }}
                  >
                    {solicitudesEntregadas.map(solicitud => (
                      <SolicitudPdfCard
                        key={solicitud.matriculado_id}
                        solicitud={solicitud}
                        tecnico={matriculadosPorId.get(solicitud.matriculado_id)}
                      />
                    ))}
                  </div>
                </details>
              )}
            </section>

            <h3 style={tituloSeccion}>Trámites pendientes</h3>
            <p style={textoAyuda}>
              Acá quedan solamente los trámites que todavía requieren atención.
              Abrí el chat, respondé y, cuando esté completamente terminado,
              usá el botón “Trámite terminado” para archivarlo.
            </p>

            {abiertos.length === 0 ? (
              <Vacio texto="No hay trámites pendientes." />
            ) : (
              abiertos.map(consulta => (
                <ConsultaCard
                  key={consulta.id}
                  consulta={consulta}
                  mensajes={mensajesPorConsulta.get(consulta.id) ?? []}
                  documentos={documentosPorConsulta.get(consulta.id) ?? []}
                  historial={historialPorConsulta.get(consulta.id) ?? []}
                  forzarAbierto={tramiteSeleccionado === consulta.id}
                />
              ))
            )}

            <details
              style={{
                ...tarjeta,
                marginTop: "32px",
                padding: 0,
                overflow: "hidden",
              }}
            >
              <summary
                style={{
                  cursor: "pointer",
                  padding: "18px 20px",
                  fontWeight: "bold",
                  color: "#172033",
                  listStylePosition: "inside",
                }}
              >
                Trámites terminados / archivados ({cerrados.length})
              </summary>

              <div
                style={{
                  padding: "0 18px 18px",
                  borderTop: "1px solid #e2e8f0",
                  background: "#f8fafc",
                }}
              >
                {cerrados.length === 0 ? (
                  <p style={textoAyuda}>
                    Todavía no hay trámites terminados.
                  </p>
                ) : (
                  cerrados.map(consulta => (
                    <ConsultaCard
                      key={consulta.id}
                      consulta={consulta}
                      mensajes={mensajesPorConsulta.get(consulta.id) ?? []}
                      documentos={documentosPorConsulta.get(consulta.id) ?? []}
                      historial={historialPorConsulta.get(consulta.id) ?? []}
                      forzarAbierto={false}
                    />
                  ))
                )}
              </div>
            </details>
          </section>
        )}
      </section>
    </main>
  )
}

function SolicitudPdfCard({
  solicitud,
  tecnico,
}: {
  solicitud: SolicitudCredencialPdf
  tecnico?: MatriculadoReferencia
}) {
  const categoria =
    solicitud.categoria_tecnica ||
    tecnico?.categoria_tecnica ||
    "base"

  const etiquetaCategoria =
    categoria === "inverter"
      ? "Inverter"
      : categoria === "superior"
        ? "Superior"
        : "Base"

  const estadoTexto =
    solicitud.estado === "solicitada"
      ? "Pendiente de aprobación"
      : solicitud.estado === "disponible"
        ? "Disponible para el técnico"
        : "Entregada"

  return (
    <article
      style={{
        ...tarjeta,
        marginBottom: "14px",
        border:
          solicitud.estado === "solicitada"
            ? "1px solid #f5c451"
            : solicitud.estado === "disponible"
              ? "1px solid #86efac"
              : "1px solid #cbd5e1",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "14px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <p
            style={{
              margin: "0 0 5px",
              color: "#0d5689",
              fontSize: "12px",
              fontWeight: "bold",
              textTransform: "uppercase",
              letterSpacing: "0.7px",
            }}
          >
            Solicitud de credencial PDF
          </p>
          <h4
            style={{
              margin: "0 0 5px",
              color: "#172033",
              fontSize: "18px",
            }}
          >
            {tecnico?.apellido_nombre || "Técnico matriculado"}
          </h4>
          <p style={{ margin: 0, color: "#64748b", fontSize: "13px" }}>
            Solicitada {formatearFechaHora(solicitud.solicitado_en)}
          </p>
        </div>

        <span
          style={{
            display: "inline-block",
            padding: "6px 10px",
            borderRadius: "999px",
            fontSize: "12px",
            fontWeight: "bold",
            background:
              solicitud.estado === "solicitada"
                ? "#fffbeb"
                : solicitud.estado === "disponible"
                  ? "#f0fdf4"
                  : "#f1f5f9",
            color:
              solicitud.estado === "solicitada"
                ? "#92400e"
                : solicitud.estado === "disponible"
                  ? "#166534"
                  : "#475569",
          }}
        >
          {estadoTexto}
        </span>
      </div>

      <div
        style={{
          marginTop: "16px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "12px",
        }}
      >
        <Dato
          etiqueta="Matrícula"
          valor={tecnico?.numero_matricula || "No disponible"}
        />
        <Dato etiqueta="Categoría" valor={etiquetaCategoria} />
        {solicitud.codigo_documento ? (
          <Dato
            etiqueta="Código PDF"
            valor={solicitud.codigo_documento}
          />
        ) : null}
        {solicitud.aprobado_en ? (
          <Dato
            etiqueta="Aprobado"
            valor={formatearFechaHora(solicitud.aprobado_en)}
          />
        ) : null}
        {solicitud.entregado_en ? (
          <Dato
            etiqueta="Entregado"
            valor={formatearFechaHora(solicitud.entregado_en)}
          />
        ) : null}
      </div>

      {solicitud.estado === "solicitada" ? (
        <form
          action={aprobarSolicitudPdf}
          style={{
            marginTop: "16px",
            paddingTop: "16px",
            borderTop: "1px solid #e2e8f0",
          }}
        >
          <input
            type="hidden"
            name="matriculado_id"
            value={solicitud.matriculado_id}
          />
          <p
            style={{
              margin: "0 0 10px",
              color: "#64748b",
              fontSize: "13px",
              lineHeight: 1.5,
            }}
          >
            Al aprobar se generará un nuevo documento con código único, se
            registrará en RENACLI y quedará disponible en la credencial del
            técnico.
          </p>
          <button type="submit" style={botonAzul}>
            Aprobar y generar PDF
          </button>
        </form>
      ) : null}
    </article>
  )
}

function ConsultaCard({
  consulta,
  mensajes,
  documentos,
  historial,
  forzarAbierto,
}: {
  consulta: ConsultaContacto
  mensajes: MensajeTramite[]
  documentos: DocumentoTramite[]
  historial: HistorialTramite[]
  forzarAbierto: boolean
}) {
  const cerrado = Boolean(consulta.cerrado_en)

  const elementosChat: Array<
    | {
        tipo: "mensaje"
        fecha: string
        id: string
        autor: "solicitante" | "administracion" | "sistema"
        mensaje: string
      }
    | {
        tipo: "documento"
        fecha: string
        id: string
        autor: "solicitante" | "administracion"
        documento: DocumentoTramite
      }
  > = []

  for (const mensaje of mensajes) {
    elementosChat.push({
      tipo: "mensaje",
      fecha: mensaje.created_at,
      id: `m-${mensaje.id}`,
      autor: mensaje.autor,
      mensaje: mensaje.mensaje,
    })
  }

  for (const documento of documentos) {
    elementosChat.push({
      tipo: "documento",
      fecha: documento.created_at,
      id: `d-${documento.id}`,
      autor: documento.origen,
      documento,
    })
  }

  elementosChat.sort((a, b) => {
    const diferencia =
      new Date(b.fecha).getTime() - new Date(a.fecha).getTime()

    if (diferencia !== 0) return diferencia
    return b.id.localeCompare(a.id)
  })

  const ultimoOrigen =
    consulta.ultimo_mensaje_origen === "solicitante"
      ? "Último mensaje del solicitante"
      : consulta.ultimo_mensaje_origen === "administracion"
        ? "Última respuesta de RENACLI"
        : "Sin actividad reciente"

  return (
    <article
      id={`tramite-${consulta.id}`}
      style={{
        ...tarjeta,
        marginBottom: "16px",
        scrollMarginTop: "20px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "14px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <p
            style={{
              margin: "0 0 5px",
              color: "#0d5689",
              fontSize: "12px",
              fontWeight: "bold",
              textTransform: "uppercase",
              letterSpacing: "0.7px",
            }}
          >
            {consulta.numero_tramite ||
              "Consulta anterior sin número de trámite"}
          </p>

          <h4
            style={{
              margin: "0 0 5px",
              color: "#172033",
              fontSize: "18px",
            }}
          >
            {consulta.nombre}
          </h4>

          <p
            style={{
              margin: 0,
              color: "#64748b",
              fontSize: "13px",
            }}
          >
            {etiquetaMotivo(consulta.motivo)}
            {" · "}
            {consulta.email}
            {consulta.telefono ? ` · ${consulta.telefono}` : ""}
          </p>

          <p
            style={{
              margin: "5px 0 0",
              color:
                consulta.ultimo_mensaje_origen === "solicitante"
                  ? "#b45309"
                  : "#64748b",
              fontSize: "12px",
              fontWeight: "bold",
            }}
          >
            {ultimoOrigen}
            {consulta.ultimo_mensaje_en
              ? ` · ${formatearFechaHora(consulta.ultimo_mensaje_en)}`
              : ""}
          </p>
        </div>

      </div>

      <details
        open={
          !cerrado &&
          (forzarAbierto || consulta.ultimo_mensaje_origen === "solicitante")
        }
        style={{
          marginTop: "16px",
          border: "1px solid #dbe4ec",
          borderRadius: "12px",
          overflow: "hidden",
          background: "#ffffff",
        }}
      >
        <summary
          style={{
            cursor: "pointer",
            padding: "14px 16px",
            fontWeight: "bold",
            color: "#172033",
            background: "#f8fbfd",
            listStylePosition: "inside",
          }}
        >
          Conversación
        </summary>

        <div
          style={{
            borderTop: "1px solid #e2e8f0",
          }}
        >
          <div
            style={{
              height: "420px",
              overflowY: "auto",
              padding: "16px",
              background: "#f8fafc",
              display: "flex",
              flexDirection: "column-reverse",
              gap: "10px",
            }}
          >
            {elementosChat.length === 0 ? (
              <div
                style={{
                  color: "#64748b",
                  textAlign: "center",
                  padding: "30px 15px",
                }}
              >
                Todavía no hay mensajes en esta conversación.
              </div>
            ) : (
              elementosChat.map(item => {
                if (item.tipo === "mensaje") {
                  const esRenacli = item.autor === "administracion"
                  const esSistema = item.autor === "sistema"

                  return (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        justifyContent: esSistema
                          ? "center"
                          : esRenacli
                            ? "flex-end"
                            : "flex-start",
                      }}
                    >
                      <div
                        style={{
                          maxWidth: esSistema ? "90%" : "78%",
                          padding: esSistema ? "8px 12px" : "11px 13px",
                          borderRadius: "12px",
                          background: esSistema
                            ? "#eef2f7"
                            : esRenacli
                              ? "#0d5689"
                              : "#ffffff",
                          color: esRenacli ? "white" : "#172033",
                          border: esRenacli
                            ? "1px solid #0d5689"
                            : "1px solid #dbe4ec",
                          boxShadow: esSistema
                            ? "none"
                            : "0 1px 3px rgba(0,0,0,0.05)",
                        }}
                      >
                        {!esSistema && (
                          <strong
                            style={{
                              display: "block",
                              marginBottom: "4px",
                              fontSize: "12px",
                              color: esRenacli ? "#dff7ff" : "#0d5689",
                            }}
                          >
                            {esRenacli ? "RENACLI" : "Solicitante"}
                          </strong>
                        )}

                        <p
                          style={{
                            margin: 0,
                            whiteSpace: "pre-wrap",
                            lineHeight: 1.5,
                            fontSize: "14px",
                          }}
                        >
                          {item.mensaje}
                        </p>

                        <p
                          style={{
                            margin: "6px 0 0",
                            fontSize: "11px",
                            color: esRenacli ? "#dbeafe" : "#64748b",
                          }}
                        >
                          {formatearFechaHora(item.fecha)}
                        </p>
                      </div>
                    </div>
                  )
                }

                const esRenacli = item.autor === "administracion"

                return (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      justifyContent: esRenacli ? "flex-end" : "flex-start",
                    }}
                  >
                    <a
                      href={`/api/administrador/tramites/documentos/${item.documento.id}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "block",
                        maxWidth: "78%",
                        padding: "11px 13px",
                        borderRadius: "12px",
                        background: esRenacli ? "#eaf5fb" : "#ffffff",
                        border: "1px solid #cbd5e1",
                        color: "#0d5689",
                        textDecoration: "none",
                      }}
                    >
                      <strong
                        style={{
                          display: "block",
                          marginBottom: "5px",
                          fontSize: "12px",
                        }}
                      >
                        {esRenacli
                          ? "Archivo enviado por RENACLI"
                          : "Archivo del solicitante"}
                      </strong>

                      <span
                        style={{
                          display: "block",
                          overflowWrap: "anywhere",
                          fontWeight: "bold",
                          fontSize: "13px",
                        }}
                      >
                        {item.documento.nombre_original}
                      </span>

                      <span
                        style={{
                          display: "block",
                          marginTop: "5px",
                          color: "#64748b",
                          fontSize: "11px",
                        }}
                      >
                        {formatearFechaHora(item.fecha)}
                        {" · "}
                        Abrir archivo
                      </span>
                    </a>
                  </div>
                )
              })
            )}
          </div>

          {!cerrado ? (
            <div
              id={`respuesta-${consulta.id}`}
              style={{
                padding: "15px",
                borderTop: "1px solid #e2e8f0",
                background: "#ffffff",
                scrollMarginTop: "18px",
              }}
            >
              <form
                action={enviarMensajeAdministrador}
                encType="multipart/form-data"
              >
                <input type="hidden" name="id" value={consulta.id} />

                <textarea
                  name="mensaje"
                  rows={3}
                  maxLength={5000}
                  placeholder="Escribí la respuesta para el solicitante..."
                  style={{
                    ...campoTexto,
                    marginTop: 0,
                  }}
                />

                <div
                  style={{
                    marginTop: "10px",
                    display: "flex",
                    gap: "10px",
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <label
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "7px",
                      padding: "10px 13px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                      color: "#334155",
                      fontWeight: "bold",
                      cursor: "pointer",
                      fontSize: "13px",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        fontSize: "18px",
                        lineHeight: 1,
                      }}
                    >
                      📎
                    </span>
                    Adjuntar documentación
                    <input
                      type="file"
                      name="documentos"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                      style={{
                        position: "absolute",
                        width: "1px",
                        height: "1px",
                        padding: 0,
                        margin: "-1px",
                        overflow: "hidden",
                        clip: "rect(0, 0, 0, 0)",
                        whiteSpace: "nowrap",
                        border: 0,
                      }}
                    />
                  </label>

                  <button type="submit" style={botonAzul}>
                    Enviar mensaje
                  </button>
                </div>

                <p
                  style={{
                    margin: "8px 0 0",
                    color: "#64748b",
                    fontSize: "12px",
                  }}
                >
                  Escribí el mensaje y, si hace falta, adjuntá la documentación
                  desde el ganchito. Al enviar, todo queda guardado en este mismo chat.
                </p>
              </form>


              <BotonCerrarTramite
                id={consulta.id}
                action={cerrarTramiteAdministrador}
              />
            </div>
          ) : null}
        </div>
      </details>

      {historial.length > 0 && (
        <details
          style={{
            marginTop: "12px",
          }}
        >
          <summary
            style={{
              cursor: "pointer",
              color: "#64748b",
              fontWeight: "bold",
              fontSize: "13px",
            }}
          >
            Ver historial interno ({historial.length})
          </summary>

          <div
            style={{
              display: "grid",
              gap: "7px",
              marginTop: "9px",
            }}
          >
            {historial.map(evento => (
              <div
                key={evento.id}
                style={{
                  padding: "9px 11px",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  background: "#f8fafc",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: "#334155",
                    fontSize: "12px",
                  }}
                >
                  {evento.descripcion || evento.tipo_evento}
                  {" · "}
                  {formatearFechaHora(evento.created_at)}
                </p>
              </div>
            ))}
          </div>
        </details>
      )}
    </article>
  )
}

function CalificacionCard({
  calificacion,
}: {
  calificacion: CalificacionTecnico
}) {
  return (
    <article
      style={{
        background: "white",
        border: "1px solid #dbe4ec",
        borderRadius: "10px",
        padding: "16px",
        marginBottom: "12px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            aria-label={`${calificacion.puntuacion} de 5 estrellas`}
            style={{
              fontSize: "22px",
              letterSpacing: "2px",
            }}
          >
            {[1, 2, 3, 4, 5].map(estrella => (
              <span
                key={estrella}
                style={{
                  color:
                    estrella <= calificacion.puntuacion
                      ? "#f59e0b"
                      : "#cbd5e1",
                }}
              >
                ★
              </span>
            ))}
          </div>
          <p
            style={{
              margin: "6px 0 0",
              color: "#64748b",
              fontSize: "13px",
            }}
          >
            {formatearFechaHora(calificacion.created_at)}
          </p>
        </div>
        <EstadoCalificacion estado={calificacion.estado} />
      </div>

      <div
        style={{
          marginTop: "14px",
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "10px",
        }}
      >
        <Dato
          etiqueta="Cliente"
          valor={calificacion.nombre_cliente || "No informado"}
        />
        <Dato
          etiqueta="Correo"
          valor={calificacion.email_cliente}
        />
      </div>

      {calificacion.comentario && (
        <div style={cajaTexto}>
          <strong style={etiquetaCaja}>Comentario</strong>
          <p style={parrafoCaja}>{calificacion.comentario}</p>
        </div>
      )}

      {calificacion.estado === "activa" ? (
        <form
          action={anularCalificacion}
          style={{
            marginTop: "15px",
            paddingTop: "15px",
            borderTop: "1px solid #e2e8f0",
          }}
        >
          <input type="hidden" name="id" value={calificacion.id} />
          <input
            type="hidden"
            name="matriculado_id"
            value={calificacion.matriculado_id}
          />
          <label
            style={{
              display: "block",
              fontWeight: "bold",
              color: "#334155",
            }}
          >
            Motivo de anulación
            <input
              type="text"
              name="motivo_anulacion"
              required
              maxLength={500}
              placeholder="Ej.: spam, contenido inapropiado o calificación no válida"
              style={campoInput}
            />
          </label>
          <button
            type="submit"
            style={{
              ...botonRojo,
              marginTop: "9px",
            }}
          >
            Anular calificación
          </button>
        </form>
      ) : (
        <div
          style={{
            marginTop: "15px",
            paddingTop: "15px",
            borderTop: "1px solid #e2e8f0",
          }}
        >
          <p
            style={{
              margin: "0 0 10px",
              color: "#64748b",
            }}
          >
            <strong>Motivo de anulación:</strong>{" "}
            {calificacion.motivo_anulacion || "No informado"}
          </p>
          <form action={restaurarCalificacion}>
            <input
              type="hidden"
              name="id"
              value={calificacion.id}
            />
            <input
              type="hidden"
              name="matriculado_id"
              value={calificacion.matriculado_id}
            />
            <button type="submit" style={botonAzul}>
              Restaurar calificación
            </button>
          </form>
        </div>
      )}
    </article>
  )
}

function EstadoConsulta({
  estado,
}: {
  estado: EstadoConsulta
}) {
  const colores =
    estado === "pendiente"
      ? { fondo: "#fffbeb", borde: "#fbbf24", texto: "#92400e" }
      : estado === "en_seguimiento"
        ? { fondo: "#eff6ff", borde: "#93c5fd", texto: "#1d4ed8" }
        : estado === "en_revision"
          ? { fondo: "#ecfeff", borde: "#67e8f9", texto: "#0e7490" }
          : estado === "falta_documentacion"
            ? { fondo: "#fff7ed", borde: "#fdba74", texto: "#c2410c" }
            : estado === "respondida" || estado === "aprobado"
              ? { fondo: "#f0fdf4", borde: "#86efac", texto: "#166534" }
              : estado === "rechazado"
                ? { fondo: "#fff1f2", borde: "#fda4af", texto: "#be123c" }
                : { fondo: "#f1f5f9", borde: "#cbd5e1", texto: "#475569" }

  return (
    <span
      style={{
        display: "inline-block",
        padding: "6px 10px",
        borderRadius: "999px",
        background: colores.fondo,
        border: `1px solid ${colores.borde}`,
        color: colores.texto,
        fontSize: "12px",
        fontWeight: "bold",
      }}
    >
      {etiquetaEstadoConsulta(estado)}
    </span>
  )
}

function EstadoCalificacion({
  estado,
}: {
  estado: string
}) {
  const activa = estado === "activa"

  return (
    <span
      style={{
        display: "inline-block",
        padding: "6px 10px",
        borderRadius: "999px",
        background: activa ? "#f0fdf4" : "#fff1f2",
        border: activa
          ? "1px solid #86efac"
          : "1px solid #fda4af",
        color: activa ? "#166534" : "#be123c",
        fontSize: "12px",
        fontWeight: "bold",
        textTransform: "uppercase",
      }}
    >
      {estado}
    </span>
  )
}

function Pildora({
  texto,
  tipo,
}: {
  texto: string
  tipo: "verde" | "gris"
}) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "5px 9px",
        borderRadius: "999px",
        background: tipo === "verde" ? "#f0fdf4" : "#f1f5f9",
        color: tipo === "verde" ? "#166534" : "#475569",
        fontSize: "12px",
        fontWeight: "bold",
      }}
    >
      {texto}
    </span>
  )
}

function Resumen({
  numero,
  texto,
}: {
  numero: number
  texto: string
}) {
  return (
    <div style={tarjeta}>
      <div
        style={{
          fontSize: "28px",
          fontWeight: "bold",
          color: "#0d5689",
        }}
      >
        {numero}
      </div>
      <div
        style={{
          marginTop: "5px",
          color: "#64748b",
          fontSize: "14px",
        }}
      >
        {texto}
      </div>
    </div>
  )
}

function Dato({
  etiqueta,
  valor,
}: {
  etiqueta: string
  valor: string
}) {
  return (
    <div>
      <strong
        style={{
          display: "block",
          marginBottom: "4px",
          color: "#64748b",
          fontSize: "12px",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}
      >
        {etiqueta}
      </strong>
      <span
        style={{
          color: "#172033",
          overflowWrap: "anywhere",
        }}
      >
        {valor}
      </span>
    </div>
  )
}

function Aviso({
  texto,
  tipo,
}: {
  texto: string
  tipo: "ok" | "error"
}) {
  return (
    <div
      style={{
        padding: "15px 17px",
        marginBottom: "20px",
        borderRadius: "9px",
        border:
          tipo === "ok"
            ? "1px solid #86efac"
            : "1px solid #fda4af",
        background: tipo === "ok" ? "#f0fdf4" : "#fff1f2",
        color: tipo === "ok" ? "#166534" : "#be123c",
        fontWeight: "bold",
      }}
    >
      {texto}
    </div>
  )
}

function Vacio({ texto }: { texto: string }) {
  return (
    <div
      style={{
        ...tarjeta,
        color: "#64748b",
        marginBottom: "14px",
      }}
    >
      {texto}
    </div>
  )
}

const tarjeta = {
  background: "white",
  border: "1px solid #d7e0e7",
  borderRadius: "12px",
  padding: "18px",
  boxShadow: "0 2px 7px rgba(0,0,0,0.05)",
}

const solapa = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "10px",
  padding: "15px 12px",
  borderRadius: "10px",
  fontWeight: "bold",
  textDecoration: "none",
  border: "1px solid #cbd5e1",
}

const solapaActiva = {
  background: "#0d5689",
  color: "white",
  borderColor: "#0d5689",
}

const solapaInactiva = {
  background: "white",
  color: "#334155",
}

const contadorSolapa = {
  minWidth: "24px",
  height: "24px",
  padding: "0 6px",
  borderRadius: "999px",
  background: "rgba(148,163,184,0.25)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "12px",
}

const tituloSeccion = {
  fontSize: "23px",
  color: "#172033",
  marginBottom: "5px",
}

const textoAyuda = {
  color: "#64748b",
  marginTop: 0,
  marginBottom: "16px",
  lineHeight: 1.5,
}

const cajaTexto = {
  marginTop: "15px",
  padding: "14px",
  background: "#f8fafc",
  borderRadius: "9px",
  border: "1px solid #e2e8f0",
}

const etiquetaCaja = {
  display: "block",
  marginBottom: "6px",
  color: "#334155",
}

const parrafoCaja = {
  margin: 0,
  whiteSpace: "pre-wrap" as const,
  lineHeight: 1.6,
  color: "#334155",
}

const etiquetaFormulario = {
  display: "block",
  fontWeight: "bold",
  color: "#334155",
}

const campoTexto = {
  width: "100%",
  boxSizing: "border-box" as const,
  marginTop: "8px",
  padding: "11px",
  borderRadius: "8px",
  border: "1px solid #cbd5e1",
  resize: "vertical" as const,
  fontFamily: "Arial, sans-serif",
}

const campoInput = {
  width: "100%",
  boxSizing: "border-box" as const,
  marginTop: "8px",
  padding: "11px",
  borderRadius: "8px",
  border: "1px solid #cbd5e1",
}

const botonAzul = {
  padding: "10px 15px",
  borderRadius: "8px",
  border: 0,
  background: "#0d5689",
  color: "white",
  fontWeight: "bold",
  cursor: "pointer",
}

const botonBlanco = {
  padding: "9px 13px",
  borderRadius: "8px",
  border: "1px solid #cbd5e1",
  background: "white",
  color: "#334155",
  fontWeight: "bold",
  cursor: "pointer",
}

const botonRojo = {
  padding: "10px 15px",
  borderRadius: "8px",
  border: 0,
  background: "#be123c",
  color: "white",
  fontWeight: "bold",
  cursor: "pointer",
}
