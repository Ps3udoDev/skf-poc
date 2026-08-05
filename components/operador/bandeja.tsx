"use client";

import { useState } from "react";
import type { CargaCsr, SolicitudResumen } from "@/lib/fuentes";
import { ListaSolicitudes } from "./lista-solicitudes";
import { PanelDetalle } from "./panel-detalle";

export function Bandeja({
  solicitudes,
  cargas,
}: {
  solicitudes: SolicitudResumen[];
  cargas: readonly CargaCsr[];
}) {
  const [seleccionada, setSeleccionada] = useState<string | null>(null);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(22rem,1fr)] xl:items-start">
      <ListaSolicitudes
        solicitudes={solicitudes}
        seleccionada={seleccionada}
        onSeleccionar={(numero) => setSeleccionada(numero === seleccionada ? null : numero)}
      />
      {seleccionada !== null && (
        <PanelDetalle
          numero={seleccionada}
          cargas={cargas}
          onCerrar={() => setSeleccionada(null)}
        />
      )}
    </div>
  );
}
