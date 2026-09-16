import crypto from "crypto"
import type { CSSProperties } from "react"
import Link from "next/link"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@supabase/supabase-js"

import {
  actualizarConfiguracion,
  actualizarFrase,
  actualizarRespuesta,
  agregarFrase,
  crearConfiguracion,
  crearRespuesta,
  eliminarConfiguracion,
  eliminarFrase,
  eliminarRespuesta,
} from "./actions"

const COOKIE_NAME =
  "renacli_admin_session"

type Configuracion = {
  id: number
  clave: string
  nombre: string
  valor: string
  tipo:
    | "texto"
    | "numero"
    | "moneda"
    | "porcentaje"
    | "booleano"
  descripcion: string | null
  activo: boolean
  orden: number
}

type Respuesta = {
  id: number
  codigo: string
  titulo: string
  categoria: string
  respuesta_plantilla: string
  prioridad: number
  activo: boolean
  es_fallback: boolean
  requiere_intervencion: boolean
}

type Frase = {
  id: number
  respuesta_id: number
  frase: string
  tipo_coincidencia:
    | "exacta"
    | "contiene"
    | "todas_palabras"
  activo: boolean
}

type ResultadoPrueba = {
  respuesta_id: number
  codigo: string
  titulo: string
  categoria: string
  respuesta_renderizada: string
  frase_detectada: string | null
  tipo_coincidencia: string | null
  requiere_intervencion: boolean
  es_fallback: boolean
}

type Props = {
  searchParams?: Promise<{
    mensaje?: string
    error?: string
    prueba?: string
  }>
}

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
  const cookieStore =
    await cookies()

  const tokenGuardado =
    cookieStore.get(
      COOKIE_NAME,
    )?.value

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
      "Falta configurar Supabase para respuestas automáticas.",
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
    },
  )
}

function obtenerMensajeOk(
  codigo?: string,
) {
  const mensajes: Record<
    string,
    string
  > = {
    configuracion_creada:
      "Variable creada correctamente.",

    configuracion_guardada:
      "Configuración guardada correctamente.",

    configuracion_eliminada:
      "Variable eliminada correctamente.",

    respuesta_creada:
      "Respuesta automática creada correctamente.",

    respuesta_guardada:
      "Respuesta automática guardada correctamente.",

    respuesta_eliminada:
      "Respuesta automática eliminada correctamente.",

    frase_creada:
      "Frase de detección agregada correctamente.",

    frase_guardada:
      "Frase de detección actualizada correctamente.",

    frase_eliminada:
      "Frase de detección eliminada correctamente.",
  }

  if (!codigo) {
    return null
  }

  return mensajes[codigo] ?? null
}

function obtenerMensajeError(
  codigo?: string,
) {
  const mensajes: Record<
    string,
    string
  > = {
    configuracion:
      "No fue posible guardar la configuración.",

    variable_en_uso:
      "No podés eliminar esa variable porque está siendo utilizada dentro de una respuesta.",

    variable_protegida:
      "Esa configuración pertenece al funcionamiento interno de RENACLI y no puede eliminarse.",

    respuesta:
      "No fue posible guardar la respuesta automática.",

    fallback_no_eliminar:
      "La respuesta de respaldo no puede eliminarse. Podés editarla o desactivarla.",

    frase:
      "No fue posible guardar la frase de detección.",
  }

  if (!codigo) {
    return null
  }

  return mensajes[codigo] ?? null
}

function valorBooleano(
  valor: string | null | undefined,
) {
  return [
    "true",
    "1",
    "si",
    "sí",
    "on",
  ].includes(
    String(valor ?? "")
      .trim()
      .toLowerCase(),
  )
}

function etiquetaTipoCoincidencia(
  tipo: string,
) {
  if (tipo === "exacta") {
    return "Coincidencia exacta"
  }

  if (
    tipo === "todas_palabras"
  ) {
    return "Todas las palabras"
  }

  return "Contiene la frase"
}

