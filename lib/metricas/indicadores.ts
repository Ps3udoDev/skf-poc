import { leerSesion } from "@/lib/sesion-demo/leer";
import { clienteLectura } from "@/lib/supabase/lectura";
import { calcularIndicadores, type EventoDemo, type Indicadores } from "./calculo";

/**
 * Indicadores de la sesión en curso.
 *
 * Solo cuenta eventos posteriores a `sesion_demo.iniciada_en`: reiniciar la
 * sesión entre dos presentaciones del mismo día deja los contadores en cero sin
 * borrar el histórico sintético.
 */
export async function indicadoresDeSesion(): Promise<Indicadores> {
  const sesion = await leerSesion();
  const { data } = await clienteLectura()
    .from("eventos_demo")
    .select("tipo, perfil, designacion, pdiv, detalle, ocurrido_en")
    .gte("ocurrido_en", sesion.iniciadaEn)
    .order("ocurrido_en");

  const eventos: EventoDemo[] = ((data ?? []) as Record<string, unknown>[]).map((f) => ({
    tipo: f.tipo as EventoDemo["tipo"],
    perfil: (f.perfil as string | null) ?? null,
    designacion: (f.designacion as string | null) ?? null,
    pdiv: (f.pdiv as string | null) ?? null,
    detalle: (f.detalle ?? {}) as Record<string, unknown>,
    ocurridoEn: f.ocurrido_en as string,
  }));

  return calcularIndicadores(eventos);
}
