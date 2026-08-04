import type { Aviso, Designacion, Planta } from "./tipos";

/**
 * Punto 4.8 — "Si no existe la designación o está incorrecta se declina y se
 * le informa al cliente." Un contexto con designación `null` es exactamente
 * el ~80% de los casos que hoy atiende Customer Service.
 */
export function designacionValida(d: Designacion | null): d is Designacion {
  return d !== null;
}

/**
 * Punto 4.5b — "Solo se cotizan con aquellas fábricas con las que se tiene
 * conexión y ruta de embarque." Ambas condiciones, no una.
 */
export function plantaCotizable(p: Planta | null): boolean {
  if (p === null) return false;
  return p.tieneConexion && p.tieneRutaEmbarque;
}

/** Puntos 4.6 y 4.7 — PCC='O' es la clasificación de tipos obsoletos. */
export function esObsoleto(d: Designacion): boolean {
  return d.pcc === "O";
}

/**
 * Punto 4.6, segundo sub-caso — "si no está en sistema, pero la fábrica lo
 * indica se cotiza y se le pide al cliente que revise con su Ing. de Ventas si
 * dicho reemplazo cumple con sus necesidades técnicas."
 *
 * El sub-caso se deriva del dato, no de una bandera que alguien pase a mano:
 * es el propio catálogo el que registra el código que indica la fábrica. Si el
 * reemplazo sí está en sistema (primer sub-caso) basta con informar el cambio,
 * y quien llama debe resolver ese camino sin pedir este aviso.
 */
export function avisoReemplazo(d: Designacion): Aviso | null {
  if (d.reemplazoIndicadoFabrica === null) return null;
  return {
    tipo: "validar_con_ingeniero_ventas",
    punto: "4.6",
    mensaje:
      `El reemplazo de ${d.designacion} que indica la fábrica ` +
      `(${d.reemplazoIndicadoFabrica}) no está dado de alta en sistema. ` +
      "Revise con su Ingeniero de Ventas si cumple con sus necesidades técnicas.",
  };
}
