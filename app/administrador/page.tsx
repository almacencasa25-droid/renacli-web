import crypto from "crypto"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@supabase/supabase-js"

const COOKIE_NAME = "renacli_admin_session"

type MatriculadoAdmin = {
  id: number
  numero_matricula: string | null
  apellido_nombre: string | null
  dni: string | null
  telefono: string | null
  email: string | null
  domicilio: string | null
  localidad: string | null
  provincia: string | null
  fecha_emision: string | null
  fecha_vencimiento: string | null
  estado: string | null
  especialidad: string | null
  foto_url: string | null
  codigo_qr: string | null
  observaciones: string | null
}

function obtenerTokenAdministrador() {
  const password = process.env.RENACLI_ADMIN_PASSWORD

  if (!password) return null

  return crypto
    .createHash("sha256")
    .update(password)
    .digest("hex")
}

function obtenerSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secret = process.env.SUPABASE_SECRET_KEY

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

async function iniciarSesion(formData: FormData) {
  "use server"

  const passwordIngresada = String(
    formData.get("password") ?? ""
  )

  const passwordCorrecta =
    process.env.RENACLI_ADMIN_PASSWORD

  if (!passwordCorrecta) {
    redirect("/administrador?error=config")
  }

  if (passwordIngresada !== passwordCorrecta) {
    redirect("/administrador?error=incorrecta")
  }

  const token = obtenerTokenAdministrador()

  if (!token) {
    redirect("/administrador?error=config")
  }

  const cookieStore = await cookies()

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 8,
  })

  redirect("/administrador")
}

async function cerrarSesion() {
  "use server"

  const cookieStore = await cookies()

  cookieStore.delete(COOKIE_NAME)

  redirect("/administrador")
}

async function crearMatriculado(formData: FormData) {
  "use server"

  if (!(await estaAutorizado())) {
    redirect("/administrador")
  }

  const apellidoNombre = String(
    formData.get("apellido_nombre") ?? ""
  ).trim()

  const dni = String(
    formData.get("dni") ?? ""
  ).trim()

  const especialidad = String(
    formData.get("especialidad") ?? ""
  ).trim()

  const localidad = String(
    formData.get("localidad") ?? ""
  ).trim()

  const provincia = String(
    formData.get("provincia") ?? ""
  ).trim()

  const telefono = String(
    formData.get("telefono") ?? ""
  ).trim()

  const fechaEmision = String(
    formData.get("fecha_emision") ?? ""
  ).trim()

  const fechaVencimiento = String(
    formData.get("fecha_vencimiento") ?? ""
  ).trim()

  if (
    !apellidoNombre ||
    !dni ||
    !especialidad ||
    !localidad ||
    !provincia ||
    !fechaEmision ||
    !fechaVencimiento
  ) {
    redirect(
      "/administrador?nuevo=1&error=campos"
    )
  }

  const supabase = obtenerSupabaseAdmin()

  const { data: existente } = await supabase
    .from("matriculados")
    .select("id")
    .eq("dni", dni)
    .maybeSingle()

  if (existente) {
    redirect(
      "/administrador?nuevo=1&error=dni"
    )
  }

  const { data, error } = await supabase
    .from("matriculados")
    .insert({
      apellido_nombre: apellidoNombre,
      dni,
      especialidad,
      localidad,
      provincia,
      telefono,
      fecha_emision: fechaEmision,
      fecha_vencimiento: fechaVencimiento,
      estado: "vigente",
    })
    .select("id")
    .single()

  if (error || !data) {
    console.error(
      "[RENACLI] Error creando matriculado:",
      error
    )

    redirect(
      "/administrador?nuevo=1&error=guardar"
    )
  }

  const { data: numeroRnc, error: errorRnc } =
    await supabase.rpc(
      "asignar_matricula_rnc",
      {
        p_matriculado_id: data.id,
      }
    )

  if (errorRnc || !numeroRnc) {
    console.error(
      "[RENACLI] Error generando RNC:",
      errorRnc
    )

    redirect(
      `/administrador?error=rnc&id=${data.id}`
    )
  }

  redirect(
    `/administrador?creado=1&rnc=${encodeURIComponent(
      String(numeroRnc)
    )}`
  )
}

