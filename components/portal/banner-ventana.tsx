"use client";

import { useSesion } from "@/components/sesion/proveedor-sesion";
import { minutosParaReapertura } from "@/lib/estado-fabricas";

export function BannerVentana() {
  const { plantas, estados, ahora } = useSesion();
  const enVentana = plantas.filter((planta) => estados[planta.pdiv] === "ventana");
  if (enVentana.length === 0) return null;
  return (
    <div className="border-b border-desconexion bg-desconexion-suave px-6 py-3 text-sm text-desconexion">
      {enVentana.map((planta) => {
        const minutos = minutosParaReapertura(planta, ahora);
        const reapertura = minutos === null ? null : new Date(ahora.getTime() + minutos * 60_000);
        return (
          <p key={planta.pdiv}>
            <strong>{planta.nombre}</strong> está en ventana de mantenimiento.
            {minutos !== null && reapertura
              ? ` Restablecimiento estimado a las ${reapertura.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", timeZone: "America/Mexico_City" })} (${minutos} min).`
              : " Restablecimiento pendiente de confirmación."}
          </p>
        );
      })}
    </div>
  );
}