export default async function RespuestasAutomaticasPage({
  searchParams,
}: Props) {
  if (
    !(await estaAutorizado())
  ) {
    redirect(
      "/administrador",
    )
  }

  const parametros =
    searchParams
      ? await searchParams
      : {}

  const supabase =
    obtenerSupabaseAdmin()

  const [
    resultadoConfiguraciones,
    resultadoRespuestas,
    resultadoFrases,
  ] = await Promise.all([
    supabase
      .from(
        "configuracion_respuestas_automaticas",
      )
      .select(
        `
          id,
          clave,
          nombre,
          valor,
          tipo,
          descripcion,
          activo,
          orden
        `,
      )
      .order(
        "orden",
        {
          ascending: true,
        },
      )
      .order(
        "id",
        {
          ascending: true,
        },
      ),

    supabase
      .from(
        "respuestas_automaticas",
      )
      .select(
        `
          id,
          codigo,
          titulo,
          categoria,
          respuesta_plantilla,
          prioridad,
          activo,
          es_fallback,
          requiere_intervencion
        `,
      )
      .order(
        "prioridad",
        {
          ascending: true,
        },
      )
      .order(
        "id",
        {
          ascending: true,
        },
      ),

    supabase
      .from(
        "frases_respuestas_automaticas",
      )
      .select(
        `
          id,
          respuesta_id,
          frase,
          tipo_coincidencia,
          activo
        `,
      )
      .order(
        "respuesta_id",
        {
          ascending: true,
        },
      )
      .order(
        "id",
        {
          ascending: true,
        },
      ),
  ])

  if (
    resultadoConfiguraciones.error
  ) {
    console.error(
      "[RENACLI] Error obteniendo configuración de respuestas automáticas:",
      resultadoConfiguraciones.error,
    )
  }

  if (
    resultadoRespuestas.error
  ) {
    console.error(
      "[RENACLI] Error obteniendo respuestas automáticas:",
      resultadoRespuestas.error,
    )
  }

  if (
    resultadoFrases.error
  ) {
    console.error(
      "[RENACLI] Error obteniendo frases de respuestas automáticas:",
      resultadoFrases.error,
    )
  }

  const configuraciones =
    (
      resultadoConfiguraciones.data ??
      []
    ) as Configuracion[]

  const respuestas =
    (
      resultadoRespuestas.data ??
      []
    ) as Respuesta[]

  const frases =
    (
      resultadoFrases.data ??
      []
    ) as Frase[]

  const frasesPorRespuesta =
    new Map<
      number,
      Frase[]
    >()

  for (
    const frase
    of frases
  ) {
    const actuales =
      frasesPorRespuesta.get(
        frase.respuesta_id,
      ) ?? []

    actuales.push(frase)

    frasesPorRespuesta.set(
      frase.respuesta_id,
      actuales,
    )
  }

  const prueba =
    String(
      parametros.prueba ?? "",
    )
      .trim()
      .slice(
        0,
        5000,
      )

  let resultadoPrueba:
    | ResultadoPrueba
    | null = null

  let errorPrueba:
    string | null = null

  if (prueba) {
    const {
      data,
      error,
    } = await supabase.rpc(
      "renacli_buscar_respuesta_automatica",
      {
        p_mensaje:
          prueba,

        p_ignorar_interruptor:
          true,
      },
    )

    if (error) {
      console.error(
        "[RENACLI] Error probando respuesta automática:",
        error,
      )

      errorPrueba =
        error.message
    } else {
      resultadoPrueba =
        (
          Array.isArray(data)
            ? data[0] ?? null
            : data
        ) as
          | ResultadoPrueba
          | null
    }
  }

  const mensajeOk =
    obtenerMensajeOk(
      parametros.mensaje,
    )

  const mensajeError =
    obtenerMensajeError(
      parametros.error,
    )

  const configuracionAutomatizacion =
    configuraciones.find(
      item =>
        item.clave ===
        "automatizacion_habilitada",
    )

  const configuracionFallback =
    configuraciones.find(
      item =>
        item.clave ===
        "fallback_habilitado",
    )

  const automatizacionActiva =
    valorBooleano(
      configuracionAutomatizacion?.valor,
    )

  const fallbackActivo =
    valorBooleano(
      configuracionFallback?.valor,
    )

  const cantidadRespuestasActivas =
    respuestas.filter(
      item =>
        item.activo,
    ).length

  const cantidadFrasesActivas =
    frases.filter(
      item =>
        item.activo,
    ).length

  return (
    <main style={pagina}>
      <header style={encabezado}>
        <div style={contenedor}>
          <p style={marca}>
            RENACLI
          </p>

          <p style={subtituloHeader}>
            Registro Nacional de
            Climatización y Refrigeración
          </p>
        </div>
      </header>

      <section style={contenido}>
        <Link
          href="/administrador"
          style={volver}
        >
          ← Volver al panel de
          administración
        </Link>

        <div style={filaTitulo}>
          <div>
            <p style={sobreTitulo}>
              ADMINISTRACIÓN
            </p>

            <h1 style={titulo}>
              Respuestas automáticas
            </h1>

            <p style={descripcion}>
              Administrá precios,
              variables, preguntas,
              respuestas y formas de
              detección sin modificar el
              código de RENACLI.
            </p>
          </div>

          <div
            style={
              automatizacionActiva
                ? estadoActivo
                : estadoApagado
            }
          >
            {automatizacionActiva
              ? "AUTOMATIZACIÓN ACTIVADA"
              : "AUTOMATIZACIÓN APAGADA"}
          </div>
        </div>

        <div style={avisoInformativo}>
          <strong>
            Importante:
          </strong>{" "}
          este módulo pertenece a
          RENACLI. Enfri puede recibir
          notificaciones y responder
          manualmente, pero no utilizará
          respuestas automáticas.
        </div>

        {mensajeOk && (
          <div style={avisoOk}>
            {mensajeOk}
          </div>
        )}

        {mensajeError && (
          <div style={avisoError}>
            {mensajeError}
          </div>
        )}

        <div style={resumenGrid}>
          <Resumen
            numero={
              configuraciones.length
            }
            texto="Variables"
          />

          <Resumen
            numero={
              cantidadRespuestasActivas
            }
            texto="Respuestas activas"
          />

          <Resumen
            numero={
              cantidadFrasesActivas
            }
            texto="Frases activas"
          />

          <Resumen
            numero={
              fallbackActivo
                ? 1
                : 0
            }
            texto="Respaldo activo"
          />
        </div>

        <section style={bloque}>
          <div style={cabeceraBloque}>
            <div>
              <h2 style={tituloSeccion}>
                Probar el motor
              </h2>

              <p style={textoAyuda}>
                Esta prueba no envía
                ningún mensaje a los
                usuarios. Solamente
                muestra qué respondería
                RENACLI.
              </p>
            </div>

            <span style={etiquetaPrueba}>
              MODO PRUEBA
            </span>
          </div>

          <form method="get">
            <textarea
              name="prueba"
              rows={4}
              maxLength={5000}
              defaultValue={prueba}
              placeholder="Ejemplo: Hola, ¿cuánto sale renovar mi matrícula?"
              style={textarea}
            />

            <button
              type="submit"
              style={botonPrincipal}
            >
              Probar respuesta
            </button>
          </form>

          {errorPrueba && (
            <div style={avisoError}>
              Error al probar el motor:
              {" "}
              {errorPrueba}
            </div>
          )}

          {prueba &&
            !errorPrueba &&
            resultadoPrueba && (
              <div style={resultadoPruebaCaja}>
                <div style={resultadoCabecera}>
                  <div>
                    <strong>
                      {
                        resultadoPrueba.titulo
                      }
                    </strong>

                    <p style={resultadoMeta}>
                      Código:{" "}
                      {
                        resultadoPrueba.codigo
                      }
                      {" · "}
                      Categoría:{" "}
                      {
                        resultadoPrueba.categoria
                      }
                    </p>
                  </div>

                  <span
                    style={
                      resultadoPrueba.es_fallback
                        ? pildoraAdvertencia
                        : pildoraOk
                    }
                  >
                    {resultadoPrueba.es_fallback
                      ? "RESPALDO"
                      : "COINCIDENCIA"}
                  </span>
                </div>

                <p style={resultadoMeta}>
                  Detectó:{" "}
                  <strong>
                    {resultadoPrueba.frase_detectada ??
                      "Ninguna frase específica"}
                  </strong>
                </p>

                {resultadoPrueba.tipo_coincidencia && (
                  <p style={resultadoMeta}>
                    Tipo:{" "}
                    {
                      etiquetaTipoCoincidencia(
                        resultadoPrueba.tipo_coincidencia,
                      )
                    }
                  </p>
                )}

                <div style={respuestaVista}>
                  {
                    resultadoPrueba.respuesta_renderizada
                  }
                </div>

                {resultadoPrueba.requiere_intervencion && (
                  <div style={revisionHumana}>
                    Esta respuesta está
                    marcada para revisión
                    posterior de un
                    administrador.
                  </div>
                )}
              </div>
            )}

          {prueba &&
            !errorPrueba &&
            !resultadoPrueba && (
              <div style={avisoError}>
                El motor no encontró una
                respuesta para esta
                consulta.
              </div>
            )}
        </section>

        <section style={bloque}>
          <div style={cabeceraBloque}>
            <div>
              <h2 style={tituloSeccion}>
                Valores y configuración
              </h2>

              <p style={textoAyuda}>
                Estos valores pueden
                utilizarse dentro de las
                respuestas mediante
                variables.
              </p>
            </div>
          </div>

          <div style={ejemploVariable}>
            Ejemplo:{" "}
            <code>
              {
                "{{precio_inscripcion}}"
              }
            </code>{" "}
            será reemplazado
            automáticamente por el
            precio actual configurado.
          </div>

          <div style={grillaVariables}>
            {configuraciones.map(
              item => {
                const protegida =
                  [
                    "automatizacion_habilitada",
                    "fallback_habilitado",
                    "notificar_telegram_respuesta_automatica",
                  ].includes(
                    item.clave,
                  )

                return (
                  <article
                    key={item.id}
                    style={tarjeta}
                  >
                    <form
                      action={
                        actualizarConfiguracion
                      }
                    >
                      <input
                        type="hidden"
                        name="id"
                        value={item.id}
                      />

                      <label style={label}>
                        Variable
                      </label>

                      <input
                        value={`{{${item.clave}}}`}
                        readOnly
                        style={
                          campoSoloLectura
                        }
                      />

                      <label style={label}>
                        Nombre
                      </label>

                      <input
                        name="nombre"
                        defaultValue={
                          item.nombre
                        }
                        maxLength={150}
                        required
                        style={campo}
                      />

                      <label style={label}>
                        Valor
                      </label>

                      {item.tipo ===
                      "booleano" ? (
                        <select
                          name="valor"
                          defaultValue={
                            item.valor
                          }
                          style={campo}
                        >
                          <option value="true">
                            Sí
                          </option>

                          <option value="false">
                            No
                          </option>
                        </select>
                      ) : (
                        <input
                          name="valor"
                          defaultValue={
                            item.valor
                          }
                          maxLength={500}
                          style={campo}
                        />
                      )}

                      <label style={label}>
                        Tipo
                      </label>

                      <select
                        name="tipo"
                        defaultValue={
                          item.tipo
                        }
                        style={campo}
                      >
                        <option value="texto">
                          Texto
                        </option>

                        <option value="numero">
                          Número
                        </option>

                        <option value="moneda">
                          Moneda
                        </option>

                        <option value="porcentaje">
                          Porcentaje
                        </option>

                        <option value="booleano">
                          Sí / No
                        </option>
                      </select>

                      <label style={label}>
                        Descripción
                      </label>

                      <textarea
                        name="descripcion"
                        rows={3}
                        maxLength={1000}
                        defaultValue={
                          item.descripcion ??
                          ""
                        }
                        style={textarea}
                      />

                      <label style={label}>
                        Orden
                      </label>

                      <input
                        name="orden"
                        type="number"
                        defaultValue={
                          item.orden
                        }
                        style={campo}
                      />

                      <label style={checkboxFila}>
                        <input
                          type="checkbox"
                          name="activo"
                          defaultChecked={
                            item.activo
                          }
                        />

                        Configuración activa
                      </label>

                      <button
                        type="submit"
                        style={botonPrincipal}
                      >
                        Guardar
                      </button>
                    </form>

                    {!protegida && (
                      <form
                        action={
                          eliminarConfiguracion
                        }
                        style={formEliminar}
                      >
                        <input
                          type="hidden"
                          name="id"
                          value={item.id}
                        />

                        <button
                          type="submit"
                          style={botonPeligro}
                        >
                          Eliminar variable
                        </button>
                      </form>
                    )}
                  </article>
                )
              },
            )}
          </div>

          <details style={detailsNuevo}>
            <summary style={summaryNuevo}>
              + Agregar nueva variable
            </summary>

            <form
              action={crearConfiguracion}
              style={formNuevo}
            >
              <label style={label}>
                Clave
              </label>

              <input
                name="clave"
                maxLength={80}
                placeholder="Ejemplo: precio_curso_inverter"
                required
                style={campo}
              />

              <label style={label}>
                Nombre visible
              </label>

              <input
                name="nombre"
                maxLength={150}
                placeholder="Ejemplo: Precio curso Inverter"
                required
                style={campo}
              />

              <label style={label}>
                Valor
              </label>

              <input
                name="valor"
                maxLength={500}
                placeholder="Valor"
                style={campo}
              />

              <label style={label}>
                Tipo
              </label>

              <select
                name="tipo"
                defaultValue="texto"
                style={campo}
              >
                <option value="texto">
                  Texto
                </option>

                <option value="numero">
                  Número
                </option>

                <option value="moneda">
                  Moneda
                </option>

                <option value="porcentaje">
                  Porcentaje
                </option>

                <option value="booleano">
                  Sí / No
                </option>
              </select>

              <label style={label}>
                Descripción
              </label>

              <textarea
                name="descripcion"
                rows={3}
                maxLength={1000}
                placeholder="Descripción opcional"
                style={textarea}
              />

              <label style={label}>
                Orden
              </label>

              <input
                name="orden"
                type="number"
                defaultValue={100}
                style={campo}
              />

              <button
                type="submit"
                style={botonPrincipal}
              >
                Crear variable
              </button>
            </form>
          </details>
        </section>

        <section style={bloque}>
          <div style={cabeceraBloque}>
            <div>
              <h2 style={tituloSeccion}>
                Preguntas y respuestas
              </h2>

              <p style={textoAyuda}>
                Cada respuesta puede
                tener muchas formas de
                preguntar. Podés
                editarlas, activarlas,
                desactivarlas o
                eliminarlas.
              </p>
            </div>

            <span style={contador}>
              {cantidadRespuestasActivas}
              {" "}
              activas
            </span>
          </div>

          {respuestas.length === 0 ? (
            <div style={vacio}>
              Todavía no hay respuestas
              automáticas configuradas.
            </div>
          ) : (
            respuestas.map(
              respuesta => {
                const frasesRespuesta =
                  frasesPorRespuesta.get(
                    respuesta.id,
                  ) ?? []

                return (
                  <details
                    key={respuesta.id}
                    style={respuestaCard}
                  >
                    <summary
                      style={
                        summaryRespuesta
                      }
                    >
                      <div>
                        <strong>
                          {
                            respuesta.titulo
                          }
                        </strong>

                        <div style={miniTexto}>
                          {
                            respuesta.categoria
                          }
                          {" · "}
                          prioridad{" "}
                          {
                            respuesta.prioridad
                          }
                        </div>
                      </div>

                      <div style={pildorasFila}>
                        {respuesta.es_fallback && (
                          <span
                            style={
                              pildoraAdvertencia
                            }
                          >
                            RESPALDO
                          </span>
                        )}

                        {respuesta.requiere_intervencion && (
                          <span
                            style={
                              pildoraRevision
                            }
                          >
                            REVISIÓN HUMANA
                          </span>
                        )}

                        <span
                          style={
                            respuesta.activo
                              ? pildoraOk
                              : pildoraInactiva
                          }
                        >
                          {respuesta.activo
                            ? "ACTIVA"
                            : "INACTIVA"}
                        </span>
                      </div>
                    </summary>

                    <div style={respuestaContenido}>
                      <form
                        action={
                          actualizarRespuesta
                        }
                      >
                        <input
                          type="hidden"
                          name="id"
                          value={respuesta.id}
                        />

                        <label style={label}>
                          Código interno
                        </label>

                        <input
                          value={
                            respuesta.codigo
                          }
                          readOnly
                          style={
                            campoSoloLectura
                          }
                        />

                        <label style={label}>
                          Título
                        </label>

                        <input
                          name="titulo"
                          defaultValue={
                            respuesta.titulo
                          }
                          maxLength={150}
                          required
                          style={campo}
                        />

                        <label style={label}>
                          Categoría
                        </label>

                        <input
                          name="categoria"
                          defaultValue={
                            respuesta.categoria
                          }
                          maxLength={80}
                          style={campo}
                        />

                        <label style={label}>
                          Respuesta
                        </label>

                        <textarea
                          name="respuesta_plantilla"
                          rows={6}
                          maxLength={5000}
                          defaultValue={
                            respuesta.respuesta_plantilla
                          }
                          required
                          style={textarea}
                        />

                        <label style={label}>
                          Prioridad
                        </label>

                        <input
                          name="prioridad"
                          type="number"
                          defaultValue={
                            respuesta.prioridad
                          }
                          style={campo}
                        />

                        <label style={checkboxFila}>
                          <input
                            type="checkbox"
                            name="activo"
                            defaultChecked={
                              respuesta.activo
                            }
                          />

                          Respuesta activa
                        </label>

                        <label style={checkboxFila}>
                          <input
                            type="checkbox"
                            name="requiere_intervencion"
                            defaultChecked={
                              respuesta.requiere_intervencion
                            }
                          />

                          Marcar para revisión
                          humana
                        </label>

                        <button
                          type="submit"
                          style={
                            botonPrincipal
                          }
                        >
                          Guardar respuesta
                        </button>
                      </form>

                      {!respuesta.es_fallback && (
                        <form
                          action={
                            eliminarRespuesta
                          }
                          style={
                            formEliminar
                          }
                        >
                          <input
                            type="hidden"
                            name="id"
                            value={
                              respuesta.id
                            }
                          />

                          <button
                            type="submit"
                            style={
                              botonPeligro
                            }
                          >
                            Eliminar respuesta
                          </button>
                        </form>
                      )}

                      {!respuesta.es_fallback && (
                        <div style={frasesBloque}>
                          <h3 style={subtituloSeccion}>
                            Formas de preguntar
                          </h3>

                          <p style={textoAyuda}>
                            Estas frases son
                            las que utiliza el
                            motor para reconocer
                            la consulta.
                          </p>

                          {frasesRespuesta.length ===
                          0 ? (
                            <div style={vacio}>
                              Esta respuesta no
                              tiene frases de
                              detección.
                            </div>
                          ) : (
                            frasesRespuesta.map(
                              frase => (
                                <div
                                  key={frase.id}
                                  style={
                                    fraseTarjeta
                                  }
                                >
                                  <form
                                    action={
                                      actualizarFrase
                                    }
                                    style={
                                      formFrase
                                    }
                                  >
                                    <input
                                      type="hidden"
                                      name="id"
                                      value={
                                        frase.id
                                      }
                                    />

                                    <div>
                                      <label style={label}>
                                        Frase
                                      </label>

                                      <input
                                        name="frase"
                                        defaultValue={
                                          frase.frase
                                        }
                                        maxLength={500}
                                        required
                                        style={campo}
                                      />
                                    </div>

                                    <div>
                                      <label style={label}>
                                        Coincidencia
                                      </label>

                                      <select
                                        name="tipo_coincidencia"
                                        defaultValue={
                                          frase.tipo_coincidencia
                                        }
                                        style={campo}
                                      >
                                        <option value="contiene">
                                          Contiene la frase
                                        </option>

                                        <option value="exacta">
                                          Exacta
                                        </option>

                                        <option value="todas_palabras">
                                          Todas las palabras
                                        </option>
                                      </select>
                                    </div>

                                    <label style={checkboxFila}>
                                      <input
                                        type="checkbox"
                                        name="activo"
                                        defaultChecked={
                                          frase.activo
                                        }
                                      />

                                      Activa
                                    </label>

                                    <button
                                      type="submit"
                                      style={
                                        botonSecundario
                                      }
                                    >
                                      Guardar frase
                                    </button>
                                  </form>

                                  <form
                                    action={
                                      eliminarFrase
                                    }
                                    style={
                                      formEliminarFrase
                                    }
                                  >
                                    <input
                                      type="hidden"
                                      name="id"
                                      value={
                                        frase.id
                                      }
                                    />

                                    <button
                                      type="submit"
                                      style={
                                        botonPeligro
                                      }
                                    >
                                      Eliminar
                                    </button>
                                  </form>
                                </div>
                              ),
                            )
                          )}

                          <form
                            action={
                              agregarFrase
                            }
                            style={
                              nuevaFrase
                            }
                          >
                            <input
                              type="hidden"
                              name="respuesta_id"
                              value={
                                respuesta.id
                              }
                            />

                            <div>
                              <label style={label}>
                                Nueva frase
                              </label>

                              <input
                                name="frase"
                                maxLength={500}
                                placeholder="Ejemplo: cuánto cuesta renovar"
                                required
                                style={campo}
                              />
                            </div>

                            <div>
                              <label style={label}>
                                Tipo
                              </label>

                              <select
                                name="tipo_coincidencia"
                                defaultValue="contiene"
                                style={campo}
                              >
                                <option value="contiene">
                                  Contiene la frase
                                </option>

                                <option value="exacta">
                                  Exacta
                                </option>

                                <option value="todas_palabras">
                                  Todas las palabras
                                </option>
                              </select>
                            </div>

                            <button
                              type="submit"
                              style={
                                botonSecundario
                              }
                            >
                              Agregar frase
                            </button>
                          </form>
                        </div>
                      )}
                    </div>
                  </details>
                )
              },
            )
          )}

          <details style={detailsNuevo}>
            <summary style={summaryNuevo}>
              + Crear nueva pregunta /
              respuesta
            </summary>

            <form
              action={crearRespuesta}
              style={formNuevo}
            >
              <label style={label}>
                Título
              </label>

              <input
                name="titulo"
                maxLength={150}
                placeholder="Ejemplo: Curso Inverter"
                required
                style={campo}
              />

              <label style={label}>
                Categoría
              </label>

              <input
                name="categoria"
                maxLength={80}
                defaultValue="general"
                style={campo}
              />

              <label style={label}>
                Respuesta
              </label>

              <textarea
                name="respuesta_plantilla"
                rows={6}
                maxLength={5000}
                placeholder="Escribí la respuesta que recibirá el solicitante."
                required
                style={textarea}
              />

              <label style={label}>
                Prioridad
              </label>

              <input
                name="prioridad"
                type="number"
                defaultValue={100}
                style={campo}
              />

              <label style={checkboxFila}>
                <input
                  type="checkbox"
                  name="requiere_intervencion"
                />

                Requiere revisión
                posterior de un
                administrador
              </label>

              <button
                type="submit"
                style={botonPrincipal}
              >
                Crear respuesta
              </button>
            </form>
          </details>
        </section>
      </section>
    </main>
  )
}