async function buscarMatriculados(
  termino: string
): Promise<MatriculadoAdmin[]> {
  const busqueda = termino.trim()

  if (!busqueda) return []

  const supabase = obtenerSupabaseAdmin()

  const terminoSeguro = busqueda
    .replace(/,/g, "")
    .replace(/\(/g, "")
    .replace(/\)/g, "")

  const { data, error } = await supabase
    .from("matriculados")
    .select(
      `
        id,
        numero_matricula,
        apellido_nombre,
        dni,
        telefono,
        email,
        domicilio,
        localidad,
        provincia,
        fecha_emision,
        fecha_vencimiento,
        estado,
        especialidad,
        foto_url,
        codigo_qr,
        observaciones
      `
    )
    .or(
      `numero_matricula.ilike.%${terminoSeguro}%,dni.ilike.%${terminoSeguro}%,apellido_nombre.ilike.%${terminoSeguro}%`
    )
    .order("apellido_nombre", {
      ascending: true,
    })
    .limit(50)

  if (error) {
    console.error(
      "[RENACLI] Error buscando matriculados:",
      error
    )

    return []
  }

  return (data ?? []) as MatriculadoAdmin[]
}

function formatearFecha(fecha: string | null) {
  if (!fecha) return "-"

  const partes = fecha.slice(0, 10).split("-")

  if (partes.length !== 3) {
    return fecha
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`
}

type Props = {
  searchParams?: Promise<{
    error?: string
    nuevo?: string
    creado?: string
    rnc?: string
    buscar?: string
    q?: string
  }>
}

export default async function AdministradorPage({
  searchParams,
}: Props) {
  const parametros = searchParams
    ? await searchParams
    : {}

  const autorizado =
    await estaAutorizado()

  if (!autorizado) {
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
          <h1
            style={{
              margin: 0,
              letterSpacing: "4px",
            }}
          >
            RENACLI
          </h1>

          <p style={{ margin: "6px 0 0" }}>
            Registro Nacional de Climatización y
            Refrigeración
          </p>
        </header>

        <section
          style={{
            maxWidth: "480px",
            margin: "70px auto",
            padding: "0 20px",
          }}
        >
          <div
            style={{
              background: "white",
              border: "1px solid #d7e0e7",
              borderRadius: "14px",
              padding: "32px",
              boxShadow:
                "0 2px 8px rgba(0,0,0,0.08)",
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
              ACCESO RESTRINGIDO
            </p>

            <h2
              style={{
                marginTop: "8px",
                marginBottom: "8px",
                color: "#172033",
                fontSize: "28px",
              }}
            >
              Administración
            </h2>

            <p
              style={{
                color: "#64748b",
                lineHeight: 1.5,
              }}
            >
              Ingrese la contraseña de administrador
              para acceder a la gestión de matrículas.
            </p>

            {parametros.error === "incorrecta" && (
              <p
                style={{
                  color: "#be123c",
                  background: "#fff1f2",
                  padding: "12px",
                  borderRadius: "8px",
                }}
              >
                Contraseña incorrecta.
              </p>
            )}

            {parametros.error === "config" && (
              <p
                style={{
                  color: "#c2410c",
                  background: "#fff7ed",
                  padding: "12px",
                  borderRadius: "8px",
                }}
              >
                La contraseña administrativa no está
                configurada.
              </p>
            )}

            <form action={iniciarSesion}>
              <label
                htmlFor="password"
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "bold",
                }}
              >
                Contraseña
              </label>

              <input
                id="password"
                name="password"
                type="password"
                required
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "14px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "16px",
                  marginBottom: "18px",
                }}
              />

              <button
                type="submit"
                style={{
                  width: "100%",
                  padding: "14px",
                  border: 0,
                  borderRadius: "8px",
                  background: "#0d5689",
                  color: "white",
                  fontSize: "16px",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                Ingresar
              </button>
            </form>
          </div>
        </section>
      </main>
    )
  }

  const mostrarNuevo =
    parametros.nuevo === "1"

  const mostrarBusqueda =
    parametros.buscar === "1"

  const terminoBusqueda =
    String(parametros.q ?? "").trim()

  let resultados: MatriculadoAdmin[] = []

  if (
    mostrarBusqueda &&
    terminoBusqueda
  ) {
    resultados =
      await buscarMatriculados(
        terminoBusqueda
      )
  }

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
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "20px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              letterSpacing: "4px",
            }}
          >
            RENACLI
          </h1>

          <p style={{ margin: "6px 0 0" }}>
            Registro Nacional de Climatización y
            Refrigeración
          </p>
        </div>

        <form action={cerrarSesion}>
          <button
            type="submit"
            style={{
              padding: "10px 16px",
              borderRadius: "8px",
              border:
                "1px solid rgba(255,255,255,.5)",
              background: "transparent",
              color: "white",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Cerrar sesión
          </button>
        </form>
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
            marginBottom: "8px",
            color: "#172033",
          }}
        >
          Panel de matriculados
        </h2>

        <p
          style={{
            color: "#64748b",
            marginBottom: "30px",
          }}
        >
          Gestión interna de matrículas RENACLI.
        </p>

        {parametros.creado === "1" &&
          parametros.rnc && (
            <div
              style={{
                background: "#ecfdf5",
                border: "1px solid #86efac",
                color: "#166534",
                borderRadius: "10px",
                padding: "18px",
                marginBottom: "25px",
              }}
            >
              Matriculado creado correctamente.
              Matrícula asignada:{" "}
              <strong>
                {parametros.rnc}
              </strong>
            </div>
          )}

        {parametros.error === "rnc" && (
          <div
            style={{
              background: "#fff7ed",
              border: "1px solid #fdba74",
              color: "#9a3412",
              borderRadius: "10px",
              padding: "18px",
              marginBottom: "25px",
            }}
          >
            El matriculado fue creado, pero ocurrió
            un problema al generar la matrícula RNC.
          </div>
        )}

        {!mostrarNuevo &&
        !mostrarBusqueda ? (
          <div
            style={{
              background: "white",
              border: "1px solid #d7e0e7",
              borderRadius: "14px",
              padding: "30px",
              boxShadow:
                "0 2px 5px rgba(0,0,0,.08)",
            }}
          >
            <h3 style={{ marginTop: 0 }}>
              Gestión de matrículas
            </h3>

            <p style={{ color: "#64748b" }}>
              Registre técnicos, asigne matrículas
              RNC y gestione altas y bajas.
            </p>

            <div
              style={{
                display: "flex",
                gap: "15px",
                flexWrap: "wrap",
                marginTop: "25px",
              }}
            >
              <a
                href="/administrador?nuevo=1"
                style={{
                  padding: "14px 22px",
                  borderRadius: "8px",
                  background: "#0d5689",
                  color: "white",
                  fontWeight: "bold",
                  textDecoration: "none",
                }}
              >
                + Nuevo matriculado
              </a>

              <a
                href="/administrador?buscar=1"
                style={{
                  padding: "14px 22px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  background: "white",
                  color: "#334155",
                  fontWeight: "bold",
                  textDecoration: "none",
                }}
              >
                Buscar matriculado
              </a>
            </div>
          </div>
        ) : mostrarNuevo ? (
          <div
            style={{
              background: "white",
              border: "1px solid #d7e0e7",
              borderRadius: "14px",
              padding: "30px",
              boxShadow:
                "0 2px 5px rgba(0,0,0,.08)",
            }}
          >
            <h3
              style={{
                marginTop: 0,
                fontSize: "24px",
              }}
            >
              Nuevo matriculado
            </h3>

            <p style={{ color: "#64748b" }}>
              Al guardar, RENACLI asignará
              automáticamente una matrícula
              RNC-XXXXXX única.
            </p>

            {parametros.error === "campos" && (
              <p style={{ color: "#b91c1c" }}>
                Complete todos los campos
                obligatorios.
              </p>
            )}

            {parametros.error === "dni" && (
              <p style={{ color: "#b91c1c" }}>
                Ya existe un matriculado registrado
                con ese DNI.
              </p>
            )}

            {parametros.error === "guardar" && (
              <p style={{ color: "#b91c1c" }}>
                No fue posible guardar el
                matriculado.
              </p>
            )}

            <form action={crearMatriculado}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit,minmax(260px,1fr))",
                  gap: "20px",
                  marginTop: "25px",
                }}
              >
                <Campo
                  nombre="apellido_nombre"
                  etiqueta="Apellido y nombre"
                  requerido
                />

                <Campo
                  nombre="dni"
                  etiqueta="DNI"
                  requerido
                />

                <Campo
                  nombre="especialidad"
                  etiqueta="Especialidad"
                  requerido
                />

                <Campo
                  nombre="telefono"
                  etiqueta="Teléfono"
                />

                <Campo
                  nombre="localidad"
                  etiqueta="Localidad"
                  requerido
                />

                <Campo
                  nombre="provincia"
                  etiqueta="Provincia"
                  requerido
                />

                <Campo
                  nombre="fecha_emision"
                  etiqueta="Fecha de emisión"
                  tipo="date"
                  requerido
                />

                <Campo
                  nombre="fecha_vencimiento"
                  etiqueta="Fecha de vencimiento"
                  tipo="date"
                  requerido
                />
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "15px",
                  marginTop: "30px",
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="submit"
                  style={{
                    padding: "14px 25px",
                    border: 0,
                    borderRadius: "8px",
                    background: "#0d5689",
                    color: "white",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  Guardar y generar matrícula
                </button>

                <a
                  href="/administrador"
                  style={{
                    padding: "14px 25px",
                    border:
                      "1px solid #cbd5e1",
                    borderRadius: "8px",
                    color: "#334155",
                    textDecoration: "none",
                    fontWeight: "bold",
                  }}
                >
                  Cancelar
                </a>
              </div>
            </form>
          </div>
        ) : (
          <div>
            <div
              style={{
                background: "white",
                border: "1px solid #d7e0e7",
                borderRadius: "14px",
                padding: "30px",
                boxShadow:
                  "0 2px 5px rgba(0,0,0,.08)",
              }}
            >
              <h3
                style={{
                  marginTop: 0,
                  fontSize: "24px",
                }}
              >
                Buscar matriculado
              </h3>

              <p
                style={{
                  color: "#64748b",
                  lineHeight: 1.5,
                }}
              >
                Puede buscar por número de matrícula,
                DNI, apellido o nombre.
              </p>

              <form
                action="/administrador"
                method="get"
              >
                <input
                  type="hidden"
                  name="buscar"
                  value="1"
                />

                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    flexWrap: "wrap",
                    marginTop: "20px",
                  }}
                >
                  <input
                    type="text"
                    name="q"
                    defaultValue={
                      terminoBusqueda
                    }
                    placeholder="Ej.: RNC-447052, DNI o apellido"
                    autoFocus
                    style={{
                      flex: "1 1 350px",
                      padding: "14px",
                      borderRadius: "8px",
                      border:
                        "1px solid #cbd5e1",
                      fontSize: "16px",
                    }}
                  />

                  <button
                    type="submit"
                    style={{
                      padding: "14px 24px",
                      border: 0,
                      borderRadius: "8px",
                      background: "#0d5689",
                      color: "white",
                      fontWeight: "bold",
                      cursor: "pointer",
                    }}
                  >
                    Buscar
                  </button>

                  <a
                    href="/administrador"
                    style={{
                      padding: "14px 24px",
                      border:
                        "1px solid #cbd5e1",
                      borderRadius: "8px",
                      color: "#334155",
                      textDecoration: "none",
                      fontWeight: "bold",
                    }}
                  >
                    Volver
                  </a>
                </div>
              </form>
            </div>

            {terminoBusqueda && (
              <div
                style={{
                  marginTop: "25px",
                }}
              >
                <p
                  style={{
                    color: "#475569",
                    fontWeight: "bold",
                  }}
                >
                  {resultados.length === 0
                    ? "No se encontraron matriculados."
                    : `${resultados.length} resultado${
                        resultados.length === 1
                          ? ""
                          : "s"
                      } encontrado${
                        resultados.length === 1
                          ? ""
                          : "s"
                      }.`}
                </p>

                {resultados.map(
                  (matriculado) => (
                    <div
                      key={matriculado.id}
                      style={{
                        background: "white",
                        border:
                          "1px solid #d7e0e7",
                        borderRadius: "14px",
                        padding: "25px",
                        marginBottom: "18px",
                        boxShadow:
                          "0 2px 5px rgba(0,0,0,.06)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent:
                            "space-between",
                          gap: "20px",
                          flexWrap: "wrap",
                          marginBottom: "20px",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              color:
                                "#64748b",
                              fontSize:
                                "12px",
                              fontWeight:
                                "bold",
                              letterSpacing:
                                "1px",
                            }}
                          >
                            MATRICULADO
                          </div>

                          <h3
                            style={{
                              margin:
                                "6px 0",
                              fontSize:
                                "24px",
                              color:
                                "#172033",
                            }}
                          >
                            {matriculado.apellido_nombre ||
                              "Sin nombre"}
                          </h3>

                          <strong
                            style={{
                              color:
                                "#0d5689",
                            }}
                          >
                            {matriculado.numero_matricula ||
                              "SIN MATRÍCULA"}
                          </strong>
                        </div>

                        <div>
                          <span
                            style={{
                              display:
                                "inline-block",
                              padding:
                                "8px 12px",
                              borderRadius:
                                "999px",
                              background:
                                matriculado.estado
                                  ?.toLowerCase()
                                  .includes(
                                    "vigente"
                                  )
                                  ? "#dcfce7"
                                  : "#fef3c7",
                              color:
                                matriculado.estado
                                  ?.toLowerCase()
                                  .includes(
                                    "vigente"
                                  )
                                  ? "#166534"
                                  : "#92400e",
                              fontWeight:
                                "bold",
                            }}
                          >
                            {matriculado.estado ||
                              "Sin estado"}
                          </span>
                        </div>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit,minmax(220px,1fr))",
                          gap: "18px",
                        }}
                      >
                        <Dato
                          titulo="DNI"
                          valor={
                            matriculado.dni
                          }
                        />

                        <Dato
                          titulo="Teléfono"
                          valor={
                            matriculado.telefono
                          }
                        />

                        <Dato
                          titulo="Especialidad"
                          valor={
                            matriculado.especialidad
                          }
                        />

                        <Dato
                          titulo="Localidad"
                          valor={
                            matriculado.localidad
                          }
                        />

                        <Dato
                          titulo="Provincia"
                          valor={
                            matriculado.provincia
                          }
                        />

                        <Dato
                          titulo="Fecha de emisión"
                          valor={formatearFecha(
                            matriculado.fecha_emision
                          )}
                        />

                        <Dato
                          titulo="Fecha de vencimiento"
                          valor={formatearFecha(
                            matriculado.fecha_vencimiento
                          )}
                        />
                      </div>

                      {matriculado.numero_matricula && (
                        <div
                          style={{
                            marginTop:
                              "22px",
                          }}
                        >
                          <a
                            href={`/matriculado/${encodeURIComponent(
                              matriculado.numero_matricula
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              color:
                                "#0d5689",
                              fontWeight:
                                "bold",
                              textDecoration:
                                "none",
                            }}
                          >
                            Ver ficha pública ↗
                          </a>
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  )
}

function Campo({
  nombre,
  etiqueta,
  tipo = "text",
  requerido = false,
}: {
  nombre: string
  etiqueta: string
  tipo?: string
  requerido?: boolean
}) {
  return (
    <label
      style={{
        display: "block",
        color: "#334155",
        fontWeight: "bold",
      }}
    >
      {etiqueta}
      {requerido ? " *" : ""}

      <input
        name={nombre}
        type={tipo}
        required={requerido}
        style={{
          display: "block",
          width: "100%",
          boxSizing: "border-box",
          marginTop: "8px",
          padding: "13px",
          borderRadius: "8px",
          border: "1px solid #cbd5e1",
          fontSize: "16px",
          fontWeight: "normal",
        }}
      />
    </label>
  )
}

function Dato({
  titulo,
  valor,
}: {
  titulo: string
  valor: string | null
}) {
  return (
    <div>
      <div
        style={{
          fontSize: "12px",
          color: "#64748b",
          fontWeight: "bold",
          textTransform: "uppercase",
          letterSpacing: ".5px",
          marginBottom: "5px",
        }}
      >
        {titulo}
      </div>

      <div
        style={{
          color: "#172033",
        }}
      >
        {valor || "-"}
      </div>
    </div>
  )
}
