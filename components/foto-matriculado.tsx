"use client"

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react"

type Props = {
  matriculadoId?: number
  action?: (formData: FormData) => void | Promise<void>
  modo?: "editar" | "alta"
}

const SALIDA_ANCHO = 850
const SALIDA_ALTO = 1000
const RELACION = SALIDA_ANCHO / SALIDA_ALTO

function limitar(valor: number, minimo: number, maximo: number) {
  return Math.min(maximo, Math.max(minimo, valor))
}

function recortarImagen(
  dataUrl: string,
  zoom: number,
  posicionX: number,
  posicionY: number
) {
  return new Promise<string>((resolve, reject) => {
    const imagen = new Image()

    imagen.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = SALIDA_ANCHO
      canvas.height = SALIDA_ALTO

      const ctx = canvas.getContext("2d")
      if (!ctx) {
        reject(new Error("No se pudo preparar la imagen."))
        return
      }

      const ancho = imagen.naturalWidth
      const alto = imagen.naturalHeight

      if (!ancho || !alto) {
        reject(new Error("La imagen no es válida."))
        return
      }

      const relacionOrigen = ancho / alto
      let anchoBase = ancho
      let altoBase = alto

      if (relacionOrigen > RELACION) {
        altoBase = alto
        anchoBase = alto * RELACION
      } else {
        anchoBase = ancho
        altoBase = ancho / RELACION
      }

      const z = limitar(zoom, 1, 3)
      const anchoRecorte = anchoBase / z
      const altoRecorte = altoBase / z

      const maxX = Math.max(0, ancho - anchoRecorte)
      const maxY = Math.max(0, alto - altoRecorte)

      const nx = (limitar(posicionX, -100, 100) + 100) / 200
      const ny = (limitar(posicionY, -100, 100) + 100) / 200

      const sx = maxX * nx
      const sy = maxY * ny

      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, SALIDA_ANCHO, SALIDA_ALTO)

      ctx.drawImage(
        imagen,
        sx,
        sy,
        anchoRecorte,
        altoRecorte,
        0,
        0,
        SALIDA_ANCHO,
        SALIDA_ALTO
      )

      resolve(canvas.toDataURL("image/jpeg", 0.92))
    }

    imagen.onerror = () => {
      reject(new Error("No se pudo leer la imagen."))
    }

    imagen.src = dataUrl
  })
}

