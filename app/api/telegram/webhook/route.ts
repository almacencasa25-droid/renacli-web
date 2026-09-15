import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import crypto from "crypto"

export const runtime = "nodejs"

type TelegramMessage = {
  message_id?: number
  text?: string
  chat?: {
    id?: number
  }
  reply_to_message?: {
    message_id?: number
  }
}

type TelegramUpdate = {
  update_id?: number
  message?: TelegramMessage
}

function obtenerSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secret = process.env.SUPABASE_SECRET_KEY

  if (!url || !secret) {
    throw new Error("Falta configurar Supabase para Telegram.")
  }

  return createClient(url, secret, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

function secretoValido(recibido: string | null) {
  const esperado =
    process.env.TELEGRAM_BOT_WEBHOOK_SECRET

  if (!recibido || !esperado) {
    return false
  }

  const a = Buffer.from(recibido)
  const b = Buffer.from(esperado)

  if (a.length !== b.length) {
    return false
  }

  return crypto.timingSafeEqual(a, b)
}

function respuestaOk(
  datos: Record<string, unknown> = {}
) {
  return NextResponse.json(
    {
      ok: true,
      ...datos,
    },
    {
      status: 200,
    }
  )
}

export async function POST(
  request: NextRequest
) {
  try {
    const secretoRecibido =
      request.headers.get(
        "x-telegram-bot-api-secret-token"
      )

    if (!secretoValido(secretoRecibido)) {
      return NextResponse.json(
        {
          ok: false,
          error: "No autorizado.",
        },
        {
          status: 401,
        }
      )
    }

    const update =
      (await request.json()) as TelegramUpdate

    const mensaje =
      update.message

    if (!mensaje) {
      return respuestaOk({
        ignorado: true,
        motivo: "Actualización sin mensaje.",
      })
    }

    const chatId =
      Number(mensaje.chat?.id)

    const telegramMessageId =
      Number(mensaje.message_id)

    const replyToMessageId =
      Number(
        mensaje.reply_to_message?.message_id
      )

    const texto =
      String(mensaje.text ?? "")
        .trim()
        .slice(0, 5000)

    /*
     * Solamente procesamos respuestas de texto
     * realizadas usando "Responder" sobre una
     * notificación RENACLI.
     */
    if (
      !Number.isSafeInteger(chatId) ||
      !Number.isSafeInteger(
        telegramMessageId
      ) ||
      !Number.isSafeInteger(
        replyToMessageId
      ) ||
      !texto
    ) {
      return respuestaOk({
        ignorado: true,
        motivo:
          "El mensaje no es una respuesta de texto válida.",
      })
    }

    const supabase =
      obtenerSupabaseAdmin()

    const {
      data,
      error,
    } = await supabase.rpc(
      "registrar_respuesta_telegram",
      {
        p_chat_id: chatId,
        p_telegram_message_id:
          telegramMessageId,
        p_reply_to_message_id:
          replyToMessageId,
        p_texto: texto,
      }
    )

    if (error) {
      const mensajeError =
        String(error.message ?? "")

      console.error(
        "[RENACLI] Error procesando respuesta de Telegram:",
        error
      )

      /*
       * Estos errores son definitivos.
       * Respondemos 200 para evitar que Telegram
       * reintente indefinidamente el mismo mensaje.
       */
      const erroresDefinitivos = [
        "TELEGRAM_DATOS_INCOMPLETOS",
        "TELEGRAM_MENSAJE_VACIO",
        "TELEGRAM_DESTINO_NO_AUTORIZADO",
        "TELEGRAM_RESPUESTA_SIN_REFERENCIA",
        "TELEGRAM_TRAMITE_NO_ENCONTRADO",
        "TELEGRAM_TRAMITE_CERRADO",
      ]

      if (
        erroresDefinitivos.some(codigo =>
          mensajeError.includes(codigo)
        )
      ) {
        return respuestaOk({
          procesado: false,
          motivo: mensajeError,
        })
      }

      return NextResponse.json(
        {
          ok: false,
          error:
            "No se pudo registrar la respuesta.",
        },
        {
          status: 500,
        }
      )
    }

    const resultado =
      Array.isArray(data)
        ? data[0] ?? null
        : data

    return respuestaOk({
      procesado: true,
      resultado,
    })
  } catch (error) {
    console.error(
      "[RENACLI] Error en webhook Telegram:",
      error
    )

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se pudo procesar el webhook.",
      },
      {
        status: 500,
      }
    )
  }
}
