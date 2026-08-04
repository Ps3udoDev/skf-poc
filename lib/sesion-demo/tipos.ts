import type { EstadoPlanta } from "@/lib/estado-fabricas";

export interface SesionDemo {
  modo: "hoy" | "solucion";
  plantasOverride: Record<string, EstadoPlanta>;
  relojOffsetMin: number;
  escenarioActivo: string | null;
  iniciadaEn: string;
}

/** Estados que expone el canal de Realtime de supabase-js. */
export type EstadoCanal = "conectando" | "suscrito" | "error" | "cerrado";
