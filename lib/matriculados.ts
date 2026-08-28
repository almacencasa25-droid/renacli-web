/**
 * Capa de datos de RENACLI.
 *
 * ------------------------------------------------------------------
 * CONECTADO A SUPABASE
 * ------------------------------------------------------------------
 *
 * Vista pública consultada:
 *   matriculados_publicos
 *
 * Campo público de búsqueda:
 *   numero_matricula
 *
 * Variables de entorno utilizadas:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 *
 * IMPORTANTE:
 * DNI, domicilio particular, correo electrónico y observaciones
 * administrativas NO se consultan desde esta capa pública.
 * ------------------------------------------------------------------
 */

import { getSupabase, supabaseConfigurado } from "@/lib/supabase"

export type EstadoMatricula =
  | "vigente"
  | "vencida"
  | "suspendida"
  | "baja"

export type TipoBusqueda = "matricula" | "dni"

export type MatriculadoPublico = {
  /** Número de matrícula público. También se utiliza para el QR. */
  matricula: string
  apellido: string
  nombre: string
  estado: EstadoMatricula

  /** Fecha ISO YYYY-MM-DD */
  fecha_emision: string

  /** Fecha ISO YYYY-MM-DD */
  fecha_vencimiento: string

  especialidad: string
  localidad: string
  provincia: string
  telefono: string
  foto_url: string | null
}

export const ESTADOS: Record<
  EstadoMatricula,
  {
    etiqueta: string
    descripcion: string
    tono: "success" | "warning" | "destructive" | "muted"
  }
> = {
  vigente: {
    etiqueta: "MATRÍCULA VIGENTE",
    descripcion: "El técnico se encuentra habilitado para ejercer.",
    tono: "success",
  },

  vencida: {
    etiqueta: "MATRÍCULA VENCIDA",
    descripcion:
      "La matrícula no fue renovada. El técnico no se encuentra habilitado.",
    tono: "warning",
  },

  suspendida: {
    etiqueta: "MATRÍCULA SUSPENDIDA",
    descripcion:
      "La habilitación se encuentra suspendida por resolución del registro.",
    tono: "destructive",
  },

  baja: {
    etiqueta: "MATRÍCULA DADA DE BAJA",
    descripcion: "La matrícula fue dada de baja del registro.",
    tono: "muted",
  },
}

/**
 * Datos ficticios utilizados únicamente si Supabase
 * no está configurado.
 */
