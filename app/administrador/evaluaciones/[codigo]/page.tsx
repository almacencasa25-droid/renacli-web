import crypto from "crypto"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@supabase/supabase-js"

const COOKIE_NAME = "renacli_admin_session"

type RouteProps = {
  params: Promise<{
    codigo: string
  }>
  searchParams?: Promise<{
    corregido?: string
    error?: string
  }>
}

type Evaluacion = {
  id: number
  codigo: string
  numero_matricula_snapshot: string | null
  apellido_nombre_snapshot: string | null
  tipo_evaluacion: string
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

type EvaluacionItem = {
  id: number
  orden: number
  enunciado_snapshot: string
  opcion_a_snapshot: string
  opcion_b_snapshot: string
  opcion_c_snapshot: string
  opcion_d_snapshot: string
  respuesta_correcta_snapshot: string
  critica_snapshot: boolean
}

type RespuestaGuardada = {
  evaluacion_item_id: number
  opcion_elegida: string
  correcta: boolean
}

type Configuracion = {
  tipo_evaluacion: string
  porcentaje_aprobacion: number | string
  criticas_minimas_correctas: number
  preguntas_criticas_total: number
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
  const cookieStore =
    await cookies()

  const tokenGuardado =
    cookieStore.get(
      COOKIE_NAME
    )?.value

  const tokenCorrecto =
    obtenerTokenAdministrador()

  return (
    Boolean(tokenCorrecto) &&
    tokenGuardado ===
      tokenCorrecto
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

function codigoValido(
  codigo: string
) {
  return /^RNC-EVAL-\d{6}$/.test(
    codigo
  )
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

async function corregirEvaluacion(
  formData: FormData
) {
  "use server"

  if (!(await estaAutorizado())) {
    redirect("/administrador")
  }

  const codigo =
    String(
      formData.get("codigo") ??
        ""
    )
      .trim()
      .toUpperCase()

  if (!codigoValido(codigo)) {
    redirect(
      "/administrador/evaluaciones"
    )
  }

  const supabase =
    obtenerSupabaseAdmin()

  const {
    data: evaluacion,
    error: errorEvaluacion,
  } = await supabase
    .from("evaluaciones")
    .select(
      `
        id,
        codigo,
        tipo_evaluacion,
        total_preguntas,
        preguntas_criticas_total
      `
    )
    .eq(
      "codigo",
      codigo
    )
    .maybeSingle()

  if (
    errorEvaluacion ||
    !evaluacion
  ) {
    redirect(
      `/administrador/evaluaciones/${encodeURIComponent(
        codigo
      )}?error=evaluacion`
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
        porcentaje_aprobacion,
        criticas_minimas_correctas,
        preguntas_criticas_total
      `
    )
    .eq(
      "tipo_evaluacion",
      evaluacion.tipo_evaluacion
    )
    .maybeSingle()

  if (
    errorConfiguracion ||
    !configuracion
  ) {
    redirect(
      `/administrador/evaluaciones/${encodeURIComponent(
        codigo
      )}?error=config`
    )
  }

  const {
    data: items,
    error: errorItems,
  } = await supabase
    .from(
      "evaluacion_items"
    )
    .select(
      `
        id,
        orden,
        respuesta_correcta_snapshot,
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
    !items ||
    items.length !==
      Number(
        evaluacion.total_preguntas
      )
  ) {
    redirect(
      `/administrador/evaluaciones/${encodeURIComponent(
        codigo
      )}?error=items`
    )
  }

  const respuestas:
    {
      evaluacion_item_id: number
      opcion_elegida: string
      correcta: boolean
      respondida_at: string
    }[] = []

  let correctas = 0
  let criticasCorrectas = 0

  const ahora =
    new Date().toISOString()

  for (
    const item of items
  ) {
    const opcion =
      String(
        formData.get(
          `respuesta_${item.id}`
        ) ?? ""
      )
        .trim()
        .toUpperCase()

    if (
      !["A", "B", "C", "D"].includes(
        opcion
      )
    ) {
      redirect(
        `/administrador/evaluaciones/${encodeURIComponent(
          codigo
        )}?error=incompleta`
      )
    }

    const respuestaCorrecta =
      String(
        item.respuesta_correcta_snapshot
      )
        .trim()
        .toUpperCase()

    const esCorrecta =
      opcion ===
      respuestaCorrecta

    if (esCorrecta) {
      correctas += 1

      if (
        Boolean(
          item.critica_snapshot
        )
      ) {
        criticasCorrectas += 1
      }
    }

    respuestas.push({
      evaluacion_item_id:
        Number(item.id),
      opcion_elegida:
        opcion,
      correcta:
        esCorrecta,
      respondida_at:
        ahora,
    })
  }

  const total =
    items.length

  const incorrectas =
    total - correctas

  const porcentaje =
    Number(
      (
        (correctas / total) *
        100
      ).toFixed(2)
    )

  const porcentajeMinimo =
    Number(
      configuracion
        .porcentaje_aprobacion
    )

  const criticasMinimas =
    Number(
      configuracion
        .criticas_minimas_correctas
    )

  const aprobado =
    porcentaje >=
      porcentajeMinimo &&
    criticasCorrectas >=
      criticasMinimas

  const {
    error:
      errorRespuestas,
  } = await supabase
    .from(
      "evaluacion_respuestas"
    )
    .upsert(
      respuestas,
      {
        onConflict:
          "evaluacion_item_id",
      }
    )

  if (errorRespuestas) {
    console.error(
      "[RENACLI] Error guardando respuestas:",
      errorRespuestas
    )

    redirect(
      `/administrador/evaluaciones/${encodeURIComponent(
        codigo
      )}?error=guardar`
    )
  }

  const {
    error:
      errorActualizar,
  } = await supabase
    .from("evaluaciones")
    .update({
      estado:
        "finalizada",
      respuestas_correctas:
        correctas,
      respuestas_incorrectas:
        incorrectas,
      porcentaje,
      aprobado,
      preguntas_criticas_correctas:
        criticasCorrectas,
      fecha_finalizacion:
        ahora,
    })
    .eq(
      "id",
      evaluacion.id
    )

  if (errorActualizar) {
    console.error(
      "[RENACLI] Error actualizando resultado:",
      errorActualizar
    )

    redirect(
      `/administrador/evaluaciones/${encodeURIComponent(
        codigo
      )}?error=guardar`
    )
  }

  redirect(
    `/administrador/evaluaciones/${encodeURIComponent(
      codigo
    )}?corregido=1`
  )
}

function obtenerMensajeError(
  error:
    | string
    | undefined
) {
  if (
    error ===
    "evaluacion"
  ) {
    return "No se pudo encontrar la evaluación."
  }

  if (
    error ===
    "config"
  ) {
    return "No se pudo obtener la configuración de corrección."
  }

  if (
    error ===
    "items"
  ) {
    return "La evaluación está incompleta o sus preguntas no pudieron leerse."
  }

  if (
    error ===
    "incompleta"
  ) {
    return "Debe cargarse una respuesta para cada una de las 30 preguntas."
  }

  if (
    error ===
    "guardar"
  ) {
    return "No fue posible guardar correctamente la corrección."
  }

  return null
}

export default async function EvaluacionDetallePage({
  params,
  searchParams,
}: RouteProps) {
  const autorizado =
    await estaAutorizado()

  if (!autorizado) {
    redirect("/administrador")
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

  if (!codigoValido(codigo)) {
    redirect(
      "/administrador/evaluaciones"
    )
  }

  const parametros =
    searchParams
      ? await searchParams
      : {}

  const supabase =
    obtenerSupabaseAdmin()

  const {
    data:
      evaluacionData,
    error:
      errorEvaluacion,
  } = await supabase
    .from("evaluaciones")
    .select(
      `
        id,
        codigo,
        numero_matricula_snapshot,
        apellido_nombre_snapshot,
        tipo_evaluacion,
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
    .eq(
      "codigo",
      codigo
    )
    .maybeSingle()

  if (
    errorEvaluacion ||
    !evaluacionData
  ) {
    redirect(
      "/administrador/evaluaciones"
    )
  }

  const evaluacion =
    evaluacionData as Evaluacion

  const [
    itemsResultado,
    configuracionResultado,
  ] = await Promise.all([
    supabase
      .from(
        "evaluacion_items"
      )
      .select(
        `
          id,
          orden,
          enunciado_snapshot,
          opcion_a_snapshot,
          opcion_b_snapshot,
          opcion_c_snapshot,
          opcion_d_snapshot,
          respuesta_correcta_snapshot,
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
      ),

    supabase
      .from(
        "evaluacion_configuraciones"
      )
      .select(
        `
          tipo_evaluacion,
          porcentaje_aprobacion,
          criticas_minimas_correctas,
          preguntas_criticas_total
        `
      )
      .eq(
        "tipo_evaluacion",
        evaluacion
          .tipo_evaluacion
      )
      .maybeSingle(),
  ])

  if (
    itemsResultado.error ||
    !itemsResultado.data
  ) {
    throw new Error(
      "No se pudieron cargar las preguntas de la evaluación."
    )
  }

  if (
    configuracionResultado.error ||
    !configuracionResultado.data
  ) {
    throw new Error(
      "No se pudo cargar la configuración de evaluación."
    )
  }

  const items =
    itemsResultado.data as EvaluacionItem[]

  const configuracion =
    configuracionResultado.data as Configuracion

  const idsItems =
    items.map(
      item =>
        item.id
    )

  let respuestasGuardadas:
    RespuestaGuardada[] = []

  if (
    idsItems.length > 0
  ) {
    const {
      data,
      error,
    } = await supabase
      .from(
        "evaluacion_respuestas"
      )
      .select(
        `
          evaluacion_item_id,
          opcion_elegida,
          correcta
        `
      )
      .in(
        "evaluacion_item_id",
        idsItems
      )

    if (error) {
      console.error(
        "[RENACLI] Error leyendo respuestas guardadas:",
        error
      )
    } else {
      respuestasGuardadas =
        (
          data ?? []
        ) as RespuestaGuardada[]
    }
  }

  const mapaRespuestas =
    new Map<
      number,
      RespuestaGuardada
    >(
      respuestasGuardadas.map(
        respuesta => [
          Number(
            respuesta.evaluacion_item_id
          ),
          respuesta,
        ]
      )
    )

  const errorVisible =
    obtenerMensajeError(
      parametros.error
    )

  const estaFinalizada =
    evaluacion.estado ===
    "finalizada"

  return (
    <main
      style={{
        minHeight:
          "100vh",
        background:
          "#eef5fa",
        fontFamily:
          "Arial, sans-serif",
      }}
    >
      <header
        style={{
          background:
            "#0d4f7c",
          color:
            "white",
          padding:
            "25px 40px",
          borderBottom:
            "4px solid #35c4cf",
        }}
      >
        <h1
          style={{
            margin: 0,
            letterSpacing:
              "4px",
          }}
        >
          RENACLI
        </h1>

        <p
          style={{
            margin:
              "6px 0 0",
          }}
        >
          Registro Nacional de
          Climatización y Refrigeración
        </p>
      </header>

      <section
        style={{
          maxWidth:
            "1000px",
          margin:
            "40px auto",
          padding:
            "0 20px 50px",
        }}
      >
        <p
          style={{
            color:
              "#64748b",
            fontSize:
              "13px",
            fontWeight:
              "bold",
            letterSpacing:
              "1px",
          }}
        >
          ADMINISTRACIÓN · EVALUACIONES
        </p>

        <h2
          style={{
            color:
              "#172033",
            fontSize:
              "30px",
            marginBottom:
              "8px",
          }}
        >
          Corrección de evaluación
        </h2>

        <p
          style={{
            color:
              "#475569",
            marginTop: 0,
          }}
        >
          Código:{" "}
          <strong>
            {evaluacion.codigo}
          </strong>
        </p>

        {parametros.corregido ===
          "1" && (
          <Aviso
            tipo="ok"
            texto="La evaluación fue corregida y el resultado quedó guardado correctamente."
          />
        )}

        {errorVisible && (
          <Aviso
            tipo="error"
            texto={
              errorVisible
            }
          />
        )}

        <div
          style={{
            marginTop:
              "24px",
            padding:
              "22px",
            background:
              "white",
            border:
              "1px solid #d7e0e7",
            borderRadius:
              "14px",
            boxShadow:
              "0 2px 5px rgba(0,0,0,.07)",
          }}
        >
          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(180px, 1fr))",
              gap:
                "14px",
            }}
          >
            <Dato
              titulo="Técnico"
              valor={
                evaluacion.apellido_nombre_snapshot ||
                "Sin nombre"
              }
            />

            <Dato
              titulo="Matrícula"
              valor={
                evaluacion.numero_matricula_snapshot ||
                "-"
              }
            />

            <Dato
              titulo="Código"
              valor={
                evaluacion.codigo
              }
            />

            <Dato
              titulo="Estado"
              valor={
                evaluacion.estado
              }
            />
          </div>
        </div>

        {estaFinalizada && (
          <div
            style={{
              marginTop:
                "24px",
              padding:
                "24px",
              borderRadius:
                "14px",
              background:
                evaluacion.aprobado
                  ? "#ecfdf5"
                  : "#fff1f2",
              border:
                evaluacion.aprobado
                  ? "1px solid #86efac"
                  : "1px solid #fecdd3",
            }}
          >
            <div
              style={{
                fontSize:
                  "28px",
                fontWeight:
                  "bold",
                color:
                  evaluacion.aprobado
                    ? "#166534"
                    : "#be123c",
              }}
            >
              {evaluacion.aprobado
                ? "APROBADO"
                : "NO APROBADO"}
            </div>

            <div
              style={{
                display:
                  "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(160px, 1fr))",
                gap:
                  "12px",
                marginTop:
                  "18px",
              }}
            >
              <Dato
                titulo="Correctas"
                valor={String(
                  evaluacion.respuestas_correctas ??
                    0
                )}
              />

              <Dato
                titulo="Incorrectas"
                valor={String(
                  evaluacion.respuestas_incorrectas ??
                    0
                )}
              />

              <Dato
                titulo="Porcentaje"
                valor={`${Number(
                  evaluacion.porcentaje ??
                    0
                ).toFixed(
                  2
                )} %`}
              />

              <Dato
                titulo="Críticas correctas"
                valor={`${evaluacion.preguntas_criticas_correctas ?? 0} de ${evaluacion.preguntas_criticas_total}`}
              />
            </div>

            <p
              style={{
                marginBottom:
                  0,
                marginTop:
                  "18px",
                color:
                  "#475569",
                fontSize:
                  "13px",
              }}
            >
              Regla de aprobación: mínimo{" "}
              <strong>
                {Number(
                  configuracion.porcentaje_aprobacion
                )}
                %
              </strong>{" "}
              y al menos{" "}
              <strong>
                {configuracion.criticas_minimas_correctas} de{" "}
                {configuracion.preguntas_criticas_total}
              </strong>{" "}
              preguntas críticas correctas.
            </p>

            <p
              style={{
                color:
                  "#64748b",
                fontSize:
                  "12px",
                marginBottom:
                  0,
              }}
            >
              Finalizada:{" "}
              {formatearFechaHora(
                evaluacion.fecha_finalizacion
              )}
            </p>
          </div>
        )}

        <form
          action={
            corregirEvaluacion
          }
        >
          <input
            type="hidden"
            name="codigo"
            value={
              evaluacion.codigo
            }
          />

          <div
            style={{
              display:
                "grid",
              gap:
                "16px",
              marginTop:
                "28px",
            }}
          >
            {items.map(
              item => {
                const respuestaGuardada =
                  mapaRespuestas.get(
                    item.id
                  )
                    ?.opcion_elegida

                return (
                  <div
                    key={
                      item.id
                    }
                    style={{
                      padding:
                        "22px",
                      background:
                        "white",
                      border:
                        "1px solid #d7e0e7",
                      borderRadius:
                        "12px",
                      boxShadow:
                        "0 1px 4px rgba(0,0,0,.05)",
                    }}
                  >
                    <div
                      style={{
                        fontWeight:
                          "bold",
                        color:
                          "#172033",
                        lineHeight:
                          1.5,
                        marginBottom:
                          "16px",
                      }}
                    >
                      {item.orden}.{" "}
                      {
                        item.enunciado_snapshot
                      }
                    </div>

                    <Opcion
                      letra="A"
                      texto={
                        item.opcion_a_snapshot
                      }
                      itemId={
                        item.id
                      }
                      respuestaGuardada={
                        respuestaGuardada
                      }
                    />

                    <Opcion
                      letra="B"
                      texto={
                        item.opcion_b_snapshot
                      }
                      itemId={
                        item.id
                      }
                      respuestaGuardada={
                        respuestaGuardada
                      }
                    />

                    <Opcion
                      letra="C"
                      texto={
                        item.opcion_c_snapshot
                      }
                      itemId={
                        item.id
                      }
                      respuestaGuardada={
                        respuestaGuardada
                      }
                    />

                    <Opcion
                      letra="D"
                      texto={
                        item.opcion_d_snapshot
                      }
                      itemId={
                        item.id
                      }
                      respuestaGuardada={
                        respuestaGuardada
                      }
                    />
                  </div>
                )
              }
            )}
          </div>

          <div
            style={{
              marginTop:
                "28px",
              padding:
                "22px",
              background:
                "white",
              border:
                "1px solid #d7e0e7",
              borderRadius:
                "14px",
              display:
                "flex",
              gap:
                "12px",
              flexWrap:
                "wrap",
              alignItems:
                "center",
            }}
          >
            <button
              type="submit"
              style={
                botonVerde
              }
            >
              {estaFinalizada
                ? "Guardar nueva corrección"
                : "Corregir evaluación"}
            </button>

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
              href="/administrador/evaluaciones"
              style={
                botonBlanco
              }
            >
              Volver a evaluaciones
            </a>
          </div>
        </form>
      </section>
    </main>
  )
}

function Opcion({
  letra,
  texto,
  itemId,
  respuestaGuardada,
}: {
  letra: string
  texto: string
  itemId: number
  respuestaGuardada:
    | string
    | undefined
}) {
  return (
    <label
      style={{
        display:
          "flex",
        alignItems:
          "flex-start",
        gap:
          "10px",
        padding:
          "8px 10px",
        borderRadius:
          "8px",
        cursor:
          "pointer",
        color:
          "#334155",
        lineHeight:
          1.45,
      }}
    >
      <input
        type="radio"
        name={`respuesta_${itemId}`}
        value={
          letra
        }
        defaultChecked={
          respuestaGuardada ===
          letra
        }
        required
        style={{
          marginTop:
            "3px",
        }}
      />

      <span>
        <strong>
          {letra})
        </strong>{" "}
        {texto}
      </span>
    </label>
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
        padding:
          "13px",
        border:
          "1px solid #e2e8f0",
        borderRadius:
          "9px",
        background:
          "#f8fafc",
      }}
    >
      <div
        style={{
          color:
            "#64748b",
          fontSize:
            "11px",
          fontWeight:
            "bold",
          textTransform:
            "uppercase",
        }}
      >
        {titulo}
      </div>

      <div
        style={{
          marginTop:
            "6px",
          color:
            "#172033",
          fontWeight:
            "bold",
          lineHeight:
            1.35,
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
  tipo:
    | "ok"
    | "error"
}) {
  return (
    <div
      style={{
        marginTop:
          "22px",
        padding:
          "16px",
        borderRadius:
          "10px",
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
        fontWeight:
          "bold",
      }}
    >
      {texto}
    </div>
  )
}

const botonVerde = {
  padding:
    "13px 20px",
  border:
    "none",
  borderRadius:
    "8px",
  background:
    "#15803d",
  color:
    "white",
  fontWeight:
    "bold",
  textDecoration:
    "none",
  cursor:
    "pointer",
}

const botonAzul = {
  padding:
    "13px 20px",
  border:
    "none",
  borderRadius:
    "8px",
  background:
    "#0d5689",
  color:
    "white",
  fontWeight:
    "bold",
  textDecoration:
    "none",
  cursor:
    "pointer",
}

const botonBlanco = {
  padding:
    "13px 20px",
  border:
    "1px solid #cbd5e1",
  borderRadius:
    "8px",
  background:
    "white",
  color:
    "#334155",
  fontWeight:
    "bold",
  textDecoration:
    "none",
  cursor:
    "pointer",
}