function Resumen({
  numero,
  texto,
}: {
  numero: number
  texto: string
}) {
  return (
    <div style={resumenCard}>
      <strong style={resumenNumero}>
        {numero}
      </strong>

      <span style={resumenTexto}>
        {texto}
      </span>
    </div>
  )
}


/* ============================================================
   ESTILOS
   ============================================================ */

const pagina: CSSProperties = {
  minHeight: "100vh",
  background: "#eef5fa",
  fontFamily: "Arial, sans-serif",
}

const encabezado: CSSProperties = {
  background: "#0d4f7c",
  color: "white",
  padding: "24px 30px",
  borderBottom:
    "4px solid #35c4cf",
}

const contenedor: CSSProperties = {
  maxWidth: "1180px",
  margin: "0 auto",
}

const contenido: CSSProperties = {
  maxWidth: "1180px",
  margin: "30px auto",
  padding: "0 18px 60px",
}

const marca: CSSProperties = {
  margin: 0,
  fontSize: "24px",
  fontWeight: 800,
  letterSpacing: "4px",
}

const subtituloHeader: CSSProperties = {
  margin: "6px 0 0",
  opacity: 0.92,
}

const volver: CSSProperties = {
  display: "inline-block",
  marginBottom: "22px",
  color: "#0d5689",
  fontWeight: 700,
  textDecoration: "none",
}

