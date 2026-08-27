import type { MatriculadoPublico, TipoBusqueda } from "@/lib/matriculados"

export type EstadoConsulta = {
  termino: string
  tipo: TipoBusqueda
  resultados: MatriculadoPublico[]
  error: string | null
  consultado: boolean
}

export const consultaInicial: EstadoConsulta = {
  termino: "",
  tipo: "matricula",
  resultados: [],
  error: null,
  consultado: false,
}
