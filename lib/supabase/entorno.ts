/**
 * Valida una variable de entorno obligatoria y falla de inmediato, con un
 * mensaje que la nombra, si falta — en vez de dejar que un cliente con URL o
 * clave vacías falle más tarde, de forma opaca, en la primera petición de red.
 *
 * Recibe el valor ya leído (no el nombre para indexar `process.env`) a
 * propósito: en `clienteNavegador()` el acceso debe seguir siendo
 * `process.env.NEXT_PUBLIC_X` literal en el sitio de la llamada, porque
 * Next.js solo puede inlinear variables `NEXT_PUBLIC_*` en el bundle del
 * navegador cuando el acceso es estático. Un acceso indirecto vía
 * `process.env[nombre]` dentro de este módulo no se reemplazaría en el
 * bundle del cliente y `clienteNavegador()` fallaría en producción.
 */
export function variableDeEntorno(nombre: string, valor: string | undefined): string {
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre}`);
  return valor;
}
