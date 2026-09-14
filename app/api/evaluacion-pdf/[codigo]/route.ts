import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@supabase/supabase-js"
import {
  PDFDocument,
  PDFFont,
  PDFPage,
  StandardFonts,
  rgb,
} from "pdf-lib"
import {
  createHash,
  randomInt,
  timingSafeEqual,
} from "crypto"

export const runtime = "nodejs"

const COOKIE_ADMIN =
  "renacli_admin_session"

const CANTIDAD_MARCADORES = 4

const PALABRAS_CONTROL = [
  "psicrometria",
  "entalpia",
  "presostato",
  "higrometro",
  "anemometro",
  "solenoide",
  "termistor",
  "contactor",
  "azeotropico",
  "zeotropico",
  "desescarche",
  "acumulador",
  "separador",
  "higroscopicidad",
  "barometrica",
  "subenfriador",
  "intercambiador",
  "recuperadora",
  "capilaridad",
  "visor",
  "sifon",
  "rele",
  "manifold",
  "vacuumetro",
]

type RouteProps = {
  params: Promise<{
    codigo: string
  }>
}

type Evaluacion = {
  id: number
  codigo: string
  matriculado_id: number | null
  numero_matricula_snapshot: string | null
  apellido_nombre_snapshot: string | null
  tipo_evaluacion: string
  estado: string
  total_preguntas: number
  fecha_generacion: string
}

type EvaluacionItem = {
  id: number
  evaluacion_id: number
  pregunta_id: number | null
  orden: number
  enunciado_snapshot: string
  opcion_a_snapshot: string
  opcion_b_snapshot: string
  opcion_c_snapshot: string
  opcion_d_snapshot: string
  tema_snapshot: string
  dificultad_snapshot: string
  critica_snapshot: boolean
}

type PreguntaControl = {
  id: number
  permite_marcador_oculto: boolean
  tema_secundario: string | null
}

type Configuracion = {
  tipo_evaluacion: string
  nombre: string
  total_preguntas: number
  duracion_minutos: number
  porcentaje_aprobacion: number | string
  criticas_minimas_correctas: number
  preguntas_criticas_total: number
  marcadores_ocultos_cantidad: number
}

type Marcador = {
  evaluacion_item_id: number
  palabra_control: string
  tema_secundario: string | null
}

function obtenerSupabaseAdmin() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL

  const secretKey =
    process.env.SUPABASE_SECRET_KEY

  if (!url || !secretKey) {
    throw new Error(
      "Faltan las variables de entorno de Supabase."
    )
  }

  return createClient(
    url,
    secretKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  )
}

function crearTokenAdmin(
  password: string
) {
  return createHash("sha256")
    .update(password)
    .digest("hex")
}

async function adminAutorizado() {
  const cookieStore =
    await cookies()

  const sesion =
    cookieStore.get(
      COOKIE_ADMIN
    )?.value

  const password =
    process.env.RENACLI_ADMIN_PASSWORD

  if (
    !sesion ||
    !password
  ) {
    return false
  }

  const esperado =
    crearTokenAdmin(
      password
    )

  const a =
    Buffer.from(sesion)

  const b =
    Buffer.from(esperado)

  if (
    a.length !== b.length
  ) {
    return false
  }

  return timingSafeEqual(
    a,
    b
  )
}

