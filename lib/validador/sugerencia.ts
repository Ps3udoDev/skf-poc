import { construirContexto } from "@/lib/fuentes";
import { evaluarSolicitud } from "@/lib/reglas-qms";
import type { Sugerencia } from "./tipos";

/**
 * Enriquece un código con todo su contexto QMS.
 *
 * La evaluación se hace aquí, en el validador, y no en la pantalla: así el
 * aviso de MOQ, el redondeo a pack quantity y la advertencia de nueva creación
 * llegan al cliente ANTES de enviar la solicitud, que es lo que evita el
 * declinado del punto 4.4 en la bandeja del operador.
 */
export async function construirSugerencia(
  codigo: string,
  cantidad: number,
  puntaje: number,
): Promise<Sugerencia | null> {
  const contexto = await construirContexto(codigo, cantidad);
  if (!contexto.designacion) return null;
  return {
    designacion: contexto.designacion,
    puntaje,
    existencias: contexto.existencias,
    planta: contexto.planta,
    evaluacion: evaluarSolicitud(contexto),
  };
}

export async function construirVarias(
  codigos: readonly { codigo: string; puntaje: number }[],
  cantidad: number,
): Promise<Sugerencia[]> {
  const resueltas = await Promise.all(
    codigos.map((c) => construirSugerencia(c.codigo, cantidad, c.puntaje)),
  );
  return resueltas.filter((s): s is Sugerencia => s !== null);
}
