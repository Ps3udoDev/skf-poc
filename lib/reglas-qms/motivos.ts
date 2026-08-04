import type { Database } from "@/lib/supabase/tipos";
import type { RutaQMS } from "./tipos";

/**
 * Puente entre el dominio (`RutaQMS`) y la persistencia (el enum SQL
 * `motivo_declinado` de `cotizaciones` y `solicitudes`).
 *
 * Existe para que el mapeo viva en un solo sitio: en el Plan 3 lo van a
 * necesitar tres consumidores distintos —el validador, la bandeja del operador
 * y el chatbot— al guardar el resultado de `evaluarSolicitud()`.
 *
 * El tipo se toma del esquema generado, no se redeclara: si alguien altera el
 * enum en la base y regenera `lib/supabase/tipos.ts`, el compilador señala la
 * deriva aquí. Es un import de solo tipos; el motor de reglas sigue sin
 * conocer nombres de columna ni tocar la base.
 */
export type MotivoDeclinado = Database["public"]["Enums"]["motivo_declinado"];

/** Las rutas del árbol que terminan en declinación. */
export type RutaDeclinante = Extract<RutaQMS, `declinar_${string}`>;

/**
 * Correspondencia 1:1. La anotación `satisfies` obliga a que estén TODAS las
 * rutas `declinar_*` y solo ellas, y a que cada valor exista en el enum SQL.
 * `as const` conserva los literales para que el test pueda comprobar también
 * el sentido inverso: que ningún valor del enum se quede sin ruta.
 */
export const MOTIVO_POR_RUTA = {
  declinar_designacion_invalida: "designacion_invalida", // 4.8
  declinar_planta_sin_ruta: "planta_sin_ruta", // 4.5b
  declinar_obsoleto_sin_reemplazo: "obsoleto_sin_reemplazo", // 4.7
  declinar_moq: "moq_mayor", // 4.4
  declinar_ya_disponible: "ya_disponible_wcl", // 4.1
} as const satisfies Record<RutaDeclinante, MotivoDeclinado>;

/**
 * Motivo que se persiste para una ruta, o `null` si la ruta no declina.
 * Se corresponde con la restricción `declinada_tiene_motivo`: solo las
 * declinadas llevan motivo, y todas lo llevan.
 */
export function motivoDeclinado(ruta: RutaQMS): MotivoDeclinado | null {
  return ruta in MOTIVO_POR_RUTA ? MOTIVO_POR_RUTA[ruta as RutaDeclinante] : null;
}
