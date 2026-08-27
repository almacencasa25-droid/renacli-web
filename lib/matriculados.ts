/**
 * Capa de datos de RENACLI.
 *
 * ------------------------------------------------------------------
 * CONECTADO A SUPABASE
 * ------------------------------------------------------------------
 * Tabla consultada: `matriculados`
 * Búsqueda habilitada por los campos `matricula` y `dni`.
 *
 * Variables de entorno utilizadas (ya configuradas en Vercel):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 *
 * El DNI se admite como criterio de búsqueda pero NUNCA se expone
 * públicamente en la ficha, al igual que el domicilio particular, el
 * correo electrónico y las observaciones administrativas.
 * ------------------------------------------------------------------
 */

import { getSupabase, supabaseConfigurado } from "@/lib/supabase"

export type EstadoMatricula = "vigente" | "vencida" | "suspendida" | "baja"

export type TipoBusqueda = "matricula" | "dni"

export type MatriculadoPublico = {
  /** Número de matrícula (identificador público, usado también en la URL del QR) */
  matricula: string
  apellido: string
  nombre: string
  estado: EstadoMatricula
  /** Fecha en formato ISO (YYYY-MM-DD) */
  fecha_emision: string
  /** Fecha en formato ISO (YYYY-MM-DD) */
  fecha_vencimiento: string
  especialidad: string
  localidad: string
  provincia: string
  telefono: string
  /** URL pública de la fotografía del matriculado (puede ser null) */
  foto_url: string | null
}

export const ESTADOS: Record<
  EstadoMatricula,
  { etiqueta: string; descripcion: string; tono: "success" | "warning" | "destructive" | "muted" }
> = {
  vigente: {
    etiqueta: "MATRÍCULA VIGENTE",
    descripcion: "El técnico se encuentra habilitado para ejercer.",
    tono: "success",
  },
  vencida: {
    etiqueta: "MATRÍCULA VENCIDA",
    descripcion: "La matrícula no fue renovada. El técnico no se encuentra habilitado.",
    tono: "warning",
  },
  suspendida: {
    etiqueta: "MATRÍCULA SUSPENDIDA",
    descripcion: "La habilitación se encuentra suspendida por resolución del registro.",
    tono: "destructive",
  },
  baja: {
    etiqueta: "MATRÍCULA DADA DE BAJA",
    descripcion: "La matrícula fue dada de baja del registro.",
    tono: "muted",
  },
}

/**
 * DATOS DE EJEMPLO — SOLO PARA VISUALIZACIÓN.
 * Se utilizan únicamente si las variables de entorno de Supabase no
 * están disponibles. No corresponden a personas ni matrículas reales.
 */
export const MATRICULADOS_EJEMPLO: MatriculadoPublico[] = [
  {
    matricula: "RNC-000001",
    apellido: "Ejemplo",
    nombre: "Técnico Uno",
    estado: "vigente",
    fecha_emision: "2024-03-15",
    fecha_vencimiento: "2027-03-15",
    especialidad: "Refrigeración comercial",
    localidad: "Localidad de ejemplo",
    provincia: "Provincia de ejemplo",
    telefono: "000 000-0000",
    foto_url: null,
  },
  {
    matricula: "RNC-000002",
    apellido: "Muestra",
    nombre: "Técnica Dos",
    estado: "vigente",
    fecha_emision: "2023-08-01",
    fecha_vencimiento: "2026-08-01",
    especialidad: "Aire acondicionado domiciliario",
    localidad: "Localidad de ejemplo",
    provincia: "Provincia de ejemplo",
    telefono: "000 000-0000",
    foto_url: null,
  },
  {
    matricula: "RNC-000003",
    apellido: "Demostración",
    nombre: "Técnico Tres",
    estado: "vencida",
    fecha_emision: "2019-05-20",
    fecha_vencimiento: "2022-05-20",
    especialidad: "Climatización industrial",
    localidad: "Localidad de ejemplo",
    provincia: "Provincia de ejemplo",
    telefono: "000 000-0000",
    foto_url: null,
  },
  {
    matricula: "RNC-000004",
    apellido: "Prueba",
    nombre: "Técnico Cuatro",
    estado: "suspendida",
    fecha_emision: "2021-11-10",
    fecha_vencimiento: "2026-11-10",
    especialidad: "Cámaras frigoríficas",
    localidad: "Localidad de ejemplo",
    provincia: "Provincia de ejemplo",
    telefono: "000 000-0000",
    foto_url: null,
  },
  {
    matricula: "RNC-000005",
    apellido: "Testigo",
    nombre: "Técnico Cinco",
    estado: "baja",
    fecha_emision: "2018-02-05",
    fecha_vencimiento: "2021-02-05",
    especialidad: "Refrigeración de transporte",
    localidad: "Localidad de ejemplo",
    provincia: "Provincia de ejemplo",
    telefono: "000 000-0000",
    foto_url: null,
  },
]

