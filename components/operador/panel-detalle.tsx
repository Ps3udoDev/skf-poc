"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  asignarSolicitud,
  type DetalleSolicitud,
  detalleDeSolicitud,
  resolverSolicitud,
} from "@/app/(operador)/acciones";
import { EstimacionTE } from "@/components/estimador/estimacion-te";
import type { CargaCsr } from "@/lib/fuentes";
import type { MotivoDeclinado } from "@/lib/reglas-qms";

const MOTIVOS: { valor: MotivoDeclinado; etiqueta: string }[] = [
  { valor: "designacion_invalida", etiqueta: "Designación inválida (4.8)" },
  { valor: "planta_sin_ruta", etiqueta: "Planta sin conexión ni ruta (4.5b)" },
  { valor: "obsoleto_sin_reemplazo", etiqueta: "Obsoleto sin reemplazo (4.7)" },
  { valor: "moq_mayor", etiqueta: "MOQ mayor a lo solicitado (4.4)" },
  { valor: "ya_disponible_wcl", etiqueta: "Ya disponible en WCL (4.1)" },
];

export function PanelDetalle({
  numero,
  cargas,
  onCerrar,
}: {
  numero: string;
  cargas: readonly CargaCsr[];
  onCerrar: () => void;
}) {
  const router = useRouter();
  const [detalle, setDetalle] = useState<DetalleSolicitud | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [motivo, setMotivo] = useState<MotivoDeclinado | "">("");
  const [enVuelo, iniciar] = useTransition();

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setError(null);
    detalleDeSolicitud(numero)
      .then((resultado) => {
        if (!vigente) return;
        setDetalle(resultado);
        setCargando(false);
      })
      .catch((causa: unknown) => {
        if (!vigente) return;
        setError(causa instanceof Error ? causa.message : "No se pudo cargar el detalle.");
        setCargando(false);
      });
    // Cancela el resultado de una solicitud anterior si el CSR cambia de fila
    // antes de que responda: sin esto, el panel puede terminar mostrando el
    // detalle de la fila que ya no está seleccionada.
    return () => {
      vigente = false;
    };
  }, [numero]);

  function ejecutar(accion: () => Promise<void>) {
    setError(null);
    iniciar(async () => {
      try {
        await accion();
        setDetalle(await detalleDeSolicitud(numero));
        router.refresh();
      } catch (causa) {
        setError(causa instanceof Error ? causa.message : "No se pudo completar la acción.");
      }
    });
  }

  return (
    <aside className="rounded-xl border border-borde bg-fondo p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-texto-tenue">Solicitud</p>
          <h2 className="designacion mt-1 text-lg font-semibold text-texto">{numero}</h2>
        </div>
        <button
          type="button"
          onClick={onCerrar}
          className="rounded-lg border border-borde px-2.5 py-1 text-xs font-medium text-texto hover:bg-fondo-sutil"
        >
          Cerrar
        </button>
      </div>

      {cargando && <p className="mt-4 text-sm text-texto-tenue">Reuniendo el contexto QMS…</p>}
      {error && (
        <div className="mt-4 rounded-lg border border-error bg-error-suave p-3 text-sm text-error">
          {error}
        </div>
      )}

      {detalle && (
        <div className="mt-4 space-y-4 text-sm">
          <div>
            <p className="text-texto-tenue">Designación capturada</p>
            <p className="designacion font-medium text-texto">{detalle.fila.designacionTexto}</p>
            <p className="mt-1 text-texto-tenue">
              {detalle.fila.cantidad} piezas · cantidad efectiva{" "}
              {detalle.evaluacion.cantidadEfectiva}
            </p>
          </div>

          <div className="border-l-2 border-primario pl-3">
            <p className="font-medium text-texto">Regla QMS · punto {detalle.evaluacion.punto}</p>
            <p className="mt-1 text-texto-tenue">{detalle.evaluacion.mensaje}</p>
          </div>

          {detalle.evaluacion.avisos.length > 0 && (
            <ul className="space-y-1">
              {detalle.evaluacion.avisos.map((aviso) => (
                <li key={`${aviso.tipo}-${aviso.punto}`} className="text-texto-tenue">
                  <span className="font-medium text-texto">Punto {aviso.punto}:</span>{" "}
                  {aviso.mensaje}
                </li>
              ))}
            </ul>
          )}

          {detalle.contexto.designacion === null ? (
            <p className="text-texto-tenue">
              La designación capturada no existe en el catálogo: no hay existencias, homólogos ni
              estimación que mostrar.
            </p>
          ) : (
            <>
              <div>
                <p className="text-texto-tenue">Existencias</p>
                <p className="text-texto">
                  {detalle.contexto.existencias.length === 0
                    ? "Sin existencias registradas"
                    : detalle.contexto.existencias
                        .map((existencia) => `${existencia.almacen}: ${existencia.cantidad}`)
                        .join(" · ")}
                </p>
              </div>

              {detalle.homologos.length > 0 && (
                <div>
                  <p className="text-texto-tenue">Homólogos registrados</p>
                  <ul className="mt-1 space-y-1">
                    {detalle.homologos.map((homologo) => (
                      <li key={homologo.equivalente}>
                        <span className="designacion font-medium text-texto">
                          {homologo.equivalente}
                        </span>
                        <span className="text-texto-tenue"> · {homologo.motivo}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {detalle.estimacion ? (
                <EstimacionTE estimacion={detalle.estimacion} />
              ) : (
                <p className="text-texto-tenue">
                  No hay base histórica suficiente para estimar el tiempo de entrega. Se confirmará
                  al procesar la cotización.
                </p>
              )}
            </>
          )}

          <div className="border-t border-borde pt-4">
            <label className="block">
              <span className="text-texto-tenue">CSR asignado</span>
              <select
                value={detalle.fila.csrAsignado ?? ""}
                disabled={enVuelo}
                onChange={(evento) =>
                  ejecutar(() =>
                    asignarSolicitud(
                      numero,
                      evento.target.value === "" ? null : evento.target.value,
                    ),
                  )
                }
                className="mt-1 h-10 w-full rounded-lg border border-borde bg-fondo px-3 text-sm text-texto outline-none focus:border-primario focus:ring-2 focus:ring-primario-suave"
              >
                <option value="">Sin asignar</option>
                {cargas
                  .filter((carga) => carga.activo)
                  .map((carga) => (
                    <option key={carga.codigo} value={carga.codigo}>
                      {carga.codigo} · {carga.abiertas} abiertas
                    </option>
                  ))}
              </select>
            </label>
          </div>

          {detalle.fila.atendidaEn === null ? (
            <div className="space-y-2 border-t border-borde pt-4">
              <p className="text-texto-tenue">Resolver</p>
              <button
                type="button"
                disabled={enVuelo}
                onClick={() => ejecutar(() => resolverSolicitud(numero, "cotizada"))}
                className="w-full rounded-lg bg-primario px-4 py-2 font-medium text-primario-contraste hover:opacity-90 disabled:opacity-50"
              >
                Marcar como cotizada
              </button>
              <select
                value={motivo}
                onChange={(evento) => setMotivo(evento.target.value as MotivoDeclinado | "")}
                className="h-10 w-full rounded-lg border border-borde bg-fondo px-3 text-sm text-texto outline-none focus:border-primario focus:ring-2 focus:ring-primario-suave"
              >
                <option value="">Motivo según la clasificación QMS</option>
                {MOTIVOS.map((opcion) => (
                  <option key={opcion.valor} value={opcion.valor}>
                    {opcion.etiqueta}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={enVuelo}
                onClick={() =>
                  ejecutar(() =>
                    resolverSolicitud(numero, "declinada", motivo === "" ? undefined : motivo),
                  )
                }
                className="w-full rounded-lg border border-borde px-4 py-2 font-medium text-texto hover:bg-fondo-sutil disabled:opacity-50"
              >
                Declinar
              </button>
            </div>
          ) : (
            <div className="border-t border-borde pt-4">
              <p className="text-texto">
                Resuelta como{" "}
                <span className="font-medium">
                  {detalle.fila.resultado === "cotizada" ? "cotizada" : "declinada"}
                </span>
                {detalle.fila.motivoDeclinado && ` · ${detalle.fila.motivoDeclinado}`}
              </p>
              <p className="mt-1 text-texto-tenue">
                {new Date(detalle.fila.atendidaEn).toLocaleString("es-MX")}
              </p>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
