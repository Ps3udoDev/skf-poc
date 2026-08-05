"use client";

import { useState, useTransition } from "react";
import { registrarSolicitudEvitada } from "@/app/(portal)/portal/acciones";
import { EstimacionTE } from "@/components/estimador/estimacion-te";
import type { Estimacion } from "@/lib/estimador/calculo";
import type { Sugerencia } from "@/lib/validador/tipos";
import { ConfirmacionHomologo } from "./confirmacion-homologo";

export function DetalleDesignacion({
  sugerencia,
  estimacion,
  cantidad,
}: {
  sugerencia: Sugerencia;
  estimacion: Estimacion | null;
  cantidad: number;
}) {
  const [registrada, setRegistrada] = useState(false);
  const [enVuelo, iniciar] = useTransition();
  const { designacion } = sugerencia;
  const avisoPrecio = sugerencia.evaluacion.avisos.find((aviso) =>
    ["precio_requiere_lpc", "precio_bajo_spq"].includes(aviso.tipo),
  );

  return (
    <div className="grid gap-4 border-t border-borde bg-fondo-sutil p-4 lg:grid-cols-[minmax(13rem,0.7fr)_minmax(20rem,1.3fr)]">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-texto-tenue">
          Precio de lista
        </p>
        {designacion.precioLista !== null ? (
          <p className="mt-1 text-2xl font-semibold text-texto">
            USD {designacion.precioLista.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
          </p>
        ) : (
          <p className="mt-2 text-sm text-texto-tenue">
            {avisoPrecio?.mensaje ?? "Precio no publicado; requiere cotización."}
          </p>
        )}
        <button
          type="button"
          disabled={enVuelo || registrada}
          onClick={() =>
            iniciar(async () => {
              await registrarSolicitudEvitada(designacion.designacion);
              setRegistrada(true);
            })
          }
          className={
            registrada
              ? "mt-4 rounded-lg border border-confirmacion bg-confirmacion-suave px-4 py-2 text-sm font-medium text-confirmacion"
              : "mt-4 rounded-lg bg-primario px-4 py-2 text-sm font-medium text-primario-contraste hover:opacity-90 disabled:opacity-50"
          }
        >
          {registrada ? "Consulta resuelta" : enVuelo ? "Registrando…" : "Usar esta designación"}
        </button>
        <ConfirmacionHomologo codigo={designacion.designacion} cantidad={cantidad} />
      </div>
      {estimacion ? (
        <EstimacionTE estimacion={estimacion} />
      ) : (
        <div className="rounded-md border border-borde bg-fondo p-4 text-sm text-texto-tenue">
          No hay base histórica suficiente para estimar el tiempo de entrega. Se confirmará al
          procesar la cotización.
        </div>
      )}
    </div>
  );
}