export const MATRICULADOS_EJEMPLO: MatriculadoPublico[] = [
  {
    matricula: "RENACLI-000001",
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
]

/**
 * IMPORTANTE:
 * Esta es la vista pública expuesta en Supabase Data API.
 * No utilizar aquí la tabla privada "matriculados".
 */
const TABLA = "matriculados_publicos"

/**
 * Normaliza números de matrícula.
 *
 * Admite ejemplos como:
 *   1
 *   000001
 *   RENACLI-000001
 *   renacli000001
 *   RNC-000001
 *
 * Devuelve:
 *   RENACLI-000001
 */
export function normalizarMatricula(valor: string) {
  const original = valor.trim()

  if (!original) return ""

  const limpio = original
    .replace(/[^0-9a-zA-Z]/g, "")
    .toUpperCase()

  let digitos = limpio

  if (digitos.startsWith("RENACLI")) {
    digitos = digitos.substring("RENACLI".length)
  } else if (digitos.startsWith("RNC")) {
    digitos = digitos.substring("RNC".length)
  }

  if (/^\d+$/.test(digitos)) {
    return `RENACLI-${digitos.padStart(6, "0")}`
  }

  return original.toUpperCase()
}

/**
 * Genera las distintas variantes que aceptaremos durante
 * la búsqueda para mantener compatibilidad con datos existentes.
 */
function variantesMatricula(valor: string) {
  const bruto = valor.trim()

  if (!bruto) return []

  const limpio = bruto
    .replace(/[^0-9a-zA-Z]/g, "")
    .toUpperCase()

  let digitos = limpio

  if (digitos.startsWith("RENACLI")) {
    digitos = digitos.substring("RENACLI".length)
  } else if (digitos.startsWith("RNC")) {
    digitos = digitos.substring("RNC".length)
  }

  const variantes = new Set<string>()

  variantes.add(bruto)
  variantes.add(bruto.toUpperCase())
  variantes.add(normalizarMatricula(bruto))

  if (/^\d+$/.test(digitos)) {
    const seisDigitos = digitos.padStart(6, "0")

    variantes.add(digitos)
    variantes.add(String(Number(digitos)))
    variantes.add(seisDigitos)
    variantes.add(`RENACLI-${seisDigitos}`)
    variantes.add(`RNC-${seisDigitos}`)
  }

  return [...variantes].filter(
    (valorVariante) =>
      valorVariante.length > 0 &&
      !valorVariante.includes(","),
  )
}

/**
 * Obtiene el primer valor existente de una serie
 * de posibles nombres de columna.
 */
function primerValor(
  fila: Record<string, unknown>,
  claves: string[],
) {
  for (const clave of claves) {
    const valor = fila[clave]

    if (
      valor !== null &&
      valor !== undefined &&
      String(valor).trim() !== ""
    ) {
      return String(valor).trim()
    }
  }

  return ""
}

/**
 * Convierte el estado almacenado en Supabase
 * al estado utilizado por la interfaz.
 */
function normalizarEstado(
  valor: string,
  vencimiento: string,
): EstadoMatricula {
  const texto = valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()

  if (texto.includes("suspend")) {
    return "suspendida"
  }

  if (
    texto.includes("baja") ||
    texto.includes("anulad") ||
    texto.includes("cancelad")
  ) {
    return "baja"
  }

  if (texto.includes("venc")) {
    return "vencida"
  }

  if (
    texto === "false" ||
    texto === "no" ||
    texto.includes("inactiv")
  ) {
    return "baja"
  }

  const esVigente =
    texto === "true" ||
    texto === "si" ||
    texto === "" ||
    texto.includes("vigente") ||
    texto.includes("activ") ||
    texto.includes("habilit")

  if (esVigente) {
    if (
      vencimiento &&
      vencimiento < new Date().toISOString().slice(0, 10)
    ) {
      return "vencida"
    }

    return "vigente"
  }

  return "vencida"
}

/**
 * Normaliza una fecha recibida desde Supabase.
 */
function normalizarFecha(valor: string) {
  if (!valor) return ""

  const iso = valor.slice(0, 10)

  return /^\d{4}-\d{2}-\d{2}$/.test(iso)
    ? iso
    : valor
}

/**
 * Nuestra base guarda el nombre completo en:
 *
 * apellido_nombre
 *
 * La interfaz original de v0 espera:
 *
 * apellido
 * nombre
 *
 * Por eso aquí dividimos el texto.
 */
function separarApellidoNombre(nombreCompleto: string) {
  const limpio = nombreCompleto.trim()

  if (!limpio) {
    return {
      apellido: "",
      nombre: "",
    }
  }

  const partes = limpio
    .split(/\s+/)
    .filter(Boolean)

  if (partes.length === 1) {
    return {
      apellido: partes[0],
      nombre: "",
    }
  }

  /**
   * Por ahora tomamos la primera palabra como apellido
   * y el resto como nombres.
   *
   * Más adelante podemos guardar apellido y nombres
   * en columnas independientes si lo preferís.
   */
  return {
    apellido: partes[0],
    nombre: partes.slice(1).join(" "),
  }
}

/**
 * Convierte una fila de matriculados_publicos
 * al formato utilizado por la web.
 */
function mapearFila(
  fila: Record<string, unknown>,
): MatriculadoPublico {
  const fecha_emision = normalizarFecha(
    primerValor(fila, [
      "fecha_emision",
      "fecha_de_emision",
      "emision",
      "fecha_alta",
      "created_at",
    ]),
  )

  const fecha_vencimiento = normalizarFecha(
    primerValor(fila, [
      "fecha_vencimiento",
      "fecha_de_vencimiento",
      "vencimiento",
      "fecha_baja",
    ]),
  )

  const nombreCompleto = primerValor(fila, [
    "apellido_nombre",
    "nombre_completo",
    "apellido_y_nombre",
  ])

  let apellido = primerValor(fila, [
    "apellido",
    "apellidos",
  ])

  let nombre = primerValor(fila, [
    "nombre",
    "nombres",
  ])

  if ((!apellido || !nombre) && nombreCompleto) {
    const separado =
      separarApellidoNombre(nombreCompleto)

    if (!apellido) apellido = separado.apellido
    if (!nombre) nombre = separado.nombre
  }

  return {
    matricula: primerValor(fila, [
      "numero_matricula",
      "matricula",
      "nro_matricula",
    ]),

    apellido,

    nombre,

    estado: normalizarEstado(
      primerValor(fila, [
        "estado",
        "estado_matricula",
        "situacion",
        "vigente",
        "activo",
      ]),
      fecha_vencimiento,
    ),

    fecha_emision,

    fecha_vencimiento,

    especialidad: primerValor(fila, [
      "especialidad",
      "especialidades",
      "rubro",
      "categoria",
    ]),

    localidad: primerValor(fila, [
      "localidad",
      "ciudad",
    ]),

    provincia: primerValor(fila, [
      "provincia",
      "estado_provincia",
    ]),

    telefono: primerValor(fila, [
      "telefono",
      "telefono_contacto",
      "celular",
    ]),

    foto_url:
      primerValor(fila, [
        "foto_url",
        "foto",
        "url_foto",
        "imagen",
        "avatar_url",
      ]) || null,
  }
}

/**
 * Busca matriculados en la vista pública de Supabase.
 *
 * Por seguridad, actualmente la búsqueda pública
 * solamente está habilitada por matrícula.
 */
export async function buscarMatriculados(
  termino: string,
  tipo: TipoBusqueda,
): Promise<MatriculadoPublico[]> {
  const busqueda = termino.trim()

  if (!busqueda) return []

  /**
   * El DNI pertenece a la tabla administrativa privada.
   * No se consulta desde matriculados_publicos.
   */
  if (tipo === "dni") {
    return []
  }

  const supabase = getSupabase()

  if (!supabase) {
    const objetivo = normalizarMatricula(busqueda)

    return MATRICULADOS_EJEMPLO.filter(
      (m) => m.matricula === objetivo,
    )
  }

  const variantes =
    variantesMatricula(busqueda)

  if (variantes.length === 0) {
    return []
  }

  const filtro = variantes
    .map(
      (valor) =>
        `numero_matricula.eq.${valor}`,
    )
    .join(",")

  const { data, error } = await supabase
    .from(TABLA)
    .select("*")
    .or(filtro)
    .limit(20)

  if (error) {
    console.error(
      "[RENACLI] Error al consultar matriculados_publicos:",
      error,
    )

    throw new Error(
      "No se pudo consultar el registro en este momento. Intente nuevamente en unos minutos.",
    )
  }

  return (data ?? []).map((fila) =>
    mapearFila(
      fila as Record<string, unknown>,
    ),
  )
}

/**
 * Obtiene una ficha individual por matrícula.
 *
 * Esta función será utilizada por el enlace
 * individual que posteriormente tendrá el QR.
 */
export async function obtenerMatriculado(
  matricula: string,
): Promise<MatriculadoPublico | null> {
  const valor =
    decodeURIComponent(matricula).trim()

  if (!valor) return null

  const supabase = getSupabase()

  if (!supabase) {
    const objetivo =
      normalizarMatricula(valor)

    return (
      MATRICULADOS_EJEMPLO.find(
        (m) => m.matricula === objetivo,
      ) ?? null
    )
  }

  const variantes =
    variantesMatricula(valor)

  if (variantes.length === 0) {
    return null
  }

  const filtro = variantes
    .map(
      (v) =>
        `numero_matricula.eq.${v}`,
    )
    .join(",")

  const { data, error } = await supabase
    .from(TABLA)
    .select("*")
    .or(filtro)
    .limit(1)

  if (error) {
    console.error(
      "[RENACLI] Error al obtener matriculado:",
      error,
    )

    return null
  }

  const fila = (data ?? [])[0]

  return fila
    ? mapearFila(
        fila as Record<string, unknown>,
      )
    : null
}

/**
 * Convierte YYYY-MM-DD en DD/MM/YYYY.
 */
export function formatearFecha(iso: string) {
  const [anio, mes, dia] =
    iso.split("-")

  if (!anio || !mes || !dia) {
    return iso
  }

  return `${dia}/${mes}/${anio}`
}

export { supabaseConfigurado }
