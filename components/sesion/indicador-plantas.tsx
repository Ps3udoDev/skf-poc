"use client";

import { minutosParaReapertura } from "@/lib/estado-fabricas";
import { useSesion } from "./proveedor-sesion";

/**
 * Estado de las plantas en la barra superior.
 *
 * El ámbar es exclusivo del estado de desconexión en toda la aplicación: no
 * usar estos colores para ningún otro aviso. Si ninguna planta está en
 * ventana, la píldora neutra confirma que todas están en línea.
 */
export function IndicadorPlantas() {
  const { plantas, estados, ahora } = useSesion();

  const enVentana = plantas.filter((planta) => estados[planta.pdiv] === "ventana");

  if (enVentana.length === 0) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-borde bg-fondo-sutil px-3 py-1 text-xs font-medium text-texto-tenue">
        <span className="size-1.5 rounded-full bg-texto-tenue" aria-hidden />
        Todas las plantas en línea
      </span>
    );
  }

  return (
    <>
      {enVentana.map((planta) => {
        const restantes = minutosParaReapertura(planta, ahora);
        return (
          <span
            key={planta.pdiv}
            className="inline-flex items-center gap-2 rounded-full border border-desconexion bg-desconexion-suave px-3 py-1 text-xs font-medium text-desconexion"
          >
            <span className="size-1.5 rounded-full bg-desconexion" aria-hidden />
            {planta.nombre} desconectada
            {restantes !== null ? ` · reconecta en ${restantes} min` : ""}
          </span>
        );
      })}
    </>
  );
}
