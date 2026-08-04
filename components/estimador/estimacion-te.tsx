import type { Estimacion } from "@/lib/estimador/calculo";

const TEXTO_BASE: Record<Estimacion["base"], string> = {
  designacion: "cotizaciones previas de esta designación",
  familia: "cotizaciones previas de productos de la misma familia",
  global: "cotizaciones previas del catálogo",
};

const TEXTO_CONFIANZA: Record<Estimacion["confianza"], string> = {
  alta: "Confianza alta",
  media: "Confianza media",
  baja: "Confianza baja",
};

/**
 * Único punto de render de una estimación de tiempo de entrega.
 *
 * Los tres elementos son obligatorios y no configurables: el rango, la base y
 * el compromiso de confirmación. Presentar una estimación como tiempo
 * confirmado sería un problema comercial serio para SKF frente a sus clientes,
 * así que el diseño lo hace imposible por construcción.
 */
export function EstimacionTE({
  estimacion,
  horaConfirmacion,
}: {
  estimacion: Estimacion;
  horaConfirmacion?: string;
}) {
  return (
    <div className="rounded-md border border-borde bg-fondo-sutil p-4">
      <div className="flex items-baseline gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-texto-tenue">
          Tiempo de entrega estimado
        </span>
        <span className="rounded border border-borde px-1.5 py-0.5 text-[11px] text-texto-tenue">
          {TEXTO_CONFIANZA[estimacion.confianza]}
        </span>
      </div>

      {/* 1. El rango. Nunca un número solo: sería falsa precisión. */}
      <p className="mt-1 text-2xl font-semibold text-texto">
        {estimacion.semanasMin} a {estimacion.semanasMax} semanas
      </p>

      {/* 2. La base que lo sustenta. */}
      <p className="mt-1 text-sm text-texto-tenue">
        Basado en {estimacion.casos} {TEXTO_BASE[estimacion.base]}.
      </p>

      {/* 3. El compromiso de confirmación. */}
      <p className="mt-2 text-sm text-texto-tenue">
        Es una estimación, no un tiempo confirmado
        {horaConfirmacion
          ? `: se confirma en firme al restablecerse la conexión con la planta, aproximadamente a las ${horaConfirmacion}.`
          : ": el tiempo en firme se confirma al procesar la cotización."}
      </p>
    </div>
  );
}
