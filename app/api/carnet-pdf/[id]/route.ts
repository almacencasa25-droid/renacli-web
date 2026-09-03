import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@supabase/supabase-js"
import QRCode from "qrcode"
import {
  PDFDocument,
  PDFFont,
  StandardFonts,
  rgb,
  pushGraphicsState,
  popGraphicsState,
  rectangle,
  clip,
  endPath,
} from "pdf-lib"
import {
  createHash,
  createHmac,
  timingSafeEqual,
} from "crypto"

export const runtime = "nodejs"

const COOKIE_ADMIN = "renacli_admin_session"

type RouteProps = {
  params: Promise<{ id: string }>
}

function obtenerSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secretKey = process.env.SUPABASE_SECRET_KEY

  if (!url || !secretKey) {
    throw new Error(
      "Faltan las variables de entorno de Supabase.",
    )
  }

  return createClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

function crearTokenAdmin(password: string) {
  return createHash("sha256")
    .update(password)
    .digest("hex")
}

async function adminAutorizado() {
  const cookieStore = await cookies()
  const sesion = cookieStore.get(COOKIE_ADMIN)?.value
  const password = process.env.RENACLI_ADMIN_PASSWORD

  if (!sesion || !password) {
    return false
  }

  const esperado = crearTokenAdmin(password)

  const a = Buffer.from(sesion)
  const b = Buffer.from(esperado)

  if (a.length !== b.length) {
    return false
  }

  return timingSafeEqual(a, b)
}

