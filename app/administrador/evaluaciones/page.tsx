import crypto from "crypto"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@supabase/supabase-js"

const COOKIE_NAME = "renacli_admin_session"

type MatriculadoEvaluacion = {
  id: number
  numero_matricula: string | null
  apellido_nombre: string | null
  dni: string | null
  estado: string | null
}

type PreguntaBanco = {
  id: number
  enunciado: string
  opcion_a: string
  opcion_b: string
  opcion_c: string
  opcion_d: string
  respuesta_correcta: string
  tema: string
  dificultad: string
  critica: boolean
  permite_marcador_oculto: boolean
  tema_secundario: string | null
}

type ConfiguracionEvaluacion = {
  tipo_evaluacion: string
  nombre: string
  total_preguntas: number
  duracion_minutos: number
  porcentaje_aprobacion: number
  criticas_minimas_correctas: number
  preguntas_criticas_total: number
  marcadores_ocultos_cantidad: number
  activa: boolean
}

type ConfiguracionBucket = {
  categoria_codigo: string
  dificultad: string
  cantidad_preguntas: number
}

type EvaluacionReciente = {
  id: number
  codigo: string
  matriculado_id: number | null
  numero_matricula_snapshot: string | null
  apellido_nombre_snapshot: string | null
  estado: string
  total_preguntas: number
  respuestas_correctas: number | null
  respuestas_incorrectas: number | null
  porcentaje: number | string | null
  aprobado: boolean | null
  preguntas_criticas_total: number
  preguntas_criticas_correctas: number | null
  fecha_generacion: string
  fecha_finalizacion: string | null
}

type Props = {
  searchParams?: Promise<{
    q?: string
    generado?: string
    codigo?: string
    error?: string
  }>
}

function obtenerTokenAdministrador() {
  const password =
    process.env.RENACLI_ADMIN_PASSWORD

  if (!password) {
    return null
  }

  return crypto
    .createHash("sha256")
    .update(password)
    .digest("hex")
}

async function estaAutorizado() {
  const cookieStore = await cookies()

  const tokenGuardado =
    cookieStore.get(COOKIE_NAME)?.value

  const tokenCorrecto =
    obtenerTokenAdministrador()

  return (
    Boolean(tokenCorrecto) &&
    tokenGuardado === tokenCorrecto
  )
}

function obtenerSupabaseAdmin() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL

  const secret =
    process.env.SUPABASE_SECRET_KEY

  if (!url || !secret) {
    throw new Error(
      "Falta configurar Supabase para el administrador."
    )
  }

  return createClient(
    url,
    secret,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  )
}

async function obtenerResumenEvaluaciones() {
  const supabase =
    obtenerSupabaseAdmin()

  const [
    preguntasActivas,
    evaluacionesGeneradas,
    evaluacionesFinalizadas,
    evaluacionesAprobadas,
  ] = await Promise.all([
    supabase
      .from("evaluacion_preguntas")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("estado", "activa"),

    supabase
      .from("evaluaciones")
      .select("id", {
        count: "exact",
        head: true,
      }),

    supabase
      .from("evaluaciones")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("estado", "finalizada"),

    supabase
      .from("evaluaciones")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("aprobado", true),
  ])

  return {
    preguntasActivas:
      preguntasActivas.count ?? 0,

    evaluacionesGeneradas:
      evaluacionesGeneradas.count ?? 0,

    evaluacionesFinalizadas:
      evaluacionesFinalizadas.count ?? 0,

    evaluacionesAprobadas:
      evaluacionesAprobadas.count ?? 0,
  }
}

async function obtenerConfiguracionGeneral():
  Promise<ConfiguracionEvaluacion | null> {
  const supabase =
    obtenerSupabaseAdmin()

  const { data, error } =
    await supabase
      .from("evaluacion_configuraciones")
      .select(
        `
          tipo_evaluacion,
          nombre,
          total_preguntas,
          duracion_minutos,
          porcentaje_aprobacion,
          criticas_minimas_correctas,
          preguntas_criticas_total,
          marcadores_ocultos_cantidad,
          activa
        `
      )
      .eq("tipo_evaluacion", "general")
      .eq("activa", true)
      .maybeSingle()

  if (error || !data) {
    console.error(
      "[RENACLI] Error obteniendo configuración de evaluación:",
      error
    )

    return null
  }

  return data as ConfiguracionEvaluacion
}

async function obtenerUltimasEvaluaciones():
  Promise<EvaluacionReciente[]> {
  const supabase =
    obtenerSupabaseAdmin()

  const { data, error } =
    await supabase
      .from("evaluaciones")
      .select(
        `
          id,
          codigo,
          matriculado_id,
          numero_matricula_snapshot,
          apellido_nombre_snapshot,
          estado,
          total_preguntas,
          respuestas_correctas,
          respuestas_incorrectas,
          porcentaje,
          aprobado,
          preguntas_criticas_total,
          preguntas_criticas_correctas,
          fecha_generacion,
          fecha_finalizacion
        `
      )
      .order(
        "fecha_generacion",
        {
          ascending: false,
        }
      )
      .limit(20)

  if (error) {
    console.error(
      "[RENACLI] Error obteniendo últimas evaluaciones:",
      error
    )

    return []
  }

  return (
    data ?? []
  ) as EvaluacionReciente[]
}

