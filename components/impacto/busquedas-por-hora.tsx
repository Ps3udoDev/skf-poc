"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/** Las 24 horas siempre presentes: una gráfica con dos barras no se lee. */
function serie(datos: Record<string, number>) {
  return Array.from({ length: 24 }, (_, hora) => ({
    hora: `${String(hora).padStart(2, "0")}:00`,
    busquedas: datos[String(hora)] ?? 0,
  }));
}

export function BusquedasPorHora({ datos }: { datos: Record<string, number> }) {
  return (
    <section
      className="rounded-xl border border-borde bg-fondo p-5"
      aria-labelledby="titulo-busquedas"
    >
      <h2 id="titulo-busquedas" className="text-lg font-semibold text-texto">
        Búsquedas por hora
      </h2>
      <p className="mt-1 text-sm text-texto-tenue">
        Distribución horaria de la sesión, sobre datos simulados. Hora de la Ciudad de México.
      </p>
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={serie(datos)} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--borde)" vertical={false} />
            <XAxis
              dataKey="hora"
              interval={2}
              tick={{ fontSize: 11, fill: "var(--texto-tenue)" }}
              stroke="var(--borde)"
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: "var(--texto-tenue)" }}
              stroke="var(--borde)"
            />
            <Tooltip
              cursor={{ fill: "var(--fondo-sutil)" }}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid var(--borde)",
                fontSize: 12,
              }}
              formatter={(valor) => [String(valor), "Búsquedas"]}
            />
            <Bar dataKey="busquedas" fill="var(--primario)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