const TABLA = "matriculados"

/** Normaliza el número de matrícula ingresado por el usuario (admite "1", "000001", "rnc-000001"). */
export function normalizarMatricula(valor: string) {
  const limpio = valor.replace(/[^0-9a-zA-Z]/g, "").toUpperCase()
  const soloNumeros = limpio.replace(/^RNC/, "")
  if (/^\d+$/.test(soloNumeros)) {
    return `RNC-${soloNumeros.padStart(6, "0")}`
  }
  return valor.toUpperCase().trim()
}

/** Genera las variantes admitidas del número de matrícula para la consulta. */
function variantesMatricula(valor: string) {
  const bruto = valor.trim()
  const alfanumerico = bruto.replace(/[^0-9a-zA-Z]/g, "").toUpperCase()
  const digitos = alfanumerico.replace(/^RNC/, "")
  const variantes = new Set<string>([bruto, bruto.toUpperCase(), normalizarMatricula(bruto)])
  if (/^\d+$/.test(digitos)) {
    variantes.add(digitos)
    variantes.add(String(Number(digitos)))
    variantes.add(digitos.padStart(6, "0"))
    variantes.add(`RNC-${digitos.padStart(6, "0")}`)
  }
  // PostgREST usa la coma como separador dentro de `.or()`
  return [...variantes].filter((v) => v.length > 0 && !v.includes(","))
}

/** Genera las variantes admitidas del DNI para la consulta. */
function variantesDni(valor: string) {
  const digitos = valor.replace(/\D/g, "")
  const variantes = new Set<string>([valor.trim()])
  if (digitos) {
    variantes.add(digitos)
    variantes.add(String(Number(digitos)))
  }
  return [...variantes].filter((v) => v.length > 0 && !v.includes(","))
}

function primerValor(fila: Record<string, unknown>, claves: string[]) {
  for (const clave of claves) {
    const valor = fila[clave]
    if (valor !== null && valor !== undefined && String(valor).trim() !== "") {
      return String(valor).trim()
    }
  }
  return ""
}

function normalizarEstado(valor: string, vencimiento: string): EstadoMatricula {
  const texto = valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()

  if (texto.includes("suspend")) return "suspendida"
  if (texto.includes("baja") || texto.includes("anulad") || texto.includes("cancelad")) return "baja"
  if (texto.includes("venc")) return "vencida"
  if (texto === "false" || texto === "no" || texto.includes("inactiv")) return "baja"

  const esVigente =
    texto === "true" ||
    texto === "si" ||
    texto === "" ||
    texto.includes("vigente") ||
    texto.includes("activ") ||
    texto.includes("habilit")

  if (esVigente) {
    // Si la fecha de vencimiento ya pasó, se informa como vencida.
    if (vencimiento && vencimiento < new Date().toISOString().slice(0, 10)) return "vencida"
    return "vigente"
  }

  return "vencida"
}

function normalizarFecha(valor: string) {
  if (!valor) return ""
  const iso = valor.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : valor
}

