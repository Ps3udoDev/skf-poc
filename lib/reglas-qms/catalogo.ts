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
 * Punto 4.6, segundo sub-caso — la validación con el Ingeniero de Ventas se
 * exige ÚNICAMENTE cuando el reemplazo no está en sistema y lo indica la
 * fábrica. Si el reemplazo está en sistema, basta con informar el cambio.
 */
export function avisoReemplazo(reemplazoSoloIndicadoPorFabrica: boolean): Aviso | null {
  if (!reemplazoSoloIndicadoPorFabrica) return null;
  return {
    tipo: "validar_con_ingeniero_ventas",
    punto: "4.6",
    mensaje:
      "Este reemplazo lo indica la fábrica pero no está dado de alta en sistema. " +
      "Revise con su Ingeniero de Ventas si cumple con sus necesidades técnicas.",
  };
}
