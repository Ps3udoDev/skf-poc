import { construirContexto, historicoDe, historicoDeFamilia, plantaCompleta } from "@/lib/fuentes";
import { evaluarSolicitud } from "@/lib/reglas-qms";
import {
  ajustarPorProcedimiento,
  CASOS_CONFIANZA_MEDIA,
  type Estimacion,
  estimarDesdeCasos,
} from "./calculo";

/**
 * Estimación de tiempo de entrega de una designación.
 *
 * Escala hacia atrás: histórico de la designación; si no alcanza, histórico de
 * su familia. Nunca inventa un rango: si no hay casos de ninguna de las dos,
 * devuelve null y la pantalla debe decir que no hay base histórica suficiente.
 */
export async function estimarTE(codigo: string, cantidad: number): Promise<Estimacion | null> {
  const contexto = await construirContexto(codigo, cantidad);
  if (!contexto.designacion) return null;

  const propios = await historicoDe(codigo);
  let base = estimarDesdeCasos(propios, "designacion");

  if (!base || propios.length < CASOS_CONFIANZA_MEDIA) {
    const familiares = await historicoDeFamilia(contexto.designacion.familia);
    const porFamilia = estimarDesdeCasos(familiares, "familia");
    // Se prefiere la familia solo si aporta más casos que el propio histórico.
    if (porFamilia && (!base || familiares.length > propios.length)) base = porFamilia;
  }

  if (!base) return null;

  const planta = await plantaCompleta(contexto.designacion.pdiv);
  const evaluacion = evaluarSolicitud(contexto);

  return ajustarPorProcedimiento(base, {
    desempenoTe: planta?.desempenoTe ?? 1,
    semanasExtra: evaluacion.semanasExtraTE,
  });
}
