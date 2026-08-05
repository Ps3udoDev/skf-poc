import type { CumplimientoSla } from "@/lib/fuentes/cotizaciones";
import { DIAS_SLA } from "@/lib/reglas-qms";

const PORCENTAJE = new Intl.NumberFormat("es-MX", { style: "percent", maximumFractionDigits: 0 });
const ENTERO = new Intl.NumberFormat("es-MX");

export function CumplimientoSlaPanel({ sla }: { sla: CumplimientoSla }) {
  return (
    <section className="rounded-xl border border-borde bg-fondo p-5" aria-labelledby="titulo-sla">
      <h2 id="titulo-sla" className="text-lg font-semibold text-texto">
        Cumplimiento del SLA
      </h2>
      <p className="mt-1 text-sm text-texto-tenue">
        Respuestas dentro de {DIAS_SLA} días hábiles. Operación simulada acumulada, no la sesión.
      </p>
      <p className="mt-4 text-4xl font-semibold tracking-tight text-texto">
        {PORCENTAJE.format(sla.tasa)}
      </p>
      <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <div className="flex justify-between">
          <dt className="text-texto-tenue">Respondidas</dt>
          <dd className="font-medium text-texto">{ENTERO.format(sla.respondidas)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-texto-tenue">Dentro del SLA</dt>
          <dd className="font-medium text-texto">{ENTERO.format(sla.dentroDelSla)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-texto-tenue">Sin responder</dt>
          <dd className="font-medium text-texto">{ENTERO.format(sla.pendientes)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-texto-tenue">Mediana</dt>
          <dd className="font-medium text-texto">{sla.medianaDiasHabiles} días hábiles</dd>
        </div>
      </dl>
      <p className="mt-4 text-xs leading-5 text-texto-tenue">
        Supuesto abierto con SKF: se excluyen sábados y domingos; los festivos locales todavía no,
        porque falta confirmar cómo los trata el cliente.
      </p>
    </section>
  );
}
