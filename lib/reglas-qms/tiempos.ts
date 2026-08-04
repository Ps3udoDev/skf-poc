import type { Aviso, Designacion } from "./tipos";

/** Punto 4.9 — el procedimiento fija 4 semanas, no es un parámetro ajustable. */
export const SEMANAS_NUEVA_CREACION = 4;

export function semanasExtraPorNuevaCreacion(d: Designacion): number {
  return d.esNuevaCreacion ? SEMANAS_NUEVA_CREACION : 0;
}

/**
 * Punto 4.9 — el detalle del porqué es lo que da credibilidad al estimador:
 * creación del material, extensión en MDG-SAP, precio en SAP y seteo en WCL.
 */
export function avisoNuevaCreacion(d: Designacion): Aviso | null {
  if (!d.esNuevaCreacion) return null;
  return {
    tipo: "nueva_creacion",
    punto: "4.9",
    mensaje:
      `Designación de nueva creación: se suman ${SEMANAS_NUEVA_CREACION} semanas al tiempo ` +
      "de entrega por la creación del material, su extensión en MDG-SAP, la asignación " +
      "de precio en SAP y el seteo en WCL.",
  };
}

/**
 * Punto 5.3 — FPC2 no es producto de línea: hay que pedir el PS/LPC a fábrica
 * antes de poder cotizar el precio. Explica por qué algunos precios tardan.
 */
export function avisoPrecio(d: Designacion): Aviso | null {
  if (d.fpc !== "2") return null;
  return {
    tipo: "precio_requiere_lpc",
    punto: "5.3",
    mensaje:
      "Producto fuera de línea (FPC 2): el precio requiere el LPC de la fábrica " +
      "y el cálculo posterior en SPQ+.",
  };
}
