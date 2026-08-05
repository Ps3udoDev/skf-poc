import type { FranjaVentana } from "@/lib/estado-fabricas/semana";

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MINUTOS_DIA = 1440;

function hora(minutos: number): string {
  const normalizado = ((minutos % MINUTOS_DIA) + MINUTOS_DIA) % MINUTOS_DIA;
  const h = Math.floor(normalizado / 60);
  const m = normalizado % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function VentanasSemana({
  franjas,
  minutosSemana,
}: {
  franjas: readonly FranjaVentana[];
  minutosSemana: number;
}) {
  const plantas = [...new Set(franjas.map((f) => f.pdiv))];
  const horas = (minutosSemana / 60).toFixed(1).replace(".", ",");

  return (
    <section
      className="rounded-xl border border-borde bg-fondo p-5"
      aria-labelledby="titulo-ventanas"
    >
      <h2 id="titulo-ventanas" className="text-lg font-semibold text-texto">
        Ventanas de desconexión de la semana
      </h2>
      <p className="mt-1 text-sm text-texto-tenue">
        {horas} horas de fábrica no consultable en los próximos siete días, sobre datos simulados.
        Hora de la Ciudad de México.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr>
              <th className="w-20 py-2 text-left text-xs font-medium text-texto-tenue">Planta</th>
              {franjas
                .filter((f) => f.pdiv === plantas[0])
                .map((f) => (
                  <th
                    key={f.diaOffset}
                    className="py-2 text-left text-xs font-medium text-texto-tenue"
                  >
                    {DIAS[f.dia]}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {plantas.map((pdiv) => (
              <tr key={pdiv} className="border-t border-borde">
                <td className="designacion py-2 text-texto">{pdiv}</td>
                {franjas
                  .filter((f) => f.pdiv === pdiv)
                  .map((f) => (
                    <td key={f.diaOffset} className="py-2 pr-3">
                      {/* Ámbar: es lo único de esta pantalla que trata de desconexión. */}
                      <span className="designacion inline-flex rounded border border-desconexion bg-desconexion-suave px-1.5 py-0.5 text-xs text-desconexion">
                        {hora(f.inicioMin)}–{hora(f.inicioMin + f.duracionMin)}
                      </span>
                    </td>
                  ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
