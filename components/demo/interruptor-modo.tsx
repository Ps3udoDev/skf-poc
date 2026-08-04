"use client";

import { useTransition } from "react";
import { useSesion } from "@/components/sesion/proveedor-sesion";
import { cambiarModo } from "@/lib/sesion-demo/acciones";
import type { SesionDemo } from "@/lib/sesion-demo/tipos";
import { cn } from "@/lib/utilidades";

const MODOS: { valor: SesionDemo["modo"]; etiqueta: string; detalle: string }[] = [
  { valor: "hoy", etiqueta: "Situación actual", detalle: "El portal se comporta como hoy" },
  { valor: "solucion", etiqueta: "Con la solución", detalle: "El portal muestra la solución" },
];

/**
 * El interruptor de modo: el elemento más prominente del panel.
 *
 * Dos botones grandes con el activo inequívocamente marcado. Mientras la acción
 * está en vuelo se muestra el estado de envío: el presentador tiene que saber
 * que su pulsación entró aunque la proyección tarde un instante en reaccionar.
 */
export function InterruptorModo() {
  const { sesion } = useSesion();
  const [enVuelo, iniciar] = useTransition();

  return (
    <section aria-labelledby="titulo-modo">
      <h2 id="titulo-modo" className="text-lg font-semibold text-texto">
        Modo de la demostración
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-4">
        {MODOS.map(({ valor, etiqueta, detalle }) => {
          const activo = sesion.modo === valor;
          return (
            <button
              key={valor}
              type="button"
              disabled={enVuelo || activo}
              onClick={() => iniciar(() => cambiarModo(valor))}
              aria-pressed={activo}
              className={cn(
                "rounded-xl border-2 px-6 py-6 text-left transition-colors disabled:cursor-default",
                activo
                  ? "border-primario bg-primario text-primario-contraste"
                  : "border-borde bg-fondo text-texto hover:border-primario hover:bg-primario-suave",
                enVuelo && !activo && "opacity-60",
              )}
            >
              <span className="block text-xl font-semibold">{etiqueta}</span>
              <span
                className={cn(
                  "mt-1 block text-sm",
                  activo ? "text-primario-contraste/80" : "text-texto-tenue",
                )}
              >
                {detalle}
              </span>
              <span
                className={cn(
                  "mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase",
                  activo ? "bg-primario-contraste/15 text-primario-contraste" : "invisible",
                )}
              >
                Activo
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 h-5 text-sm text-texto-tenue" role="status">
        {enVuelo ? "Cambiando el modo… la proyección se actualiza sola." : ""}
      </p>
    </section>
  );
}
