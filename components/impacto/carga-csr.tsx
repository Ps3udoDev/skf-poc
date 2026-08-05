import type { CargaCsr } from "@/lib/operacion/asignacion";

export function CargaCsrPanel({
  cargas,
  sinAsignar,
}: {
  cargas: readonly CargaCsr[];
  sinAsignar: number;
}) {
  const maximo = Math.max(1, ...cargas.map((c) => c.abiertas));
  return (
    <section className="rounded-xl border border-borde bg-fondo p-5" aria-labelledby="titulo-carga">
      <h2 id="titulo-carga" className="text-lg font-semibold text-texto">
        Reparto por CSR
      </h2>
      <p className="mt-1 text-sm text-texto-tenue">
        Asignación automática y balanceada, disponible desde la primera solicitud. Sustituye el
        reparto manual de las 11:30. Sobre datos simulados.
      </p>
      <ul className="mt-4 space-y-2">
        {cargas.map((carga) => (
          <li key={carga.codigo} className="flex items-center gap-3">
            <span className="designacion w-20 shrink-0 text-sm text-texto">{carga.codigo}</span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-fondo-sutil">
              <div
                className={`h-full rounded-full ${carga.activo ? "bg-primario" : "bg-borde"}`}
                style={{ width: `${(carga.abiertas / maximo) * 100}%` }}
              />
            </div>
            <span className="w-8 shrink-0 text-right text-sm font-medium text-texto">
              {carga.abiertas}
            </span>
            {!carga.activo && (
              <span className="shrink-0 text-xs text-texto-tenue">no disponible</span>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-texto-tenue">
        Sin asignar: <span className="font-medium text-texto">{sinAsignar}</span>
        {sinAsignar > 0 && " — no había ningún CSR disponible al recibirlas."}
      </p>
    </section>
  );
}
