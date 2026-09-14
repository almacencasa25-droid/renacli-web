import crypto from "crypto"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@supabase/supabase-js"

const COOKIE_NAME = "renacli_admin_session"

type Props = {
  searchParams?: Promise<{
    creada?: string
    error?: string
  }>
}

type Categoria = {
  codigo: string
  nombre: string
  orden: number
  activa: boolean
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
    .eq(
      "activa",
      true
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

async function crearPregunta(
  formData: FormData
) {
  "use server"

  if (!(await estaAutorizado())) {
    redirect("/administrador")
  }

  const enunciado =
    String(
      formData.get(
        "enunciado"
      ) ?? ""
    ).trim()

  const opcionA =
    String(
      formData.get(
        "opcion_a"
      ) ?? ""
    ).trim()

  const opcionB =
    String(
      formData.get(
        "opcion_b"
      ) ?? ""
    ).trim()

  const opcionC =
    String(
      formData.get(
        "opcion_c"
      ) ?? ""
    ).trim()

  const opcionD =
    String(
      formData.get(
        "opcion_d"
      ) ?? ""
    ).trim()

  const respuestaCorrecta =
    String(
      formData.get(
        "respuesta_correcta"
      ) ?? ""
    )
      .trim()
      .toUpperCase()

  const tema =
    String(
      formData.get(
        "tema"
      ) ?? ""
    ).trim()

  const dificultad =
    String(
      formData.get(
        "dificultad"
      ) ?? ""
    ).trim()

  const estado =
    String(
      formData.get(
        "estado"
      ) ?? "borrador"
    ).trim()

  const explicacionInterna =
    String(
      formData.get(
        "explicacion_interna"
      ) ?? ""
    ).trim()

  const critica =
    formData.get(
      "critica"
    ) === "on"

  const permiteMarcadorOculto =
    formData.get(
      "permite_marcador_oculto"
    ) === "on"

  const temaSecundario =
    String(
      formData.get(
        "tema_secundario"
      ) ?? ""
    ).trim()

  if (
    !enunciado ||
    !opcionA ||
    !opcionB ||
    !opcionC ||
    !opcionD
  ) {
    redirect(
      "/administrador/evaluaciones/preguntas/nueva?error=campos"
    )
  }

  if (
    ![
      "A",
      "B",
      "C",
      "D",
    ].includes(
      respuestaCorrecta
    )
  ) {
    redirect(
      "/administrador/evaluaciones/preguntas/nueva?error=respuesta"
    )
  }

  if (
    ![
      "basica",
      "intermedia",
      "avanzada",
    ].includes(
      dificultad
    )
  ) {
    redirect(
      "/administrador/evaluaciones/preguntas/nueva?error=dificultad"
    )
  }

  if (
    ![
      "borrador",
      "activa",
      "retirada",
    ].includes(
      estado
    )
  ) {
    redirect(
      "/administrador/evaluaciones/preguntas/nueva?error=estado"
    )
  }

  if (
    permiteMarcadorOculto &&
    !temaSecundario
  ) {
    redirect(
      "/administrador/evaluaciones/preguntas/nueva?error=marcador"
    )
  }

  const supabase =
    obtenerSupabaseAdmin()

  const {
    data: categoria,
    error:
      errorCategoria,
  } = await supabase
    .from(
      "evaluacion_categorias"
    )
    .select(
      "codigo, activa"
    )
    .eq(
      "codigo",
      tema
    )
    .eq(
      "activa",
      true
    )
    .maybeSingle()

  if (
    errorCategoria ||
    !categoria
  ) {
    redirect(
      "/administrador/evaluaciones/preguntas/nueva?error=tema"
    )
  }

  const {
    error:
      errorInsertar,
  } = await supabase
    .from(
      "evaluacion_preguntas"
    )
    .insert({
      enunciado,
      opcion_a:
        opcionA,
      opcion_b:
        opcionB,
      opcion_c:
        opcionC,
      opcion_d:
        opcionD,
      respuesta_correcta:
        respuestaCorrecta,
      tema,
      dificultad,
      critica,
      estado,
      explicacion_interna:
        explicacionInterna ||
        null,
      permite_marcador_oculto:
        permiteMarcadorOculto,
      tema_secundario:
        permiteMarcadorOculto
          ? temaSecundario
          : null,
    })

  if (errorInsertar) {
    console.error(
      "[RENACLI] Error creando pregunta:",
      errorInsertar
    )

    redirect(
      "/administrador/evaluaciones/preguntas/nueva?error=guardar"
    )
  }

  redirect(
    "/administrador/evaluaciones/preguntas/nueva?creada=1"
  )
}

function mensajeError(
  error:
    | string
    | undefined
) {
  if (
    error === "campos"
  ) {
    return "El enunciado y las cuatro opciones son obligatorios."
  }

  if (
    error === "respuesta"
  ) {
    return "La respuesta correcta seleccionada no es válida."
  }

  if (
    error === "dificultad"
  ) {
    return "La dificultad seleccionada no es válida."
  }

  if (
    error === "estado"
  ) {
    return "El estado seleccionado no es válido."
  }

  if (
    error === "tema"
  ) {
    return "La categoría seleccionada no existe o no está activa."
  }

  if (
    error === "marcador"
  ) {
    return "Si permitís marcador oculto, también tenés que indicar un tema secundario."
  }

  if (
    error === "guardar"
  ) {
    return "No fue posible guardar la pregunta."
  }

  return null
}

export default async function NuevaPreguntaPage({
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

  const categorias =
    await obtenerCategorias()

  const errorVisible =
    mensajeError(
      parametros.error
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
            "900px",
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
              "32px",
            marginBottom:
              "8px",
          }}
        >
          Nueva pregunta
        </h2>

        <p
          style={{
            marginTop: 0,
            color:
              "#475569",
            lineHeight:
              1.6,
          }}
        >
          Creá una nueva pregunta para el
          banco técnico de evaluaciones
          RENACLI.
        </p>

        {parametros.creada ===
          "1" && (
          <Aviso
            tipo="ok"
            texto="Pregunta creada correctamente."
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

        <form
          action={
            crearPregunta
          }
          style={{
            marginTop:
              "26px",
            padding:
              "26px",
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
          <Campo
            titulo="Enunciado"
          >
            <textarea
              name="enunciado"
              required
              rows={4}
              placeholder="Escribí la pregunta completa."
              style={
                estiloCampo
              }
            />
          </Campo>

          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(280px, 1fr))",
              gap:
                "16px",
              marginTop:
                "20px",
            }}
          >
            <Campo titulo="Opción A">
              <textarea
                name="opcion_a"
                required
                rows={3}
                style={
                  estiloCampo
                }
              />
            </Campo>

            <Campo titulo="Opción B">
              <textarea
                name="opcion_b"
                required
                rows={3}
                style={
                  estiloCampo
                }
              />
            </Campo>

            <Campo titulo="Opción C">
              <textarea
                name="opcion_c"
                required
                rows={3}
                style={
                  estiloCampo
                }
              />
            </Campo>

            <Campo titulo="Opción D">
              <textarea
                name="opcion_d"
                required
                rows={3}
                style={
                  estiloCampo
                }
              />
            </Campo>
          </div>

          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(200px, 1fr))",
              gap:
                "16px",
              marginTop:
                "20px",
            }}
          >
            <Campo
              titulo="Respuesta correcta"
            >
              <select
                name="respuesta_correcta"
                required
                defaultValue=""
                style={
                  estiloCampo
                }
              >
                <option
                  value=""
                  disabled
                >
                  Seleccionar
                </option>

                <option value="A">
                  A
                </option>

                <option value="B">
                  B
                </option>

                <option value="C">
                  C
                </option>

                <option value="D">
                  D
                </option>
              </select>
            </Campo>

            <Campo titulo="Tema">
              <select
                name="tema"
                required
                defaultValue=""
                style={
                  estiloCampo
                }
              >
                <option
                  value=""
                  disabled
                >
                  Seleccionar
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

            <Campo
              titulo="Dificultad"
            >
              <select
                name="dificultad"
                required
                defaultValue=""
                style={
                  estiloCampo
                }
              >
                <option
                  value=""
                  disabled
                >
                  Seleccionar
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

            <Campo titulo="Estado">
              <select
                name="estado"
                defaultValue="borrador"
                style={
                  estiloCampo
                }
              >
                <option value="borrador">
                  Borrador
                </option>

                <option value="activa">
                  Activa
                </option>

                <option value="retirada">
                  Retirada
                </option>
              </select>
            </Campo>
          </div>

          <div
            style={{
              marginTop:
                "22px",
              display:
                "grid",
              gap:
                "12px",
            }}
          >
            <label
              style={
                estiloCheckbox
              }
            >
              <input
                type="checkbox"
                name="critica"
              />

              <span>
                <strong>
                  Pregunta crítica
                </strong>
                <br />
                <small>
                  Puede formar parte de las
                  preguntas críticas que
                  condicionan la aprobación.
                </small>
              </span>
            </label>

            <label
              style={
                estiloCheckbox
              }
            >
              <input
                type="checkbox"
                name="permite_marcador_oculto"
              />

              <span>
                <strong>
                  Permitir marcador oculto
                </strong>
                <br />
                <small>
                  Habilita esta pregunta para
                  contener una palabra de
                  control invisible en el PDF.
                </small>
              </span>
            </label>
          </div>

          <div
            style={{
              marginTop:
                "20px",
            }}
          >
            <Campo
              titulo="Tema secundario para marcador oculto"
            >
              <input
                type="text"
                name="tema_secundario"
                placeholder="Ej.: medición, vacío, electricidad, refrigerante"
                style={
                  estiloCampo
                }
              />

              <small
                style={{
                  color:
                    "#64748b",
                  lineHeight:
                    1.4,
                }}
              >
                Solo es obligatorio si se
                habilita el marcador oculto.
              </small>
            </Campo>
          </div>

          <div
            style={{
              marginTop:
                "20px",
            }}
          >
            <Campo
              titulo="Explicación interna"
            >
              <textarea
                name="explicacion_interna"
                rows={4}
                placeholder="Explicación para administración. No se muestra al evaluado."
                style={
                  estiloCampo
                }
              />
            </Campo>
          </div>

          <div
            style={{
              marginTop:
                "26px",
              paddingTop:
                "20px",
              borderTop:
                "1px solid #e2e8f0",
              display:
                "flex",
              gap:
                "12px",
              flexWrap:
                "wrap",
            }}
          >
            <button
              type="submit"
              style={
                botonVerde
              }
            >
              Guardar pregunta
            </button>

            <a
              href="/administrador/evaluaciones/preguntas"
              style={
                botonBlanco
              }
            >
              Volver al banco
            </a>
          </div>
        </form>
      </section>
    </main>
  )
}

function Campo({
  titulo,
  children,
}: {
  titulo: string
  children:
    React.ReactNode
}) {
  return (
    <div
      style={{
        display:
          "grid",
        gap:
          "7px",
      }}
    >
      <label
        style={{
          color:
            "#475569",
          fontSize:
            "12px",
          fontWeight:
            "bold",
          textTransform:
            "uppercase",
        }}
      >
        {titulo}
      </label>

      {children}
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
          "20px",
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
  color:
    "#172033",
  boxSizing:
    "border-box" as const,
  fontFamily:
    "Arial, sans-serif",
  fontSize:
    "14px",
}

const estiloCheckbox = {
  display:
    "flex",
  alignItems:
    "flex-start",
  gap:
    "10px",
  padding:
    "14px",
  border:
    "1px solid #e2e8f0",
  borderRadius:
    "10px",
  background:
    "#f8fafc",
  color:
    "#334155",
  lineHeight:
    1.4,
  cursor:
    "pointer",
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

const botonBlanco = {
  padding:
    "12px 18px",
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
