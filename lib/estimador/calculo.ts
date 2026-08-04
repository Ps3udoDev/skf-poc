export type BaseEstimacion = "designacion" | "familia" | "global";
export type Confianza = "alta" | "media" | "baja";

export interface Estimacion {
  semanasMin: number;
  mediana: number;
  semanasMax: number;
  casos: number;
  base: BaseEstimacion;
  confianza: Confianza;
}

/** Casos mínimos para poder afirmar algo con confianza alta. */
export const CASOS_CONFIANZA_ALTA = 30;
export const CASOS_CONFIANZA_MEDIA = 8;

/** Percentil por interpolación lineal. La lista no necesita venir ordenada. */
export function percentil(valores: readonly number[], p: number): number {
  if (valores.length === 0) return Number.NaN;
  const ordenados = [...valores].sort((a, b) => a - b);
  if (ordenados.length === 1) return ordenados[0];
  const posicion = p * (ordenados.length - 1);
  const inferior = Math.floor(posicion);
  const superior = Math.ceil(posicion);
  if (inferior === superior) return ordenados[inferior];
  return ordenados[inferior] + (ordenados[superior] - ordenados[inferior]) * (posicion - inferior);
}

/** Media semana. Un TE de "5.37 semanas" es precisión que el dato no sostiene. */
function aMediaSemana(valor: number): number {
  return Math.round(valor * 2) / 2;
}

function nivelDeConfianza(casos: number, base: BaseEstimacion): Confianza {
  // Inferir de la familia o del catálogo entero nunca da confianza alta, por
  // muchos casos que haya: la incertidumbre no está en el tamaño de la muestra
  // sino en que la muestra no es de este producto.
  if (base !== "designacion") return base === "familia" ? "media" : "baja";
  if (casos >= CASOS_CONFIANZA_ALTA) return "alta";
  if (casos >= CASOS_CONFIANZA_MEDIA) return "media";
  return "baja";
}

/**
 * Estimación a partir del histórico.
 *
 * Mediana en vez de promedio: es robusta ante los casos extremos que el Plan 2
 * sembró deliberadamente en la cola del SLA. Rango por percentiles 25 y 75:
 * expresa la incertidumbre en vez de esconderla.
 *
 * Devuelve `null` sin casos. Inventar un rango sin base es exactamente lo que
 * las reglas de honestidad del demo prohíben.
 */
export function estimarDesdeCasos(
  casos: readonly number[],
  base: BaseEstimacion,
): Estimacion | null {
  if (casos.length === 0) return null;
  return {
    semanasMin: aMediaSemana(percentil(casos, 0.25)),
    mediana: aMediaSemana(percentil(casos, 0.5)),
    semanasMax: aMediaSemana(percentil(casos, 0.75)),
    casos: casos.length,
    base,
    confianza: nivelDeConfianza(casos.length, base),
  };
}

/**
 * Ajustes del procedimiento sobre la estimación base.
 *
 * `desempenoTe` es el multiplicador histórico de la planta; `semanasExtra` son
 * las 4 semanas del punto 4.9 por designación de nueva creación. El extra se
 * suma DESPUÉS del multiplicador: son semanas de trámite administrativo
 * (creación del material, extensión en MDG-SAP, precio en SAP, seteo en WCL),
 * no de fabricación, así que el desempeño de la planta no las afecta.
 */
export function ajustarPorProcedimiento(
  estimacion: Estimacion,
  ajustes: { desempenoTe: number; semanasExtra: number },
): Estimacion {
  const aplicar = (valor: number) =>
    aMediaSemana(valor * ajustes.desempenoTe + ajustes.semanasExtra);
  return {
    ...estimacion,
    semanasMin: aplicar(estimacion.semanasMin),
    mediana: aplicar(estimacion.mediana),
    semanasMax: aplicar(estimacion.semanasMax),
  };
}