/** Convierte una fila de la tabla `matriculados` en la ficha pública. */
function mapearFila(fila: Record<string, unknown>): MatriculadoPublico {
  const fecha_emision = normalizarFecha(
    primerValor(fila, ["fecha_emision", "fecha_de_emision", "emision", "fecha_alta", "created_at"]),
  )
  const fecha_vencimiento = normalizarFecha(
    primerValor(fila, ["fecha_vencimiento", "fecha_de_vencimiento", "vencimiento", "fecha_baja"]),
  )

  return {
    matricula: primerValor(fila, ["matricula", "nro_matricula", "numero_matricula"]),
    apellido: primerValor(fila, ["apellido", "apellidos"]),
    nombre: primerValor(fila, ["nombre", "nombres"]),
    estado: normalizarEstado(
      primerValor(fila, ["estado", "estado_matricula", "situacion", "vigente", "activo"]),
      fecha_vencimiento,
    ),
    fecha_emision,
    fecha_vencimiento,
    especialidad: primerValor(fila, ["especialidad", "especialidades", "rubro", "categoria"]),
    localidad: primerValor(fila, ["localidad", "ciudad"]),
    provincia: primerValor(fila, ["provincia", "estado_provincia"]),
    telefono: primerValor(fila, ["telefono", "telefono_contacto", "celular"]),
    foto_url: primerValor(fila, ["foto_url", "foto", "url_foto", "imagen", "avatar_url"]) || null,
  }
}

/**
 * Busca matriculados en la tabla `matriculados` por número de matrícula o por DNI.
 */
export async function buscarMatriculados(termino: string, tipo: TipoBusqueda): Promise<MatriculadoPublico[]> {
  const busqueda = termino.trim()
  if (!busqueda) return []

  const supabase = getSupabase()

  if (!supabase) {
    // Sin credenciales disponibles: se responde con los datos de ejemplo.
    const objetivo = normalizarMatricula(busqueda)
    return tipo === "matricula" ? MATRICULADOS_EJEMPLO.filter((m) => m.matricula === objetivo) : []
  }

  const campo = tipo === "matricula" ? "matricula" : "dni"
  const variantes = tipo === "matricula" ? variantesMatricula(busqueda) : variantesDni(busqueda)
  const filtro = variantes.map((valor) => `${campo}.eq.${valor}`).join(",")

  const { data, error } = await supabase.from(TABLA).select("*").or(filtro).limit(20)

  if (error) {
    console.log("[v0] Error al consultar matriculados:", error.message)
    throw new Error("No se pudo consultar el registro en este momento. Intente nuevamente en unos minutos.")
  }

  return (data ?? []).map((fila) => mapearFila(fila as Record<string, unknown>))
}

/**
 * Obtiene la ficha de un matriculado por número de matrícula.
 * Usada por la página individual (destino del código QR del carnet).
 */
export async function obtenerMatriculado(matricula: string): Promise<MatriculadoPublico | null> {
  const valor = decodeURIComponent(matricula).trim()
  if (!valor) return null

  const supabase = getSupabase()

  if (!supabase) {
    const objetivo = normalizarMatricula(valor)
    return MATRICULADOS_EJEMPLO.find((m) => m.matricula === objetivo) ?? null
  }

  const filtro = variantesMatricula(valor)
    .map((v) => `matricula.eq.${v}`)
    .join(",")

  const { data, error } = await supabase.from(TABLA).select("*").or(filtro).limit(1)

  if (error) {
    console.log("[v0] Error al obtener matriculado:", error.message)
    return null
  }

  const fila = (data ?? [])[0]
  return fila ? mapearFila(fila as Record<string, unknown>) : null
}

export function formatearFecha(iso: string) {
  const [anio, mes, dia] = iso.split("-")
  if (!anio || !mes || !dia) return iso
  return `${dia}/${mes}/${anio}`
}

export { supabaseConfigurado }
