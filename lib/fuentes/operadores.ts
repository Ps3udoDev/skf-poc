import type { CargaCsr } from "@/lib/operacion/asignacion";
import { clienteLectura } from "@/lib/supabase/lectura";
import { lanzarSiError } from "./errores";

export type { CargaCsr };

/**
 * Carga abierta de cada operador desde el inicio de la sesión.
 *
 * Devuelve TODOS los operadores, activos e inactivos. Un operador sin
 * solicitudes aparece con `abiertas: 0` en vez de omitirse, porque es
 * justamente el que debe recibir la siguiente: si se omitiera, `elegirCsr()`
 * nunca lo vería y el reparto se concentraría en quien ya tiene trabajo.
 *
 * El conteo se hace en memoria y no con un `group by` en SQL: son ocho
 * operadores y unas decenas de solicitudes por sesión, y así la capa de
 * fuentes no necesita una vista ni una RPC nueva.
 */
export async function cargaPorCsr(desde: string): Promise<CargaCsr[]> {
  const lectura = clienteLectura();
  const [operadores, solicitudes] = await Promise.all([
    lectura.from("operadores").select("id, codigo, activo").order("codigo"),
    lectura
      .from("solicitudes")
      .select("csr_asignado")
      .gte("creada_en", desde)
      .is("atendida_en", null),
  ]);
  lanzarSiError(operadores.error, "obtener los operadores");
  lanzarSiError(solicitudes.error, "obtener la carga de los operadores");

  const abiertasPorId = new Map<number, number>();
  for (const fila of solicitudes.data ?? []) {
    if (fila.csr_asignado === null) continue;
    abiertasPorId.set(fila.csr_asignado, (abiertasPorId.get(fila.csr_asignado) ?? 0) + 1);
  }

  return (operadores.data ?? []).map((operador) => ({
    codigo: operador.codigo,
    abiertas: abiertasPorId.get(operador.id) ?? 0,
    activo: operador.activo,
  }));
}

/**
 * Id de un operador a partir de su código.
 *
 * `null` cuando el código no existe: quien escribe decide si eso es un error
 * (asignación manual a un código inventado) o un filtro vacío (bandeja).
 */
export async function idDeOperador(codigo: string): Promise<number | null> {
  const { data, error } = await clienteLectura()
    .from("operadores")
    .select("id")
    .eq("codigo", codigo)
    .maybeSingle();
  lanzarSiError(error, `obtener el operador ${codigo}`);
  return data?.id ?? null;
}
