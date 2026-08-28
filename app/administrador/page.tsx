export default function AdministradorPage() {
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
        <h1 style={{ margin: 0, letterSpacing: "4px" }}>RENACLI</h1>

        <p style={{ margin: "6px 0 0" }}>
          Registro Nacional de Climatización y Refrigeración
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
            marginBottom: "8px",
            color: "#172033",
          }}
        >
          Panel de matriculados
        </h2>

        <p style={{ color: "#64748b", marginBottom: "35px" }}>
          Gestión interna de matrículas RENACLI.
        </p>

        <div
          style={{
            background: "white",
            border: "1px solid #d7e0e7",
            borderRadius: "14px",
            padding: "30px",
            boxShadow: "0 2px 5px rgba(0,0,0,0.08)",
          }}
        >
          <h3 style={{ marginTop: 0, color: "#172033" }}>
            Gestión de matrículas
          </h3>

          <p style={{ color: "#64748b" }}>
            Desde este panel se podrán registrar técnicos, asignar matrículas
            RNC, consultar matriculados y gestionar altas y bajas.
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
                border: "1px solid #cbd5e1",
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