function mezclar<T>(
  elementos: T[]
) {
  const copia =
    [...elementos]

  for (
    let i =
      copia.length - 1;
    i > 0;
    i--
  ) {
    const j =
      randomInt(
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

function textoSeguroPdf(
  valor:
    | string
    | null
    | undefined
) {
  return String(
    valor ?? ""
  )
    .normalize("NFC")
    .replace(
      /[\u2013\u2014]/g,
      "-"
    )
    .replace(
      /[\u2018\u2019]/g,
      "'"
    )
    .replace(
      /[\u201C\u201D]/g,
      '"'
    )
    .replace(
      /\u00A0/g,
      " "
    )
    .replace(
      /µ/g,
      "u"
    )
}

function envolverTexto(
  texto: string,
  fuente: PDFFont,
  tamanio: number,
  anchoMaximo: number
) {
  const palabras =
    textoSeguroPdf(texto)
      .trim()
      .split(/\s+/)
      .filter(Boolean)

  const lineas:
    string[] = []

  let actual = ""

  for (
    const palabra
    of palabras
  ) {
    const tentativa =
      actual
        ? `${actual} ${palabra}`
        : palabra

    if (
      fuente.widthOfTextAtSize(
        tentativa,
        tamanio
      ) <= anchoMaximo
    ) {
      actual =
        tentativa

      continue
    }

    if (actual) {
      lineas.push(
        actual
      )
    }

    actual =
      palabra
  }

  if (actual) {
    lineas.push(actual)
  }

  return lineas.length
    ? lineas
    : [""]
}

function formatearFechaHora(
  fecha: string
) {
  try {
    return new Intl.DateTimeFormat(
      "es-AR",
      {
        timeZone:
          "America/Argentina/Buenos_Aires",
        dateStyle:
          "short",
        timeStyle:
          "short",
      }
    ).format(
      new Date(fecha)
    )
  } catch {
    return fecha
  }
}

function textoVisibleItem(
  item: EvaluacionItem
) {
  return [
    item.enunciado_snapshot,
    item.opcion_a_snapshot,
    item.opcion_b_snapshot,
    item.opcion_c_snapshot,
    item.opcion_d_snapshot,
  ]
    .join(" ")
    .toLowerCase()
}

function elegirPalabraControl(
  item: EvaluacionItem,
  palabrasUsadas: Set<string>
) {
  const textoVisible =
    textoVisibleItem(
      item
    )

  const candidatas =
    mezclar(
      PALABRAS_CONTROL
    )

  for (
    const palabra
    of candidatas
  ) {
    const normalizada =
      palabra.toLowerCase()

    if (
      palabrasUsadas.has(
        normalizada
      )
    ) {
      continue
    }

    if (
      textoVisible.includes(
        normalizada
      )
    ) {
      continue
    }

    return palabra
  }

  return null
}

async function obtenerOCrearMarcadores(
  evaluacion:
    Evaluacion,
  items:
    EvaluacionItem[]
) {
  const supabase =
    obtenerSupabaseAdmin()

  const {
    data:
      marcadoresExistentes,
    error:
      errorMarcadores,
  } = await supabase
    .from(
      "evaluacion_marcadores"
    )
    .select(
      `
        evaluacion_item_id,
        palabra_control,
        tema_secundario
      `
    )
    .eq(
      "evaluacion_id",
      evaluacion.id
    )

  if (errorMarcadores) {
    throw new Error(
      "No se pudieron leer los marcadores de la evaluación."
    )
  }

  const mapa =
    new Map<
      number,
      string
    >()

  const palabrasUsadas =
    new Set<string>()

  for (
    const marcador of
    (
      marcadoresExistentes ??
      []
    ) as Marcador[]
  ) {
    mapa.set(
      Number(
        marcador.evaluacion_item_id
      ),
      String(
        marcador.palabra_control
      )
    )

    palabrasUsadas.add(
      String(
        marcador.palabra_control
      ).toLowerCase()
    )
  }

  if (
    mapa.size >=
    CANTIDAD_MARCADORES
  ) {
    return mapa
  }

  const preguntaIds =
    items
      .map(
        item =>
          item.pregunta_id
      )
      .filter(
        (
          id
        ): id is number =>
          Number.isInteger(
            id
          ) &&
          Number(id) > 0
      )

  const metadatos =
    new Map<
      number,
      PreguntaControl
    >()

  if (
    preguntaIds.length > 0
  ) {
    const {
      data:
        preguntasControl,
      error:
        errorControl,
    } = await supabase
      .from(
        "evaluacion_preguntas"
      )
      .select(
        `
          id,
          permite_marcador_oculto,
          tema_secundario
        `
      )
      .in(
        "id",
        preguntaIds
      )

    if (errorControl) {
      throw new Error(
        "No se pudo obtener la configuración de marcadores."
      )
    }

    for (
      const pregunta of
      (
        preguntasControl ??
        []
      ) as PreguntaControl[]
    ) {
      metadatos.set(
        Number(
          pregunta.id
        ),
        pregunta
      )
    }
  }

  const yaMarcados =
    new Set<number>(
      Array.from(
        mapa.keys()
      )
    )

  const disponibles =
    items.filter(
      item =>
        !yaMarcados.has(
          item.id
        )
    )

  const criticasPermitidas =
    mezclar(
      disponibles.filter(
        item => {
          const meta =
            item.pregunta_id
              ? metadatos.get(
                  item.pregunta_id
                )
              : null

          return (
            item.critica_snapshot &&
            meta
              ?.permite_marcador_oculto ===
              true
          )
        }
      )
    )

  const otrasPermitidas =
    mezclar(
      disponibles.filter(
        item => {
          const meta =
            item.pregunta_id
              ? metadatos.get(
                  item.pregunta_id
                )
              : null

          return (
            !item.critica_snapshot &&
            meta
              ?.permite_marcador_oculto ===
              true
          )
        }
      )
    )

  const criticasRestantes =
    mezclar(
      disponibles.filter(
        item => {
          const meta =
            item.pregunta_id
              ? metadatos.get(
                  item.pregunta_id
                )
              : null

          return (
            item.critica_snapshot &&
            meta
              ?.permite_marcador_oculto !==
              true
          )
        }
      )
    )

  const otrasRestantes =
    mezclar(
      disponibles.filter(
        item => {
          const meta =
            item.pregunta_id
              ? metadatos.get(
                  item.pregunta_id
                )
              : null

          return (
            !item.critica_snapshot &&
            meta
              ?.permite_marcador_oculto !==
              true
          )
        }
      )
    )

  /*
   * Priorizamos 3 preguntas críticas
   * y luego una pregunta adicional.
   * Si el banco seleccionado no lo
   * permite, completamos con otras.
   */
  const candidatos = [
    ...criticasPermitidas.slice(
      0,
      3
    ),
    ...otrasPermitidas,
    ...criticasPermitidas.slice(
      3
    ),
    ...criticasRestantes,
    ...otrasRestantes,
  ]

  const nuevos:
    {
      evaluacion_id: number
      evaluacion_item_id: number
      palabra_control: string
      tema_secundario:
        string | null
    }[] = []

  for (
    const item
    of candidatos
  ) {
    if (
      mapa.size +
        nuevos.length >=
      CANTIDAD_MARCADORES
    ) {
      break
    }

    if (
      yaMarcados.has(
        item.id
      )
    ) {
      continue
    }

    const palabra =
      elegirPalabraControl(
        item,
        palabrasUsadas
      )

    if (!palabra) {
      continue
    }

    const meta =
      item.pregunta_id
        ? metadatos.get(
            item.pregunta_id
          )
        : null

    nuevos.push({
      evaluacion_id:
        evaluacion.id,
      evaluacion_item_id:
        item.id,
      palabra_control:
        palabra,
      tema_secundario:
        meta
          ?.tema_secundario ??
        "control_general",
    })

    palabrasUsadas.add(
      palabra.toLowerCase()
    )

    yaMarcados.add(
      item.id
    )
  }

  if (
    mapa.size +
      nuevos.length <
    CANTIDAD_MARCADORES
  ) {
    throw new Error(
      "No fue posible asignar los cuatro marcadores ocultos."
    )
  }

  if (
    nuevos.length > 0
  ) {
    const {
      error:
        errorInsertar,
    } = await supabase
      .from(
        "evaluacion_marcadores"
      )
      .insert(
        nuevos
      )

    if (errorInsertar) {
      throw new Error(
        "No se pudieron guardar los marcadores ocultos."
      )
    }

    for (
      const marcador
      of nuevos
    ) {
      mapa.set(
        marcador.evaluacion_item_id,
        marcador.palabra_control
      )
    }
  }

  return mapa
}

function dibujarEncabezado(
  page: PDFPage,
  fontRegular: PDFFont,
  fontBold: PDFFont,
  evaluacion:
    Evaluacion,
  configuracion:
    Configuracion,
  primeraPagina:
    boolean
) {
  const {
    width,
    height,
  } = page.getSize()

  const azul =
    rgb(
      0.05,
      0.31,
      0.49
    )

  const celeste =
    rgb(
      0.21,
      0.77,
      0.81
    )

  const gris =
    rgb(
      0.32,
      0.38,
      0.46
    )

  const grisClaro =
    rgb(
      0.96,
      0.97,
      0.98
    )

  const negro =
    rgb(
      0.05,
      0.07,
      0.10
    )

  const blanco =
    rgb(
      1,
      1,
      1
    )

  page.drawRectangle({
    x: 0,
    y: height - 62,
    width,
    height: 62,
    color: azul,
  })

  page.drawRectangle({
    x: 0,
    y: height - 65,
    width,
    height: 3,
    color: celeste,
  })

  page.drawText(
    "RENACLI",
    {
      x: 42,
      y: height - 29,
      size: 19,
      font: fontBold,
      color: blanco,
    }
  )

  page.drawText(
    "Registro Nacional de Climatizacion y Refrigeracion",
    {
      x: 42,
      y: height - 44,
      size: 7.5,
      font: fontRegular,
      color: blanco,
    }
  )

  page.drawText(
    "EVALUACION TECNICA",
    {
      x: width - 175,
      y: height - 31,
      size: 10,
      font: fontBold,
      color: blanco,
    }
  )

  page.drawText(
    textoSeguroPdf(
      evaluacion.codigo
    ),
    {
      x: width - 175,
      y: height - 45,
      size: 7.5,
      font: fontRegular,
      color: blanco,
    }
  )

  let y =
    height - 91

  page.drawText(
    "TECNICO",
    {
      x: 42,
      y,
      size: 6.5,
      font: fontBold,
      color: gris,
    }
  )

  page.drawText(
    textoSeguroPdf(
      evaluacion
        .apellido_nombre_snapshot ||
        "Sin nombre"
    ),
    {
      x: 42,
      y: y - 13,
      size: 10,
      font: fontBold,
      color: negro,
    }
  )

  page.drawText(
    "MATRICULA",
    {
      x: 360,
      y,
      size: 6.5,
      font: fontBold,
      color: gris,
    }
  )

  page.drawText(
    textoSeguroPdf(
      evaluacion
        .numero_matricula_snapshot ||
        "Sin matricula"
    ),
    {
      x: 360,
      y: y - 13,
      size: 10,
      font: fontBold,
      color: azul,
    }
  )

  y -= 33

  page.drawRectangle({
    x: 42,
    y: y - 30,
    width: width - 84,
    height: 36,
    color: grisClaro,
    borderColor:
      rgb(
        0.84,
        0.87,
        0.90
      ),
    borderWidth: 0.6,
  })

  const aprobacion =
    Number(
      configuracion
        .porcentaje_aprobacion
    )

  page.drawText(
    `Preguntas: ${configuracion.total_preguntas}`,
    {
      x: 53,
      y: y - 10,
      size: 7.5,
      font: fontBold,
      color: negro,
    }
  )

  page.drawText(
    `Duracion: ${configuracion.duracion_minutos} minutos`,
    {
      x: 153,
      y: y - 10,
      size: 7.5,
      font: fontBold,
      color: negro,
    }
  )

  page.drawText(
    `Aprobacion: ${aprobacion}%`,
    {
      x: 300,
      y: y - 10,
      size: 7.5,
      font: fontBold,
      color: negro,
    }
  )

  page.drawText(
    `Criticas: minimo ${configuracion.criticas_minimas_correctas} de ${configuracion.preguntas_criticas_total}`,
    {
      x: 405,
      y: y - 10,
      size: 7.5,
      font: fontBold,
      color: negro,
    }
  )

  if (primeraPagina) {
    page.drawText(
      "Marque una sola opcion por pregunta. No se consideran respuestas multiples.",
      {
        x: 53,
        y: y - 23,
        size: 6.8,
        font: fontRegular,
        color: gris,
      }
    )
  } else {
    page.drawText(
      "Continuacion de la evaluacion.",
      {
        x: 53,
        y: y - 23,
        size: 6.8,
        font: fontRegular,
        color: gris,
      }
    )
  }

  return y - 47
}

function calcularAlturaPregunta(
  item:
    EvaluacionItem,
  fontRegular:
    PDFFont,
  fontBold:
    PDFFont,
  anchoTexto:
    number
) {
  const lineasPregunta =
    envolverTexto(
      `${item.orden}. ${item.enunciado_snapshot}`,
      fontBold,
      10,
      anchoTexto
    ).length

  const opciones = [
    `A) ${item.opcion_a_snapshot}`,
    `B) ${item.opcion_b_snapshot}`,
    `C) ${item.opcion_c_snapshot}`,
    `D) ${item.opcion_d_snapshot}`,
  ]

  let lineasOpciones =
    0

  for (
    const opcion
    of opciones
  ) {
    lineasOpciones +=
      envolverTexto(
        opcion,
        fontRegular,
        9,
        anchoTexto - 12
      ).length
  }

  return (
    lineasPregunta *
      12.5 +
    lineasOpciones *
      11 +
    25
  )
}

function dibujarPregunta(
  page:
    PDFPage,
  item:
    EvaluacionItem,
  marcador:
    string | undefined,
  yInicial:
    number,
  fontRegular:
    PDFFont,
  fontBold:
    PDFFont
) {
  const margen =
    42

  const ancho =
    page.getWidth() -
    margen * 2

  const negro =
    rgb(
      0.05,
      0.07,
      0.10
    )

  const gris =
    rgb(
      0.30,
      0.35,
      0.42
    )

  const linea =
    rgb(
      0.88,
      0.90,
      0.93
    )

  const blanco =
    rgb(
      1,
      1,
      1
    )

  let y =
    yInicial

  /*
   * El marcador se dibuja en blanco
   * detrás del texto visible.
   * No modifica el contenido visual,
   * pero permanece dentro del PDF.
   */
  if (marcador) {
    page.drawText(
      textoSeguroPdf(
        marcador
      ),
      {
        x: margen + 8,
        y: y - 1,
        size: 4,
        font: fontRegular,
        color: blanco,
      }
    )
  }

  const lineasPregunta =
    envolverTexto(
      `${item.orden}. ${item.enunciado_snapshot}`,
      fontBold,
      10,
      ancho
    )

  for (
    const lineaPregunta
    of lineasPregunta
  ) {
    page.drawText(
      lineaPregunta,
      {
        x: margen,
        y,
        size: 10,
        font: fontBold,
        color: negro,
      }
    )

    y -= 12.5
  }

  y -= 3

  const opciones = [
    `A) ${item.opcion_a_snapshot}`,
    `B) ${item.opcion_b_snapshot}`,
    `C) ${item.opcion_c_snapshot}`,
    `D) ${item.opcion_d_snapshot}`,
  ]

  for (
    const opcion
    of opciones
  ) {
    const lineasOpcion =
      envolverTexto(
        opcion,
        fontRegular,
        9,
        ancho - 12
      )

    for (
      const lineaOpcion
      of lineasOpcion
    ) {
      page.drawText(
        lineaOpcion,
        {
          x: margen + 12,
          y,
          size: 9,
          font: fontRegular,
          color: gris,
        }
      )

      y -= 11
    }

    y -= 1
  }

  y -= 4

  page.drawLine({
    start: {
      x: margen,
      y,
    },
    end: {
      x:
        page.getWidth() -
        margen,
      y,
    },
    thickness: 0.5,
    color: linea,
  })

  return y - 12
}

function dibujarPiePagina(
  page:
    PDFPage,
  fontRegular:
    PDFFont,
  fontBold:
    PDFFont,
  evaluacion:
    Evaluacion,
  pagina:
    number,
  totalPaginas:
    number
) {
  const ancho =
    page.getWidth()

  const gris =
    rgb(
      0.38,
      0.43,
      0.50
    )

  const azul =
    rgb(
      0.05,
      0.31,
      0.49
    )

  page.drawLine({
    start: {
      x: 42,
      y: 28,
    },
    end: {
      x: ancho - 42,
      y: 28,
    },
    thickness: 0.5,
    color:
      rgb(
        0.84,
        0.87,
        0.90
      ),
  })

  page.drawText(
    textoSeguroPdf(
      evaluacion.codigo
    ),
    {
      x: 42,
      y: 15,
      size: 6.5,
      font: fontBold,
      color: azul,
    }
  )

  const textoPagina =
    `Pagina ${pagina} de ${totalPaginas}`

  const anchoTexto =
    fontRegular
      .widthOfTextAtSize(
        textoPagina,
        6.5
      )

  page.drawText(
    textoPagina,
    {
      x:
        ancho -
        42 -
        anchoTexto,
      y: 15,
      size: 6.5,
      font: fontRegular,
      color: gris,
    }
  )
}

export async function GET(
  _request: NextRequest,
  {
    params,
  }: RouteProps
) {
  try {
    const autorizado =
      await adminAutorizado()

    if (!autorizado) {
      return NextResponse.json(
        {
          error:
            "No autorizado.",
        },
        {
          status: 401,
        }
      )
    }

    const {
      codigo:
        codigoParametro,
    } = await params

    const codigo =
      decodeURIComponent(
        codigoParametro
      )
        .trim()
        .toUpperCase()

    if (
      !/^RNC-EVAL-\d{6}$/.test(
        codigo
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Codigo de evaluacion invalido.",
        },
        {
          status: 400,
        }
      )
    }

    const supabase =
      obtenerSupabaseAdmin()

    const {
      data:
        evaluacionData,
      error:
        errorEvaluacion,
    } = await supabase
      .from(
        "evaluaciones"
      )
      .select(
        `
          id,
          codigo,
          matriculado_id,
          numero_matricula_snapshot,
          apellido_nombre_snapshot,
          tipo_evaluacion,
          estado,
          total_preguntas,
          fecha_generacion
        `
      )
      .eq(
        "codigo",
        codigo
      )
      .maybeSingle()

    if (
      errorEvaluacion ||
      !evaluacionData
    ) {
      return NextResponse.json(
        {
          error:
            "Evaluacion no encontrada.",
        },
        {
          status: 404,
        }
      )
    }

    const evaluacion =
      evaluacionData as Evaluacion

    const {
      data:
        configuracionData,
      error:
        errorConfiguracion,
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
          marcadores_ocultos_cantidad
        `
      )
      .eq(
        "tipo_evaluacion",
        evaluacion
          .tipo_evaluacion
      )
      .maybeSingle()

    if (
      errorConfiguracion ||
      !configuracionData
    ) {
      return NextResponse.json(
        {
          error:
            "No se pudo obtener la configuracion de la evaluacion.",
        },
        {
          status: 500,
        }
      )
    }

    const configuracion =
      configuracionData as Configuracion

    const {
      data:
        itemsData,
      error:
        errorItems,
    } = await supabase
      .from(
        "evaluacion_items"
      )
      .select(
        `
          id,
          evaluacion_id,
          pregunta_id,
          orden,
          enunciado_snapshot,
          opcion_a_snapshot,
          opcion_b_snapshot,
          opcion_c_snapshot,
          opcion_d_snapshot,
          tema_snapshot,
          dificultad_snapshot,
          critica_snapshot
        `
      )
      .eq(
        "evaluacion_id",
        evaluacion.id
      )
      .order(
        "orden",
        {
          ascending: true,
        }
      )

    if (
      errorItems ||
      !itemsData
    ) {
      return NextResponse.json(
        {
          error:
            "No se pudieron obtener las preguntas de la evaluacion.",
        },
        {
          status: 500,
        }
      )
    }

    const items =
      itemsData as EvaluacionItem[]

    if (
      items.length !==
      Number(
        evaluacion.total_preguntas
      )
    ) {
      return NextResponse.json(
        {
          error:
            "La evaluacion esta incompleta y no puede generar un PDF.",
        },
        {
          status: 409,
        }
      )
    }

    const marcadores =
      await obtenerOCrearMarcadores(
        evaluacion,
        items
      )

    const pdf =
      await PDFDocument.create()

    pdf.setTitle(
      `Evaluacion RENACLI ${evaluacion.codigo}`
    )

    pdf.setAuthor(
      "RENACLI - Registro Nacional de Climatizacion y Refrigeracion"
    )

    pdf.setSubject(
      "Evaluacion tecnica RENACLI"
    )

    pdf.setCreator(
      "RENACLI"
    )

    pdf.setProducer(
      "RENACLI"
    )

    pdf.setKeywords([
      "RENACLI",
      "evaluacion",
      evaluacion.codigo,
      evaluacion
        .numero_matricula_snapshot ??
        "",
    ])

    const fontRegular =
      await pdf.embedFont(
        StandardFonts.Helvetica
      )

    const fontBold =
      await pdf.embedFont(
        StandardFonts.HelveticaBold
      )

    const A4:
      [number, number] = [
        595.28,
        841.89,
      ]

    let page =
      pdf.addPage(A4)

    let y =
      dibujarEncabezado(
        page,
        fontRegular,
        fontBold,
        evaluacion,
        configuracion,
        true
      )

    const margenInferiorContenido =
      48

    const anchoTexto =
      A4[0] - 84

    for (
      const item
      of items
    ) {
      const alturaNecesaria =
        calcularAlturaPregunta(
          item,
          fontRegular,
          fontBold,
          anchoTexto
        )

      if (
        y -
          alturaNecesaria <
        margenInferiorContenido
      ) {
        page =
          pdf.addPage(A4)

        y =
          dibujarEncabezado(
            page,
            fontRegular,
            fontBold,
            evaluacion,
            configuracion,
            false
          )
      }

      y =
        dibujarPregunta(
          page,
          item,
          marcadores.get(
            item.id
          ),
          y,
          fontRegular,
          fontBold
        )
    }

    const paginas =
      pdf.getPages()

    paginas.forEach(
      (
        pagina,
        indice
      ) => {
        dibujarPiePagina(
          pagina,
          fontRegular,
          fontBold,
          evaluacion,
          indice + 1,
          paginas.length
        )
      }
    )

    const pdfBytes =
      await pdf.save()

    const nombreSeguro =
      evaluacion.codigo.replace(
        /[^A-Za-z0-9_-]/g,
        "_"
      )

    return new NextResponse(
      Buffer.from(
        pdfBytes
      ),
      {
        status: 200,
        headers: {
          "Content-Type":
            "application/pdf",
          "Content-Disposition":
            `attachment; filename="Evaluacion-RENACLI-${nombreSeguro}.pdf"`,
          "Cache-Control":
            "private, no-store, max-age=0",
          "X-RENACLI-Evaluation-Code":
            evaluacion.codigo,
        },
      }
    )
  } catch (error) {
    console.error(
      "[RENACLI] Error generando PDF de evaluacion:",
      error
    )

    return NextResponse.json(
      {
        error:
          "No se pudo generar el PDF de la evaluacion.",
      },
      {
        status: 500,
      }
    )
  }
}
