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

async function editarMatriculado(
  formData: FormData
) {
  "use server"

  if (!(await estaAutorizado())) {
    redirect("/administrador")
  }

  const id = Number(formData.get("id"))

  const apellidoNombre = String(
    formData.get("apellido_nombre") ?? ""
  ).trim()

  const dni = String(
    formData.get("dni") ?? ""
  ).trim()

  const telefono = String(
    formData.get("telefono") ?? ""
  ).trim()

  const email = String(
    formData.get("email") ?? ""
  ).trim()

  const domicilio = String(
    formData.get("domicilio") ?? ""
  ).trim()

  const localidad = String(
    formData.get("localidad") ?? ""
  ).trim()

  const provincia = String(
    formData.get("provincia") ?? ""
  ).trim()

  const especialidad = String(
    formData.get("especialidad") ?? ""
  ).trim()

  const fechaEmision = String(
    formData.get("fecha_emision") ?? ""
  ).trim()

  const fechaVencimiento = String(
    formData.get("fecha_vencimiento") ?? ""
  ).trim()

  const observaciones = String(
    formData.get("observaciones") ?? ""
  ).trim()

  if (
    !id ||
    !apellidoNombre ||
    !dni ||
    !especialidad ||
    !localidad ||
    !provincia
  ) {
    redirect(
      "/administrador?error=editar"
    )
  }

  const supabase = obtenerSupabaseAdmin()

  const { error } = await supabase
    .from("matriculados")
    .update({
      apellido_nombre: apellidoNombre,
      dni,
      telefono,
      email,
      domicilio,
      localidad,
      provincia,
      especialidad,
      fecha_emision:
        fechaEmision || null,
      fecha_vencimiento:
        fechaVencimiento || null,
      observaciones,
    })
    .eq("id", id)

  if (error) {
    console.error(
      "[RENACLI] Error editando matriculado:",
      error
    )

    redirect(
      `/administrador?buscar=1&error=editar`
    )
  }

  redirect(
    `/administrador?buscar=1&q=${encodeURIComponent(
      apellidoNombre
    )}&mensaje=editado`
  )
}

async function cambiarEstado(
  formData: FormData
) {
  "use server"

  if (!(await estaAutorizado())) {
    redirect("/administrador")
  }

  const id = Number(formData.get("id"))
  const estado = String(
    formData.get("estado") ?? ""
  )

  const q = String(
    formData.get("q") ?? ""
  )

  if (
    !id ||
    !["vigente", "suspendida"].includes(
      estado
    )
  ) {
    redirect("/administrador")
  }

  const supabase = obtenerSupabaseAdmin()

  const { error } = await supabase
    .from("matriculados")
    .update({
      estado,
    })
    .eq("id", id)

  if (error) {
    console.error(
      "[RENACLI] Error cambiando estado:",
      error
    )

    redirect(
      `/administrador?buscar=1&q=${encodeURIComponent(
        q
      )}&error=estado`
    )
  }

  redirect(
    `/administrador?buscar=1&q=${encodeURIComponent(
      q
    )}&mensaje=estado`
  )
}

