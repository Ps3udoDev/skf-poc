"use client";

import { useSesion } from "./proveedor-sesion";

/** Nombre de pantalla de cada modo: "hoy" / "con la solución" (doc 02). */
const NOMBRE_MODO = {
  hoy: "Modo: hoy",
  solucion: "Modo: con la solución",
} as const;

/**
 * Modo activo del demo en la barra superior. Píldora neutra: ni ámbar
 * (exclusivo de desconexión) ni verde (exclusivo de confirmación).
 */
export function IndicadorModo() {
  const { sesion } = useSesion();
  return (
    <span className="inline-flex items-center rounded-full border border-primario bg-primario-suave px-3 py-1 text-xs font-medium text-primario">
      {NOMBRE_MODO[sesion.modo]}
    </span>
  );
}
