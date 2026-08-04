import type { Designacion, EvaluacionQMS, Existencia, Planta } from "@/lib/reglas-qms";

export type TipoResultado = "exacta" | "truncada" | "similar" | "no_encontrada";

export type Estrategia = "exacta" | "normalizacion" | "prefijo" | "trigramas" | "llm" | "ninguna";

/**
 * Una sugerencia no es solo un código: trae el contexto que hoy obliga al CSR a
 * investigar a mano. Eso es lo que convierte un buscador en un asesor.
 */
export interface Sugerencia {
  designacion: Designacion;
  puntaje: number;
  existencias: Existencia[];
  planta: Planta | null;
  evaluacion: EvaluacionQMS;
}

export interface ResultadoValidacion {
  consulta: string;
  tipo: TipoResultado;
  estrategia: Estrategia;
  /** Texto para el usuario. Distingue "parece incompleta" de "no existe". */
  mensaje: string;
  candidatos: Sugerencia[];
}
