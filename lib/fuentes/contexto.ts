import type { ContextoSolicitud } from "@/lib/reglas-qms";
import { obtenerDesignacion } from "./designaciones";
import { existenciasDe } from "./inventario";
import { obtenerPlanta } from "./plantas";

/**
 * Construye el contexto que consume `evaluarSolicitud`.
 *
 * INVARIANTE: si la designación tiene `reemplazadoPor`, este es el único lugar
 * que carga esa designación en `reemplazo`. Pasar `null` teniendo
 * `reemplazadoPor` hace que el motor decline por el punto 4.7 un caso que el
 * procedimiento manda cotizar por el 4.6 — y tumba la escena 3 del guion.
 */
export async function construirContexto(
  codigo: string,
  cantidad: number,
): Promise<ContextoSolicitud> {
  const designacion = await obtenerDesignacion(codigo);
  if (!designacion) {
    return { designacion: null, cantidad, existencias: [], planta: null, reemplazo: null };
  }

  const [existencias, planta, reemplazo] = await Promise.all([
    existenciasDe(designacion.designacion),
    obtenerPlanta(designacion.pdiv),
    designacion.reemplazadoPor ? obtenerDesignacion(designacion.reemplazadoPor) : null,
  ]);

  return { designacion, cantidad, existencias, planta, reemplazo };
}
