"use client";

import { useState, useTransition } from "react";
import { useIndicadores } from "@/components/metricas/uso-indicadores";
import { IndicadorCanal } from "@/components/sesion/indicador-canal";
import { useSesion } from "@/components/sesion/proveedor-sesion";
import { HUSO_MEXICO } from "@/lib/estado-fabricas";
import type { Indicadores } from "@/lib/metricas/calculo";
import { reiniciarSesion } from "@/lib/sesion-demo/acciones";

const FORMATO_HORA = new Intl.DateTimeFormat("es-MX", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
  timeZone: HUSO_MEXICO,
});

export function EstadoSesion({ indicadores: iniciales }: { indicadores: Indicadores }) {
  const { sesion, plantas, estados, ahora } = useSesion();
  // Cierra la deuda del Plan 3: hasta ahora estas cuatro cifras eran la
  // fotografía del momento en que se cargó la página.
  const { indicadores } = useIndicadores(iniciales);
  const [confirmando, setConfirmando] = useState(false);
  const [enVuelo, iniciar] = useTransition();
  const enVentana = plantas.filter((planta) => estados[planta.pdiv] === "ventana");
  return (
    <section
      aria-labelledby="titulo-sesion"
      className="rounded-xl border border-borde bg-fondo p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="titulo-sesion" className="text-lg font-semibold text-texto">
            Estado de la sesión
          </h2>
          <div className="mt-2">
            <IndicadorCanal />
          </div>
        </div>
        <button
          type="button"
          onClick={() => setConfirmando(true)}
          className="rounded-lg border border-error px-3 py-2 text-sm font-medium text-error hover:bg-error-suave"
        >
          Reiniciar sesión
        </button>
      </div>
      <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Dato
          etiqueta="Modo activo"
          valor={sesion.modo === "hoy" ? "Situación actual" : "Con la solución"}
        />
        <Dato
          etiqueta="Plantas en ventana"
          valor={enVentana.length ? enVentana.map((p) => p.pdiv).join(", ") : "Ninguna"}
        />
        <Dato etiqueta="Hora simulada" valor={FORMATO_HORA.format(ahora)} mono />
        <Dato etiqueta="Escenario" valor={sesion.escenarioActivo ?? "Sin escenario"} />
        <Dato etiqueta="Solicitudes recibidas" valor={String(indicadores.solicitudesGeneradas)} />
        <Dato etiqueta="Solicitudes evitadas" valor={String(indicadores.solicitudesEvitadas)} />
        <Dato etiqueta="Minutos liberados" valor={String(indicadores.minutosOperadorLiberados)} />
        <Dato etiqueta="Llamadas al modelo" valor={String(indicadores.llamadasModelo)} />
      </dl>
      {confirmando && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-texto/20 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-reinicio"
        >
          <div className="w-full max-w-md rounded-xl border border-borde bg-fondo p-5">
            <h3 id="titulo-reinicio" className="text-lg font-semibold text-texto">
              ¿Reiniciar la sesión?
            </h3>
            <p className="mt-2 text-sm leading-6 text-texto-tenue">
              Se borrarán las solicitudes de esta sesión y los contadores volverán a cero. El
              histórico sintético de cotizaciones no se modifica.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={enVuelo}
                onClick={() => setConfirmando(false)}
                className="rounded-lg border border-borde px-4 py-2 text-sm font-medium text-texto"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={enVuelo}
                onClick={() =>
                  iniciar(async () => {
                    await reiniciarSesion();
                    setConfirmando(false);
                  })
                }
                className="rounded-lg bg-error px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {enVuelo ? "Reiniciando…" : "Sí, reiniciar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Dato({
  etiqueta,
  valor,
  mono = false,
}: {
  etiqueta: string;
  valor: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg border border-borde bg-fondo-sutil p-3">
      <dt className="text-xs font-medium text-texto-tenue">{etiqueta}</dt>
      <dd className={`mt-1 text-base font-semibold text-texto ${mono ? "designacion" : ""}`}>
        {valor}
      </dd>
      <p className="mt-1 text-[11px] text-texto-tenue">sobre datos simulados</p>
    </div>
  );
}
