import crypto from "crypto"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

const COOKIE_NAME = "renacli_admin_session"

function obtenerTokenAdministrador() {
  const password = process.env.RENACLI_ADMIN_PASSWORD

  if (!password) {
    return null
  }

  return crypto
    .createHash("sha256")
    .update(password)
    .digest("hex")
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

type Props = {
  searchParams?: Promise<{
    error?: string
  }>
}

export default async function AdministradorPage({
  searchParams,
}: Props) {
  const parametros = searchParams
    ? await searchParams
    : {}

  const cookieStore = await cookies()

  const tokenGuardado =
    cookieStore.get(COOKIE_NAME)?.value

  const tokenCorrecto =
    obtenerTokenAdministrador()

  const autorizado =
    Boolean(tokenCorrecto) &&
    tokenGuardado === tokenCorrecto

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

          <p
            style={{
              margin: "6px 0 0",
            }}
          >
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
                marginBottom: "25px",
                lineHeight: 1.5,
              }}
            >
              Ingrese la contraseña de administrador
              para acceder a la gestión de matrículas
              RENACLI.
            </p>

            {parametros?.error === "incorrecta" && (
              <div
                style={{
                  background: "#fff1f2",
                  border: "1px solid #fecdd3",
                  color: "#be123c",
                  borderRadius: "8px",
                  padding: "12px 14px",
                  marginBottom: "20px",
                }}
              >
                Contraseña incorrecta.
              </div>
            )}

            {parametros?.error === "config" && (
              <div
                style={{
                  background: "#fff7ed",
                  border: "1px solid #fed7aa",
                  color: "#c2410c",
                  borderRadius: "8px",
                  padding: "12px 14px",
                  marginBottom: "20px",
                }}
              >
                La contraseña de administración no
                está configurada correctamente.
              </div>
            )}

            <form action={iniciarSesion}>
              <label
                htmlFor="password"
                style={{
                  display: "block",
                  color: "#334155",
                  fontWeight: "bold",
                  marginBottom: "8px",
                }}
              >
                Contraseña
              </label>

              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="Ingrese su contraseña"
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
                  padding: "14px 20px",
                  border: "none",
                  borderRadius: "8px",
                  background: "#0d5689",
                  color: "white",
                  fontWeight: "bold",
                  fontSize: "16px",
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

          <p
            style={{
              margin: "6px 0 0",
            }}
          >
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
                "1px solid rgba(255,255,255,0.5)",
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
            marginBottom: "35px",
          }}
        >
          Gestión interna de matrículas RENACLI.
        </p>

        <div
          style={{
            background: "white",
            border: "1px solid #d7e0e7",
            borderRadius: "14px",
            padding: "30px",
            boxShadow:
              "0 2px 5px rgba(0,0,0,0.08)",
          }}
        >
          <h3
            style={{
              marginTop: 0,
              color: "#172033",
            }}
          >
            Gestión de matrículas
          </h3>

          <p
            style={{
              color: "#64748b",
              lineHeight: 1.5,
            }}
          >
            Desde este panel se podrán registrar
            técnicos, asignar matrículas RNC,
            consultar matriculados y gestionar altas
            y bajas.
          </p>

          <div
            style={{
              display: "flex",
              gap: "15px",
              flexWrap: "wrap",
              marginTop: "25px",
            }}
          >
            <button
              type="button"
              style={{
                padding: "14px 22px",
                border: "none",
                borderRadius: "8px",
                background: "#0d5689",
                color: "white",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              + Nuevo matriculado
            </button>

            <button
              type="button"
              style={{
                padding: "14px 22px",
                border:
                  "1px solid #cbd5e1",
                borderRadius: "8px",
                background: "white",
                color: "#334155",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              Buscar matriculado
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}
