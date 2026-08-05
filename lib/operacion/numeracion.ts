/**
 * Numeración de las solicitudes del demo.
 *
 * Las solicitudes usan `AAAAS#####` y las cotizaciones del histórico
 * `AAAAQ#####`. La distinción no es cosmética: son dos tablas distintas
 * (`solicitudes` nace en la sesión, `cotizaciones` es el histórico inmutable) y
 * mientras compartieron el prefijo `Q` un número de solicitud podía coincidir
 * por azar con el de una cotización sembrada. El chat habría respondido
 * entonces con los datos de otro cliente y otra designación, con total
 * confianza y sin forma de notarlo.
 *
 * Módulo puro y sin `server-only`: lo importan la acción del portal, la ruta
 * mock de SPQ+ y las herramientas del chat.
 */

const FORMATO_SOLICITUD = /^\d{4}S\d{5}$/;
const FORMATO_COTIZACION = /^\d{4}Q\d{5}$/;

/**
 * Número nuevo de solicitud. La fecha y el sorteo se inyectan para que el test
 * no dependa del reloj ni de `Math.random`.
 */
export function numeroDeSolicitud(fecha: Date = new Date(), aleatorio = Math.random): string {
  const secuencia = String(Math.floor(aleatorio() * 100_000)).padStart(5, "0");
  return `${fecha.getFullYear()}S${secuencia}`;
}

/** Normaliza lo que escribe un usuario: ` 2026s56310 ` es un número válido. */
export function normalizarNumero(numero: string): string {
  return numero.trim().toUpperCase();
}

export function esNumeroDeSolicitud(numero: string): boolean {
  return FORMATO_SOLICITUD.test(normalizarNumero(numero));
}

export function esNumeroDeCotizacion(numero: string): boolean {
  return FORMATO_COTIZACION.test(normalizarNumero(numero));
}