function formatearFechaHora(
  fecha: string | null
) {
  if (!fecha) {
    return "-"
  }

  try {
    return new Intl.DateTimeFormat(
      "es-AR",
      {
        timeZone:
          "America/Argentina/Buenos_Aires",
        dateStyle: "short",
        timeStyle: "short",
      }
    ).format(
      new Date(fecha)
    )
  } catch {
    return fecha
  }
}

async function buscarMatriculados(
  termino: string
): Promise<MatriculadoEvaluacion[]> {
  const busqueda =
    termino.trim()

  if (!busqueda) {
    return []
  }

  const terminoSeguro =
    busqueda
      .replace(/,/g, "")
      .replace(/\(/g, "")
      .replace(/\)/g, "")

  const supabase =
    obtenerSupabaseAdmin()

  const { data, error } =
    await supabase
      .from("matriculados")
      .select(
        `
          id,
          numero_matricula,
          apellido_nombre,
          dni,
          estado
        `
      )
      .or(
        `numero_matricula.ilike.%${terminoSeguro}%,dni.ilike.%${terminoSeguro}%,apellido_nombre.ilike.%${terminoSeguro}%`
      )
      .order(
        "apellido_nombre",
        {
          ascending: true,
        }
      )
      .limit(30)

  if (error) {
    console.error(
      "[RENACLI] Error buscando matriculados para evaluación:",
      error
    )

    return []
  }

  return (
    data ?? []
  ) as MatriculadoEvaluacion[]
}

function mezclar<T>(
  elementos: T[]
): T[] {
  const copia =
    [...elementos]

  for (
    let i = copia.length - 1;
    i > 0;
    i--
  ) {
    const j =
      crypto.randomInt(
        0,
        i + 1
      )

    const temporal =
      copia[i]

    copia[i] =
      copia[j]

    copia[j] =
      temporal
  }

  return copia
}

function priorizarNoUsadas<T extends {
  id: number
}>(
  elementos: T[],
  usadasRecientemente: Set<number>
) {
  const mezcladas =
    mezclar(elementos)

  const nuevas =
    mezcladas.filter(
      item =>
        !usadasRecientemente.has(
          item.id
        )
    )

  const repetidas =
    mezcladas.filter(
      item =>
        usadasRecientemente.has(
          item.id
        )
    )

  return [
    ...nuevas,
    ...repetidas,
  ]
}

function generarCodigoEvaluacion() {
  const numero =
    crypto.randomInt(
      0,
      1000000
    )

  return `RNC-EVAL-${String(
    numero
  ).padStart(6, "0")}`
}

async function obtenerPreguntasRecientes(
  matriculadoId: number
) {
  const supabase =
    obtenerSupabaseAdmin()

  const {
    data: evaluacionesAnteriores,
    error: errorEvaluaciones,
  } = await supabase
    .from("evaluaciones")
    .select("id")
    .eq(
      "matriculado_id",
      matriculadoId
    )
    .order(
      "fecha_generacion",
      {
        ascending: false,
      }
    )
    .limit(5)

  if (
    errorEvaluaciones ||
    !evaluacionesAnteriores ||
    evaluacionesAnteriores.length === 0
  ) {
    return new Set<number>()
  }

  const idsEvaluaciones =
    evaluacionesAnteriores.map(
      evaluacion =>
        Number(evaluacion.id)
    )

  const {
    data: items,
    error: errorItems,
  } = await supabase
    .from("evaluacion_items")
    .select("pregunta_id")
    .in(
      "evaluacion_id",
      idsEvaluaciones
    )
    .not(
      "pregunta_id",
      "is",
      null
    )

  if (errorItems) {
    console.error(
      "[RENACLI] Error obteniendo preguntas recientes:",
      errorItems
    )

    return new Set<number>()
  }

  return new Set<number>(
    (items ?? [])
      .map(
        item =>
          Number(
            item.pregunta_id
          )
      )
      .filter(
        id =>
          Number.isInteger(id) &&
          id > 0
      )
  )
}