const filaTitulo: CSSProperties = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "flex-start",
  gap: "18px",
  flexWrap: "wrap",
}

const sobreTitulo: CSSProperties = {
  margin: "0 0 5px",
  color: "#64748b",
  fontSize: "12px",
  fontWeight: 700,
  letterSpacing: "1px",
}

const titulo: CSSProperties = {
  margin: 0,
  color: "#172033",
  fontSize: "32px",
}

const descripcion: CSSProperties = {
  maxWidth: "750px",
  margin: "8px 0 0",
  color: "#64748b",
  lineHeight: 1.6,
}

const estadoActivo: CSSProperties = {
  padding: "9px 13px",
  borderRadius: "999px",
  background: "#dcfce7",
  color: "#166534",
  fontSize: "12px",
  fontWeight: 800,
}

const estadoApagado: CSSProperties = {
  padding: "9px 13px",
  borderRadius: "999px",
  background: "#fee2e2",
  color: "#991b1b",
  fontSize: "12px",
  fontWeight: 800,
}

const avisoInformativo: CSSProperties = {
  marginTop: "20px",
  padding: "13px 15px",
  background: "#f0f9ff",
  border: "1px solid #bae6fd",
  borderRadius: "10px",
  color: "#075985",
  lineHeight: 1.5,
}

