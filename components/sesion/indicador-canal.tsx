"use client";

import { useSesion } from "./proveedor-sesion";

/**
 * Estado del canal de Realtime. SOLO para el panel `/demo` del presentador:
 * las pantallas que ve el cliente no muestran jamás la fontanería del demo.
 *
 * Verde solo cuando el canal confirmó `SUBSCRIBED`; en cualquier otro estado
 * el texto deja explícito que el respaldo por sondeo es el que mantiene la
 * pantalla al día, para que el presentador sepa si puede fiarse del
 * interruptor antes de tocarlo delante del cliente.
 */
export function IndicadorCanal() {
  const { estadoCanal } = useSesion();

  if (estadoCanal === "suscrito") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-confirmacion bg-confirmacion-suave px-3 py-1 text-xs font-medium text-confirmacion">
        <span className="size-1.5 rounded-full bg-confirmacion" aria-hidden />
        Canal en vivo: los cambios se propagan al instante
      </span>
    );
  }

  if (estadoCanal === "conectando") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-borde bg-fondo-sutil px-3 py-1 text-xs font-medium text-texto-tenue">
        <span className="size-1.5 rounded-full bg-texto-tenue" aria-hidden />
        Conectando con el canal… (respaldo por sondeo en espera)
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-error bg-error-suave px-3 py-1 text-xs font-medium text-error">
      <span className="size-1.5 rounded-full bg-error" aria-hidden />
      Canal {estadoCanal === "error" ? "con error" : "cerrado"}: activo el respaldo por sondeo (cada
      2 s)
    </span>
  );
}
