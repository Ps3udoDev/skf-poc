"use client";

import { useCallback, useEffect, useState } from "react";
import { listarIntenciones } from "@/app/(portal)/portal/acciones";
import { useSesion } from "@/components/sesion/proveedor-sesion";
import type { EstadoIntencion, Intencion } from "@/lib/fuentes";

const ETIQUETA: Record<EstadoIntencion, string> = {
  encolada: "En cola",
  confirmada: "Confirmada",
  ajustada: "Ajustada",
  escalada: "Escalada",
};

/**
 * Ámbar solo en `encolada`: la cola existe porque la planta está desconectada.
 * Verde solo en `confirmada`. Ajustada y escalada son resultados legítimos del
 * procedimiento, no fallos, así que van en neutro.
 */
const CLASE: Record<EstadoIntencion, string> = {
  encolada: "border-desconexion bg-desconexion-suave text-desconexion",
  confirmada: "border-confirmacion bg-confirmacion-suave text-confirmacion",
  ajustada: "border-borde bg-fondo-sutil text-texto",
  escalada: "border-borde bg-fondo-sutil text-texto",
};

export function ColaIntenciones() {
  const { sesion } = useSesion();
  const [intenciones, setIntenciones] = useState<Intencion[]>([]);

  const refrescar = useCallback(() => {
    listarIntenciones()
      .then(setIntenciones)
      .catch(() => {
        // Una cola que no carga no puede tumbar el portal en mitad de la
        // escena: se queda con lo último que mostró.
      });
  }, []);

  // Se refresca cuando cambia la sesión: cerrar la ventana desde /demo cambia
  // `plantasOverride`, ese cambio llega por Realtime y arrastra la relectura de
  // la cola ya reconciliada. No hace falta un canal nuevo sobre esta tabla.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `sesion` es la señal de refresco, no un dato leído dentro del efecto
  useEffect(() => {
    refrescar();
  }, [refrescar, sesion]);

  if (intenciones.length === 0) return null;

  return (
    <section className="mt-8" aria-labelledby="titulo-cola">
      <h2 id="titulo-cola" className="text-lg font-semibold text-texto">
        Intenciones de pedido registradas
      </h2>
      <p className="mt-1 text-sm text-texto-tenue">
        Registro de intención sobre datos simulados. No es un pedido en firme ni un compromiso de
        fecha.
      </p>
      <ul className="mt-3 space-y-2">
        {intenciones.map((intencion) => (
          <li key={intencion.id} className="rounded-xl border border-borde bg-fondo p-3 text-sm">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="designacion font-medium text-texto">{intencion.designacion}</span>
              <span className="text-texto-tenue">{intencion.cantidad} piezas</span>
              <span className="designacion text-texto-tenue">{intencion.pdiv}</span>
              <span
                className={`ml-auto inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${CLASE[intencion.estado]}`}
              >
                {ETIQUETA[intencion.estado]}
              </span>
            </div>
            {intencion.nota && <p className="mt-2 text-texto-tenue">{intencion.nota}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
