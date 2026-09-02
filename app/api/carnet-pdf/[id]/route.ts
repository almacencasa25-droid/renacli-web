import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@supabase/supabase-js"
import {
  PDFDocument,
  StandardFonts,
  rgb,
} from "pdf-lib"
import QRCode from "qrcode"
import {
  createHash,
  createHmac,
  timingSafeEqual,
} from "crypto"

const COOKIE_ADMIN = "renacli_admin_session"

type RouteProps = {
  params: Promise<{ id: string }>
}

function obtenerSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secretKey = process.env.SUPABASE_SECRET_KEY

  if (!url || !secretKey) {
    throw new Error("Faltan las variables de entorno de Supabase.")
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

function partirTexto(
  texto: string,
  maximo: number,
) {
  if (texto.length <= maximo) {
    return [texto]
  }

  const palabras = texto.split(" ")
  const lineas: string[] = []
  let actual = ""

  for (const palabra of palabras) {
    const tentativa =
      actual.length === 0
        ? palabra
        : `${actual} ${palabra}`

    if (tentativa.length <= maximo) {
      actual = tentativa
    } else {
      if (actual) lineas.push(actual)
      actual = palabra
    }
  }

  if (actual) lineas.push(actual)

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

    if (
      !Number.isInteger(matriculadoId) ||
      matriculadoId <= 0
    ) {
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
        "id, numero_matricula, apellido_nombre, localidad, provincia, especialidad, telefono, foto_url, fecha_emision, fecha_vencimiento, estado",
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

    const codigo =
      codigoData[0].codigo_verificacion as string

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://renacli-web.vercel.app"

    const urlVerificacion =
      `${baseUrl}/verificar/${codigo}`

    const generadoEn = fechaHoraArgentina()

    const payloadFirma = [
      `id=${matriculado.id}`,
      `matricula=${matriculado.numero_matricula}`,
      `nombre=${matriculado.apellido_nombre}`,
      `estado=${matriculado.estado || "vigente"}`,
      `emision=${matriculado.fecha_emision || ""}`,
      `vencimiento=${matriculado.fecha_vencimiento || ""}`,
      `codigo_qr=${codigo}`,
      `generado=${generadoEn}`,
    ].join("|")

    const firmaCompleta = crearSello(payloadFirma)
    const codigoDocumento =
      `RPDF-${firmaCompleta.slice(0, 16)}`

    const qrBuffer = await QRCode.toBuffer(
      urlVerificacion,
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

    const page = pdf.addPage([842, 595])

    const fontRegular = await pdf.embedFont(
      StandardFonts.Helvetica,
    )
    const fontBold = await pdf.embedFont(
      StandardFonts.HelveticaBold,
    )

    const azul = rgb(0.07, 0.12, 0.31)
    const gris = rgb(0.35, 0.39, 0.45)
    const grisClaro = rgb(0.94, 0.95, 0.97)
    const blanco = rgb(1, 1, 1)

    page.drawRectangle({
      x: 0,
      y: 0,
      width: 842,
      height: 595,
      color: grisClaro,
    })

    page.drawRectangle({
      x: 40,
      y: 40,
      width: 762,
      height: 515,
      color: blanco,
      borderColor: rgb(0.82, 0.84, 0.88),
      borderWidth: 1,
    })

    page.drawRectangle({
      x: 40,
      y: 470,
      width: 762,
      height: 85,
      color: azul,
    })

    page.drawText("RENACLI", {
      x: 70,
      y: 515,
      size: 28,
      font: fontBold,
      color: blanco,
    })

    page.drawText(
      "Registro Nacional de Climatización y Refrigeración",
      {
        x: 70,
        y: 491,
        size: 11,
        font: fontRegular,
        color: blanco,
      },
    )

    page.drawText(
      "CREDENCIAL DE TÉCNICO MATRICULADO",
      {
        x: 70,
        y: 440,
        size: 10,
        font: fontBold,
        color: azul,
      },
    )

    page.drawText(
      matriculado.apellido_nombre || "Sin nombre",
      {
        x: 70,
        y: 405,
        size: 22,
        font: fontBold,
        color: rgb(0.05, 0.07, 0.1),
      },
    )

    const datos = [
      [
        "Matrícula",
        matriculado.numero_matricula,
      ],
      [
        "Estado",
        (matriculado.estado || "vigente").toUpperCase(),
      ],
      [
        "Especialidad",
        matriculado.especialidad || "No informada",
      ],
      [
        "Localidad / Provincia",
        [matriculado.localidad, matriculado.provincia]
          .filter(Boolean)
          .join(", ") || "No informado",
      ],
      [
        "Emisión",
        formatearFecha(matriculado.fecha_emision),
      ],
      [
        "Vencimiento",
        formatearFecha(matriculado.fecha_vencimiento),
      ],
    ]

    let y = 365

    for (const [titulo, valor] of datos) {
      page.drawText(titulo.toUpperCase(), {
        x: 70,
        y,
        size: 8,
        font: fontBold,
        color: gris,
      })

      const lineas = partirTexto(valor, 43)

      page.drawText(lineas[0], {
        x: 70,
        y: y - 18,
        size: 12,
        font: fontBold,
        color: rgb(0.07, 0.09, 0.13),
      })

      if (lineas[1]) {
        page.drawText(lineas[1], {
          x: 70,
          y: y - 33,
          size: 11,
          font: fontRegular,
          color: rgb(0.07, 0.09, 0.13),
        })
        y -= 63
      } else {
        y -= 48
      }
    }

    const qrImage = await pdf.embedPng(qrBuffer)

    page.drawRectangle({
      x: 570,
      y: 245,
      width: 185,
      height: 185,
      color: blanco,
      borderColor: rgb(0.82, 0.84, 0.88),
      borderWidth: 1,
    })

    page.drawImage(qrImage, {
      x: 580,
      y: 255,
      width: 165,
      height: 165,
    })

    page.drawText(
      "Escanee para verificar la matrícula",
      {
        x: 572,
        y: 226,
        size: 9,
        font: fontBold,
        color: gris,
      },
    )

    if (matriculado.foto_url) {
      try {
        const respuestaFoto = await fetch(
          matriculado.foto_url,
          { cache: "no-store" },
        )

        if (respuestaFoto.ok) {
          const bytes =
            new Uint8Array(
              await respuestaFoto.arrayBuffer(),
            )

          const tipo =
            respuestaFoto.headers.get(
              "content-type",
            ) || ""

          const imagen =
            tipo.includes("png")
              ? await pdf.embedPng(bytes)
              : await pdf.embedJpg(bytes)

          const dims = imagen.scaleToFit(130, 165)

          page.drawImage(imagen, {
            x: 470 + (130 - dims.width) / 2,
            y: 260 + (165 - dims.height) / 2,
            width: dims.width,
            height: dims.height,
          })
        }
      } catch {
        // Si la foto falla, el PDF igualmente se genera.
      }
    }

    page.drawRectangle({
      x: 70,
      y: 80,
      width: 685,
      height: 78,
      color: rgb(0.97, 0.98, 0.99),
      borderColor: rgb(0.82, 0.84, 0.88),
      borderWidth: 1,
    })

    page.drawText(
      "SELLO DE INTEGRIDAD RENACLI",
      {
        x: 88,
        y: 136,
        size: 9,
        font: fontBold,
        color: azul,
      },
    )

    page.drawText(
      `Código del documento: ${codigoDocumento}`,
      {
        x: 88,
        y: 117,
        size: 9,
        font: fontBold,
        color: rgb(0.08, 0.1, 0.14),
      },
    )

    page.drawText(
      `Generado: ${generadoEn}`,
      {
        x: 88,
        y: 101,
        size: 8,
        font: fontRegular,
        color: gris,
      },
    )

    page.drawText(
      "Documento protegido con sello criptográfico RENACLI. La autenticidad de la matrícula se verifica mediante el QR.",
      {
        x: 88,
        y: 86,
        size: 7.5,
        font: fontRegular,
        color: gris,
      },
    )

    const pdfBytes = await pdf.save()

    const nombreSeguro =
      matriculado.numero_matricula
        .replace(/[^A-Za-z0-9_-]/g, "_")

    return new NextResponse(
      Buffer.from(pdfBytes),
      {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition":
            `attachment; filename="Credencial-RENACLI-${nombreSeguro}.pdf"`,
          "Cache-Control":
            "private, no-store, max-age=0",
          "X-RENACLI-Document-Code":
            codigoDocumento,
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
