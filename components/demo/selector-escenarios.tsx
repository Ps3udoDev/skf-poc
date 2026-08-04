"use client";

import { useState, useTransition } from "react";
import { useSesion } from "@/components/sesion/proveedor-sesion";
import { activarEscenario } from "@/lib/sesion-demo/acciones";
import { ESCENARIOS } from "@/lib/sesion-demo/escenarios";
import { cn } from "@/lib/utilidades";

export function SelectorEscenarios() {
  const { sesion } = useSesion();
  const [copiado, setCopiado] = useState<string | null>(null);
  const [enVuelo, iniciar] = useTransition();

  async function copiar(clave: string, consulta: string) {
    await navigator.clipboard.writeText(consulta);
    setCopiado(clave);
    window.setTimeout(() => setCopiado(null), 1500);
  }

  return (
    <section aria-labelledby="titulo-escenarios">
      <h2 id="titulo-escenarios" className="text-lg font-semibold text-texto">
        Escenarios del guion
      </h2>
      <p className="mt-1 text-sm text-texto-tenue">
        Un clic prepara el modo y los estados de planta necesarios.
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {ESCENARIOS.map((escenario) => {
          const activo = sesion.escenarioActivo === escenario.clave;
          return (
            <article
              key={escenario.clave}
              className={cn(
                "rounded-xl border p-4",
                activo ? "border-primario bg-primario-suave" : "border-borde bg-fondo",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primario">
                    {escenario.escena}
                  </p>
                  <h3 className="mt-1 font-semibold text-texto">{escenario.nombre}</h3>
                </div>
                {activo && (
                  <span className="rounded-full bg-primario px-2 py-0.5 text-xs font-semibold text-primario-contraste">
                    Activo
                  </span>
                )}
              </div>
              <p className="mt-3 designacion rounded-md border border-borde bg-fondo-sutil px-3 py-2 text-sm text-texto">
                {escenario.consulta} · {escenario.cantidadSugerida} uds.
              </p>
              <p className="mt-3 text-sm leading-5 text-texto-tenue">{escenario.nota}</p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  disabled={enVuelo || activo}
                  onClick={() => iniciar(() => activarEscenario(escenario.clave))}
                  className="rounded-lg bg-primario px-3 py-2 text-sm font-medium text-primario-contraste disabled:opacity-40"
                >
                  {enVuelo ? "Aplicando…" : "Activar"}
                </button>
                <button
                  type="button"
                  onClick={() => void copiar(escenario.clave, escenario.consulta)}
                  className="rounded-lg border border-borde bg-fondo px-3 py-2 text-sm font-medium text-texto hover:bg-fondo-sutil"
                >
                  {copiado === escenario.clave ? "Copiada" : "Copiar consulta"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
