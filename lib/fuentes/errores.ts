import type { PostgrestError } from "@supabase/supabase-js";

/**
 * Lanza si Supabase devolvió un error, en vez de dejar que la función
 * que llama lo trate como "no hay datos".
 *
 * Por qué importa: en esta capa, `null` y `[]` son resultados válidos del
 * dominio — el punto 4.8 del procedimiento QMS espera que una designación
 * inexistente produzca `obtenerDesignacion(...) === null`. Si un fallo de
 * infraestructura (red caída, base suspendida, timeout) también se
 * tradujera en `null`, `construirContexto` armaría un contexto con
 * `designacion: null` igual que si la designación no existiera, y
 * `evaluarSolicitud` declinaría la solicitud por "designación inválida"
 * delante del cliente en vivo — cuando en realidad la base ni siquiera
 * respondió. Un fallo de infraestructura no puede disfrazarse de decisión
 * del procedimiento: por eso se lanza aquí, de inmediato, en vez de
 * propagar `null` o `[]` silenciosamente.
 */
export function lanzarSiError(error: PostgrestError | null, operacion: string): void {
  if (error) throw new Error(`No se pudo ${operacion}: ${error.message}`);
}
