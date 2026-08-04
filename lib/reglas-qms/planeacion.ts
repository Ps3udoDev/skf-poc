import type { Almacen, Designacion, Existencia } from "./tipos";

/**
 * Punto 4.1 — un producto planeado (LCC=PLAN) se mantiene normalmente en
 * stock y aparece en la lista de precios vigente sin excepción.
 */
export function esPlaneado(d: Designacion): boolean {
  return d.lcc === "PLAN";
}

export function stockTotal(existencias: Existencia[]): number {
  return existencias.reduce((suma, e) => suma + e.cantidad, 0);
}

/** Desglose por la consulta escalonada del QMS: PS primario, SL secundario, XX terciario. */
export function stockPorAlmacen(existencias: Existencia[]): Record<Almacen, number> {
  const desglose: Record<Almacen, number> = { PS: 0, SL: 0, XX: 0 };
  for (const e of existencias) desglose[e.almacen] += e.cantidad;
  return desglose;
}

/**
 * Punto 4.1 — planeado con cantidad menor o igual al stock: se declina porque
 * el producto ya estaba disponible en WCL y la cotización era innecesaria.
 * Si la cantidad supera el stock, se pide LT al planner de la PDIV.
 */
export function rutaPlaneado(
  _d: Designacion,
  cantidad: number,
  existencias: Existencia[],
): "declinar_ya_disponible" | "solicitar_lt_planner" {
  return cantidad <= stockTotal(existencias) ? "declinar_ya_disponible" : "solicitar_lt_planner";
}

/**
 * Puntos 4.2 y 4.3 — no planeado: primero se revisa disponibilidad (SPQ+, SAP,
 * Global Availability); si no hay, se ingresa la PINQ a fábrica.
 */
export function rutaNoPlaneado(
  existencias: Existencia[],
): "revisar_disponibilidad_np" | "ingresar_pinq" {
  return stockTotal(existencias) > 0 ? "revisar_disponibilidad_np" : "ingresar_pinq";
}
