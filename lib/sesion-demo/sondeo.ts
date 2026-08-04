import type { EstadoCanal } from "./tipos";

/**
 * Margen que se le da al canal para confirmar antes de encender el sondeo.
 *
 * El Plan 1 midió una primera suscripción que no propagó en 15 s tras
 * inactividad, y reintentos que propagaron en ~500 ms. Cuatro segundos son
 * suficientes para un canal sano y lo bastante cortos para que el presentador
 * no llegue al interruptor con la pantalla muerta.
 */
export const MS_ESPERA_CANAL = 4_000;

/** Cada cuánto se relee `sesion_demo` cuando el canal no es de fiar. */
export const MS_INTERVALO_SONDEO = 2_000;

/**
 * Es un POC: quedarse congelado en vivo cuesta mucho más que una consulta de
 * más cada dos segundos.
 */
export function debeSondear(estado: EstadoCanal, msDesdeApertura: number): boolean {
  if (estado === "suscrito") return false;
  if (estado === "error" || estado === "cerrado") return true;
  return msDesdeApertura > MS_ESPERA_CANAL;
}