async function darDeBaja(
  formData: FormData
) {
  "use server"

  if (!(await estaAutorizado())) {
    redirect("/administrador")
  }

  const id = Number(formData.get("id"))

  const q = String(
    formData.get("q") ?? ""
  )

  if (!id) {
    redirect("/administrador")
  }

  const supabase = obtenerSupabaseAdmin()

  const {
    data: liberado,
    error: errorLiberar,
  } = await supabase.rpc(
    "liberar_matricula_rnc",
    {
      p_matriculado_id: id,
    }
  )

  if (errorLiberar) {
    console.error(
      "[RENACLI] Error liberando RNC:",
      errorLiberar
    )

    redirect(
      `/administrador?buscar=1&q=${encodeURIComponent(
        q
      )}&error=baja`
    )
  }

  const { error: errorEstado } =
    await supabase
      .from("matriculados")
      .update({
        estado: "baja",
      })
      .eq("id", id)

  if (errorEstado) {
    console.error(
      "[RENACLI] Error marcando baja:",
      errorEstado
    )

    redirect(
      `/administrador?buscar=1&q=${encodeURIComponent(
        q
      )}&error=baja`
    )
  }

  redirect(
    `/administrador?buscar=1&q=${encodeURIComponent(
      q
    )}&mensaje=baja&liberado=${
      liberado ? "1" : "0"
    }`
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

async function obtenerMatriculadoPorId(
  id: number
): Promise<MatriculadoAdmin | null> {
  const supabase = obtenerSupabaseAdmin()

  const { data, error } = await supabase
    .from("matriculados")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return data as MatriculadoAdmin
}

function formatearFecha(
  fecha: string | null
) {
  if (!fecha) return "-"

  const partes =
    fecha.slice(0, 10).split("-")

  if (partes.length !== 3) {
    return fecha
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`
}

function fechaHoyArgentina() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

function estadoEfectivo(
  matriculado: MatriculadoAdmin
) {
  const estadoBase = (
    matriculado.estado || ""
  ).toLowerCase()

  if (estadoBase.includes("baja")) {
    return "baja"
  }

  if (estadoBase.includes("suspend")) {
    return "suspendida"
  }

  if (
    matriculado.fecha_vencimiento &&
    matriculado.fecha_vencimiento.slice(0, 10) <
      fechaHoyArgentina()
  ) {
    return "vencida"
  }

  return "vigente"
}

function diasHastaVencimiento(
  fecha: string | null
) {
  if (!fecha) return null

  const hoy = new Date(
    `${fechaHoyArgentina()}T00:00:00`
  )
  const vencimiento = new Date(
    `${fecha.slice(0, 10)}T00:00:00`
  )

  return Math.ceil(
    (vencimiento.getTime() - hoy.getTime()) /
      86400000
  )
}

async function obtenerTodosMatriculados():
  Promise<MatriculadoAdmin[]> {
  const supabase = obtenerSupabaseAdmin()

  const { data, error } = await supabase
    .from("matriculados")
    .select("*")
    .order("apellido_nombre", {
      ascending: true,
    })

  if (error) {
    console.error(
      "[RENACLI] Error obteniendo listado:",
      error
    )
    return []
  }

  return (data ?? []) as MatriculadoAdmin[]
}

type Props = {
  searchParams?: Promise<{
    error?: string
    nuevo?: string
    creado?: string
    rnc?: string
    buscar?: string
    q?: string
    editar?: string
    baja?: string
    mensaje?: string
    liberado?: string
    listado?: string
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
            maxWidth: "480px",
            margin: "70px auto",
            padding: "0 20px",
          }}
        >
          <div
            style={{
              background: "white",
              border:
                "1px solid #d7e0e7",
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
                color: "#172033",
              }}
            >
              Administración
            </h2>

            {parametros.error ===
              "incorrecta" && (
              <p
                style={{
                  color: "#be123c",
                }}
              >
                Contraseña incorrecta.
              </p>
            )}

            <form
              action={iniciarSesion}
            >
              <label
                style={{
                  display: "block",
                  fontWeight: "bold",
                  marginBottom: "8px",
                }}
              >
                Contraseña
              </label>

              <input
                name="password"
                type="password"
                required
                style={{
                  width: "100%",
                  boxSizing:
                    "border-box",
                  padding: "14px",
                  borderRadius: "8px",
                  border:
                    "1px solid #cbd5e1",
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
                  fontWeight: "bold",
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

  const editarId =
    Number(parametros.editar ?? 0)

  let matriculadoEditar:
    MatriculadoAdmin | null = null

  if (editarId) {
    matriculadoEditar =
      await obtenerMatriculadoPorId(
        editarId
      )
  }

  let resultados:
    MatriculadoAdmin[] = []

  if (
    mostrarBusqueda &&
    terminoBusqueda
  ) {
    resultados =
      await buscarMatriculados(
        terminoBusqueda
      )
  }

  const todosMatriculados =
    await obtenerTodosMatriculados()

  const vigentes = todosMatriculados.filter(
    m => estadoEfectivo(m) === "vigente"
  )
  const vencidas = todosMatriculados.filter(
    m => estadoEfectivo(m) === "vencida"
  )
  const suspendidas = todosMatriculados.filter(
    m => estadoEfectivo(m) === "suspendida"
  )
  const bajas = todosMatriculados.filter(
    m => estadoEfectivo(m) === "baja"
  )
  const proximasAVencer =
    todosMatriculados.filter(m => {
      if (estadoEfectivo(m) !== "vigente") {
        return false
      }
      const dias =
        diasHastaVencimiento(
          m.fecha_vencimiento
        )
      return (
        dias !== null &&
        dias >= 0 &&
        dias <= 30
      )
    })

  const listado = String(
    parametros.listado ?? ""
  )

  const matriculadosListado =
    listado === "vigentes"
      ? vigentes
      : listado === "vencidas"
        ? vencidas
        : listado === "suspendidas"
          ? suspendidas
          : listado === "bajas"
            ? bajas
            : listado === "proximas"
              ? proximasAVencer
              : []

  const tituloListado =
    listado === "vigentes"
      ? "Matrículas vigentes"
      : listado === "vencidas"
        ? "Matrículas vencidas"
        : listado === "suspendidas"
          ? "Matrículas suspendidas"
          : listado === "bajas"
            ? "Matrículas dadas de baja"
            : listado === "proximas"
              ? "Próximas a vencer (30 días)"
              : ""

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
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
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

          <p
            style={{
              margin: "6px 0 0",
            }}
          >
            Registro Nacional de
            Climatización y Refrigeración
          </p>
        </div>

        <form action={cerrarSesion}>
          <button
            type="submit"
            style={{
              padding: "10px 16px",
              borderRadius: "8px",
              border:
                "1px solid white",
              background:
                "transparent",
              color: "white",
              fontWeight: "bold",
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
            color: "#172033",
          }}
        >
          Panel de matriculados
        </h2>

        {parametros.mensaje ===
          "editado" && (
          <Aviso
            texto="Datos actualizados correctamente."
            tipo="ok"
          />
        )}

        {parametros.mensaje ===
          "estado" && (
          <Aviso
            texto="Estado actualizado correctamente."
            tipo="ok"
          />
        )}

        {parametros.mensaje ===
          "baja" && (
          <Aviso
            texto={
              parametros.liberado === "1"
                ? "Matrícula dada de baja. El número RNC quedó liberado y disponible para una futura asignación."
                : "El matriculado fue dado de baja."
            }
            tipo="ok"
          />
        )}

        {parametros.error ===
          "baja" && (
          <Aviso
            texto="No fue posible completar la baja."
            tipo="error"
          />
        )}

        {parametros.error ===
          "estado" && (
          <Aviso
            texto="No fue posible cambiar el estado."
            tipo="error"
          />
        )}

        {matriculadoEditar ? (
          <div
            style={tarjeta}
          >
            <h3>
              Editar matriculado
            </h3>

            <p>
              Matrícula:{" "}
              <strong>
                {matriculadoEditar.numero_matricula ||
                  "Sin matrícula"}
              </strong>
            </p>

            <form
              action={
                editarMatriculado
              }
            >
              <input
                type="hidden"
                name="id"
                value={
                  matriculadoEditar.id
                }
              />

              <div
                style={grilla}
              >
                <Campo
                  nombre="apellido_nombre"
                  etiqueta="Apellido y nombre"
                  valor={
                    matriculadoEditar.apellido_nombre
                  }
                  requerido
                />

                <Campo
                  nombre="dni"
                  etiqueta="DNI"
                  valor={
                    matriculadoEditar.dni
                  }
                  requerido
                />

                <Campo
                  nombre="telefono"
                  etiqueta="Teléfono"
                  valor={
                    matriculadoEditar.telefono
                  }
                />

                <Campo
                  nombre="email"
                  etiqueta="Email"
                  tipo="email"
                  valor={
                    matriculadoEditar.email
                  }
                />

                <Campo
                  nombre="domicilio"
                  etiqueta="Domicilio"
                  valor={
                    matriculadoEditar.domicilio
                  }
                />

                <Campo
                  nombre="localidad"
                  etiqueta="Localidad"
                  valor={
                    matriculadoEditar.localidad
                  }
                  requerido
                />

                <Campo
                  nombre="provincia"
                  etiqueta="Provincia"
                  valor={
                    matriculadoEditar.provincia
                  }
                  requerido
                />

                <Campo
                  nombre="especialidad"
                  etiqueta="Especialidad"
                  valor={
                    matriculadoEditar.especialidad
                  }
                  requerido
                />

                <Campo
                  nombre="fecha_emision"
                  etiqueta="Fecha de emisión"
                  tipo="date"
                  valor={
                    matriculadoEditar.fecha_emision
                  }
                />

                <Campo
                  nombre="fecha_vencimiento"
                  etiqueta="Fecha de vencimiento"
                  tipo="date"
                  valor={
                    matriculadoEditar.fecha_vencimiento
                  }
                />
              </div>

              <label
                style={{
                  display: "block",
                  marginTop: "20px",
                  fontWeight: "bold",
                }}
              >
                Observaciones

                <textarea
                  name="observaciones"
                  defaultValue={
                    matriculadoEditar.observaciones ??
                    ""
                  }
                  rows={4}
                  style={{
                    display: "block",
                    width: "100%",
                    boxSizing:
                      "border-box",
                    marginTop: "8px",
                    padding: "13px",
                    borderRadius: "8px",
                    border:
                      "1px solid #cbd5e1",
                  }}
                />
              </label>

              <div
                style={botonera}
              >
                <button
                  type="submit"
                  style={botonAzul}
                >
                  Guardar cambios
                </button>

                <a
                  href={`/administrador?buscar=1&q=${encodeURIComponent(
                    terminoBusqueda ||
                      matriculadoEditar.apellido_nombre ||
                      ""
                  )}`}
                  style={botonBlanco}
                >
                  Cancelar
                </a>
              </div>
            </form>
          </div>
        ) : mostrarNuevo ? (
          <div style={tarjeta}>
            <h3>
              Nuevo matriculado
            </h3>

            <form
              action={
                crearMatriculado
              }
            >
              <div
                style={grilla}
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
                style={botonera}
              >
                <button
                  style={botonAzul}
                >
                  Guardar y generar matrícula
                </button>

                <a
                  href="/administrador"
                  style={botonBlanco}
                >
                  Cancelar
                </a>
              </div>
            </form>
          </div>
        ) : mostrarBusqueda ? (
          <>
            <div style={tarjeta}>
              <h3>
                Buscar matriculado
              </h3>

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
                  style={botonera}
                >
                  <input
                    name="q"
                    defaultValue={
                      terminoBusqueda
                    }
                    placeholder="RNC, DNI, apellido o nombre"
                    style={{
                      flex:
                        "1 1 350px",
                      padding: "14px",
                      borderRadius:
                        "8px",
                      border:
                        "1px solid #cbd5e1",
                    }}
                  />

                  <button
                    style={botonAzul}
                  >
                    Buscar
                  </button>

                  <a
                    href="/administrador"
                    style={botonBlanco}
                  >
                    Volver
                  </a>
                </div>
              </form>
            </div>

            {resultados.map(
              matriculado => {
                const estado =
                  estadoEfectivo(
                    matriculado
                  )

                const suspendida =
                  estado.includes(
                    "suspend"
                  )

                const baja =
                  estado.includes(
                    "baja"
                  )

                const confirmarBaja =
                  Number(
                    parametros.baja ??
                      0
                  ) ===
                  matriculado.id

                return (
                  <div
                    key={
                      matriculado.id
                    }
                    style={{
                      ...tarjeta,
                      marginTop:
                        "20px",
                    }}
                  >
                    <h3>
                      {
                        matriculado.apellido_nombre
                      }
                    </h3>

                    <p>
                      <strong>
                        {matriculado.numero_matricula ||
                          "SIN MATRÍCULA"}
                      </strong>
                    </p>

                    <div
                      style={grilla}
                    >
                      <Dato
                        titulo="DNI"
                        valor={
                          matriculado.dni
                        }
                      />

                      <Dato
                        titulo="Estado"
                        valor={
                          estadoEfectivo(
                            matriculado
                          )
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
                        titulo="Emisión"
                        valor={formatearFecha(
                          matriculado.fecha_emision
                        )}
                      />

                      <Dato
                        titulo="Vencimiento"
                        valor={formatearFecha(
                          matriculado.fecha_vencimiento
                        )}
                      />
                    </div>

                    {!baja && (
                      <div
                        style={botonera}
                      >
                        <a
                          href={`/administrador?buscar=1&q=${encodeURIComponent(
                            terminoBusqueda
                          )}&editar=${
                            matriculado.id
                          }`}
                          style={
                            botonBlanco
                          }
                        >
                          Editar
                        </a>

                        <form
                          action={
                            cambiarEstado
                          }
                        >
                          <input
                            type="hidden"
                            name="id"
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

                          <input
                            type="hidden"
                            name="estado"
                            value={
                              suspendida
                                ? "vigente"
                                : "suspendida"
                            }
                          />

                          <button
                            type="submit"
                            style={
                              suspendida
                                ? botonVerde
                                : botonAmarillo
                            }
                          >
                            {suspendida
                              ? "Rehabilitar"
                              : "Suspender"}
                          </button>
                        </form>

                        <a
                          href={`/administrador?buscar=1&q=${encodeURIComponent(
                            terminoBusqueda
                          )}&baja=${
                            matriculado.id
                          }`}
                          style={
                            botonRojo
                          }
                        >
                          Dar de baja
                        </a>
                      </div>
                    )}

                    {confirmarBaja &&
                      !baja && (
                        <div
                          style={{
                            marginTop:
                              "20px",
                            padding:
                              "20px",
                            background:
                              "#fff1f2",
                            border:
                              "1px solid #fecdd3",
                            borderRadius:
                              "10px",
                          }}
                        >
                          <strong>
                            Confirmar baja
                          </strong>

                          <p>
                            Esta acción
                            dará de baja al
                            matriculado y
                            liberará el número{" "}
                            <strong>
                              {matriculado.numero_matricula}
                            </strong>{" "}
                            para que pueda
                            asignarse en el
                            futuro a otra
                            persona.
                          </p>

                          <form
                            action={
                              darDeBaja
                            }
                          >
                            <input
                              type="hidden"
                              name="id"
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

                            <div
                              style={
                                botonera
                              }
                            >
                              <button
                                type="submit"
                                style={
                                  botonRojo
                                }
                              >
                                Sí, dar de baja y liberar RNC
                              </button>

                              <a
                                href={`/administrador?buscar=1&q=${encodeURIComponent(
                                  terminoBusqueda
                                )}`}
                                style={
                                  botonBlanco
                                }
                              >
                                Cancelar
                              </a>
                            </div>
                          </form>
                        </div>
                      )}
                  </div>
                )
              }
            )}
          </>
        ) : (
          <>
            <div style={tarjeta}>
              <h3>
                Gestión de matrículas
              </h3>

              <p>
                El estado VENCIDA se calcula
                automáticamente según la fecha de
                vencimiento. Suspensión y baja
                continúan siendo administrativas.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit,minmax(170px,1fr))",
                  gap: "14px",
                  marginTop: "24px",
                }}
              >
                <Resumen
                  titulo="Vigentes"
                  cantidad={vigentes.length}
                  href="/administrador?listado=vigentes"
                />
                <Resumen
                  titulo="Vencidas"
                  cantidad={vencidas.length}
                  href="/administrador?listado=vencidas"
                />
                <Resumen
                  titulo="Suspendidas"
                  cantidad={suspendidas.length}
                  href="/administrador?listado=suspendidas"
                />
                <Resumen
                  titulo="Bajas"
                  cantidad={bajas.length}
                  href="/administrador?listado=bajas"
                />
                <Resumen
                  titulo="Próximas a vencer"
                  cantidad={proximasAVencer.length}
                  href="/administrador?listado=proximas"
                />
              </div>

              <div style={botonera}>
                <a
                  href="/administrador?nuevo=1"
                  style={botonAzul}
                >
                  + Nuevo matriculado
                </a>

                <a
                  href="/administrador?buscar=1"
                  style={botonBlanco}
                >
                  Buscar matriculado
                </a>
              </div>
            </div>

            {tituloListado && (
              <div
                style={{
                  ...tarjeta,
                  marginTop: "22px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <h3 style={{ margin: 0 }}>
                    {tituloListado}
                  </h3>
                  <a
                    href="/administrador"
                    style={botonBlanco}
                  >
                    Cerrar listado
                  </a>
                </div>

                {matriculadosListado.length === 0 ? (
                  <p style={{ marginTop: "22px" }}>
                    No hay registros en este listado.
                  </p>
                ) : (
                  <div style={{ marginTop: "22px" }}>
                    {matriculadosListado.map(m => (
                      <div
                        key={m.id}
                        style={{
                          padding: "16px 0",
                          borderBottom:
                            "1px solid #e2e8f0",
                        }}
                      >
                        <strong>
                          {m.apellido_nombre ||
                            "Sin nombre"}
                        </strong>
                        <div
                          style={{
                            marginTop: "5px",
                            color: "#475569",
                          }}
                        >
                          {m.numero_matricula ||
                            "SIN MATRÍCULA"}{" "}
                          · Estado:{" "}
                          {estadoEfectivo(m)} · Vence:{" "}
                          {formatearFecha(
                            m.fecha_vencimiento
                          )}
                        </div>
                        <div
                          style={{
                            marginTop: "10px",
                          }}
                        >
                          <a
                            href={`/administrador?buscar=1&q=${encodeURIComponent(
                              m.numero_matricula ||
                                m.dni ||
                                m.apellido_nombre ||
                                ""
                            )}`}
                            style={{
                              color: "#0d5689",
                              fontWeight: "bold",
                              textDecoration: "none",
                            }}
                          >
                            Ver / administrar
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
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
  valor = null,
}: {
  nombre: string
  etiqueta: string
  tipo?: string
  requerido?: boolean
  valor?: string | null
}) {
  return (
    <label
      style={{
        fontWeight: "bold",
      }}
    >
      {etiqueta}
      {requerido ? " *" : ""}

      <input
        name={nombre}
        type={tipo}
        required={requerido}
        defaultValue={
          tipo === "date" && valor
            ? valor.slice(0, 10)
            : valor ?? ""
        }
        style={{
          display: "block",
          width: "100%",
          boxSizing: "border-box",
          marginTop: "8px",
          padding: "13px",
          borderRadius: "8px",
          border:
            "1px solid #cbd5e1",
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
      <strong>
        {titulo}
      </strong>

      <div
        style={{
          marginTop: "5px",
        }}
      >
        {valor || "-"}
      </div>
    </div>
  )
}

function Resumen({
  titulo,
  cantidad,
  href,
}: {
  titulo: string
  cantidad: number
  href: string
}) {
  return (
    <a
      href={href}
      style={{
        display: "block",
        padding: "18px",
        border: "1px solid #d7e0e7",
        borderRadius: "10px",
        background: "#f8fafc",
        color: "#172033",
        textDecoration: "none",
      }}
    >
      <div
        style={{
          fontSize: "13px",
          color: "#64748b",
          fontWeight: "bold",
        }}
      >
        {titulo}
      </div>
      <div
        style={{
          fontSize: "30px",
          fontWeight: "bold",
          marginTop: "6px",
        }}
      >
        {cantidad}
      </div>
    </a>
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
        padding: "16px",
        marginBottom: "22px",
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
      }}
    >
      {texto}
    </div>
  )
}

const tarjeta = {
  background: "white",
  border: "1px solid #d7e0e7",
  borderRadius: "14px",
  padding: "30px",
  boxShadow:
    "0 2px 5px rgba(0,0,0,.08)",
}

const grilla = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(220px,1fr))",
  gap: "20px",
}

const botonera = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap" as const,
  marginTop: "25px",
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

const botonAmarillo = {
  padding: "13px 20px",
  border: "none",
  borderRadius: "8px",
  background: "#f59e0b",
  color: "white",
  fontWeight: "bold",
  cursor: "pointer",
}

const botonVerde = {
  padding: "13px 20px",
  border: "none",
  borderRadius: "8px",
  background: "#15803d",
  color: "white",
  fontWeight: "bold",
  cursor: "pointer",
}

const botonRojo = {
  padding: "13px 20px",
  border: "none",
  borderRadius: "8px",
  background: "#b91c1c",
  color: "white",
  fontWeight: "bold",
  textDecoration: "none",
  cursor: "pointer",
}