export default function FotoMatriculado({
  matriculadoId,
  action,
  modo = "editar",
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [stream, setStream] = useState<MediaStream | null>(null)
  const [camaraActiva, setCamaraActiva] = useState(false)
  const [imagenOriginal, setImagenOriginal] = useState("")
  const [fotoCapturada, setFotoCapturada] = useState("")
  const [nombreArchivo, setNombreArchivo] = useState("")
  const [errorCamara, setErrorCamara] = useState("")
  const [zoom, setZoom] = useState(1)
  const [posicionX, setPosicionX] = useState(0)
  const [posicionY, setPosicionY] = useState(0)
  const [procesando, setProcesando] = useState(false)

  useEffect(() => {
    return () => {
      stream?.getTracks().forEach(track => track.stop())
    }
  }, [stream])

  function resetearAjustes() {
    setZoom(1)
    setPosicionX(0)
    setPosicionY(0)
  }

  async function prepararImagen(dataUrl: string, nombre: string) {
    setProcesando(true)
    setErrorCamara("")

    try {
      setImagenOriginal(dataUrl)
      setNombreArchivo(nombre)
      resetearAjustes()

      const recorteInicial = await recortarImagen(dataUrl, 1, 0, 0)
      setFotoCapturada(recorteInicial)

      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (error) {
      console.error("[RENACLI] Error preparando foto:", error)
      setImagenOriginal("")
      setFotoCapturada("")
      setNombreArchivo("")
      setErrorCamara("No se pudo preparar la imagen. Probá con otra foto.")
    } finally {
      setProcesando(false)
    }
  }

  async function aplicarRecorte() {
    if (!imagenOriginal) return

    setProcesando(true)
    setErrorCamara("")

    try {
      const resultado = await recortarImagen(
        imagenOriginal,
        zoom,
        posicionX,
        posicionY
      )
      setFotoCapturada(resultado)
    } catch (error) {
      console.error("[RENACLI] Error aplicando encuadre:", error)
      setErrorCamara("No se pudo aplicar el encuadre.")
    } finally {
      setProcesando(false)
    }
  }

  async function abrirCamara() {
    setErrorCamara("")
    setImagenOriginal("")
    setFotoCapturada("")
    setNombreArchivo("")
    resetearAjustes()

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setErrorCamara(
          "Este navegador no permite acceder a la cámara. Podés usar Elegir foto."
        )
        return
      }

      const nuevoStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })

      setStream(nuevoStream)
      setCamaraActiva(true)

      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = nuevoStream
          void videoRef.current.play()
        }
      })
    } catch (error) {
      console.error("[RENACLI] No se pudo abrir la cámara:", error)
      setErrorCamara(
        "No se pudo abrir la cámara. Revisá que el navegador tenga permiso para usarla."
      )
    }
  }

  function cerrarCamara() {
    stream?.getTracks().forEach(track => track.stop())
    setStream(null)
    setCamaraActiva(false)

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  async function tomarFoto() {
    const video = videoRef.current

    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setErrorCamara(
        "La cámara todavía no está lista. Esperá un segundo e intentá nuevamente."
      )
      return
    }

    const maxWidth = 1600
    const escala = Math.min(1, maxWidth / video.videoWidth)
    const width = Math.round(video.videoWidth * escala)
    const height = Math.round(video.videoHeight * escala)

    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext("2d")
    if (!ctx) {
      setErrorCamara("No se pudo capturar la imagen.")
      return
    }

    ctx.drawImage(video, 0, 0, width, height)
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92)

    cerrarCamara()
    await prepararImagen(dataUrl, "Foto tomada con cámara")
  }

  function elegirFoto() {
    setErrorCamara("")
    cerrarCamara()
    fileInputRef.current?.click()
  }

  function cambioArchivo(event: ChangeEvent<HTMLInputElement>) {
    const archivo = event.target.files?.[0]
    if (!archivo) return

    const permitidos = ["image/jpeg", "image/png", "image/webp"]

    if (!permitidos.includes(archivo.type)) {
      event.target.value = ""
      setErrorCamara("La imagen debe ser JPG, PNG o WEBP.")
      return
    }

    if (archivo.size > 10 * 1024 * 1024) {
      event.target.value = ""
      setErrorCamara("La imagen no puede superar los 10 MB.")
      return
    }

    const lector = new FileReader()

    lector.onload = async () => {
      if (typeof lector.result !== "string") {
        setErrorCamara("No se pudo leer la imagen seleccionada.")
        return
      }

      await prepararImagen(lector.result, archivo.name)
    }

    lector.onerror = () => {
      setErrorCamara("No se pudo leer la imagen seleccionada.")
    }

    lector.readAsDataURL(archivo)
  }

  function descartarFoto() {
    setImagenOriginal("")
    setFotoCapturada("")
    setNombreArchivo("")
    setErrorCamara("")
    resetearAjustes()

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const posicionHorizontal = `${50 + posicionX / 2}%`
  const posicionVertical = `${50 + posicionY / 2}%`

  const contenido = (
    <>
      {modo === "editar" && matriculadoId ? (
        <input type="hidden" name="id" value={matriculadoId} />
      ) : null}

      <input
        type="hidden"
        name="foto_capturada"
        value={fotoCapturada}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={cambioArchivo}
        style={{ display: "none" }}
      />

      <h4 style={titulo}>Foto del matriculado</h4>

      <p style={descripcion}>
        Podés tomar una foto con la cámara del celular o con una webcam,
        o elegir una imagen guardada. Después podés centrarla, moverla
        y hacer zoom antes de guardarla.
      </p>

      <div style={filaBotones}>
        <button type="button" onClick={abrirCamara} style={botonCamara}>
          📷 Usar cámara
        </button>

        <button type="button" onClick={elegirFoto} style={botonArchivo}>
          🖼️ Elegir foto
        </button>
      </div>

      {camaraActiva && (
        <div style={{ marginTop: "18px", maxWidth: "520px" }}>
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            style={{
              display: "block",
              width: "100%",
              borderRadius: "12px",
              background: "#0f172a",
            }}
          />

          <div style={{ ...filaBotones, marginTop: "12px" }}>
            <button type="button" onClick={tomarFoto} style={botonTomar}>
              Tomar foto
            </button>

            <button
              type="button"
              onClick={cerrarCamara}
              style={botonCancelar}
            >
              Cerrar cámara
            </button>
          </div>
        </div>
      )}

      {imagenOriginal && (
        <div style={editor}>
          <p style={{ margin: "0 0 6px", fontWeight: "bold" }}>
            Ajustar encuadre
          </p>

          <p style={ayuda}>
            Mové los controles hasta que el rostro quede centrado dentro
            del marco. Luego tocá “Aplicar encuadre”.
          </p>

          <div style={grillaEditor}>
            <div>
              <div style={marcoFoto}>
                <img
                  src={imagenOriginal}
                  alt="Vista previa para ajustar"
                  draggable={false}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition:
                      `${posicionHorizontal} ${posicionVertical}`,
                    transform: `scale(${zoom})`,
                    transformOrigin:
                      `${posicionHorizontal} ${posicionVertical}`,
                    userSelect: "none",
                    pointerEvents: "none",
                  }}
                />
              </div>

              <p style={pieMarco}>Marco final de la credencial</p>
            </div>

            <div>
              <label style={etiquetaControl}>
                Zoom: {zoom.toFixed(2)}x
              </label>
              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={zoom}
                onChange={e => setZoom(Number(e.target.value))}
                style={controlRango}
              />

              <label style={etiquetaControl}>Mover horizontal</label>
              <input
                type="range"
                min="-100"
                max="100"
                step="1"
                value={posicionX}
                onChange={e => setPosicionX(Number(e.target.value))}
                style={controlRango}
              />

              <label style={etiquetaControl}>Mover vertical</label>
              <input
                type="range"
                min="-100"
                max="100"
                step="1"
                value={posicionY}
                onChange={e => setPosicionY(Number(e.target.value))}
                style={controlRango}
              />

              <div style={{ ...filaBotones, marginTop: "16px" }}>
                <button
                  type="button"
                  onClick={aplicarRecorte}
                  disabled={procesando}
                  style={{
                    ...botonTomar,
                    opacity: procesando ? 0.6 : 1,
                  }}
                >
                  {procesando ? "Procesando..." : "Aplicar encuadre"}
                </button>

                <button
                  type="button"
                  onClick={resetearAjustes}
                  style={botonArchivo}
                >
                  Centrar
                </button>

                <button
                  type="button"
                  onClick={descartarFoto}
                  style={botonCancelar}
                >
                  Descartar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {fotoCapturada && (
        <div style={{ marginTop: "18px" }}>
          <p style={{ margin: "0 0 8px", fontWeight: "bold" }}>
            Resultado que se guardará
          </p>

          <img
            src={fotoCapturada}
            alt="Foto ajustada"
            style={{
              width: "170px",
              height: "200px",
              objectFit: "cover",
              borderRadius: "12px",
              border: "1px solid #cbd5e1",
            }}
          />

          {nombreArchivo && (
            <p style={origen}>
              Origen: <strong>{nombreArchivo}</strong>
            </p>
          )}
        </div>
      )}

      {errorCamara && <div style={errorCaja}>{errorCamara}</div>}

      {modo === "editar" && fotoCapturada && (
        <button
          type="submit"
          disabled={procesando}
          style={{
            ...botonGuardar,
            opacity: procesando ? 0.6 : 1,
            cursor: procesando ? "not-allowed" : "pointer",
          }}
        >
          Guardar foto
        </button>
      )}

      {modo === "alta" && (
        <p style={notaAlta}>
          La foto ajustada se guardará junto con el nuevo matriculado al
          presionar “Guardar y generar matrícula”.
        </p>
      )}
    </>
  )

  if (modo === "alta") {
    return <div style={contenedor}>{contenido}</div>
  }

  if (!action || !matriculadoId) {
    return null
  }

  return (
    <form action={action} style={contenedor}>
      {contenido}
    </form>
  )
}

