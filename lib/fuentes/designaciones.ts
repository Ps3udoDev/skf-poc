import type { Designacion } from "@/lib/reglas-qms";
import { clienteLectura } from "@/lib/supabase/lectura";

/** Columnas del catálogo que el dominio necesita. Una sola lista, un solo lugar. */
export const COLUMNAS = `
  designacion, descripcion, familia, pcc, lcc, fpc, pdiv, segmento,
  moq, pack_quantity, precio_lista, vigente,
  reemplazado_por, reemplazo_indicado_fabrica, es_nueva_creacion
`;

export interface FilaDesignacion {
  designacion: string;
  descripcion: string;
  familia: string;
  pcc: Designacion["pcc"];
  lcc: Designacion["lcc"];
  fpc: Designacion["fpc"];
  pdiv: string;
  segmento: Designacion["segmento"];
  moq: number;
  pack_quantity: number;
  precio_lista: number | null;
  vigente: boolean;
  reemplazado_por: string | null;
  reemplazo_indicado_fabrica: string | null;
  es_nueva_creacion: boolean;
}

/**
 * Único punto de conversión snake_case → camelCase de todo el proyecto.
 *
 * Si esta conversión se duplica en otro archivo, la próxima columna que se
 * añada quedará mapeada en un sitio y olvidada en el otro.
 */
export function aDesignacion(fila: FilaDesignacion): Designacion {
  return {
    designacion: fila.designacion,
    descripcion: fila.descripcion,
    familia: fila.familia,
    pcc: fila.pcc,
    lcc: fila.lcc,
    fpc: fila.fpc,
    pdiv: fila.pdiv,
    segmento: fila.segmento,
    moq: fila.moq,
    packQuantity: fila.pack_quantity,
    precioLista: fila.precio_lista === null ? null : Number(fila.precio_lista),
    vigente: fila.vigente,
    reemplazadoPor: fila.reemplazado_por,
    reemplazoIndicadoFabrica: fila.reemplazo_indicado_fabrica,
    esNuevaCreacion: fila.es_nueva_creacion,
  };
}

export async function obtenerDesignacion(codigo: string): Promise<Designacion | null> {
  const { data } = await clienteLectura()
    .from("designaciones")
    .select(COLUMNAS)
    .eq("designacion", codigo)
    .maybeSingle();
  return data ? aDesignacion(data as unknown as FilaDesignacion) : null;
}

export async function obtenerVarias(codigos: string[]): Promise<Designacion[]> {
  if (codigos.length === 0) return [];
  const { data } = await clienteLectura()
    .from("designaciones")
    .select(COLUMNAS)
    .in("designacion", codigos);
  const encontradas = ((data ?? []) as unknown as FilaDesignacion[]).map(aDesignacion);
  // Se preserva el orden pedido: el validador ordena por puntaje y la base no.
  const porCodigo = new Map(encontradas.map((d) => [d.designacion, d]));
  return codigos.map((c) => porCodigo.get(c)).filter((d): d is Designacion => d !== undefined);
}

/** Estrategia 3 de la cascada: el texto es prefijo de designaciones válidas. */
export async function completacionesDe(prefijo: string, limite = 5): Promise<string[]> {
  const { data } = await clienteLectura().rpc("buscar_por_prefijo", { prefijo, limite });
  return ((data ?? []) as { designacion: string }[]).map((f) => f.designacion);
}

/** Estrategia 4 de la cascada: similitud por trigramas. */
export async function similaresA(
  consulta: string,
  limite = 5,
): Promise<{ designacion: string; puntaje: number }[]> {
  const { data } = await clienteLectura().rpc("buscar_similares", { consulta, limite });
  return (data ?? []) as { designacion: string; puntaje: number }[];
}
