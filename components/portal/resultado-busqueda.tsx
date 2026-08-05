"use client";

import { useState, useTransition } from "react";
import { generarSolicitud, type ResultadoBusquedaPortal } from "@/app/(portal)/portal/acciones";
import { TarjetaSugerencia } from "./tarjeta-sugerencia";

export function ResultadoBusqueda({
  resultado,
  cantidad,
}: {
  resultado: ResultadoBusquedaPortal;
  cantidad: number;
}) {
  const [numero, setNumero] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enVuelo, iniciar] = useTransition();
  const permiteSolicitud = resultado.tipo !== "exacta" || Boolean(resultado.sistemaNoDisponible);

  function solicitar() {
    setError(null);
    iniciar(async () => {
      try {
        setNumero(await generarSolicitud(resultado.consulta, cantidad));
      } catch (causa) {
        setError(causa instanceof Error ? causa.message : "No se pudo generar la solicitud.");
      }
    });
  }

  return (
    <section className="mt-6" aria-live="polite">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-texto-tenue">
            Resultado de la consulta
          </p>
          <h2 className="mt-1 text-xl font-semibold text-texto">
            {resultado.sistemaNoDisponible
              ? "Sistema de planta no disponible"
              : resultado.tipo === "truncada"
                ? "La designación parece incompleta"
                : resultado.tipo === "similar"
                  ? "No se encontró esa designación exacta"
                  : resultado.mensaje}
          </h2>
          {resultado.sistemaNoDisponible && (
            <p className="mt-1 text-sm text-texto-tenue">
              {resultado.sistemaNoDisponible.planta} ({resultado.sistemaNoDisponible.pdiv}) está en
              ventana de mantenimiento. No podemos consultar disponibilidad en vivo.
            </p>
          )}
          {resultado.tipo === "truncada" && (
            <p className="mt-1 text-sm text-texto-tenue">
              Estas son las completaciones más probables del catálogo.
            </p>
          )}
        </div>
        {permiteSolicitud && !numero && (
          <button
            type="button"
            onClick={solicitar}
            disabled={enVuelo}
            className="rounded-lg border border-primario px-4 py-2 text-sm font-medium text-primario hover:bg-primario-suave disabled:opacity-50"
          >
            {enVuelo ? "Generando…" : "Solicitar cotización"}
          </button>
        )}
      </div>
      {numero && (
        <div className="mb-4 rounded-lg border border-confirmacion bg-confirmacion-suave p-4 text-sm text-confirmacion">
          Solicitud generada correctamente:{" "}
          <span className="designacion font-semibold">{numero}</span>
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-lg border border-error bg-error-suave p-4 text-sm text-error">
          {error}
        </div>
      )}
      {resultado.candidatos.length > 0 ? (
        <div className="space-y-4">
          {resultado.candidatos.map((sugerencia) => (
            <TarjetaSugerencia
              key={sugerencia.designacion.designacion}
              sugerencia={sugerencia}
              cantidad={cantidad}
              estrategia={resultado.estrategia}
              estimacion={resultado.estimaciones[sugerencia.designacion.designacion] ?? null}
              plantaEnVentana={
                resultado.plantasEnVentana[sugerencia.designacion.designacion] ?? null
              }
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-borde bg-fondo p-8 text-center">
          {resultado.sistemaNoDisponible ? (
            <div>
              <p className="font-medium text-texto">Disponibilidad temporalmente inaccesible</p>
              <p className="mt-2 text-sm text-texto-tenue">
                En la situación actual no hay una fuente alternativa confirmada. Genera una
                solicitud para que Servicio al Cliente la procese cuando la planta se restablezca.
              </p>
            </div>
          ) : (
            <p className="text-sm text-texto-tenue">
              Revisa la captura o genera una solicitud para que Servicio al Cliente la investigue.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
