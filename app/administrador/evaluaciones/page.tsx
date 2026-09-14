import crypto from "crypto"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@supabase/supabase-js"

const COOKIE_NAME = "renacli_admin_session"

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

export default async function EvaluacionesPage() {
  const autorizado =
    await estaAutorizado()

  if (!autorizado) {
    redirect("/administrador")
  }

  const resumen =
    await obtenerResumenEvaluaciones()

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
              valor="30"
            />

            <Dato
              titulo="Duración"
              valor="45 minutos"
            />

            <Dato
              titulo="Aprobación"
              valor="80 %"
            />

            <Dato
              titulo="Preguntas críticas"
              valor="4"
            />

            <Dato
              titulo="Críticas mínimas"
              valor="3 de 4"
            />

            <Dato
              titulo="Banco actual"
              valor={`${resumen.preguntasActivas} preguntas`}
            />
          </div>
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
          textTransform: "uppercase",
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
