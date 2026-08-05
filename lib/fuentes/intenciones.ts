import { clienteLectura } from "@/lib/supabase/lectura";
import type { Database } from "@/lib/supabase/tipos";
import { lanzarSiError } from "./errores";

/**
 * Estados de la cola. Anclados al enum SQL: si el enum cambia y se regeneran
 * los tipos, esta línea deja de compilar en vez de fallar al escribir.
 */
export const ESTADOS_INTENCION = [
  "encolada",
  "confirmada",
  "ajustada",
  "escalada",
] as const satisfies readonly Database["public"]["Enums"]["estado_intencion"][];

export type EstadoIntencion = (typeof ESTADOS_INTENCION)[number];

export interface Intencion {
  id: number;
  designacion: string;
  cantidad: number;
  pdiv: string;
  encoladaEn: string;
  estado: EstadoIntencion;
  resueltaEn: string | null;
  nota: string | null;
}

const COLUMNAS = "id, designacion, cantidad, pdiv, encolada_en, estado, resuelta_en, nota";

interface FilaIntencion {
  id: number;
  designacion: string;
  cantidad: number;
  pdiv: string;
  encolada_en: string;
  estado: EstadoIntencion;
  resuelta_en: string | null;
  nota: string | null;
}

function aIntencion(fila: FilaIntencion): Intencion {
  return {
    id: fila.id,
    designacion: fila.designacion,
    cantidad: fila.cantidad,
    pdiv: fila.pdiv,
    encoladaEn: fila.encolada_en,
    estado: fila.estado,
    resueltaEn: fila.resuelta_en,
    nota: fila.nota,
  };
}

/** Intenciones de una planta, opcionalmente filtradas por estado. */
export async function intencionesDe(pdiv: string, estado?: EstadoIntencion): Promise<Intencion[]> {
  let consulta = clienteLectura().from("intenciones_pedido").select(COLUMNAS).eq("pdiv", pdiv);
  if (estado) consulta = consulta.eq("estado", estado);
  const { data, error } = await consulta.order("encolada_en");
  lanzarSiError(error, `obtener las intenciones de la planta ${pdiv}`);
  return ((data ?? []) as unknown as FilaIntencion[]).map(aIntencion);
}

/** Cola completa de la sesión, para la pantalla del cliente. */
export async function intencionesDesde(iniciadaEn: string): Promise<Intencion[]> {
  const { data, error } = await clienteLectura()
    .from("intenciones_pedido")
    .select(COLUMNAS)
    .gte("encolada_en", iniciadaEn)
    .order("encolada_en");
  lanzarSiError(error, "obtener las intenciones de la sesión");
  return ((data ?? []) as unknown as FilaIntencion[]).map(aIntencion);
}
