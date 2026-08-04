"use client";

import { type FormEvent, useState, useTransition } from "react";
import { buscarDesignacion, type ResultadoBusquedaPortal } from "@/app/(portal)/portal/acciones";
import { ResultadoBusqueda } from "./resultado-busqueda";

export function Buscador() {
  const [consulta, setConsulta] = useState("");
  const [cantidad, setCantidad] = useState(100);
  const [resultado, setResultado] = useState<ResultadoBusquedaPortal | null>(null);
  const [cantidadBuscada, setCantidadBuscada] = useState(100);
  const [error, setError] = useState<string | null>(null);
  const [enVuelo, iniciar] = useTransition();

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const texto = consulta.trim();
    if (!texto || !Number.isInteger(cantidad) || cantidad < 1) return;
    setError(null);
    iniciar(async () => {
      try {
        setResultado(await buscarDesignacion(texto, cantidad));
        setCantidadBuscada(cantidad);
      } catch (causa) {
        setError(causa instanceof Error ? causa.message : "No se pudo completar la búsqueda.");
      }
    });
  }

  return (
    <div>
      <form onSubmit={enviar} className="rounded-xl border border-borde bg-fondo p-5">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_10rem_auto] md:items-end">
          <label className="block">
            <span className="text-sm font-medium text-texto">Designación</span>
            <input
              value={consulta}
              onChange={(evento) => setConsulta(evento.target.value)}
              placeholder="Ej. DEMO-6205-2RSH/C3"
              autoComplete="off"
              className="designacion mt-2 h-12 w-full rounded-lg border border-borde bg-fondo px-4 text-base text-texto outline-none focus:border-primario focus:ring-2 focus:ring-primario-suave"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-texto">Cantidad</span>
            <input
              type="number"
              min={1}
              step={1}
              value={cantidad}
              onChange={(evento) => setCantidad(Number(evento.target.value))}
              className="mt-2 h-12 w-full rounded-lg border border-borde bg-fondo px-4 text-base text-texto outline-none focus:border-primario focus:ring-2 focus:ring-primario-suave"
            />
          </label>
          <button
            type="submit"
            disabled={enVuelo || !consulta.trim() || cantidad < 1}
            className="h-12 rounded-lg bg-primario px-6 text-sm font-semibold text-primario-contraste hover:opacity-90 disabled:opacity-50"
          >
            {enVuelo ? "Consultando…" : "Consultar"}
          </button>
        </div>
        <p className="mt-3 h-5 text-sm text-texto-tenue" role="status">
          {enVuelo ? "Validando la designación y reuniendo su contexto QMS…" : ""}
        </p>
      </form>
      {error && (
        <div className="mt-4 rounded-lg border border-error bg-error-suave p-4 text-sm text-error">
          {error}
        </div>
      )}
      {resultado && <ResultadoBusqueda resultado={resultado} cantidad={cantidadBuscada} />}
    </div>
  );
}
