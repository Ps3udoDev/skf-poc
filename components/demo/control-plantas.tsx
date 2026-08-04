"use client";

import { useTransition } from "react";
import { useSesion } from "@/components/sesion/proveedor-sesion";
import type { EstadoPlanta } from "@/lib/estado-fabricas";
import { fijarEstadoPlanta } from "@/lib/sesion-demo/acciones";
import { cn } from "@/lib/utilidades";

/** La planta belga de la escena 4 (caso `DEMO-VENTANA`): va siempre arriba. */
const PLANTA_ESCENA_4 = "P103";

const ETIQUETA_ESTADO: Record<EstadoPlanta, string> = {
  online: "En línea",
  ventana: "En ventana",
  reactivando: "Reactivando",
};

const BOTONES: { estado: EstadoPlanta; etiqueta: string }[] = [
  { estado: "online", etiqueta: "Forzar en línea" },
  { estado: "ventana", etiqueta: "Forzar ventana" },
  { estado: "reactivando", etiqueta: "Forzar reactivando" },
];

/** Minutos del día → "HH:MM". Las ventanas están definidas en hora de México. */
function horaMinuto(minutos: number): string {
  const normalizado = ((minutos % 1440) + 1440) % 1440;
  const h = Math.floor(normalizado / 60);
  const m = normalizado % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Control de plantas: una fila por planta con su ventana programada, el estado
 * actual calculado y los botones para forzar un estado o volver al calendario.
 *
 * Las plantas con override activo van destacadas: si no se distinguieran, el
 * presentador no sabría qué dejó forzado de un ensayo anterior.
 */
export function ControlPlantas() {
  const { plantas, estados, sesion } = useSesion();
  const [enVuelo, iniciar] = useTransition();

  const ordenadas = [...plantas].sort((a, b) => {
    if (a.pdiv === PLANTA_ESCENA_4) return -1;
    if (b.pdiv === PLANTA_ESCENA_4) return 1;
    return a.pdiv.localeCompare(b.pdiv);
  });

  return (
    <section aria-labelledby="titulo-plantas">
      <h2 id="titulo-plantas" className="text-lg font-semibold text-texto">
        Estado de las plantas
      </h2>
      <p className="mt-1 text-sm text-texto-tenue">
        Ventanas programadas en hora de México. El override del presentador siempre gana sobre el
        calendario.
      </p>
      <ul className="mt-3 space-y-2">
        {ordenadas.map((planta) => {
          const override = sesion.plantasOverride[planta.pdiv];
          const estado = estados[planta.pdiv];
          const esEscena4 = planta.pdiv === PLANTA_ESCENA_4;
          return (
            <li
              key={planta.pdiv}
              className={cn(
                "rounded-xl border p-3",
                override ? "border-primario bg-primario-suave" : "border-borde bg-fondo",
              )}
            >
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="designacion text-sm font-semibold text-texto">{planta.pdiv}</span>
                <span className="text-sm font-medium text-texto">{planta.nombre}</span>
                <span className="text-sm text-texto-tenue">{planta.pais}</span>
                {esEscena4 && (
                  <span className="rounded-full border border-borde bg-fondo-sutil px-2 py-0.5 text-xs font-medium text-texto-tenue">
                    Escena 4
                  </span>
                )}
                {override && (
                  <span className="rounded-full bg-primario px-2 py-0.5 text-xs font-semibold text-primario-contraste">
                    Forzada
                  </span>
                )}
                <span
                  className={cn(
                    "ml-auto rounded-full border px-2.5 py-0.5 text-xs font-medium",
                    estado === "ventana"
                      ? "border-desconexion bg-desconexion-suave text-desconexion"
                      : "border-borde bg-fondo-sutil text-texto-tenue",
                  )}
                >
                  {ETIQUETA_ESTADO[estado]}
                  {override ? "" : " (calendario)"}
                </span>
              </div>
              <p className="mt-1 text-xs text-texto-tenue">
                Ventana:{" "}
                <span className="designacion">
                  {horaMinuto(planta.ventanaInicioMin)}–
                  {horaMinuto(planta.ventanaInicioMin + planta.ventanaDuracionMin)}
                </span>
                {planta.ventanaVariabilidadMin > 0 &&
                  ` · inicio variable ±${planta.ventanaVariabilidadMin / 2} min`}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {BOTONES.map(({ estado: destino, etiqueta }) => (
                  <button
                    key={destino}
                    type="button"
                    disabled={enVuelo || override === destino}
                    onClick={() => iniciar(() => fijarEstadoPlanta(planta.pdiv, destino))}
                    className="rounded-lg border border-borde bg-fondo px-3 py-1.5 text-xs font-medium text-texto hover:bg-fondo-sutil disabled:opacity-40"
                  >
                    {etiqueta}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={enVuelo || !override}
                  onClick={() => iniciar(() => fijarEstadoPlanta(planta.pdiv, null))}
                  className="rounded-lg border border-borde bg-fondo px-3 py-1.5 text-xs font-medium text-texto hover:bg-fondo-sutil disabled:opacity-40"
                >
                  Seguir calendario
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