const avisoOk: CSSProperties = {
  marginTop: "14px",
  padding: "12px 14px",
  borderRadius: "9px",
  background: "#dcfce7",
  color: "#166534",
}

const avisoError: CSSProperties = {
  marginTop: "14px",
  padding: "12px 14px",
  borderRadius: "9px",
  background: "#fee2e2",
  color: "#991b1b",
}

const resumenGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "12px",
  marginTop: "20px",
}

const resumenCard: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "5px",
  padding: "16px",
  background: "white",
  border: "1px solid #dbe5ee",
  borderRadius: "12px",
}

const resumenNumero: CSSProperties = {
  color: "#0d5689",
  fontSize: "25px",
}

const resumenTexto: CSSProperties = {
  color: "#64748b",
  fontSize: "13px",
}

const bloque: CSSProperties = {
  marginTop: "22px",
  padding: "20px",
  background: "white",
  border: "1px solid #dbe5ee",
  borderRadius: "14px",
  boxShadow:
    "0 4px 15px rgba(15, 23, 42, 0.05)",
}

const cabeceraBloque: CSSProperties = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "flex-start",
  gap: "15px",
  flexWrap: "wrap",
}

const tituloSeccion: CSSProperties = {
  margin: "0 0 6px",
  color: "#172033",
}

