import type { Aleatorio } from "./aleatorio";
import type { DesignacionCompleta } from "./designaciones";

export interface FilaInventario {
  designacion: string;
  almacen: "PS" | "SL" | "XX";
  cantidad: number;
  pdiv_dueno: string;
}

/**
 * Existencias por almacén, con la consulta escalonada del QMS:
 * PS primario, SL secundario, XX terciario (los dos últimos sujetos a
 * aprobación del Supplier).
 *
 * La regla que hace funcionar el demo: los planeados tienen stock con
 * frecuencia y los no planeados casi nunca. Es lo que dispara la cotización y
 * lo que hace que el punto 4.1 pueda declinar en la escena 2.
 */
export function generarInventario(
  a: Aleatorio,
  catalogo: readonly DesignacionCompleta[],
): FilaInventario[] {
  const salida: FilaInventario[] = [];

  for (const d of catalogo) {
    // Un obsoleto puede conservar saldo, pero rara vez.
    const probabilidadStock = !d.vigente ? 0.15 : d.lcc === "PLAN" ? 0.92 : 0.12;
    if (!a.probabilidad(probabilidadStock)) continue;

    const almacenes: FilaInventario["almacen"][] = ["PS"];
    if (a.probabilidad(0.45)) almacenes.push("SL");
    if (a.probabilidad(0.2)) almacenes.push("XX");

    for (const almacen of almacenes) {
      const base = d.lcc === "PLAN" ? a.entero(40, 4000) : a.entero(1, 120);
      const factor = almacen === "PS" ? 1 : almacen === "SL" ? 0.35 : 0.12;
      salida.push({
        designacion: d.designacion,
        almacen,
        cantidad: Math.max(0, Math.round(base * factor)),
        pdiv_dueno: d.pdiv,
      });
    }
  }
  return salida;
}

export const COLUMNAS_INVENTARIO = ["designacion", "almacen", "cantidad", "pdiv_dueno"] as const;

export function filasInventario(inventario: readonly FilaInventario[]): unknown[][] {
  return inventario.map((i) => [i.designacion, i.almacen, i.cantidad, i.pdiv_dueno]);
}
