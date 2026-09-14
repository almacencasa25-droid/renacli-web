import crypto from "crypto"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@supabase/supabase-js"

const COOKIE_NAME = "renacli_admin_session"

type Props = {
  searchParams?: Promise<{
    q?: string
    tema?: string
    dificultad?: string
    estado?: string
  }>
}

type Categoria = {
  codigo: string
  nombre: string
  orden: number
  activa: boolean
}

type Pregunta = {
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
  estado: string
  explicacion_interna: string | null
  permite_marcador_oculto: boolean
  tema_secundario: string | null
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

async function obtenerCategorias():
  Promise<Categoria[]> {
  const supabase =
    obtenerSupabaseAdmin()

  const {
    data,
    error,
  } = await supabase
    .from(
      "evaluacion_categorias"
    )
    .select(
      `
        codigo,
        nombre,
        orden,
        activa
      `
    )
    .order(
      "orden",
      {
        ascending: true,
      }
    )

  if (error) {
    console.error(
      "[RENACLI] Error obteniendo categorías:",
      error
    )

    return []
  }

  return (
    data ?? []
  ) as Categoria[]
}

async function obtenerPreguntas(
  q: string,
  tema: string,
  dificultad: string,
  estado: string
): Promise<Pregunta[]> {
  const supabase =
    obtenerSupabaseAdmin()

  let consulta =
    supabase
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
          estado,
          explicacion_interna,
          permite_marcador_oculto,
          tema_secundario
        `
      )
      .order(
        "tema",
        {
          ascending: true,
        }
      )
      .order(
        "dificultad",
        {
          ascending: true,
        }
      )
      .order(
        "id",
        {
          ascending: true,
        }
      )
      .limit(300)

  if (q) {
    const terminoSeguro =
      q
        .replace(/[%_,()]/g, " ")
        .trim()

    if (terminoSeguro) {
      consulta =
        consulta.ilike(
          "enunciado",
          `%${terminoSeguro}%`
        )
    }
  }

  if (
    tema &&
    tema !== "todos"
  ) {
    consulta =
      consulta.eq(
        "tema",
        tema
      )
  }

  if (
    dificultad &&
    dificultad !== "todas"
  ) {
    consulta =
      consulta.eq(
        "dificultad",
        dificultad
      )
  }

  if (
    estado &&
    estado !== "todos"
  ) {
    consulta =
      consulta.eq(
        "estado",
        estado
      )
  }

  const {
    data,
    error,
  } = await consulta

  if (error) {
    console.error(
      "[RENACLI] Error obteniendo banco de preguntas:",
      error
    )

    return []
  }

  return (
    data ?? []
  ) as Pregunta[]
}

async function obtenerResumen() {
  const supabase =
    obtenerSupabaseAdmin()

  const [
    total,
    activas,
    borradores,
    retiradas,
    criticas,
  ] = await Promise.all([
    supabase
      .from(
        "evaluacion_preguntas"
      )
      .select(
        "id",
        {
          count: "exact",
          head: true,
        }
      ),

    supabase
      .from(
        "evaluacion_preguntas"
      )
      .select(
        "id",
        {
          count: "exact",
          head: true,
        }
      )
      .eq(
        "estado",
        "activa"
      ),

    supabase
      .from(
        "evaluacion_preguntas"
      )
      .select(
        "id",
        {
          count: "exact",
          head: true,
        }
      )
      .eq(
        "estado",
        "borrador"
      ),

    supabase
      .from(
        "evaluacion_preguntas"
      )
      .select(
        "id",
        {
          count: "exact",
          head: true,
        }
      )
      .eq(
        "estado",
        "retirada"
      ),

    supabase
      .from(
        "evaluacion_preguntas"
      )
      .select(
        "id",
        {
          count: "exact",
          head: true,
        }
      )
      .eq(
        "critica",
        true
      ),
  ])

  return {
    total:
      total.count ?? 0,
    activas:
      activas.count ?? 0,
    borradores:
      borradores.count ?? 0,
    retiradas:
      retiradas.count ?? 0,
    criticas:
      criticas.count ?? 0,
  }
}

function nombreDificultad(
  dificultad: string
) {
  if (
    dificultad === "basica"
  ) {
    return "Básica"
  }

  if (
    dificultad === "intermedia"
  ) {
    return "Intermedia"
  }

  if (
    dificultad === "avanzada"
  ) {
    return "Avanzada"
  }

  return dificultad
}

function nombreEstado(
  estado: string
) {
  if (
    estado === "activa"
  ) {
    return "ACTIVA"
  }

  if (
    estado === "borrador"
  ) {
    return "BORRADOR"
  }

  if (
    estado === "retirada"
  ) {
    return "RETIRADA"
  }

  return estado.toUpperCase()
}

export default async function PreguntasPage({
  searchParams,
}: Props) {
  const autorizado =
    await estaAutorizado()

  if (!autorizado) {
    redirect(
      "/administrador"
    )
  }

  const parametros =
    searchParams
      ? await searchParams
      : {}

  const q =
    String(
      parametros.q ?? ""
    ).trim()

  const tema =
    String(
      parametros.tema ??
        "todos"
    )

  const dificultad =
    String(
      parametros.dificultad ??
        "todas"
    )

  const estado =
    String(
      parametros.estado ??
        "todos"
    )

  const [
    categorias,
    preguntas,
    resumen,
  ] = await Promise.all([
    obtenerCategorias(),
    obtenerPreguntas(
      q,
      tema,
      dificultad,
      estado
    ),
    obtenerResumen(),
  ])

  const nombresCategorias =
    new Map(
      categorias.map(
        categoria => [
          categoria.codigo,
          categoria.nombre,
        ]
      )
    )

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
            "1200px",
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
            fontSize:
              "32px",
            color:
              "#172033",
            marginBottom:
              "8px",
          }}
        >
          Banco de preguntas
        </h2>

        <p
          style={{
            color:
              "#475569",
            lineHeight:
              1.6,
            maxWidth:
              "800px",
            marginTop: 0,
          }}
        >
          Consulta y control del banco
          técnico utilizado para generar
          las evaluaciones RENACLI.
        </p>

        <div
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(170px, 1fr))",
            gap:
              "14px",
            marginTop:
              "28px",
          }}
        >
          <Resumen
            titulo="Total"
            cantidad={
              resumen.total
            }
          />

          <Resumen
            titulo="Activas"
            cantidad={
              resumen.activas
            }
          />

          <Resumen
            titulo="Borradores"
            cantidad={
              resumen.borradores
            }
          />

          <Resumen
            titulo="Retiradas"
            cantidad={
              resumen.retiradas
            }
          />

          <Resumen
            titulo="Críticas"
            cantidad={
              resumen.criticas
            }
          />
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
            boxShadow:
              "0 2px 5px rgba(0,0,0,.06)",
          }}
        >
          <h3
            style={{
              marginTop: 0,
              color:
                "#172033",
            }}
          >
            Buscar y filtrar
          </h3>

          <form
            method="get"
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "minmax(220px, 2fr) repeat(3, minmax(150px, 1fr)) auto",
              gap:
                "10px",
              alignItems:
                "end",
            }}
          >
            <Campo>
              <label
                style={
                  estiloLabel
                }
              >
                Buscar texto
              </label>

              <input
                type="text"
                name="q"
                defaultValue={
                  q
                }
                placeholder="Texto de la pregunta"
                style={
                  estiloCampo
                }
              />
            </Campo>

            <Campo>
              <label
                style={
                  estiloLabel
                }
              >
                Tema
              </label>

              <select
                name="tema"
                defaultValue={
                  tema
                }
                style={
                  estiloCampo
                }
              >
                <option value="todos">
                  Todos
                </option>

                {categorias.map(
                  categoria => (
                    <option
                      key={
                        categoria.codigo
                      }
                      value={
                        categoria.codigo
                      }
                    >
                      {
                        categoria.nombre
                      }
                    </option>
                  )
                )}
              </select>
            </Campo>

            <Campo>
              <label
                style={
                  estiloLabel
                }
              >
                Dificultad
              </label>

              <select
                name="dificultad"
                defaultValue={
                  dificultad
                }
                style={
                  estiloCampo
                }
              >
                <option value="todas">
                  Todas
                </option>

                <option value="basica">
                  Básica
                </option>

                <option value="intermedia">
                  Intermedia
                </option>

                <option value="avanzada">
                  Avanzada
                </option>
              </select>
            </Campo>

            <Campo>
              <label
                style={
                  estiloLabel
                }
              >
                Estado
              </label>

              <select
                name="estado"
                defaultValue={
                  estado
                }
                style={
                  estiloCampo
                }
              >
                <option value="todos">
                  Todos
                </option>

                <option value="activa">
                  Activa
                </option>

                <option value="borrador">
                  Borrador
                </option>

                <option value="retirada">
                  Retirada
                </option>
              </select>
            </Campo>

            <button
              type="submit"
              style={
                botonAzul
              }
            >
              Filtrar
            </button>
          </form>
        </div>

        <div
          style={{
            marginTop:
              "24px",
            display:
              "flex",
            alignItems:
              "center",
            justifyContent:
              "space-between",
            gap:
              "12px",
            flexWrap:
              "wrap",
          }}
        >
          <h3
            style={{
              margin: 0,
              color:
                "#172033",
            }}
          >
            Preguntas encontradas:{" "}
            {preguntas.length}
          </h3>

          <a
            href="/administrador/evaluaciones"
            style={
              botonBlanco
            }
          >
            Volver a evaluaciones
          </a>
        </div>

        <div
          style={{
            display:
              "grid",
            gap:
              "14px",
            marginTop:
              "18px",
          }}
        >
          {preguntas.length ===
          0 ? (
            <div
              style={{
                padding:
                  "24px",
                background:
                  "white",
                border:
                  "1px solid #d7e0e7",
                borderRadius:
                  "12px",
                color:
                  "#64748b",
              }}
            >
              No se encontraron
              preguntas con esos filtros.
            </div>
          ) : (
            preguntas.map(
              pregunta => (
                <article
                  key={
                    pregunta.id
                  }
                  style={{
                    padding:
                      "20px",
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
                      display:
                        "flex",
                      justifyContent:
                        "space-between",
                      alignItems:
                        "flex-start",
                      gap:
                        "15px",
                      flexWrap:
                        "wrap",
                    }}
                  >
                    <div
                      style={{
                        color:
                          "#64748b",
                        fontSize:
                          "12px",
                        fontWeight:
                          "bold",
                      }}
                    >
                      PREGUNTA #
                      {pregunta.id}
                    </div>

                    <div
                      style={{
                        display:
                          "flex",
                        gap:
                          "7px",
                        flexWrap:
                          "wrap",
                      }}
                    >
                      <Etiqueta
                        texto={
                          nombresCategorias.get(
                            pregunta.tema
                          ) ??
                          pregunta.tema
                        }
                      />

                      <Etiqueta
                        texto={
                          nombreDificultad(
                            pregunta.dificultad
                          )
                        }
                      />

                      {pregunta.critica && (
                        <Etiqueta
                          texto="CRÍTICA"
                          tipo="rojo"
                        />
                      )}

                      <Etiqueta
                        texto={
                          nombreEstado(
                            pregunta.estado
                          )
                        }
                        tipo={
                          pregunta.estado ===
                          "activa"
                            ? "verde"
                            : pregunta.estado ===
                                "retirada"
                              ? "rojo"
                              : "gris"
                        }
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop:
                        "12px",
                      fontWeight:
                        "bold",
                      color:
                        "#172033",
                      lineHeight:
                        1.5,
                      fontSize:
                        "16px",
                    }}
                  >
                    {
                      pregunta.enunciado
                    }
                  </div>

                  <div
                    style={{
                      display:
                        "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(240px, 1fr))",
                      gap:
                        "8px",
                      marginTop:
                        "15px",
                    }}
                  >
                    <Opcion
                      letra="A"
                      texto={
                        pregunta.opcion_a
                      }
                      correcta={
                        pregunta.respuesta_correcta ===
                        "A"
                      }
                    />

                    <Opcion
                      letra="B"
                      texto={
                        pregunta.opcion_b
                      }
                      correcta={
                        pregunta.respuesta_correcta ===
                        "B"
                      }
                    />

                    <Opcion
                      letra="C"
                      texto={
                        pregunta.opcion_c
                      }
                      correcta={
                        pregunta.respuesta_correcta ===
                        "C"
                      }
                    />

                    <Opcion
                      letra="D"
                      texto={
                        pregunta.opcion_d
                      }
                      correcta={
                        pregunta.respuesta_correcta ===
                        "D"
                      }
                    />
                  </div>

                  {(pregunta.explicacion_interna ||
                    pregunta.permite_marcador_oculto ||
                    pregunta.tema_secundario) && (
                    <div
                      style={{
                        marginTop:
                          "14px",
                        padding:
                          "12px",
                        background:
                          "#f8fafc",
                        borderRadius:
                          "8px",
                        color:
                          "#475569",
                        fontSize:
                          "13px",
                        lineHeight:
                          1.5,
                      }}
                    >
                      {pregunta.explicacion_interna && (
                        <div>
                          <strong>
                            Explicación interna:
                          </strong>{" "}
                          {
                            pregunta.explicacion_interna
                          }
                        </div>
                      )}

                      <div
                        style={{
                          marginTop:
                            pregunta.explicacion_interna
                              ? "6px"
                              : 0,
                        }}
                      >
                        <strong>
                          Marcador oculto:
                        </strong>{" "}
                        {pregunta.permite_marcador_oculto
                          ? "Permitido"
                          : "No"}
                      </div>

                      {pregunta.tema_secundario && (
                        <div
                          style={{
                            marginTop:
                              "6px",
                          }}
                        >
                          <strong>
                            Tema secundario:
                          </strong>{" "}
                          {
                            pregunta.tema_secundario
                          }
                        </div>
                      )}
                    </div>
                  )}
                </article>
              )
            )
          )}
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
        padding:
          "18px",
        background:
          "white",
        border:
          "1px solid #d7e0e7",
        borderRadius:
          "12px",
      }}
    >
      <div
        style={{
          color:
            "#64748b",
          fontSize:
            "12px",
          fontWeight:
            "bold",
        }}
      >
        {titulo}
      </div>

      <div
        style={{
          marginTop:
            "6px",
          color:
            "#0d4f7c",
          fontSize:
            "28px",
          fontWeight:
            "bold",
        }}
      >
        {cantidad}
      </div>
    </div>
  )
}

function Campo({
  children,
}: {
  children:
    React.ReactNode
}) {
  return (
    <div
      style={{
        display:
          "grid",
        gap:
          "6px",
      }}
    >
      {children}
    </div>
  )
}

function Opcion({
  letra,
  texto,
  correcta,
}: {
  letra: string
  texto: string
  correcta: boolean
}) {
  return (
    <div
      style={{
        padding:
          "10px",
        borderRadius:
          "8px",
        border:
          correcta
            ? "1px solid #86efac"
            : "1px solid #e2e8f0",
        background:
          correcta
            ? "#ecfdf5"
            : "#f8fafc",
        color:
          correcta
            ? "#166534"
            : "#334155",
        lineHeight:
          1.4,
      }}
    >
      <strong>
        {letra})
      </strong>{" "}
      {texto}

      {correcta && (
        <strong>
          {" "}
          ✓ CORRECTA
        </strong>
      )}
    </div>
  )
}

function Etiqueta({
  texto,
  tipo = "azul",
}: {
  texto: string
  tipo?:
    | "azul"
    | "verde"
    | "rojo"
    | "gris"
}) {
  const estilos = {
    azul: {
      background:
        "#e0f2fe",
      color:
        "#075985",
    },
    verde: {
      background:
        "#dcfce7",
      color:
        "#166534",
    },
    rojo: {
      background:
        "#ffe4e6",
      color:
        "#be123c",
    },
    gris: {
      background:
        "#e2e8f0",
      color:
        "#475569",
    },
  }

  return (
    <span
      style={{
        padding:
          "5px 8px",
        borderRadius:
          "999px",
        fontSize:
          "10px",
        fontWeight:
          "bold",
        ...estilos[tipo],
      }}
    >
      {texto}
    </span>
  )
}

const estiloLabel = {
  color:
    "#475569",
  fontSize:
    "12px",
  fontWeight:
    "bold",
}

const estiloCampo = {
  width:
    "100%",
  padding:
    "11px",
  border:
    "1px solid #cbd5e1",
  borderRadius:
    "8px",
  background:
    "white",
  boxSizing:
    "border-box" as const,
}

const botonAzul = {
  padding:
    "12px 18px",
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
    "11px 17px",
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