const subtituloSeccion: CSSProperties = {
  margin: "0 0 6px",
  color: "#172033",
  fontSize: "17px",
}

const textoAyuda: CSSProperties = {
  margin: "5px 0",
  color: "#64748b",
  lineHeight: 1.5,
}

const etiquetaPrueba: CSSProperties = {
  padding: "6px 10px",
  borderRadius: "999px",
  background: "#e0f2fe",
  color: "#0369a1",
  fontSize: "11px",
  fontWeight: 800,
}

const label: CSSProperties = {
  display: "block",
  margin: "11px 0 5px",
  color: "#334155",
  fontSize: "12px",
  fontWeight: 700,
}

const campo: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 11px",
  border: "1px solid #cbd5e1",
  borderRadius: "8px",
  background: "white",
  color: "#172033",
}

const campoSoloLectura: CSSProperties = {
  ...campo,
  background: "#f1f5f9",
  color: "#475569",
}

const textarea: CSSProperties = {
  ...campo,
  resize: "vertical",
  lineHeight: 1.5,
}

const checkboxFila: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "7px",
  margin: "12px 0",
  color: "#334155",
  fontSize: "13px",
}

const botonPrincipal: CSSProperties = {
  border: 0,
  borderRadius: "8px",
  background: "#0d5689",
  color: "white",
  padding: "10px 15px",
  cursor: "pointer",
  fontWeight: 700,
}