const contenedor = {
  marginTop: "22px",
  padding: "20px",
  border: "1px solid #d7e0e7",
  borderRadius: "12px",
  background: "#f8fafc",
}

const titulo = {
  margin: "0 0 8px",
  color: "#172033",
  fontSize: "18px",
}

const descripcion = {
  margin: "0 0 18px",
  color: "#64748b",
  lineHeight: 1.5,
}

const filaBotones = {
  display: "flex",
  flexWrap: "wrap" as const,
  gap: "10px",
}

const botonCamara = {
  padding: "11px 16px",
  border: 0,
  borderRadius: "8px",
  background: "#0d5689",
  color: "white",
  fontWeight: "bold",
  cursor: "pointer",
}

const botonArchivo = {
  padding: "11px 16px",
  border: "1px solid #cbd5e1",
  borderRadius: "8px",
  background: "white",
  color: "#172033",
  fontWeight: "bold",
  cursor: "pointer",
}

const botonTomar = {
  padding: "11px 16px",
  border: 0,
  borderRadius: "8px",
  background: "#15803d",
  color: "white",
  fontWeight: "bold",
  cursor: "pointer",
}

const botonCancelar = {
  padding: "11px 16px",
  border: "1px solid #cbd5e1",
  borderRadius: "8px",
  background: "white",
  color: "#172033",
  fontWeight: "bold",
  cursor: "pointer",
}

