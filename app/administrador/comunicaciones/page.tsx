import crypto from "crypto"
import Link from "next/link"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@supabase/supabase-js"

const COOKIE_NAME = "renacli_admin_session"

type ConsultaContacto = {
  id: number
  nombre: string
  email: string
  telefono: string | null
  motivo: string
  mensaje: string
  estado: "pendiente" | "respondida" | "archivada"
  respuesta_interna: string | null
  created_at: string
  updated_at: string
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
}

type Props = {
  searchParams?: Promise<{
    mensaje?: string
    error?: string
    seccion?: string
  }>
}

function obtenerTokenAdministrador() {
  const password =
    process.env.RENACLI_ADMIN_PASSWORD

  if (!password) return null

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

  return createClient(url, secret, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

function formatearFechaHora(
  valor: string | null
) {
  if (!valor) return "-"

  try {
    return new Intl.DateTimeFormat(
      "es-AR",
      {
        timeZone:
          "America/Argentina/Buenos_Aires",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    ).format(new Date(valor))
  } catch {
    return valor
  }
}

function etiquetaMotivo(
  motivo: string
) {
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

async function cambiarEstadoConsulta(
  formData: FormData
) {
  "use server"

  if (!(await estaAutorizado())) {
    redirect("/administrador")
  }

  const id = Number(
    formData.get("id") ?? 0
  )

  const estado = String(
    formData.get("estado") ?? ""
  )

  if (
    !Number.isInteger(id) ||
    id <= 0 ||
    ![
      "pendiente",
      "respondida",
      "archivada",
    ].includes(estado)
  ) {
    redirect(
      "/administrador/comunicaciones?error=consulta"
    )
  }

  const supabase =
    obtenerSupabaseAdmin()

  const { error } = await supabase
    .from("consultas_contacto")
    .update({
      estado,
      updated_at:
        new Date().toISOString(),
    })
    .eq("id", id)

  if (error) {
    console.error(
      "[RENACLI] Error cambiando estado de consulta:",
      error
    )

    redirect(
      "/administrador/comunicaciones?error=consulta"
    )
  }

  redirect(
    "/administrador/comunicaciones?mensaje=consulta_actualizada#consultas"
  )
}

async function guardarNotaConsulta(
  formData: FormData
) {
  "use server"

  if (!(await estaAutorizado())) {
    redirect("/administrador")
  }

  const id = Number(
    formData.get("id") ?? 0
  )

  const respuestaInterna = String(
    formData.get("respuesta_interna") ?? ""
  )
    .trim()
    .slice(0, 3000)

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    redirect(
      "/administrador/comunicaciones?error=consulta"
    )
  }

  const supabase =
    obtenerSupabaseAdmin()

  const { error } = await supabase
    .from("consultas_contacto")
    .update({
      respuesta_interna:
        respuestaInterna || null,
      updated_at:
        new Date().toISOString(),
    })
    .eq("id", id)

  if (error) {
    console.error(
      "[RENACLI] Error guardando nota de consulta:",
      error
    )

    redirect(
      "/administrador/comunicaciones?error=consulta"
    )
  }

  redirect(
    "/administrador/comunicaciones?mensaje=nota_guardada#consultas"
  )
}

async function anularCalificacion(
  formData: FormData
) {
  "use server"

  if (!(await estaAutorizado())) {
    redirect("/administrador")
  }

  const id = Number(
    formData.get("id") ?? 0
  )

  const motivo = String(
    formData.get("motivo_anulacion") ?? ""
  )
    .trim()
    .slice(0, 500)

  if (
    !Number.isInteger(id) ||
    id <= 0 ||
    !motivo
  ) {
    redirect(
      "/administrador/comunicaciones?error=calificacion#calificaciones"
    )
  }

  const supabase =
    obtenerSupabaseAdmin()

  const { error } = await supabase
    .from("calificaciones_tecnicos")
    .update({
      estado: "anulada",
      motivo_anulacion: motivo,
      updated_at:
        new Date().toISOString(),
    })
    .eq("id", id)

  if (error) {
    console.error(
      "[RENACLI] Error anulando calificación:",
      error
    )

    redirect(
      "/administrador/comunicaciones?error=calificacion#calificaciones"
    )
  }

  redirect(
    "/administrador/comunicaciones?mensaje=calificacion_anulada#calificaciones"
  )
}

async function restaurarCalificacion(
  formData: FormData
) {
  "use server"

  if (!(await estaAutorizado())) {
    redirect("/administrador")
  }

  const id = Number(
    formData.get("id") ?? 0
  )

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    redirect(
      "/administrador/comunicaciones?error=calificacion#calificaciones"
    )
  }

  const supabase =
    obtenerSupabaseAdmin()

  const { error } = await supabase
    .from("calificaciones_tecnicos")
    .update({
      estado: "activa",
      motivo_anulacion: null,
      updated_at:
        new Date().toISOString(),
    })
    .eq("id", id)

  if (error) {
    console.error(
      "[RENACLI] Error restaurando calificación:",
      error
    )

    redirect(
      "/administrador/comunicaciones?error=calificacion#calificaciones"
    )
  }

  redirect(
    "/administrador/comunicaciones?mensaje=calificacion_restaurada#calificaciones"
  )
}

export default async function ComunicacionesPage({
  searchParams,
}: Props) {
  const parametros = searchParams
    ? await searchParams
    : {}

  if (!(await estaAutorizado())) {
    redirect("/administrador")
  }

  const supabase =
    obtenerSupabaseAdmin()

  const {
    data: consultasData,
    error: errorConsultas,
  } = await supabase
    .from("consultas_contacto")
    .select(
      "id, nombre, email, telefono, motivo, mensaje, estado, respuesta_interna, created_at, updated_at"
    )
    .order("created_at", {
      ascending: false,
    })
    .limit(200)

  const {
    data: calificacionesData,
    error: errorCalificaciones,
  } = await supabase
    .from("calificaciones_tecnicos")
    .select(
      "id, matriculado_id, nombre_cliente, email_cliente, puntuacion, comentario, estado, motivo_anulacion, created_at, updated_at"
    )
    .order("created_at", {
      ascending: false,
    })
    .limit(300)

  if (errorConsultas) {
    console.error(
      "[RENACLI] Error obteniendo consultas:",
      errorConsultas
    )
  }

  if (errorCalificaciones) {
    console.error(
      "[RENACLI] Error obteniendo calificaciones:",
      errorCalificaciones
    )
  }

  const consultas =
    (consultasData ??
      []) as ConsultaContacto[]

  const calificaciones =
    (calificacionesData ??
      []) as CalificacionTecnico[]

  const idsMatriculados = Array.from(
    new Set(
      calificaciones.map(
        item => item.matriculado_id
      )
    )
  )

  let matriculados:
    MatriculadoReferencia[] = []

  if (idsMatriculados.length > 0) {
    const {
      data: matriculadosData,
      error: errorMatriculados,
    } = await supabase
      .from("matriculados")
      .select(
        "id, numero_matricula, apellido_nombre"
      )
      .in("id", idsMatriculados)

    if (errorMatriculados) {
      console.error(
        "[RENACLI] Error obteniendo matriculados para calificaciones:",
        errorMatriculados
      )
    } else {
      matriculados =
        (matriculadosData ??
          []) as MatriculadoReferencia[]
    }
  }

  const matriculadosPorId =
    new Map<
      number,
      MatriculadoReferencia
    >()

  for (const matriculado of matriculados) {
    matriculadosPorId.set(
      matriculado.id,
      matriculado
    )
  }

  const consultasPendientes =
    consultas.filter(
      item =>
        item.estado === "pendiente"
    ).length

  const consultasRespondidas =
    consultas.filter(
      item =>
        item.estado === "respondida"
    ).length

  const calificacionesActivas =
    calificaciones.filter(
      item =>
        item.estado === "activa"
    ).length

  const calificacionesAnuladas =
    calificaciones.filter(
      item =>
        item.estado === "anulada"
    ).length

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
        <div
          style={{
            maxWidth: "1100px",
            margin: "0 auto",
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
        </div>
      </header>

      <section
        style={{
          maxWidth: "1100px",
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
            marginBottom: "26px",
          }}
        >
          Desde esta sección podés revisar
          las consultas recibidas desde la
          página de RENACLI y controlar las
          calificaciones realizadas a los
          técnicos.
        </p>

        {parametros.mensaje ===
          "consulta_actualizada" && (
          <Aviso
            tipo="ok"
            texto="Estado de la consulta actualizado correctamente."
          />
        )}

        {parametros.mensaje ===
          "nota_guardada" && (
          <Aviso
            tipo="ok"
            texto="Nota interna guardada correctamente."
          />
        )}

        {parametros.mensaje ===
          "calificacion_anulada" && (
          <Aviso
            tipo="ok"
            texto="Calificación anulada correctamente. Ya no participa del promedio público."
          />
        )}

        {parametros.mensaje ===
          "calificacion_restaurada" && (
          <Aviso
            tipo="ok"
            texto="Calificación restaurada correctamente. Vuelve a participar del promedio."
          />
        )}

        {parametros.error ===
          "consulta" && (
          <Aviso
            tipo="error"
            texto="No fue posible actualizar la consulta."
          />
        )}

        {parametros.error ===
          "calificacion" && (
          <Aviso
            tipo="error"
            texto="No fue posible modificar la calificación."
          />
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "14px",
            marginBottom: "30px",
          }}
        >
          <Resumen
            numero={consultasPendientes}
            texto="Consultas pendientes"
          />

          <Resumen
            numero={consultasRespondidas}
            texto="Consultas respondidas"
          />

          <Resumen
            numero={calificacionesActivas}
            texto="Calificaciones activas"
          />

          <Resumen
            numero={calificacionesAnuladas}
            texto="Calificaciones anuladas"
          />
        </div>

        <section
          id="consultas"
          style={{
            scrollMarginTop: "20px",
            marginBottom: "45px",
          }}
        >
          <h3
            style={{
              fontSize: "24px",
              color: "#172033",
              marginBottom: "6px",
            }}
          >
            Consultas recibidas
          </h3>

          <p
            style={{
              color: "#64748b",
              marginTop: 0,
              marginBottom: "18px",
            }}
          >
            Total: {consultas.length}
          </p>

          {consultas.length === 0 ? (
            <div style={tarjeta}>
              <p
                style={{
                  margin: 0,
                  color: "#64748b",
                }}
              >
                Todavía no hay consultas
                recibidas.
              </p>
            </div>
          ) : (
            consultas.map(consulta => (
              <article
                key={consulta.id}
                style={{
                  ...tarjeta,
                  marginBottom: "16px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems:
                      "flex-start",
                    gap: "15px",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <h4
                      style={{
                        margin:
                          "0 0 6px",
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
                        fontSize: "14px",
                      }}
                    >
                      {formatearFechaHora(
                        consulta.created_at
                      )}
                    </p>
                  </div>

                  <EstadoConsulta
                    estado={
                      consulta.estado
                    }
                  />
                </div>

                <div
                  style={{
                    marginTop: "18px",
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "12px",
                  }}
                >
                  <Dato
                    etiqueta="Correo"
                    valor={consulta.email}
                  />

                  <Dato
                    etiqueta="Teléfono"
                    valor={
                      consulta.telefono ||
                      "-"
                    }
                  />

                  <Dato
                    etiqueta="Motivo"
                    valor={etiquetaMotivo(
                      consulta.motivo
                    )}
                  />
                </div>

                <div
                  style={{
                    marginTop: "18px",
                    padding: "15px",
                    background: "#f8fafc",
                    borderRadius: "9px",
                    border:
                      "1px solid #e2e8f0",
                  }}
                >
                  <strong
                    style={{
                      display: "block",
                      marginBottom: "7px",
                      color: "#334155",
                    }}
                  >
                    Mensaje
                  </strong>

                  <p
                    style={{
                      margin: 0,
                      whiteSpace:
                        "pre-wrap",
                      lineHeight: 1.6,
                      color: "#334155",
                    }}
                  >
                    {consulta.mensaje}
                  </p>
                </div>

                <form
                  action={
                    guardarNotaConsulta
                  }
                  style={{
                    marginTop: "18px",
                  }}
                >
                  <input
                    type="hidden"
                    name="id"
                    value={consulta.id}
                  />

                  <label
                    style={{
                      display: "block",
                      fontWeight: "bold",
                      color: "#334155",
                    }}
                  >
                    Nota interna de RENACLI

                    <textarea
                      name="respuesta_interna"
                      rows={3}
                      defaultValue={
                        consulta.respuesta_interna ??
                        ""
                      }
                      placeholder="Podés guardar aquí una nota sobre el seguimiento de esta consulta."
                      style={{
                        width: "100%",
                        boxSizing:
                          "border-box",
                        marginTop: "8px",
                        padding: "12px",
                        borderRadius: "8px",
                        border:
                          "1px solid #cbd5e1",
                        resize: "vertical",
                        fontFamily:
                          "Arial, sans-serif",
                      }}
                    />
                  </label>

                  <button
                    type="submit"
                    style={{
                      ...botonAzul,
                      marginTop: "10px",
                    }}
                  >
                    Guardar nota
                  </button>
                </form>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "10px",
                    marginTop: "18px",
                    paddingTop: "18px",
                    borderTop:
                      "1px solid #e2e8f0",
                  }}
                >
                  {consulta.estado !==
                    "pendiente" && (
                    <FormularioEstadoConsulta
                      id={consulta.id}
                      estado="pendiente"
                      texto="Marcar pendiente"
                    />
                  )}

                  {consulta.estado !==
                    "respondida" && (
                    <FormularioEstadoConsulta
                      id={consulta.id}
                      estado="respondida"
                      texto="Marcar respondida"
                    />
                  )}

                  {consulta.estado !==
                    "archivada" && (
                    <FormularioEstadoConsulta
                      id={consulta.id}
                      estado="archivada"
                      texto="Archivar"
                    />
                  )}
                </div>
              </article>
            ))
          )}
        </section>

        <section
          id="calificaciones"
          style={{
            scrollMarginTop: "20px",
          }}
        >
          <h3
            style={{
              fontSize: "24px",
              color: "#172033",
              marginBottom: "6px",
            }}
          >
            Calificaciones de técnicos
          </h3>

          <p
            style={{
              color: "#64748b",
              marginTop: 0,
              marginBottom: "18px",
            }}
          >
            Las calificaciones activas
            participan automáticamente del
            promedio público. Una
            calificación anulada permanece
            registrada pero deja de
            participar del cálculo.
          </p>

          {calificaciones.length === 0 ? (
            <div style={tarjeta}>
              <p
                style={{
                  margin: 0,
                  color: "#64748b",
                }}
              >
                Todavía no hay
                calificaciones registradas.
              </p>
            </div>
          ) : (
            calificaciones.map(
              calificacion => {
                const tecnico =
                  matriculadosPorId.get(
                    calificacion.matriculado_id
                  )

                return (
                  <article
                    key={
                      calificacion.id
                    }
                    style={{
                      ...tarjeta,
                      marginBottom:
                        "16px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        alignItems:
                          "flex-start",
                        gap: "15px",
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <h4
                          style={{
                            margin:
                              "0 0 6px",
                            color:
                              "#172033",
                            fontSize:
                              "18px",
                          }}
                        >
                          {tecnico
                            ?.apellido_nombre ||
                            "Técnico matriculado"}
                        </h4>

                        <p
                          style={{
                            margin: 0,
                            color:
                              "#64748b",
                            fontSize:
                              "14px",
                          }}
                        >
                          {tecnico
                            ?.numero_matricula ||
                            "Matrícula no disponible"}
                          {" · "}
                          {formatearFechaHora(
                            calificacion.created_at
                          )}
                        </p>
                      </div>

                      <EstadoCalificacion
                        estado={
                          calificacion.estado
                        }
                      />
                    </div>

                    <div
                      style={{
                        marginTop:
                          "16px",
                      }}
                    >
                      <div
                        aria-label={`${calificacion.puntuacion} de 5 estrellas`}
                        style={{
                          display:
                            "flex",
                          gap: "3px",
                          fontSize:
                            "26px",
                          lineHeight: 1,
                        }}
                      >
                        {[
                          1, 2, 3, 4, 5,
                        ].map(
                          estrella => (
                            <span
                              key={
                                estrella
                              }
                              style={{
                                color:
                                  estrella <=
                                  calificacion.puntuacion
                                    ? "#f59e0b"
                                    : "#cbd5e1",
                              }}
                            >
                              ★
                            </span>
                          )
                        )}
                      </div>

                      <strong
                        style={{
                          display:
                            "block",
                          marginTop:
                            "7px",
                          color:
                            "#172033",
                        }}
                      >
                        {
                          calificacion.puntuacion
                        }{" "}
                        de 5
                      </strong>
                    </div>

                    <div
                      style={{
                        marginTop:
                          "18px",
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(220px, 1fr))",
                        gap: "12px",
                      }}
                    >
                      <Dato
                        etiqueta="Cliente"
                        valor={
                          calificacion.nombre_cliente ||
                          "No informado"
                        }
                      />

                      <Dato
                        etiqueta="Correo"
                        valor={
                          calificacion.email_cliente
                        }
                      />
                    </div>

                    {calificacion.comentario && (
                      <div
                        style={{
                          marginTop:
                            "18px",
                          padding:
                            "15px",
                          background:
                            "#f8fafc",
                          borderRadius:
                            "9px",
                          border:
                            "1px solid #e2e8f0",
                        }}
                      >
                        <strong
                          style={{
                            display:
                              "block",
                            marginBottom:
                              "7px",
                            color:
                              "#334155",
                          }}
                        >
                          Comentario
                        </strong>

                        <p
                          style={{
                            margin: 0,
                            whiteSpace:
                              "pre-wrap",
                            lineHeight:
                              1.6,
                            color:
                              "#334155",
                          }}
                        >
                          {
                            calificacion.comentario
                          }
                        </p>
                      </div>
                    )}

                    {calificacion.estado ===
                    "activa" ? (
                      <form
                        action={
                          anularCalificacion
                        }
                        style={{
                          marginTop:
                            "18px",
                          paddingTop:
                            "18px",
                          borderTop:
                            "1px solid #e2e8f0",
                        }}
                      >
                        <input
                          type="hidden"
                          name="id"
                          value={
                            calificacion.id
                          }
                        />

                        <label
                          style={{
                            display:
                              "block",
                            fontWeight:
                              "bold",
                            color:
                              "#334155",
                          }}
                        >
                          Motivo de
                          anulación

                          <input
                            type="text"
                            name="motivo_anulacion"
                            required
                            maxLength={
                              500
                            }
                            placeholder="Ej.: spam, contenido inapropiado o calificación no válida"
                            style={{
                              width:
                                "100%",
                              boxSizing:
                                "border-box",
                              marginTop:
                                "8px",
                              padding:
                                "12px",
                              borderRadius:
                                "8px",
                              border:
                                "1px solid #cbd5e1",
                            }}
                          />
                        </label>

                        <button
                          type="submit"
                          style={{
                            ...botonRojo,
                            marginTop:
                              "10px",
                          }}
                        >
                          Anular
                          calificación
                        </button>
                      </form>
                    ) : (
                      <div
                        style={{
                          marginTop:
                            "18px",
                          paddingTop:
                            "18px",
                          borderTop:
                            "1px solid #e2e8f0",
                        }}
                      >
                        <p
                          style={{
                            margin:
                              "0 0 12px",
                            color:
                              "#64748b",
                          }}
                        >
                          <strong>
                            Motivo de
                            anulación:
                          </strong>{" "}
                          {calificacion.motivo_anulacion ||
                            "No informado"}
                        </p>

                        <form
                          action={
                            restaurarCalificacion
                          }
                        >
                          <input
                            type="hidden"
                            name="id"
                            value={
                              calificacion.id
                            }
                          />

                          <button
                            type="submit"
                            style={
                              botonAzul
                            }
                          >
                            Restaurar
                            calificación
                          </button>
                        </form>
                      </div>
                    )}
                  </article>
                )
              }
            )
          )}
        </section>
      </section>
    </main>
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
        background:
          tipo === "ok"
            ? "#f0fdf4"
            : "#fff1f2",
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

function Resumen({
  numero,
  texto,
}: {
  numero: number
  texto: string
}) {
  return (
    <div
      style={{
        background: "white",
        border:
          "1px solid #d7e0e7",
        borderRadius: "12px",
        padding: "18px",
        boxShadow:
          "0 2px 7px rgba(0,0,0,0.05)",
      }}
    >
      <div
        style={{
          fontSize: "30px",
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
          textTransform:
            "uppercase",
          letterSpacing: "0.5px",
        }}
      >
        {etiqueta}
      </strong>

      <span
        style={{
          color: "#172033",
          overflowWrap:
            "anywhere",
        }}
      >
        {valor}
      </span>
    </div>
  )
}

function EstadoConsulta({
  estado,
}: {
  estado: string
}) {
  const colores =
    estado === "pendiente"
      ? {
          fondo: "#fffbeb",
          borde: "#fbbf24",
          texto: "#92400e",
        }
      : estado === "respondida"
        ? {
            fondo: "#f0fdf4",
            borde: "#86efac",
            texto: "#166534",
          }
        : {
            fondo: "#f1f5f9",
            borde: "#cbd5e1",
            texto: "#475569",
          }

  return (
    <span
      style={{
        display: "inline-block",
        padding: "6px 10px",
        borderRadius: "999px",
        background:
          colores.fondo,
        border: `1px solid ${colores.borde}`,
        color: colores.texto,
        fontSize: "12px",
        fontWeight: "bold",
        textTransform:
          "uppercase",
      }}
    >
      {estado}
    </span>
  )
}

function EstadoCalificacion({
  estado,
}: {
  estado: string
}) {
  const activa =
    estado === "activa"

  return (
    <span
      style={{
        display: "inline-block",
        padding: "6px 10px",
        borderRadius: "999px",
        background: activa
          ? "#f0fdf4"
          : "#fff1f2",
        border: activa
          ? "1px solid #86efac"
          : "1px solid #fda4af",
        color: activa
          ? "#166534"
          : "#be123c",
        fontSize: "12px",
        fontWeight: "bold",
        textTransform:
          "uppercase",
      }}
    >
      {estado}
    </span>
  )
}

function FormularioEstadoConsulta({
  id,
  estado,
  texto,
}: {
  id: number
  estado:
    | "pendiente"
    | "respondida"
    | "archivada"
  texto: string
}) {
  return (
    <form
      action={
        cambiarEstadoConsulta
      }
    >
      <input
        type="hidden"
        name="id"
        value={id}
      />

      <input
        type="hidden"
        name="estado"
        value={estado}
      />

      <button
        type="submit"
        style={botonBlanco}
      >
        {texto}
      </button>
    </form>
  )
}

const tarjeta = {
  background: "white",
  border: "1px solid #d7e0e7",
  borderRadius: "12px",
  padding: "22px",
  boxShadow:
    "0 2px 7px rgba(0,0,0,0.05)",
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
