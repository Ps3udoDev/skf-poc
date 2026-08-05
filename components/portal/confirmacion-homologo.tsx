"use client";

import { useState, useTransition } from "react";
import { confirmarHomologo, equivalenciasDe } from "@/app/(portal)/portal/acciones";
import type { Confirmacion } from "@/lib/validador/confirmacion";

export function ConfirmacionHomologo({ codigo, cantidad }: { codigo: string; cantidad: number }) {
  const [equivalencias, setEquivalencias] = useState<Confirmacion[] | null>(null);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [marcados, setMarcados] = useState<Set<number>>(new Set());
  const [resultado, setResultado] = useState<{
    designacion: string;
    requiereIngenieriaVentas: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enVuelo, iniciar] = useTransition();

  function cargar() {
    setError(null);
    iniciar(async () => {
      try {
        setEquivalencias(await equivalenciasDe(codigo));
      } catch (causa) {
        setError(
          causa instanceof Error ? causa.message : "No se pudieron cargar las equivalencias.",
        );
      }
    });
  }

  function abrir(equivalente: string) {
    setAbierta(equivalente === abierta ? null : equivalente);
    setMarcados(new Set());
    setResultado(null);
  }

  function alternar(indice: number) {
    const siguiente = new Set(marcados);
    if (siguiente.has(indice)) siguiente.delete(indice);
    else siguiente.add(indice);
    setMarcados(siguiente);
  }

  if (equivalencias === null) {
    return (
      <button
        type="button"
        onClick={cargar}
        disabled={enVuelo}
        className="mt-3 rounded-lg border border-borde px-3 py-1.5 text-sm font-medium text-texto hover:bg-fondo-sutil disabled:opacity-50"
      >
        {enVuelo ? "Buscando equivalencias…" : "Ver equivalencias registradas"}
      </button>
    );
  }

  if (equivalencias.length === 0) {
    return (
      <p className="mt-3 text-sm text-texto-tenue">
        No hay equivalencias registradas para esta designación.
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      {error && (
        <div className="rounded-lg border border-error bg-error-suave p-3 text-sm text-error">
          {error}
        </div>
      )}
      {equivalencias.map((equivalencia) => {
        const activa = abierta === equivalencia.equivalente;
        const completos = marcados.size === equivalencia.pasos.length;
        return (
          <div
            key={equivalencia.equivalente}
            className="rounded-lg border border-borde bg-fondo p-3"
          >
            <button
              type="button"
              onClick={() => abrir(equivalencia.equivalente)}
              className="flex w-full flex-wrap items-center justify-between gap-2 text-left"
            >
              <span>
                <span className="designacion font-medium text-texto">
                  {equivalencia.equivalente}
                </span>
                <span className="ml-2 text-sm text-texto-tenue">{equivalencia.motivo}</span>
              </span>
              <span className="text-sm text-primario">{activa ? "Cerrar" : "Revisar"}</span>
            </button>

            {activa && (
              <div className="mt-3 space-y-2 border-t border-borde pt-3 text-sm">
                <p className="text-texto-tenue">
                  Punto {equivalencia.punto} del procedimiento. Reconoce cada diferencia técnica
                  antes de aceptar la equivalencia.
                </p>
                {equivalencia.pasos.map((paso, indice) => (
                  <label key={paso.atributo} className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={marcados.has(indice)}
                      onChange={() => alternar(indice)}
                      className="mt-1"
                    />
                    <span>
                      <span className="font-medium text-texto">{paso.atributo}:</span>{" "}
                      <span className="text-texto-tenue">
                        {paso.valorOrigen} → {paso.valorEquivalente}
                      </span>
                      {paso.requiereValidacion && (
                        <span className="block text-texto">
                          Cambia el ajuste o el envolvente de operación: requiere validación de
                          Ingeniería de Ventas.
                        </span>
                      )}
                    </span>
                  </label>
                ))}

                <button
                  type="button"
                  disabled={enVuelo || !completos}
                  onClick={() =>
                    iniciar(async () => {
                      setError(null);
                      try {
                        setResultado(
                          await confirmarHomologo(codigo, equivalencia.equivalente, cantidad),
                        );
                      } catch (causa) {
                        setError(
                          causa instanceof Error
                            ? causa.message
                            : "No se pudo confirmar la equivalencia.",
                        );
                      }
                    })
                  }
                  className="rounded-lg bg-primario px-4 py-2 font-medium text-primario-contraste hover:opacity-90 disabled:opacity-50"
                >
                  {completos ? "Aceptar equivalencia" : "Marca cada diferencia para continuar"}
                </button>

                {resultado && resultado.designacion === equivalencia.equivalente && (
                  <div
                    className={
                      resultado.requiereIngenieriaVentas
                        ? "rounded-lg border border-primario bg-primario-suave p-3 text-primario"
                        : "rounded-lg border border-confirmacion bg-confirmacion-suave p-3 text-confirmacion"
                    }
                  >
                    {resultado.requiereIngenieriaVentas ? (
                      <p>
                        Equivalencia registrada con{" "}
                        <span className="designacion font-semibold">{resultado.designacion}</span>,
                        <strong> sujeta a validación de Ingeniería de Ventas</strong>. No se
                        presenta como equivalencia confirmada.
                      </p>
                    ) : (
                      <p>
                        Equivalencia confirmada con{" "}
                        <span className="designacion font-semibold">{resultado.designacion}</span>.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
