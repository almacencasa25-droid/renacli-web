import crypto from "crypto"
import Link from "next/link"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@supabase/supabase-js"

const COOKIE_NAME = "renacli_admin_session"

type EstadoConsulta =
  | "pendiente"
  | "en_seguimiento"
  | "respondida"
  | "archivada"

type ConsultaContacto = {
  id: number
  nombre: string
  email: string
  telefono: string | null
  motivo: string
  mensaje: string
  estado: EstadoConsulta
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
  if (estado === "respondida") return "Respondida"
  if (estado === "archivada") return "Archivada"
  return "Pendiente"
}

async function cambiarEstadoConsulta(formData: FormData) {
  "use server"

  if (!(await estaAutorizado())) {
    redirect("/administrador")
  }

  const id = Number(formData.get("id") ?? 0)
  const estado = String(formData.get("estado") ?? "")
  const estadosPermitidos = [
    "pendiente",
    "en_seguimiento",
    "respondida",
    "archivada",
  ]

  if (
    !Number.isInteger(id) ||
    id <= 0 ||
    !estadosPermitidos.includes(estado)
  ) {
    redirect(
      "/administrador/comunicaciones?tab=notificaciones&error=consulta"
    )
  }

  const supabase = obtenerSupabaseAdmin()

  const { error } = await supabase
    .from("consultas_contacto")
    .update({
      estado,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) {
    console.error(
      "[RENACLI] Error cambiando estado de consulta:",
      error
    )
    redirect(
      "/administrador/comunicaciones?tab=notificaciones&error=consulta"
    )
  }

  redirect(
    "/administrador/comunicaciones?tab=notificaciones&mensaje=consulta_actualizada#notificaciones"
  )
}

async function guardarNotaConsulta(formData: FormData) {
  "use server"

  if (!(await estaAutorizado())) {
    redirect("/administrador")
  }

  const id = Number(formData.get("id") ?? 0)
  const respuestaInterna = String(
    formData.get("respuesta_interna") ?? ""
  )
    .trim()
    .slice(0, 3000)

  if (!Number.isInteger(id) || id <= 0) {
    redirect(
      "/administrador/comunicaciones?tab=notificaciones&error=consulta"
    )
  }

  const supabase = obtenerSupabaseAdmin()

  const { error } = await supabase
    .from("consultas_contacto")
    .update({
      respuesta_interna: respuestaInterna || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) {
    console.error(
      "[RENACLI] Error guardando nota de consulta:",
      error
    )
    redirect(
      "/administrador/comunicaciones?tab=notificaciones&error=consulta"
    )
  }

  redirect(
    "/administrador/comunicaciones?tab=notificaciones&mensaje=nota_guardada#notificaciones"
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
  const supabase = obtenerSupabaseAdmin()

  const {
    data: consultasData,
    error: errorConsultas,
  } = await supabase
    .from("consultas_contacto")
    .select(
      "id, nombre, email, telefono, motivo, mensaje, estado, respuesta_interna, created_at, updated_at"
    )
    .order("created_at", { ascending: false })
    .limit(500)

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

  const consultas = (consultasData ?? []) as ConsultaContacto[]
  const calificaciones =
    (calificacionesData ?? []) as CalificacionTecnico[]

  const idsMatriculados = Array.from(
    new Set(calificaciones.map(item => item.matriculado_id))
  )

  let matriculados: MatriculadoReferencia[] = []

  if (idsMatriculados.length > 0) {
    const {
      data: matriculadosData,
      error: errorMatriculados,
    } = await supabase
      .from("matriculados")
      .select("id, numero_matricula, apellido_nombre")
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

  const pendientes = consultas.filter(
    item => item.estado === "pendiente"
  )
  const seguimiento = consultas.filter(
    item => item.estado === "en_seguimiento"
  )
  const historial = consultas.filter(
    item =>
      item.estado === "respondida" ||
      item.estado === "archivada"
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
        {parametros.mensaje === "nota_guardada" && (
          <Aviso
            tipo="ok"
            texto="Nota interna guardada correctamente."
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
        {parametros.error === "calificacion" && (
          <Aviso
            tipo="error"
            texto="No fue posible modificar la calificación."
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
              {pendientes.length + seguimiento.length}
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
                numero={pendientes.length}
                texto="Pendientes"
              />
              <Resumen
                numero={seguimiento.length}
                texto="En seguimiento"
              />
              <Resumen
                numero={historial.length}
                texto="Respondidas / archivadas"
              />
            </div>

            <h3 style={tituloSeccion}>Pendientes</h3>
            <p style={textoAyuda}>
              Estas notificaciones quedan siempre a la vista hasta
              que cambies su estado.
            </p>

            {pendientes.length === 0 ? (
              <Vacio texto="No hay notificaciones pendientes." />
            ) : (
              pendientes.map(consulta => (
                <ConsultaCard
                  key={consulta.id}
                  consulta={consulta}
                />
              ))
            )}

            <h3
              style={{
                ...tituloSeccion,
                marginTop: "32px",
              }}
            >
              En seguimiento
            </h3>
            <p style={textoAyuda}>
              Consultas que ya estás atendiendo pero todavía no
              están cerradas.
            </p>

            {seguimiento.length === 0 ? (
              <Vacio texto="No hay notificaciones en seguimiento." />
            ) : (
              seguimiento.map(consulta => (
                <ConsultaCard
                  key={consulta.id}
                  consulta={consulta}
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
                Historial de respondidas y archivadas (
                {historial.length})
              </summary>

              <div
                style={{
                  padding: "0 18px 18px",
                  borderTop: "1px solid #e2e8f0",
                  background: "#f8fafc",
                }}
              >
                {historial.length === 0 ? (
                  <p style={textoAyuda}>
                    Todavía no hay notificaciones cerradas.
                  </p>
                ) : (
                  historial.map(consulta => (
                    <ConsultaCard
                      key={consulta.id}
                      consulta={consulta}
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

function ConsultaCard({
  consulta,
}: {
  consulta: ConsultaContacto
}) {
  return (
    <article
      style={{
        ...tarjeta,
        marginBottom: "14px",
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
            {formatearFechaHora(consulta.created_at)}
          </p>
        </div>
        <EstadoConsulta estado={consulta.estado} />
      </div>

      <div
        style={{
          marginTop: "16px",
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "12px",
        }}
      >
        <Dato etiqueta="Correo" valor={consulta.email} />
        <Dato
          etiqueta="Teléfono"
          valor={consulta.telefono || "-"}
        />
        <Dato
          etiqueta="Motivo"
          valor={etiquetaMotivo(consulta.motivo)}
        />
      </div>

      <div style={cajaTexto}>
        <strong style={etiquetaCaja}>Mensaje</strong>
        <p style={parrafoCaja}>{consulta.mensaje}</p>
      </div>

      <form
        action={guardarNotaConsulta}
        style={{ marginTop: "16px" }}
      >
        <input type="hidden" name="id" value={consulta.id} />
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
            rows={2}
            defaultValue={consulta.respuesta_interna ?? ""}
            placeholder="Seguimiento interno de esta consulta"
            style={campoTexto}
          />
        </label>
        <button
          type="submit"
          style={{
            ...botonAzul,
            marginTop: "9px",
          }}
        >
          Guardar nota
        </button>
      </form>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "8px",
          marginTop: "16px",
          paddingTop: "16px",
          borderTop: "1px solid #e2e8f0",
        }}
      >
        {consulta.estado !== "pendiente" && (
          <FormularioEstadoConsulta
            id={consulta.id}
            estado="pendiente"
            texto="Pendiente"
          />
        )}
        {consulta.estado !== "en_seguimiento" && (
          <FormularioEstadoConsulta
            id={consulta.id}
            estado="en_seguimiento"
            texto="En seguimiento"
          />
        )}
        {consulta.estado !== "respondida" && (
          <FormularioEstadoConsulta
            id={consulta.id}
            estado="respondida"
            texto="Respondida"
          />
        )}
        {consulta.estado !== "archivada" && (
          <FormularioEstadoConsulta
            id={consulta.id}
            estado="archivada"
            texto="Archivar"
          />
        )}
      </div>
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

function FormularioEstadoConsulta({
  id,
  estado,
  texto,
}: {
  id: number
  estado: EstadoConsulta
  texto: string
}) {
  return (
    <form action={cambiarEstadoConsulta}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="estado" value={estado} />
      <button type="submit" style={botonBlanco}>
        {texto}
      </button>
    </form>
  )
}

function EstadoConsulta({
  estado,
}: {
  estado: EstadoConsulta
}) {
  const colores =
    estado === "pendiente"
      ? {
          fondo: "#fffbeb",
          borde: "#fbbf24",
          texto: "#92400e",
        }
      : estado === "en_seguimiento"
        ? {
            fondo: "#eff6ff",
            borde: "#93c5fd",
            texto: "#1d4ed8",
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