const botonSecundario: CSSProperties = {
  ...botonPrincipal,
  background: "#475569",
}

const botonPeligro: CSSProperties = {
  border: "1px solid #fecaca",
  borderRadius: "8px",
  background: "#fff1f2",
  color: "#b91c1c",
  padding: "8px 12px",
  cursor: "pointer",
  fontWeight: 700,
}

const resultadoPruebaCaja: CSSProperties = {
  marginTop: "16px",
  padding: "16px",
  border: "1px solid #86efac",
  borderRadius: "11px",
  background: "#f0fdf4",
}

const resultadoCabecera: CSSProperties = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "flex-start",
  gap: "10px",
  flexWrap: "wrap",
}

const resultadoMeta: CSSProperties = {
  margin: "5px 0",
  color: "#475569",
  fontSize: "13px",
}

const respuestaVista: CSSProperties = {
  marginTop: "12px",
  padding: "13px",
  border: "1px solid #dcfce7",
  borderRadius: "9px",
  background: "white",
  color: "#172033",
  lineHeight: 1.6,
  whiteSpace: "pre-wrap",
}

const revisionHumana: CSSProperties = {
  marginTop: "12px",
  padding: "9px 11px",
  borderRadius: "8px",
  background: "#fef3c7",
  color: "#92400e",
  fontSize: "13px",
  fontWeight: 700,
}

