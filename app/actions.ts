"use server"

import { consultaInicial, type EstadoConsulta } from "@/lib/consulta"
import { buscarMatriculados } from "@/lib/matriculados"

export async function verificarMatricula(
  _estadoPrevio: EstadoConsulta,
  formData: FormData,
): Promise<EstadoConsulta> {
  const tipo = formData.get("tipo") === "dni" ? "dni" : "matricula"
  const termino = String(formData.get("termino") ?? "").trim()

  if (!termino) {
    return {
      ...consultaInicial,
      tipo,
      error:
        tipo === "matricula"
          ? "Ingrese un número de matrícula para realizar la consulta."
          : "Ingrese un número de documento para realizar la consulta.",
    }
  }

  if (tipo === "dni" && termino.replace(/\D/g, "").length < 6) {
    return {
      ...consultaInicial,
      tipo,
      termino,
      error: "Ingrese un número de documento válido (al menos 6 dígitos).",
    }
  }

  try {
    const resultados = await buscarMatriculados(termino, tipo)
    return { termino, tipo, resultados, error: null, consultado: true }
  } catch (error) {
    return {
      ...consultaInicial,
      tipo,
      termino,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo consultar el registro en este momento. Intente nuevamente en unos minutos.",
    }
  }
}
