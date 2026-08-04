"use client";

import { useTransition } from "react";
import { useSesion } from "@/components/sesion/proveedor-sesion";
import { HUSO_MEXICO } from "@/lib/estado-fabricas";
import { avanzarReloj, cerrarVentanaEnCurso, reiniciarReloj } from "@/lib/sesion-demo/acciones";

const FORMATO_HORA = new Intl.DateTimeFormat("es-MX", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
  timeZone: HUSO_MEXICO,
});

const CLASE_BOTON =
  "rounded-lg border border-borde bg-fondo px-4 py-2.5 text-sm font-medium text-texto hover:bg-fondo-sutil disabled:opacity-40";

/**
 * Control del reloj simulado: hora en grande, offset acumulado y los saltos que
 * usa la escena 4 (+30 min, +1 h, cerrar la ventana en curso y reiniciar).
 *
 * `cerrarVentanaEnCurso` se aplica a cada planta que esté en `ventana`: es el
 * gesto con el que termina la escena 4, cuando la cola se envía en lote.
 */
export function ControlReloj() {
  const { sesion, plantas, estados, ahora } = useSesion();
  const [enVuelo, iniciar] = useTransition();

  const enVentana = plantas.filter((planta) => estados[planta.pdiv] === "ventana");
  const offset = sesion.relojOffsetMin;

  return (
    <section aria-labelledby="titulo-reloj">
      <h2 id="titulo-reloj" className="text-lg font-semibold text-texto">
        Reloj simulado
      </h2>
      <p className="mt-3 designacion text-5xl font-semibold tracking-tight text-texto">
        {FORMATO_HORA.format(ahora)}
      </p>
      <p className="mt-1 text-sm text-texto-tenue">
        Hora de México ·{" "}
        {offset === 0
          ? "sin desplazamiento"
          : `desplazada ${offset > 0 ? "+" : ""}${offset} min acumulados`}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={enVuelo}
          onClick={() => iniciar(() => avanzarReloj(30))}
          className={CLASE_BOTON}
        >
          +30 min
        </button>
        <button
          type="button"
          disabled={enVuelo}
          onClick={() => iniciar(() => avanzarReloj(60))}
          className={CLASE_BOTON}
        >
          +1 h
        </button>
        <button
          type="button"
          disabled={enVuelo || enVentana.length === 0}
          onClick={() =>
            iniciar(async () => {
              for (const planta of enVentana) await cerrarVentanaEnCurso(planta.pdiv);
            })
          }
          className={CLASE_BOTON}
        >
          Cerrar la ventana en curso
          {enVentana.length > 0 ? ` (${enVentana.map((p) => p.pdiv).join(", ")})` : ""}
        </button>
        <button
          type="button"
          disabled={enVuelo || offset === 0}
          onClick={() => iniciar(() => reiniciarReloj())}
          className={CLASE_BOTON}
        >
          Reiniciar reloj
        </button>
      </div>
      <p className="mt-2 h-5 text-sm text-texto-tenue" role="status">
        {enVuelo ? "Aplicando…" : ""}
      </p>
    </section>
  );
}
