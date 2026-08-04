import { clienteLectura } from "@/lib/supabase/lectura";
import type { SesionDemo } from "./tipos";

export const SESION_POR_DEFECTO: SesionDemo = {
  modo: "hoy",
  plantasOverride: {},
  relojOffsetMin: 0,
  escenarioActivo: null,
  iniciadaEn: new Date(0).toISOString(),
};

export async function leerSesion(): Promise<SesionDemo> {
  const { data } = await clienteLectura()
    .from("sesion_demo")
    .select("modo, plantas_override, reloj_offset_min, escenario_activo, iniciada_en")
    .eq("id", 1)
    .maybeSingle();

  // Si la fila no está, el demo arranca en modo "hoy" en vez de romperse: el
  // modo "hoy" es el estado narrativo inicial, así que fallar hacia él es
  // exactamente lo que el presentador esperaría.
  if (!data) return SESION_POR_DEFECTO;

  return {
    modo: data.modo,
    plantasOverride: (data.plantas_override ?? {}) as SesionDemo["plantasOverride"],
    relojOffsetMin: data.reloj_offset_min,
    escenarioActivo: data.escenario_activo,
    iniciadaEn: data.iniciada_en,
  };
}
