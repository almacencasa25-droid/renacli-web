"use client"

import { useEffect, useRef, useState } from "react"

type Props = {
  matriculadoId: number
  action: (formData: FormData) => void | Promise<void>
}

export default function FotoMatriculado({
  matriculadoId,
  action,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [stream, setStream] = useState<MediaStream | null>(null)
  const [camaraActiva, setCamaraActiva] = useState(false)
  const [fotoCapturada, setFotoCapturada] = useState("")
  const [nombreArchivo, setNombreArchivo] = useState("")
  const [errorCamara, setErrorCamara] = useState("")

  useEffect(() => {
    return () => {
      stream?.getTracks().forEach(track => track.stop())
    }
  }, [stream])

  async function abrirCamara() {
    setErrorCamara("")
    setFotoCapturada("")
    setNombreArchivo("")

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setErrorCamara(
          "Este navegador no permite acceder a la cámara. Podés usar la opción Elegir foto."
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

  function tomarFoto() {
    const video = videoRef.current
    const canvas = canvasRef.current

    if (!video || !canvas || video.videoWidth === 0 || video.videoHeight === 0) {
      setErrorCamara("La cámara todavía no está lista. Esperá un segundo e intentá nuevamente.")
      return
    }

    const maxWidth = 1400
    const escala = Math.min(1, maxWidth / video.videoWidth)
    const width = Math.round(video.videoWidth * escala)
    const height = Math.round(video.videoHeight * escala)

    canvas.width = width
    canvas.height = height

    const contexto = canvas.getContext("2d")

    if (!contexto) {
      setErrorCamara("No se pudo capturar la imagen.")
      return
    }

    contexto.drawImage(video, 0, 0, width, height)

    const dataUrl = canvas.toDataURL("image/jpeg", 0.9)

    setFotoCapturada(dataUrl)
    setNombreArchivo("Foto tomada con cámara")
    cerrarCamara()
  }

  function elegirFoto() {
    setErrorCamara("")
    setFotoCapturada("")
    fileInputRef.current?.click()
  }

  function cambioArchivo(event: React.ChangeEvent<HTMLInputElement>) {
    const archivo = event.target.files?.[0]

    if (!archivo) {
      setNombreArchivo("")
      return
    }

    setNombreArchivo(archivo.name)
    setFotoCapturada("")
  }

  return (
    <form
      action={action}
      encType="multipart/form-data"
      style={{
        marginTop: "22px",
        padding: "20px",
        border: "1px solid #d7e0e7",
        borderRadius: "12px",
        background: "#f8fafc",
      }}
    >
      <input
        type="hidden"
        name="id"
        value={matriculadoId}
      />

      <input
        type="hidden"
        name="foto_capturada"
        value={fotoCapturada}
      />

      <input
        ref={fileInputRef}
        type="file"
        name="foto"
        accept="image/jpeg,image/png,image/webp"
        onChange={cambioArchivo}
        style={{ display: "none" }}
      />

      <h4
        style={{
          margin: "0 0 8px",
          color: "#172033",
          fontSize: "18px",
        }}
      >
        Foto del matriculado
      </h4>

      <p
        style={{
          margin: "0 0 18px",
          color: "#64748b",
          lineHeight: 1.5,
        }}
      >
        Podés tomar una foto con la cámara del celular o con una webcam,
        o elegir una imagen que ya esté guardada.
      </p>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <button
          type="button"
          onClick={abrirCamara}
          style={botonCamara}
        >
          📷 Usar cámara
        </button>

        <button
          type="button"
          onClick={elegirFoto}
          style={botonArchivo}
        >
          🖼️ Elegir foto
        </button>
      </div>

      {camaraActiva && (
        <div
          style={{
            marginTop: "18px",
            maxWidth: "520px",
          }}
        >
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

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
              marginTop: "12px",
            }}
          >
            <button
              type="button"
              onClick={tomarFoto}
              style={botonTomar}
            >
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

      <canvas
        ref={canvasRef}
        style={{ display: "none" }}
      />

      {fotoCapturada && (
        <div
          style={{
            marginTop: "18px",
          }}
        >
          <p
            style={{
              margin: "0 0 8px",
              fontWeight: "bold",
            }}
          >
            Vista previa
          </p>

          <img
            src={fotoCapturada}
            alt="Foto capturada"
            style={{
              width: "170px",
              height: "200px",
              objectFit: "cover",
              borderRadius: "12px",
              border: "1px solid #cbd5e1",
            }}
          />
        </div>
      )}

      {nombreArchivo && !fotoCapturada && (
        <p
          style={{
            marginTop: "15px",
            marginBottom: 0,
            color: "#334155",
          }}
        >
          Imagen seleccionada: <strong>{nombreArchivo}</strong>
        </p>
      )}

      {errorCamara && (
        <div
          style={{
            marginTop: "15px",
            padding: "12px",
            borderRadius: "8px",
            background: "#fff1f2",
            border: "1px solid #fecdd3",
            color: "#be123c",
          }}
        >
          {errorCamara}
        </div>
      )}

      {(fotoCapturada || nombreArchivo) && (
        <button
          type="submit"
          style={{
            marginTop: "18px",
            padding: "12px 18px",
            border: 0,
            borderRadius: "8px",
            background: "#0d5689",
            color: "white",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          Guardar foto
        </button>
      )}
    </form>
  )
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