const ejemploVariable: CSSProperties = {
  marginTop: "12px",
  padding: "10px 12px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  color: "#475569",
  fontSize: "13px",
}

const grillaVariables: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "14px",
  marginTop: "15px",
}

const tarjeta: CSSProperties = {
  padding: "15px",
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  background: "#f8fafc",
}

const formEliminar: CSSProperties = {
  marginTop: "8px",
}

const detailsNuevo: CSSProperties = {
  marginTop: "18px",
  padding: "0 15px 15px",
  border: "1px dashed #94a3b8",
  borderRadius: "10px",
  background: "#f8fafc",
}

const summaryNuevo: CSSProperties = {
  padding: "15px 0",
  cursor: "pointer",
  color: "#0d5689",
  fontWeight: 700,
}

const formNuevo: CSSProperties = {
  display: "grid",
  gap: "2px",
}

const contador: CSSProperties = {
  padding: "6px 10px",
  borderRadius: "999px",
  background: "#dbeafe",
  color: "#1e40af",
  fontSize: "12px",
  fontWeight: 800,
}

const vacio: CSSProperties = {
  marginTop: "12px",
  padding: "14px",
  borderRadius: "9px",
  background: "#f8fafc",
  color: "#64748b",
}

const respuestaCard: CSSProperties = {
  marginTop: "12px",
  border: "1px solid #dbe5ee",
  borderRadius: "12px",
  background: "#f8fafc",
  overflow: "hidden",
}

const summaryRespuesta: CSSProperties = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: "15px",
  padding: "16px 18px",
  cursor: "pointer",
  background: "white",
  color: "#172033",
}

const miniTexto: CSSProperties = {
  marginTop: "4px",
  color: "#64748b",
  fontSize: "12px",
  fontWeight: 400,
}

const pildorasFila: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: "6px",
  flexWrap: "wrap",
}

const pildoraOk: CSSProperties = {
  padding: "5px 8px",
  borderRadius: "999px",
  background: "#dcfce7",
  color: "#166534",
  fontSize: "10px",
  fontWeight: 800,
}

const pildoraAdvertencia: CSSProperties = {
  padding: "5px 8px",
  borderRadius: "999px",
  background: "#fef3c7",
  color: "#92400e",
  fontSize: "10px",
  fontWeight: 800,
}

const pildoraRevision: CSSProperties = {
  padding: "5px 8px",
  borderRadius: "999px",
  background: "#ffedd5",
  color: "#9a3412",
  fontSize: "10px",
  fontWeight: 800,
}

const pildoraInactiva: CSSProperties = {
  padding: "5px 8px",
  borderRadius: "999px",
  background: "#e2e8f0",
  color: "#475569",
  fontSize: "10px",
  fontWeight: 800,
}

const respuestaContenido: CSSProperties = {
  padding: "18px",
}

const frasesBloque: CSSProperties = {
  marginTop: "25px",
  paddingTop: "18px",
  borderTop: "1px solid #cbd5e1",
}

const fraseTarjeta: CSSProperties = {
  marginTop: "10px",
  padding: "12px",
  border: "1px solid #e2e8f0",
  borderRadius: "9px",
  background: "white",
}

const formFrase: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "minmax(220px, 2fr) minmax(180px, 1fr)",
  gap: "8px 12px",
  alignItems: "end",
}

const formEliminarFrase: CSSProperties = {
  marginTop: "8px",
}

const nuevaFrase: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "minmax(220px, 2fr) minmax(180px, 1fr) auto",
  gap: "10px",
  alignItems: "end",
  marginTop: "16px",
  paddingTop: "14px",
  borderTop: "1px dashed #cbd5e1",
}
