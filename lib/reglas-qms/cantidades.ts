import type { Aviso, Designacion } from "./tipos";

/**
 * Punto 4.4 — "Si la designación tiene MOQ mayor a lo que el cliente pide se
 * le indica el MOQ al cliente y se declina."
 */
export function incumpleMoq(d: Designacion, cantidad: number): boolean {
  return cantidad < d.moq;
}

/**
 * Punto 4.5a — el sistema redondea al pack quantity asignado. Siempre hacia
 * arriba: no se puede despachar una fracción de caja.
 */
export function redondearAPack(d: Designacion, cantidad: number): number {
  if (d.packQuantity <= 1) return cantidad;
  return Math.ceil(cantidad / d.packQuantity) * d.packQuantity;
}

/**
 * Punto 4.5a — "se le indica al cliente el motivo del cambio en la cantidad".
 * Sin cambio no hay aviso.
 */
export function avisoPackQuantity(d: Designacion, cantidad: number): Aviso | null {
  const efectiva = redondearAPack(d, cantidad);
  if (efectiva === cantidad) return null;
  return {
    tipo: "pack_quantity_ajustado",
    punto: "4.5a",
    mensaje:
      `La cantidad se ajusta de ${cantidad} a ${efectiva} piezas: ` +
      `esta designación se surte en cajas de ${d.packQuantity}.`,
  };
}
