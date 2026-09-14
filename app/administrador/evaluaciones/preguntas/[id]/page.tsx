import crypto from "crypto"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@supabase/supabase-js"

const COOKIE_NAME = "renacli_admin_session"

type RouteProps = {
  params: Promise<{
    id: string
  }>
  searchParams?: Promise<{
    guardada?: string
    error?: string
    eliminar?: string
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

function idValido(
  valor: string
) {
  const id =
    Number(valor)

  return (
    Number.isInteger(id) &&
    id > 0
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

async function guardarPregunta(
  formData: FormData
) {
  "use server"

  if (!(await estaAutorizado())) {
    redirect("/administrador")
  }

  const id =
    Number(
      formData.get("id") ?? 0
    )

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    redirect(
      "/administrador/evaluaciones/preguntas"
    )
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
      ) ?? ""
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

  const ruta =
    `/administrador/evaluaciones/preguntas/${id}`

  if (
    !enunciado ||
    !opcionA ||
    !opcionB ||
    !opcionC ||
    !opcionD
  ) {
    redirect(
      `${ruta}?error=campos`
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
      `${ruta}?error=respuesta`
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
      `${ruta}?error=dificultad`
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
      `${ruta}?error=estado`
    )
  }

  if (
    permiteMarcadorOculto &&
    !temaSecundario
  ) {
    redirect(
      `${ruta}?error=marcador`
    )
  }

  const supabase =
    obtenerSupabaseAdmin()

  const {
    data: categoria,
    error: errorCategoria,
  } = await supabase
    .from(
      "evaluacion_categorias"
    )
    .select(
      "codigo"
    )
    .eq(
      "codigo",
      tema
    )
    .maybeSingle()

  if (
    errorCategoria ||
    !categoria
  ) {
    redirect(
      `${ruta}?error=tema`
    )
  }

  const {
    data: preguntaExistente,
    error: errorExistente,
  } = await supabase
    .from(
      "evaluacion_preguntas"
    )
    .select("id")
    .eq(
      "id",
      id
    )
    .maybeSingle()

  if (
    errorExistente ||
    !preguntaExistente
  ) {
    redirect(
      "/administrador/evaluaciones/preguntas"
    )
  }

  const {
    error: errorActualizar,
  } = await supabase
    .from(
      "evaluacion_preguntas"
    )
    .update({
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
    .eq(
      "id",
      id
    )

  if (errorActualizar) {
    console.error(
      "[RENACLI] Error actualizando pregunta:",
      errorActualizar
    )

    redirect(
      `${ruta}?error=guardar`
    )
  }

  redirect(
    `${ruta}?guardada=1`
  )
}

async function eliminarPregunta(
  formData: FormData
) {
  "use server"

  if (!(await estaAutorizado())) {
    redirect("/administrador")
  }

  const id =
    Number(
      formData.get("id") ?? 0
    )

  const confirmacion =
    String(
      formData.get(
        "confirmacion"
      ) ?? ""
    )

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    redirect(
      "/administrador/evaluaciones/preguntas"
    )
  }

  if (
    confirmacion !==
    "ELIMINAR_DEFINITIVAMENTE"
  ) {
    redirect(
      `/administrador/evaluaciones/preguntas/${id}?error=confirmacion`
    )
  }

  const supabase =
    obtenerSupabaseAdmin()

  const {
    error,
  } = await supabase
    .from(
      "evaluacion_preguntas"
    )
    .delete()
    .eq(
      "id",
      id
    )

  if (error) {
    console.error(
      "[RENACLI] Error eliminando pregunta:",
      error
    )

    redirect(
      `/administrador/evaluaciones/preguntas/${id}?error=eliminar`
    )
  }

  redirect(
    "/administrador/evaluaciones/preguntas"
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
    return "La categoría seleccionada no existe."
  }

  if (
    error === "marcador"
  ) {
    return "Si permitís marcador oculto, también tenés que indicar un tema secundario."
  }

  if (
    error === "guardar"
  ) {
    return "No fue posible guardar los cambios."
  }

  if (
    error === "confirmacion"
  ) {
    return "La eliminación no fue confirmada correctamente."
  }

  if (
    error === "eliminar"
  ) {
    return "No fue posible eliminar la pregunta."
  }

  return null
}

export default async function EditarPreguntaPage({
  params,
  searchParams,
}: RouteProps) {
  const autorizado =
    await estaAutorizado()

  if (!autorizado) {
    redirect(
      "/administrador"
    )
  }

  const {
    id: idParametro,
  } = await params

  if (
    !idValido(
      idParametro
    )
  ) {
    redirect(
      "/administrador/evaluaciones/preguntas"
    )
  }

  const id =
    Number(
      idParametro
    )

  const parametros =
    searchParams
      ? await searchParams
      : {}

  const supabase =
    obtenerSupabaseAdmin()

  const [
    preguntaResultado,
    categorias,
    usosResultado,
  ] = await Promise.all([
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
      .eq(
        "id",
        id
      )
      .maybeSingle(),

    obtenerCategorias(),

    supabase
      .from(
        "evaluacion_items"
      )
      .select(
        "id",
        {
          count:
            "exact",
          head:
            true,
        }
      )
      .eq(
        "pregunta_id",
        id
      ),
  ])

  if (
    preguntaResultado.error ||
    !preguntaResultado.data
  ) {
    redirect(
      "/administrador/evaluaciones/preguntas"
    )
  }

  const pregunta =
    preguntaResultado.data as Pregunta

  const cantidadUsos =
    usosResultado.count ?? 0

  const errorVisible =
    mensajeError(
      parametros.error
    )

  const primeraConfirmacion =
    parametros.eliminar ===
    "1"

  const segundaConfirmacion =
    parametros.eliminar ===
    "2"

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
          Editar pregunta #{pregunta.id}
        </h2>

        <p
          style={{
            color:
              "#475569",
            lineHeight:
              1.6,
            marginTop: 0,
          }}
        >
          Podés modificarla, cambiar su
          estado o eliminarla
          definitivamente.
        </p>

        {parametros.guardada ===
          "1" && (
          <Aviso
            tipo="ok"
            texto="Los cambios fueron guardados correctamente."
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
              "20px",
            padding:
              "15px",
            borderRadius:
              "10px",
            background:
              "#f8fafc",
            border:
              "1px solid #cbd5e1",
            color:
              "#475569",
            lineHeight:
              1.5,
          }}
        >
          Esta pregunta fue utilizada en{" "}
          <strong>
            {cantidadUsos}
          </strong>{" "}
          evaluación
          {cantidadUsos === 1
            ? ""
            : "es"}.
          {cantidadUsos > 0 && (
            <>
              {" "}
              Si la eliminás del banco,
              las evaluaciones anteriores
              conservarán la copia que ya
              tienen guardada.
            </>
          )}
        </div>

        {primeraConfirmacion && (
          <div
            style={
              cajaPeligro
            }
          >
            <h3
              style={{
                marginTop: 0,
                color:
                  "#991b1b",
              }}
            >
              Primera confirmación
            </h3>

            <p>
              ¿Deseás borrar esta pregunta
              del banco RENACLI?
            </p>

            <p>
              Esta acción no es lo mismo
              que pasarla a borrador o
              retirarla.
            </p>

            <div
              style={
                filaBotones
              }
            >
              <a
                href={`/administrador/evaluaciones/preguntas/${pregunta.id}?eliminar=2`}
                style={
                  botonRojo
                }
              >
                Sí, continuar
              </a>

              <a
                href={`/administrador/evaluaciones/preguntas/${pregunta.id}`}
                style={
                  botonBlanco
                }
              >
                Cancelar
              </a>
            </div>
          </div>
        )}

        {segundaConfirmacion && (
          <div
            style={
              cajaPeligro
            }
          >
            <h3
              style={{
                marginTop: 0,
                color:
                  "#991b1b",
              }}
            >
              Segunda confirmación
            </h3>

            <p>
              <strong>
                Esta eliminación es
                definitiva.
              </strong>
            </p>

            <p>
              ¿Confirmás que querés borrar
              realmente la pregunta #
              {pregunta.id}?
            </p>

            <div
              style={
                filaBotones
              }
            >
              <form
                action={
                  eliminarPregunta
                }
              >
                <input
                  type="hidden"
                  name="id"
                  value={
                    pregunta.id
                  }
                />

                <input
                  type="hidden"
                  name="confirmacion"
                  value="ELIMINAR_DEFINITIVAMENTE"
                />

                <button
                  type="submit"
                  style={
                    botonRojo
                  }
                >
                  Sí, eliminar definitivamente
                </button>
              </form>

              <a
                href={`/administrador/evaluaciones/preguntas/${pregunta.id}`}
                style={
                  botonBlanco
                }
              >
                No, cancelar
              </a>
            </div>
          </div>
        )}

        {!primeraConfirmacion &&
          !segundaConfirmacion && (
          <>
            <form
              action={
                guardarPregunta
              }
              style={{
                marginTop:
                  "24px",
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
              <input
                type="hidden"
                name="id"
                value={
                  pregunta.id
                }
              />

              <Campo
                titulo="Enunciado"
              >
                <textarea
                  name="enunciado"
                  required
                  rows={4}
                  defaultValue={
                    pregunta.enunciado
                  }
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
                    defaultValue={
                      pregunta.opcion_a
                    }
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
                    defaultValue={
                      pregunta.opcion_b
                    }
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
                    defaultValue={
                      pregunta.opcion_c
                    }
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
                    defaultValue={
                      pregunta.opcion_d
                    }
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
                    defaultValue={
                      pregunta.respuesta_correcta
                    }
                    style={
                      estiloCampo
                    }
                  >
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
                    defaultValue={
                      pregunta.tema
                    }
                    style={
                      estiloCampo
                    }
                  >
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
                          {!categoria.activa
                            ? " (inactiva)"
                            : ""}
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
                    defaultValue={
                      pregunta.dificultad
                    }
                    style={
                      estiloCampo
                    }
                  >
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
                    required
                    defaultValue={
                      pregunta.estado
                    }
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
                    defaultChecked={
                      pregunta.critica
                    }
                  />

                  <span>
                    <strong>
                      Pregunta crítica
                    </strong>
                    <br />
                    <small>
                      Puede condicionar la
                      aprobación de la
                      evaluación.
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
                    defaultChecked={
                      pregunta.permite_marcador_oculto
                    }
                  />

                  <span>
                    <strong>
                      Permitir marcador oculto
                    </strong>
                    <br />
                    <small>
                      Habilita la palabra de
                      control invisible del
                      PDF.
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
                    defaultValue={
                      pregunta.tema_secundario ??
                      ""
                    }
                    style={
                      estiloCampo
                    }
                  />
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
                    defaultValue={
                      pregunta.explicacion_interna ??
                      ""
                    }
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
                  Guardar cambios
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

            <div
              style={{
                marginTop:
                  "24px",
                padding:
                  "22px",
                background:
                  "#fff7f7",
                border:
                  "1px solid #fecaca",
                borderRadius:
                  "14px",
              }}
            >
              <h3
                style={{
                  marginTop: 0,
                  color:
                    "#991b1b",
                }}
              >
                Eliminar pregunta
              </h3>

              <p
                style={{
                  color:
                    "#7f1d1d",
                  lineHeight:
                    1.5,
                }}
              >
                Si considerás que esta
                pregunta no debe existir en
                el banco, podés eliminarla
                definitivamente.
              </p>

              <a
                href={`/administrador/evaluaciones/preguntas/${pregunta.id}?eliminar=1`}
                style={
                  botonRojo
                }
              >
                Eliminar pregunta
              </a>
            </div>
          </>
        )}
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

const cajaPeligro = {
  marginTop:
    "24px",
  padding:
    "24px",
  border:
    "2px solid #ef4444",
  borderRadius:
    "14px",
  background:
    "#fff1f2",
  color:
    "#7f1d1d",
  lineHeight:
    1.55,
}

const filaBotones = {
  display:
    "flex",
  gap:
    "12px",
  flexWrap:
    "wrap" as const,
  marginTop:
    "20px",
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

const botonRojo = {
  padding:
    "13px 20px",
  border:
    "none",
  borderRadius:
    "8px",
  background:
    "#b91c1c",
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