function formatearFecha(fecha: string | null) {
  if (!fecha) return "No informada"

  const partes = fecha.substring(0, 10).split("-")

  if (partes.length !== 3) {
    return fecha
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`
}

function fechaHoraArgentina() {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date())
}

function crearSello(payload: string) {
  const secreto = process.env.PDF_SIGNING_SECRET

  if (!secreto) {
    throw new Error(
      "Falta configurar PDF_SIGNING_SECRET en Vercel.",
    )
  }

  return createHmac("sha256", secreto)
    .update(payload)
    .digest("hex")
    .toUpperCase()
}

function recortarTextoPorAncho(
  texto: string,
  fuente: PDFFont,
  tamanio: number,
  anchoMaximo: number,
) {
  if (
    fuente.widthOfTextAtSize(texto, tamanio) <= anchoMaximo
  ) {
    return texto
  }

  let resultado = texto

  while (
    resultado.length > 1 &&
    fuente.widthOfTextAtSize(`${resultado}...`, tamanio) >
      anchoMaximo
  ) {
    resultado = resultado.slice(0, -1)
  }

  return `${resultado}...`
}

function envolverTextoPorAncho(
  texto: string,
  fuente: PDFFont,
  tamanio: number,
  anchoMaximo: number,
  maxLineas: number,
) {
  const palabras = texto.trim().split(/\s+/)
  const lineas: string[] = []
  let actual = ""

  for (const palabra of palabras) {
    const tentativa = actual.length === 0
      ? palabra
      : `${actual} ${palabra}`

    if (
      fuente.widthOfTextAtSize(tentativa, tamanio) <=
      anchoMaximo
    ) {
      actual = tentativa
      continue
    }

    if (actual) {
      lineas.push(actual)
    }

    actual = palabra

    if (lineas.length === maxLineas) {
      break
    }
  }

  if (lineas.length < maxLineas && actual) {
    lineas.push(actual)
  }

  if (lineas.length > maxLineas) {
    lineas.length = maxLineas
  }

  if (
    lineas.length === maxLineas &&
    palabras.join(" ").length > lineas.join(" ").length
  ) {
    const ultima = lineas[maxLineas - 1]
    lineas[maxLineas - 1] = recortarTextoPorAncho(
      ultima,
      fuente,
      tamanio,
      anchoMaximo - 4,
    )
  }

  return lineas
}

export async function GET(
  _request: NextRequest,
  { params }: RouteProps,
) {
  try {
    const autorizado = await adminAutorizado()

    if (!autorizado) {
      return NextResponse.json(
        { error: "No autorizado." },
        { status: 401 },
      )
    }

    const { id } = await params
    const matriculadoId = Number(id)

    if (!Number.isInteger(matriculadoId) || matriculadoId <= 0) {
      return NextResponse.json(
        { error: "ID inválido." },
        { status: 400 },
      )
    }

    const supabase = obtenerSupabaseAdmin()

    const {
      data: matriculado,
      error: errorMatriculado,
    } = await supabase
      .from("matriculados")
      .select(
        "id, numero_matricula, apellido_nombre, localidad, provincia, especialidad, telefono, foto_url, fecha_emision, fecha_ultima_acreditacion, fecha_vencimiento, estado",
      )
      .eq("id", matriculadoId)
      .maybeSingle()

    if (
      errorMatriculado ||
      !matriculado ||
      !matriculado.numero_matricula
    ) {
      return NextResponse.json(
        { error: "Matriculado no encontrado." },
        { status: 404 },
      )
    }

    const {
      data: codigoData,
      error: errorCodigo,
    } = await supabase.rpc(
      "obtener_codigo_qr_actual",
      {
        p_matriculado_id: matriculadoId,
      },
    )

    if (
      errorCodigo ||
      !codigoData ||
      codigoData.length === 0
    ) {
      return NextResponse.json(
        { error: "No se pudo obtener el código QR." },
        { status: 404 },
      )
    }

    const codigo = codigoData[0].codigo_verificacion as string

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://renacli-web.vercel.app"

    const instanteGeneracion = new Date()
    const generadoEn = fechaHoraArgentina(instanteGeneracion)
    const generadoEnIso = instanteGeneracion.toISOString()

    // En la credencial, "Emisión" representa la acreditación vigente.
    // La fecha de alta original sigue conservada en matriculados.fecha_emision.
    const fechaEmisionCredencial =
      matriculado.fecha_ultima_acreditacion || matriculado.fecha_emision

    const payloadFirma = [
      `id=${matriculado.id}`,
      `matricula=${matriculado.numero_matricula}`,
      `nombre=${matriculado.apellido_nombre}`,
      `estado=${matriculado.estado || "vigente"}`,
      `emision=${fechaEmisionCredencial || ""}`,
      `vencimiento=${matriculado.fecha_vencimiento || ""}`,
      `codigo_qr=${codigo}`,
      `generado=${generadoEnIso}`,
    ].join("|")

    const firmaCompleta = crearSello(payloadFirma)
    const codigoDocumento = `RPDF-${firmaCompleta.slice(0, 16)}`

    /*
      El QR del PDF verifica ESTE documento específico.
      Desde esa página también se puede consultar
      la vigencia actual de la matrícula.
    */
    const urlVerificacionDocumento =
      `${baseUrl}/verificar-documento/${encodeURIComponent(codigoDocumento)}`

    const qrBuffer = await QRCode.toBuffer(
      urlVerificacionDocumento,
      {
        width: 500,
        margin: 1,
        errorCorrectionLevel: "M",
        type: "png",
      },
    )

    const pdf = await PDFDocument.create()

    pdf.setTitle(
      `Credencial RENACLI ${matriculado.numero_matricula}`,
    )
    pdf.setAuthor(
      "RENACLI - Registro Nacional de Climatización y Refrigeración",
    )
    pdf.setSubject(
      "Credencial RENACLI con sello criptográfico de integridad",
    )
    pdf.setCreator("RENACLI")
    pdf.setProducer("RENACLI")

    // Tamaño estándar tipo tarjeta/cédula: 85,6 mm x 54 mm.
    const MM = 72 / 25.4
    const anchoPagina = 85.6 * MM
    const altoPagina = 54 * MM

    const page = pdf.addPage([anchoPagina, altoPagina])

    const fontRegular = await pdf.embedFont(
      StandardFonts.Helvetica,
    )
    const fontBold = await pdf.embedFont(
      StandardFonts.HelveticaBold,
    )

    const azul = rgb(0.07, 0.12, 0.31)
    const gris = rgb(0.34, 0.38, 0.45)
    const grisClaro = rgb(0.95, 0.96, 0.98)
    const negro = rgb(0.05, 0.07, 0.1)
    const blanco = rgb(1, 1, 1)
    const verde = rgb(0.07, 0.42, 0.24)
    const rojo = rgb(0.72, 0.12, 0.12)

    page.drawRectangle({
      x: 0,
      y: 0,
      width: anchoPagina,
      height: altoPagina,
      color: blanco,
    })

    page.drawRectangle({
      x: 1.5,
      y: 1.5,
      width: anchoPagina - 3,
      height: altoPagina - 3,
      borderColor: rgb(0.76, 0.79, 0.84),
      borderWidth: 0.75,
    })

    const altoHeader = 27

    page.drawRectangle({
      x: 0,
      y: altoPagina - altoHeader,
      width: anchoPagina,
      height: altoHeader,
      color: azul,
    })

    page.drawText("RENACLI", {
      x: 8,
      y: altoPagina - 15.5,
      size: 13,
      font: fontBold,
      color: blanco,
    })

    page.drawText(
      "Registro Nacional de Climatización y Refrigeración",
      {
        x: 8,
        y: altoPagina - 23,
        size: 4.6,
        font: fontRegular,
        color: blanco,
      },
    )

    page.drawText("CREDENCIAL", {
      x: anchoPagina - 47,
      y: altoPagina - 15.2,
      size: 6,
      font: fontBold,
      color: blanco,
    })

    // Zonas fijas: FOTO izquierda, DATOS centro, QR derecha.
    const fotoX = 8
    const fotoY = 47
    const fotoW = 36
    const fotoH = 44

    const datosX = 58
    const datosW = 111

    const qrX = anchoPagina - 61
    const qrY = 48
    const qrW = 53
    const qrH = 53

    page.drawRectangle({
      x: fotoX,
      y: fotoY,
      width: fotoW,
      height: fotoH,
      color: grisClaro,
      borderColor: rgb(0.78, 0.81, 0.86),
      borderWidth: 0.7,
    })

    let fotoInsertada = false

    if (matriculado.foto_url) {
      try {
        const respuestaFoto = await fetch(
          matriculado.foto_url,
          { cache: "no-store" },
        )

        if (respuestaFoto.ok) {
          const bytes = new Uint8Array(
            await respuestaFoto.arrayBuffer(),
          )

          const tipo = (
            respuestaFoto.headers.get("content-type") || ""
          ).toLowerCase()

          let imagen = null

          if (tipo.includes("png")) {
            imagen = await pdf.embedPng(bytes)
          } else if (
            tipo.includes("jpeg") ||
            tipo.includes("jpg")
          ) {
            imagen = await pdf.embedJpg(bytes)
          }

          if (imagen) {
            /*
              Reproduce el efecto "object-cover"
              usado en la credencial web RENACLI:
              llena todo el marco, mantiene la
              proporción y recorta solo el sobrante.
            */
            const escala = Math.max(
              fotoW / imagen.width,
              fotoH / imagen.height,
            )

            const anchoImagen =
              imagen.width * escala
            const altoImagen =
              imagen.height * escala

            const x =
              fotoX + (fotoW - anchoImagen) / 2
            const y =
              fotoY + (fotoH - altoImagen) / 2

            page.pushOperators(
              pushGraphicsState(),
              rectangle(
                fotoX,
                fotoY,
                fotoW,
                fotoH,
              ),
              clip(),
              endPath(),
            )

            page.drawImage(imagen, {
              x,
              y,
              width: anchoImagen,
              height: altoImagen,
            })

            page.pushOperators(
              popGraphicsState(),
            )

            fotoInsertada = true
          }
        }
      } catch {
        // Si la foto falla, el PDF se genera sin foto.
      }
    }

    if (!fotoInsertada) {
      page.drawText("FOTO", {
        x: fotoX + 10.5,
        y: fotoY + 20,
        size: 6,
        font: fontBold,
        color: gris,
      })
    }

    page.drawText("TÉCNICO MATRICULADO", {
      x: datosX,
      y: 112,
      size: 5.2,
      font: fontBold,
      color: azul,
    })

    const nombreLineas = envolverTextoPorAncho(
      matriculado.apellido_nombre || "Sin nombre",
      fontBold,
      9.4,
      datosW,
      2,
    )

    let nombreY = 100

    for (const linea of nombreLineas) {
      page.drawText(linea, {
        x: datosX,
        y: nombreY,
        size: 9.4,
        font: fontBold,
        color: negro,
      })
      nombreY -= 10
    }

    const yMatricula = nombreLineas.length > 1 ? 73 : 80

    page.drawText("MATRÍCULA", {
      x: datosX,
      y: yMatricula,
      size: 4.8,
      font: fontBold,
      color: gris,
    })

    page.drawText(matriculado.numero_matricula, {
      x: datosX,
      y: yMatricula - 9,
      size: 8.3,
      font: fontBold,
      color: azul,
    })

    const estadoTexto = (
      matriculado.estado || "vigente"
    ).toUpperCase()

    const estadoColor =
      estadoTexto === "VIGENTE"
        ? verde
        : estadoTexto === "SUSPENDIDA" ||
          estadoTexto === "SUSPENDIDO" ||
          estadoTexto === "VENCIDA" ||
          estadoTexto === "VENCIDO" ||
          estadoTexto === "BAJA" ||
          estadoTexto === "BAJA_DEFINITIVA"
        ? rojo
        : negro

    page.drawText("ESTADO", {
      x: datosX + 60,
      y: yMatricula,
      size: 4.8,
      font: fontBold,
      color: gris,
    })

    page.drawText(
      recortarTextoPorAncho(
        estadoTexto.replace(/_/g, " "),
        fontBold,
        6.8,
        47,
      ),
      {
        x: datosX + 60,
        y: yMatricula - 8.5,
        size: 6.8,
        font: fontBold,
        color: estadoColor,
      },
    )

    const especialidad =
      matriculado.especialidad || "No informada"

    page.drawText("ESPECIALIDAD", {
      x: datosX,
      y: 50,
      size: 4.8,
      font: fontBold,
      color: gris,
    })

    const especialidadLineas = envolverTextoPorAncho(
      especialidad,
      fontRegular,
      5.5,
      datosW,
      2,
    )

    let especialidadY = 42

    for (const linea of especialidadLineas) {
      page.drawText(linea, {
        x: datosX,
        y: especialidadY,
        size: 5.5,
        font: fontRegular,
        color: negro,
      })
      especialidadY -= 6.5
    }

    page.drawText("EMISIÓN", {
      x: datosX,
      y: 25,
      size: 4.8,
      font: fontBold,
      color: gris,
    })

    page.drawText(
      formatearFecha(fechaEmisionCredencial),
      {
        x: datosX,
        y: 16,
        size: 6.3,
        font: fontBold,
        color: negro,
      },
    )

    page.drawText("VENCE", {
      x: datosX + 60,
      y: 25,
      size: 4.8,
      font: fontBold,
      color: gris,
    })

    page.drawText(
      formatearFecha(matriculado.fecha_vencimiento),
      {
        x: datosX + 60,
        y: 16,
        size: 6.3,
        font: fontBold,
        color: negro,
      },
    )

    const qrImage = await pdf.embedPng(qrBuffer)

    page.drawRectangle({
      x: qrX - 2,
      y: qrY - 2,
      width: qrW + 4,
      height: qrH + 4,
      color: blanco,
      borderColor: rgb(0.78, 0.81, 0.86),
      borderWidth: 0.7,
    })

    page.drawImage(qrImage, {
      x: qrX,
      y: qrY,
      width: qrW,
      height: qrH,
    })

    page.drawText("VERIFICAR", {
      x: qrX + 10,
      y: qrY - 9,
      size: 5.2,
      font: fontBold,
      color: azul,
    })

    page.drawRectangle({
      x: 6,
      y: 4,
      width: anchoPagina - 12,
      height: 8,
      color: grisClaro,
    })

    page.drawText(
      `SELLO RENACLI · ${codigoDocumento}`,
      {
        x: 8,
        y: 6.3,
        size: 4.2,
        font: fontBold,
        color: azul,
      },
    )

    page.drawText(
      recortarTextoPorAncho(
        `Generado ${generadoEn}`,
        fontRegular,
        3.8,
        78,
      ),
      {
        x: anchoPagina - 84,
        y: 6.4,
        size: 3.8,
        font: fontRegular,
        color: gris,
      },
    )

    const pdfBytes = await pdf.save()

    /*
      Registramos cada PDF emitido antes de entregarlo.
      Si el registro falla, el documento no se descarga.
    */
    const {
      error: errorRegistroDocumento,
    } = await supabase.rpc(
      "registrar_nuevo_pdf_renacli",
      {
        p_matriculado_id: matriculado.id,
        p_codigo_documento: codigoDocumento,
        p_numero_matricula: matriculado.numero_matricula,
        p_apellido_nombre:
          matriculado.apellido_nombre || "Sin nombre",
        p_estado: matriculado.estado || "vigente",
        p_fecha_emision:
          fechaEmisionCredencial || null,
        p_fecha_vencimiento:
          matriculado.fecha_vencimiento || null,
        p_codigo_qr: codigo,
        p_firma_hmac: firmaCompleta,
        p_generado_en: generadoEnIso,
      },
    )

    if (errorRegistroDocumento) {
      console.error(
        "Error registrando PDF RENACLI:",
        errorRegistroDocumento,
      )

      return NextResponse.json(
        {
          error:
            "No se pudo registrar el documento PDF en RENACLI.",
        },
        { status: 500 },
      )
    }

    const nombreSeguro = matriculado.numero_matricula.replace(
      /[^A-Za-z0-9_-]/g,
      "_",
    )

    return new NextResponse(
      Buffer.from(pdfBytes),
      {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition":
            `attachment; filename="Credencial-RENACLI-${nombreSeguro}.pdf"`,
          "Cache-Control": "private, no-store, max-age=0",
          "X-RENACLI-Document-Code": codigoDocumento,
        },
      },
    )
  } catch (error) {
    console.error(
      "Error generando PDF RENACLI:",
      error,
    )

    return NextResponse.json(
      {
        error:
          "No se pudo generar el PDF de la credencial.",
      },
      { status: 500 },
    )
  }
}
