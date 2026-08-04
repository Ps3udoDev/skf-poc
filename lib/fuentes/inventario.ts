import type { Existencia } from "@/lib/reglas-qms";
import { clienteLectura } from "@/lib/supabase/lectura";

/** Orden del QMS: PS primario, SL secundario, XX terciario. */
const ORDEN: Record<Existencia["almacen"], number> = { PS: 0, SL: 1, XX: 2 };

export async function existenciasDe(codigo: string): Promise<Existencia[]> {
  const { data } = await clienteLectura()
    .from("inventario")
    .select("almacen, cantidad")
    .eq("designacion", codigo);
  return ((data ?? []) as Existencia[]).sort((a, b) => ORDEN[a.almacen] - ORDEN[b.almacen]);
}