async function generarEvaluacion(
  formData: FormData
) {
  "use server"

  if (!(await estaAutorizado())) {
    redirect("/administrador")
  }

  const matriculadoId =
    Number(
      formData.get(
        "matriculado_id"
      ) ?? 0
    )

  const q =
    String(
      formData.get("q") ?? ""
    ).trim()

  if (
    !Number.isInteger(
      matriculadoId
    ) ||
    matriculadoId <= 0
  ) {
    redirect(
      `/administrador/evaluaciones?q=${encodeURIComponent(
        q
      )}&error=matriculado`
    )
  }

  const supabase =
    obtenerSupabaseAdmin()

  const {
    data: matriculado,
    error: errorMatriculado,
  } = await supabase
    .from("matriculados")
    .select(
      `
        id,
        numero_matricula,
        apellido_nombre,
        dni,
        estado
      `
    )
    .eq(
      "id",
      matriculadoId
    )
    .maybeSingle()

  if (
    errorMatriculado ||
    !matriculado
  ) {
    redirect(
      `/administrador/evaluaciones?q=${encodeURIComponent(
        q
      )}&error=matriculado`
    )
  }

  const {
    data: configuracion,
    error: errorConfiguracion,
  } = await supabase
    .from(
      "evaluacion_configuraciones"
    )
    .select(
      `
        tipo_evaluacion,
        nombre,
        total_preguntas,
        duracion_minutos,
        porcentaje_aprobacion,
        criticas_minimas_correctas,
        preguntas_criticas_total,
        marcadores_ocultos_cantidad,
        activa
      `
    )
    .eq(
      "tipo_evaluacion",
      "general"
    )
    .eq(
      "activa",
      true
    )
    .maybeSingle()

  if (
    errorConfiguracion ||
    !configuracion
  ) {
    console.error(
      "[RENACLI] No se encontró configuración activa:",
      errorConfiguracion
    )

    redirect(
      `/administrador/evaluaciones?q=${encodeURIComponent(
        q
      )}&error=config`
    )
  }

  const {
    data: distribucion,
    error: errorDistribucion,
  } = await supabase
    .from(
      "evaluacion_configuracion_categoria_dificultad"
    )
    .select(
      `
        categoria_codigo,
        dificultad,
        cantidad_preguntas
      `
    )
    .eq(
      "tipo_evaluacion",
      "general"
    )

  if (
    errorDistribucion ||
    !distribucion ||
    distribucion.length === 0
  ) {
    console.error(
      "[RENACLI] Error obteniendo distribución de evaluación:",
      errorDistribucion
    )

    redirect(
      `/administrador/evaluaciones?q=${encodeURIComponent(
        q
      )}&error=config`
    )
  }

  const buckets =
    distribucion.map(
      fila => ({
        categoria_codigo:
          String(
            fila.categoria_codigo
          ),
        dificultad:
          String(
            fila.dificultad
          ),
        cantidad_preguntas:
          Number(
            fila.cantidad_preguntas
          ),
      })
    ) as ConfiguracionBucket[]

  const totalConfigurado =
    buckets.reduce(
      (
        acumulado,
        bucket
      ) =>
        acumulado +
        bucket.cantidad_preguntas,
      0
    )

  if (
    totalConfigurado !==
    Number(
      configuracion.total_preguntas
    )
  ) {
    console.error(
      "[RENACLI] La distribución no coincide con el total configurado."
    )

    redirect(
      `/administrador/evaluaciones?q=${encodeURIComponent(
        q
      )}&error=config`
    )
  }

  const {
    data: preguntas,
    error: errorPreguntas,
  } = await supabase
    .from(
      "evaluacion_preguntas"
    )
    .select(
      `
        id,
        enunciado,
        opcion_a,
        opcion_b,
        opcion_c,
        opcion_d,
        respuesta_correcta,
        tema,
        dificultad,
        critica,
        permite_marcador_oculto,
        tema_secundario
      `
    )
    .eq(
      "estado",
      "activa"
    )

  if (
    errorPreguntas ||
    !preguntas
  ) {
    console.error(
      "[RENACLI] Error obteniendo banco de preguntas:",
      errorPreguntas
    )

    redirect(
      `/administrador/evaluaciones?q=${encodeURIComponent(
        q
      )}&error=banco`
    )
  }

  const banco =
    preguntas as PreguntaBanco[]

  const usadasRecientemente =
    await obtenerPreguntasRecientes(
      matriculadoId
    )

  const informacionBuckets =
    buckets.map(
      bucket => {
        const candidatas =
          banco.filter(
            pregunta =>
              pregunta.tema ===
                bucket.categoria_codigo &&
              pregunta.dificultad ===
                bucket.dificultad
          )

        const criticas =
          candidatas.filter(
            pregunta =>
              pregunta.critica
          )

        const noCriticas =
          candidatas.filter(
            pregunta =>
              !pregunta.critica
          )

        const cantidad =
          bucket.cantidad_preguntas

        const minimoCriticas =
          Math.max(
            0,
            cantidad -
              noCriticas.length
          )

        const maximoCriticas =
          Math.min(
            cantidad,
            criticas.length
          )

        return {
          ...bucket,
          candidatas,
          criticas,
          noCriticas,
          minimoCriticas,
          maximoCriticas,
          criticasAsignadas:
            minimoCriticas,
        }
      }
    )

  const bucketInsuficiente =
    informacionBuckets.find(
      bucket =>
        bucket.candidatas.length <
        bucket.cantidad_preguntas
    )

  if (bucketInsuficiente) {
    console.error(
      "[RENACLI] Banco insuficiente para:",
      bucketInsuficiente
    )

    redirect(
      `/administrador/evaluaciones?q=${encodeURIComponent(
        q
      )}&error=banco`
    )
  }

  const criticasObjetivo =
    Number(
      configuracion.preguntas_criticas_total
    )

  const minimoTotalCriticas =
    informacionBuckets.reduce(
      (
        total,
        bucket
      ) =>
        total +
        bucket.minimoCriticas,
      0
    )

  const maximoTotalCriticas =
    informacionBuckets.reduce(
      (
        total,
        bucket
      ) =>
        total +
        bucket.maximoCriticas,
      0
    )

  if (
    minimoTotalCriticas >
      criticasObjetivo ||
    maximoTotalCriticas <
      criticasObjetivo
  ) {
    console.error(
      "[RENACLI] El banco actual no permite generar exactamente la cantidad de preguntas críticas configurada."
    )

    redirect(
      `/administrador/evaluaciones?q=${encodeURIComponent(
        q
      )}&error=criticas`
    )
  }

  let criticasRestantes =
    criticasObjetivo -
    minimoTotalCriticas

  while (
    criticasRestantes > 0
  ) {
    const disponibles =
      informacionBuckets.filter(
        bucket =>
          bucket.criticasAsignadas <
          bucket.maximoCriticas
      )

    if (
      disponibles.length === 0
    ) {
      redirect(
        `/administrador/evaluaciones?q=${encodeURIComponent(
          q
        )}&error=criticas`
      )
    }

    const elegido =
      disponibles[
        crypto.randomInt(
          0,
          disponibles.length
        )
      ]

    elegido.criticasAsignadas +=
      1

    criticasRestantes -= 1
  }

  const seleccionadas:
    PreguntaBanco[] = []

  for (
    const bucket of
    informacionBuckets
  ) {
    const criticasOrdenadas =
      priorizarNoUsadas(
        bucket.criticas,
        usadasRecientemente
      )

    const noCriticasOrdenadas =
      priorizarNoUsadas(
        bucket.noCriticas,
        usadasRecientemente
      )

    const cantidadCriticas =
      bucket.criticasAsignadas

    const cantidadNoCriticas =
      bucket.cantidad_preguntas -
      cantidadCriticas

    seleccionadas.push(
      ...criticasOrdenadas.slice(
        0,
        cantidadCriticas
      )
    )

    seleccionadas.push(
      ...noCriticasOrdenadas.slice(
        0,
        cantidadNoCriticas
      )
    )
  }

  if (
    seleccionadas.length !==
    Number(
      configuracion.total_preguntas
    )
  ) {
    console.error(
      "[RENACLI] La selección final no contiene la cantidad esperada de preguntas."
    )

    redirect(
      `/administrador/evaluaciones?q=${encodeURIComponent(
        q
      )}&error=banco`
    )
  }

  const idsSeleccionados =
    seleccionadas.map(
      pregunta =>
        pregunta.id
    )

  if (
    new Set(
      idsSeleccionados
    ).size !==
    idsSeleccionados.length
  ) {
    console.error(
      "[RENACLI] Se detectó una pregunta duplicada durante la generación."
    )

    redirect(
      `/administrador/evaluaciones?q=${encodeURIComponent(
        q
      )}&error=banco`
    )
  }

  const seleccionFinal =
    mezclar(
      seleccionadas
    )

  const items =
    seleccionFinal.map(
      (
        pregunta,
        indice
      ) => {
        const opcionesOriginales =
          [
            {
              letra: "A",
              texto:
                pregunta.opcion_a,
            },
            {
              letra: "B",
              texto:
                pregunta.opcion_b,
            },
            {
              letra: "C",
              texto:
                pregunta.opcion_c,
            },
            {
              letra: "D",
              texto:
                pregunta.opcion_d,
            },
          ]

        const opcionesMezcladas =
          mezclar(
            opcionesOriginales
          )

        const letrasFinales =
          [
            "A",
            "B",
            "C",
            "D",
          ]

        const indiceCorrecto =
          opcionesMezcladas.findIndex(
            opcion =>
              opcion.letra ===
              pregunta.respuesta_correcta
          )

        if (
          indiceCorrecto === -1
        ) {
          throw new Error(
            `Respuesta correcta inválida en pregunta ${pregunta.id}.`
          )
        }

        return {
          pregunta_id:
            pregunta.id,
          orden:
            indice + 1,
          enunciado_snapshot:
            pregunta.enunciado,
          opcion_a_snapshot:
            opcionesMezcladas[0]
              .texto,
          opcion_b_snapshot:
            opcionesMezcladas[1]
              .texto,
          opcion_c_snapshot:
            opcionesMezcladas[2]
              .texto,
          opcion_d_snapshot:
            opcionesMezcladas[3]
              .texto,
          respuesta_correcta_snapshot:
            letrasFinales[
              indiceCorrecto
            ],
          tema_snapshot:
            pregunta.tema,
          dificultad_snapshot:
            pregunta.dificultad,
          critica_snapshot:
            pregunta.critica,
        }
      }
    )

  let evaluacionCreada:
    {
      id: number
      codigo: string
    } | null = null

  for (
    let intento = 0;
    intento < 10;
    intento++
  ) {
    const codigo =
      generarCodigoEvaluacion()

    const {
      data,
      error,
    } = await supabase.rpc(
      "crear_evaluacion_completa",
      {
        p_codigo:
          codigo,
        p_matriculado_id:
          matriculado.id,
        p_numero_matricula_snapshot:
          matriculado.numero_matricula,
        p_apellido_nombre_snapshot:
          matriculado.apellido_nombre,
        p_tipo_evaluacion:
          "general",
        p_total_preguntas:
          Number(
            configuracion.total_preguntas
          ),
        p_preguntas_criticas_total:
          Number(
            configuracion.preguntas_criticas_total
          ),
        p_items:
          items,
      }
    )

    if (
      !error &&
      Array.isArray(data) &&
      data.length > 0
    ) {
      const resultado =
        data[0]

      const evaluacionId =
        Number(
          resultado.evaluacion_id
        )

      const codigoCreado =
        String(
          resultado.codigo_evaluacion ??
            ""
        )

      if (
        Number.isInteger(
          evaluacionId
        ) &&
        evaluacionId > 0 &&
        codigoCreado
      ) {
        evaluacionCreada = {
          id:
            evaluacionId,
          codigo:
            codigoCreado,
        }

        break
      }

      console.error(
        "[RENACLI] La función transaccional devolvió un resultado inválido:",
        resultado
      )

      break
    }

    if (
      error?.code !==
      "23505"
    ) {
      console.error(
        "[RENACLI] Error creando evaluación completa:",
        error
      )

      break
    }
  }

  if (
    !evaluacionCreada
  ) {
    redirect(
      `/administrador/evaluaciones?q=${encodeURIComponent(
        q
      )}&error=guardar`
    )
  }

  redirect(
    `/administrador/evaluaciones?q=${encodeURIComponent(
      q
    )}&generado=1&codigo=${encodeURIComponent(
      evaluacionCreada.codigo
    )}`
  )
}

