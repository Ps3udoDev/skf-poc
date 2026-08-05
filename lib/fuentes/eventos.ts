import type { TipoEvento } from "@/lib/metricas/calculo";
import { clienteLectura } from "@/lib/supabase/lectura";
import { lanzarSiError } from "./errores";

/**
 * ¿La bandeja ya emitió este aviso para esta solicitud?
 *
 * Existe para que abrir el mismo detalle varias veces no multiplique el
 * contador de avisos anticipados del dashboard. El filtro por tipo y perfil
 * deja un puñado de filas por sesión, así que la comparación del número se
 * hace en memoria y no hace falta un operador de ruta JSON en la consulta.
 */
export async function hayAvisoDeOperador(tipo: TipoEvento, numero: string): Promise<boolean> {
  const { data, error } = await clienteLectura()
    .from("eventos_demo")
    .select("detalle")
    .eq("tipo", tipo)
    .eq("perfil", "operador");
  lanzarSiError(error, `revisar los avisos ya emitidos de la solicitud ${numero}`);
  return (data ?? []).some((fila) => (fila.detalle as { numero?: string }).numero === numero);
}