const botonGuardar = {
  marginTop: "18px",
  padding: "12px 18px",
  border: 0,
  borderRadius: "8px",
  background: "#0d5689",
  color: "white",
  fontWeight: "bold",
}

const editor = {
  marginTop: "20px",
  padding: "16px",
  border: "1px solid #cbd5e1",
  borderRadius: "12px",
  background: "white",
}

const ayuda = {
  margin: "0 0 14px",
  color: "#64748b",
  fontSize: "13px",
  lineHeight: 1.45,
}

const grillaEditor = {
  display: "grid",
  gridTemplateColumns: "minmax(180px,255px) minmax(220px,1fr)",
  gap: "22px",
  alignItems: "start",
}

const marcoFoto = {
  position: "relative" as const,
  width: "255px",
  maxWidth: "100%",
  aspectRatio: `${SALIDA_ANCHO} / ${SALIDA_ALTO}`,
  overflow: "hidden",
  borderRadius: "14px",
  border: "2px solid #0d5689",
  background: "#e2e8f0",
}

const pieMarco = {
  margin: "8px 0 0",
  color: "#64748b",
  fontSize: "12px",
}

const etiquetaControl = {
  display: "block",
  marginTop: "12px",
  marginBottom: "6px",
  color: "#334155",
  fontWeight: "bold",
  fontSize: "13px",
}

const controlRango = {
  width: "100%",
  maxWidth: "420px",
}

const origen = {
  margin: "8px 0 0",
  color: "#64748b",
  fontSize: "12px",
}

const errorCaja = {
  marginTop: "15px",
  padding: "12px",
  borderRadius: "8px",
  background: "#fff1f2",
  border: "1px solid #fecdd3",
  color: "#be123c",
}

const notaAlta = {
  marginTop: "15px",
  marginBottom: 0,
  color: "#64748b",
  fontSize: "13px",
  lineHeight: 1.5,
}