function mensajeError(
  error: string | undefined
) {
  if (
    error === "matriculado"
  ) {
    return "No fue posible identificar al matriculado seleccionado."
  }

  if (
    error === "config"
  ) {
    return "La configuración de la evaluación general está incompleta o no coincide con la distribución definida."
  }

  if (
    error === "banco"
  ) {
    return "El banco activo no tiene suficientes preguntas para generar una evaluación con la distribución establecida."
  }

  if (
    error === "criticas"
  ) {
    return "El banco actual no permite seleccionar exactamente la cantidad de preguntas críticas configurada."
  }

  if (
    error === "guardar"
  ) {
    return "No fue posible guardar la evaluación. No se generó un examen incompleto."
  }

  return null
}

export default async function EvaluacionesPage({
  searchParams,
}: Props) {
  const autorizado =
    await estaAutorizado()

  if (!autorizado) {
    redirect("/administrador")
  }

  const parametros =
    searchParams
      ? await searchParams
      : {}

  const terminoBusqueda =
    String(
      parametros.q ?? ""
    ).trim()

  const [
    resumen,
    configuracion,
    resultados,
    ultimasEvaluaciones,
  ] = await Promise.all([
    obtenerResumenEvaluaciones(),
    obtenerConfiguracionGeneral(),
    terminoBusqueda
      ? buscarMatriculados(
          terminoBusqueda
        )
      : Promise.resolve([]),
    obtenerUltimasEvaluaciones(),
  ])

  const errorVisible =
    mensajeError(
      parametros.error
    )

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#eef5fa",
        fontFamily:
          "Arial, sans-serif",
      }}
    >
      <header
        style={{
          background: "#0d4f7c",
          color: "white",
          padding: "25px 40px",
          borderBottom:
            "4px solid #35c4cf",
        }}
      >
        <h1
          style={{
            margin: 0,
            letterSpacing: "4px",
          }}
        >
          RENACLI
        </h1>

        <p
          style={{
            margin: "6px 0 0",
          }}
        >
          Registro Nacional de
          Climatización y Refrigeración
        </p>
      </header>

      <section
        style={{
          maxWidth: "1100px",
          margin: "40px auto",
          padding: "0 20px",
        }}
      >
        <p
          style={{
            color: "#64748b",
            fontSize: "13px",
            fontWeight: "bold",
            letterSpacing: "1px",
          }}
        >
          ADMINISTRACIÓN
        </p>

        <h2
          style={{
            fontSize: "32px",
            color: "#172033",
            marginBottom: "8px",
          }}
        >
          Evaluaciones RENACLI
        </h2>

        <p
          style={{
            color: "#475569",
            lineHeight: 1.6,
            maxWidth: "760px",
            marginTop: 0,
          }}
        >
          Administración del banco de
          preguntas, generación de
          evaluaciones únicas y control de
          resultados.
        </p>

        <div
          style={{
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
            marginTop: "20px",
            marginBottom: "4px",
          }}
        >
          <a
            href="/administrador/evaluaciones/preguntas"
            style={botonAzul}
          >
            Banco de preguntas
          </a>

          <a
            href="/administrador/evaluaciones/preguntas/nueva"
            style={botonVerde}
          >
            Nueva pregunta
          </a>
        </div>

        {parametros.generado ===
          "1" &&
          parametros.codigo && (
            <>
              <Aviso
                tipo="ok"
                texto={`Evaluación generada correctamente. Código: ${parametros.codigo}`}
              />

              <div
                style={{
                  marginTop: "12px",
                  marginBottom: "4px",
                }}
              >
                <a
                  href={`/api/evaluacion-pdf/${encodeURIComponent(
                    parametros.codigo
                  )}`}
                  style={botonAzul}
                >
                  Descargar PDF
                </a>
              </div>
            </>
          )}

        {errorVisible && (
          <Aviso
            tipo="error"
            texto={errorVisible}
          />
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(210px, 1fr))",
            gap: "18px",
            marginTop: "30px",
          }}
        >
          <Resumen
            titulo="Preguntas activas"
            cantidad={
              resumen.preguntasActivas
            }
          />

          <Resumen
            titulo="Evaluaciones generadas"
            cantidad={
              resumen.evaluacionesGeneradas
            }
          />

          <Resumen
            titulo="Evaluaciones finalizadas"
            cantidad={
              resumen.evaluacionesFinalizadas
            }
          />

          <Resumen
            titulo="Evaluaciones aprobadas"
            cantidad={
              resumen.evaluacionesAprobadas
            }
          />
        </div>

        <div
          style={{
            marginTop: "28px",
            padding: "24px",
            background: "white",
            border:
              "1px solid #d7e0e7",
            borderRadius: "14px",
            boxShadow:
              "0 2px 5px rgba(0,0,0,.08)",
          }}
        >
          <h3
            style={{
              marginTop: 0,
              color: "#172033",
            }}
          >
            Evaluación general
          </h3>

          {configuracion ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "16px",
                marginTop: "20px",
              }}
            >
              <Dato
                titulo="Preguntas"
                valor={String(
                  configuracion.total_preguntas
                )}
              />

              <Dato
                titulo="Duración"
                valor={`${configuracion.duracion_minutos} minutos`}
              />

              <Dato
                titulo="Aprobación"
                valor={`${configuracion.porcentaje_aprobacion} %`}
              />

              <Dato
                titulo="Preguntas críticas"
                valor={String(
                  configuracion.preguntas_criticas_total
                )}
              />

              <Dato
                titulo="Críticas mínimas"
                valor={`${configuracion.criticas_minimas_correctas} de ${configuracion.preguntas_criticas_total}`}
              />

              <Dato
                titulo="Banco actual"
                valor={`${resumen.preguntasActivas} preguntas`}
              />
            </div>
          ) : (
            <p
              style={{
                color: "#be123c",
                fontWeight: "bold",
              }}
            >
              No se pudo leer la
              configuración activa.
            </p>
          )}
        </div>

        <div
          style={{
            marginTop: "28px",
            padding: "24px",
            background: "white",
            border:
              "1px solid #d7e0e7",
            borderRadius: "14px",
            boxShadow:
              "0 2px 5px rgba(0,0,0,.08)",
          }}
        >
          <h3
            style={{
              marginTop: 0,
              color: "#172033",
            }}
          >
            Generar evaluación
          </h3>

          <p
            style={{
              color: "#475569",
              lineHeight: 1.55,
            }}
          >
            Buscá al técnico por
            matrícula, DNI o apellido y
            nombre.
          </p>

          <form
            method="get"
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
              marginTop: "18px",
            }}
          >
            <input
              type="text"
              name="q"
              defaultValue={
                terminoBusqueda
              }
              placeholder="Ej.: RNC-123456, DNI o apellido"
              required
              style={{
                flex: "1 1 300px",
                minWidth: "220px",
                padding: "13px",
                border:
                  "1px solid #cbd5e1",
                borderRadius: "8px",
                boxSizing:
                  "border-box",
              }}
            />

            <button
              type="submit"
              style={botonAzul}
            >
              Buscar matriculado
            </button>
          </form>

          {terminoBusqueda && (
            <div
              style={{
                marginTop: "24px",
              }}
            >
              {resultados.length ===
              0 ? (
                <p
                  style={{
                    color: "#64748b",
                  }}
                >
                  No se encontraron
                  matriculados.
                </p>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gap: "12px",
                  }}
                >
                  {resultados.map(
                    matriculado => (
                      <div
                        key={
                          matriculado.id
                        }
                        style={{
                          padding:
                            "18px",
                          border:
                            "1px solid #e2e8f0",
                          borderRadius:
                            "12px",
                          background:
                            "#f8fafc",
                          display:
                            "flex",
                          alignItems:
                            "center",
                          justifyContent:
                            "space-between",
                          gap: "16px",
                          flexWrap:
                            "wrap",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontWeight:
                                "bold",
                              color:
                                "#172033",
                              fontSize:
                                "17px",
                            }}
                          >
                            {matriculado.apellido_nombre ||
                              "Sin nombre"}
                          </div>

                          <div
                            style={{
                              marginTop:
                                "5px",
                              color:
                                "#475569",
                              fontSize:
                                "14px",
                            }}
                          >
                            {matriculado.numero_matricula ||
                              "SIN MATRÍCULA"}
                            {" · DNI "}
                            {matriculado.dni ||
                              "-"}
                            {" · "}
                            {matriculado.estado ||
                              "-"}
                          </div>
                        </div>

                        <form
                          action={
                            generarEvaluacion
                          }
                        >
                          <input
                            type="hidden"
                            name="matriculado_id"
                            value={
                              matriculado.id
                            }
                          />

                          <input
                            type="hidden"
                            name="q"
                            value={
                              terminoBusqueda
                            }
                          />

                          <button
                            type="submit"
                            style={
                              botonVerde
                            }
                          >
                            Generar evaluación
                          </button>
                        </form>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div
          style={{
            marginTop: "28px",
            padding: "24px",
            background: "white",
            border:
              "1px solid #d7e0e7",
            borderRadius: "14px",
            boxShadow:
              "0 2px 5px rgba(0,0,0,.08)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h3
                style={{
                  margin: 0,
                  color: "#172033",
                }}
              >
                Últimas evaluaciones
              </h3>

              <p
                style={{
                  margin:
                    "7px 0 0",
                  color:
                    "#64748b",
                  fontSize:
                    "14px",
                  lineHeight:
                    1.5,
                }}
              >
                Acceso directo a las últimas 20 evaluaciones generadas.
              </p>
            </div>

            <div
              style={{
                color:
                  "#64748b",
                fontSize:
                  "13px",
                fontWeight:
                  "bold",
              }}
            >
              {ultimasEvaluaciones.length} visibles
            </div>
          </div>

          {ultimasEvaluaciones.length ===
          0 ? (
            <p
              style={{
                marginBottom: 0,
                color: "#64748b",
              }}
            >
              Todavía no hay evaluaciones generadas.
            </p>
          ) : (
            <div
              style={{
                display: "grid",
                gap: "12px",
                marginTop: "20px",
              }}
            >
              {ultimasEvaluaciones.map(
                evaluacion => {
                  const finalizada =
                    evaluacion.estado ===
                    "finalizada"

                  const resultadoTexto =
                    finalizada
                      ? evaluacion.aprobado
                        ? "APROBADO"
                        : "NO APROBADO"
                      : "PENDIENTE DE CORRECCIÓN"

                  const resultadoColor =
                    finalizada
                      ? evaluacion.aprobado
                        ? "#166534"
                        : "#be123c"
                      : "#92400e"

                  const resultadoFondo =
                    finalizada
                      ? evaluacion.aprobado
                        ? "#ecfdf5"
                        : "#fff1f2"
                      : "#fffbeb"

                  const resultadoBorde =
                    finalizada
                      ? evaluacion.aprobado
                        ? "#86efac"
                        : "#fecdd3"
                      : "#fde68a"

                  const porcentaje =
                    evaluacion.porcentaje ===
                      null ||
                    evaluacion.porcentaje ===
                      undefined
                      ? null
                      : Number(
                          evaluacion.porcentaje
                        )

                  return (
                    <div
                      key={
                        evaluacion.id
                      }
                      style={{
                        padding:
                          "18px",
                        border:
                          "1px solid #e2e8f0",
                        borderRadius:
                          "12px",
                        background:
                          "#f8fafc",
                      }}
                    >
                      <div
                        style={{
                          display:
                            "flex",
                          alignItems:
                            "flex-start",
                          justifyContent:
                            "space-between",
                          gap:
                            "16px",
                          flexWrap:
                            "wrap",
                        }}
                      >
                        <div
                          style={{
                            flex:
                              "1 1 360px",
                            minWidth:
                              "240px",
                          }}
                        >
                          <div
                            style={{
                              display:
                                "flex",
                              alignItems:
                                "center",
                              gap:
                                "10px",
                              flexWrap:
                                "wrap",
                            }}
                          >
                            <strong
                              style={{
                                color:
                                  "#172033",
                                fontSize:
                                  "16px",
                              }}
                            >
                              {evaluacion.apellido_nombre_snapshot ||
                                "Sin nombre"}
                            </strong>

                            <span
                              style={{
                                padding:
                                  "5px 9px",
                                borderRadius:
                                  "999px",
                                border:
                                  `1px solid ${resultadoBorde}`,
                                background:
                                  resultadoFondo,
                                color:
                                  resultadoColor,
                                fontSize:
                                  "11px",
                                fontWeight:
                                  "bold",
                              }}
                            >
                              {resultadoTexto}
                            </span>
                          </div>

                          <div
                            style={{
                              marginTop:
                                "7px",
                              color:
                                "#475569",
                              fontSize:
                                "14px",
                              lineHeight:
                                1.55,
                            }}
                          >
                            {evaluacion.numero_matricula_snapshot ||
                              "SIN MATRÍCULA"}
                            {" · "}
                            <strong>
                              {
                                evaluacion.codigo
                              }
                            </strong>
                          </div>

                          <div
                            style={{
                              marginTop:
                                "5px",
                              color:
                                "#64748b",
                              fontSize:
                                "12px",
                              lineHeight:
                                1.5,
                            }}
                          >
                            Generada:{" "}
                            {formatearFechaHora(
                              evaluacion.fecha_generacion
                            )}
                          </div>

                          {finalizada && (
                            <div
                              style={{
                                marginTop:
                                  "7px",
                                color:
                                  "#475569",
                                fontSize:
                                  "13px",
                                lineHeight:
                                  1.5,
                              }}
                            >
                              {evaluacion.respuestas_correctas ??
                                0}{" "}
                              correctas ·{" "}
                              {evaluacion.respuestas_incorrectas ??
                                0}{" "}
                              incorrectas
                              {porcentaje !==
                                null &&
                              Number.isFinite(
                                porcentaje
                              )
                                ? ` · ${porcentaje.toFixed(
                                    2
                                  )} %`
                                : ""}
                              {" · "}
                              {evaluacion.preguntas_criticas_correctas ??
                                0}{" "}
                              de{" "}
                              {
                                evaluacion.preguntas_criticas_total
                              }{" "}
                              críticas
                            </div>
                          )}
                        </div>

                        <div
                          style={{
                            display:
                              "flex",
                            gap:
                              "10px",
                            flexWrap:
                              "wrap",
                          }}
                        >
                          <a
                            href={`/api/evaluacion-pdf/${encodeURIComponent(
                              evaluacion.codigo
                            )}`}
                            style={
                              botonAzul
                            }
                          >
                            Descargar PDF
                          </a>

                          <a
                            href={`/administrador/evaluaciones/${encodeURIComponent(
                              evaluacion.codigo
                            )}`}
                            style={
                              finalizada
                                ? botonBlanco
                                : botonVerde
                            }
                          >
                            {finalizada
                              ? "Ver resultado"
                              : "Corregir"}
                          </a>
                        </div>
                      </div>
                    </div>
                  )
                }
              )}
            </div>
          )}
        </div>

        <div
          style={{
            marginTop: "24px",
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <a
            href="/administrador"
            style={botonBlanco}
          >
            Volver al administrador
          </a>
        </div>
      </section>
    </main>
  )
}

function Resumen({
  titulo,
  cantidad,
}: {
  titulo: string
  cantidad: number
}) {
  return (
    <div
      style={{
        padding: "22px",
        background: "white",
        border:
          "1px solid #d7e0e7",
        borderRadius: "12px",
        boxShadow:
          "0 2px 5px rgba(0,0,0,.06)",
      }}
    >
      <div
        style={{
          color: "#64748b",
          fontSize: "13px",
          fontWeight: "bold",
        }}
      >
        {titulo}
      </div>

      <div
        style={{
          marginTop: "8px",
          fontSize: "32px",
          fontWeight: "bold",
          color: "#0d4f7c",
        }}
      >
        {cantidad}
      </div>
    </div>
  )
}

function Dato({
  titulo,
  valor,
}: {
  titulo: string
  valor: string
}) {
  return (
    <div
      style={{
        padding: "14px",
        border:
          "1px solid #e2e8f0",
        borderRadius: "10px",
        background: "#f8fafc",
      }}
    >
      <div
        style={{
          color: "#64748b",
          fontSize: "12px",
          fontWeight: "bold",
          textTransform:
            "uppercase",
        }}
      >
        {titulo}
      </div>

      <div
        style={{
          marginTop: "6px",
          color: "#172033",
          fontWeight: "bold",
        }}
      >
        {valor}
      </div>
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
        marginTop: "24px",
        padding: "16px",
        borderRadius: "10px",
        background:
          tipo === "ok"
            ? "#ecfdf5"
            : "#fff1f2",
        border:
          tipo === "ok"
            ? "1px solid #86efac"
            : "1px solid #fecdd3",
        color:
          tipo === "ok"
            ? "#166534"
            : "#be123c",
        fontWeight: "bold",
      }}
    >
      {texto}
    </div>
  )
}

const botonAzul = {
  padding: "13px 20px",
  border: "none",
  borderRadius: "8px",
  background: "#0d5689",
  color: "white",
  fontWeight: "bold",
  textDecoration: "none",
  cursor: "pointer",
}

const botonVerde = {
  padding: "13px 20px",
  border: "none",
  borderRadius: "8px",
  background: "#15803d",
  color: "white",
  fontWeight: "bold",
  textDecoration: "none",
  cursor: "pointer",
}

const botonBlanco = {
  padding: "13px 20px",
  border:
    "1px solid #cbd5e1",
  borderRadius: "8px",
  background: "white",
  color: "#334155",
  fontWeight: "bold",
  textDecoration: "none",
  cursor: "pointer",
}
