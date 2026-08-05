"use client";

import type { Estimacion } from "@/lib/estimador/calculo";
import type { Almacen } from "@/lib/reglas-qms";
import type { Estrategia, Sugerencia } from "@/lib/validador/tipos";
import { DetalleDesignacion } from "./detalle-designacion";
import { EtiquetaQMS } from "./etiqueta-qms";

const ALMACENES: Almacen[] = ["PS", "SL", "XX"];

export function TarjetaSugerencia({
  sugerencia,
  estimacion,
  cantidad,
  estrategia,
  plantaEnVentana,
}: {
  sugerencia: Sugerencia;
  estimacion: Estimacion | null;
  cantidad: number;
  estrategia: Estrategia;
  plantaEnVentana: { pdiv: string; planta: string } | null;
}) {
  const { designacion, evaluacion } = sugerencia;
  const stock = Object.fromEntries(sugerencia.existencias.map((e) => [e.almacen, e.cantidad]));
  const incumpleMoq = cantidad < designacion.moq;
  const incumplePack = cantidad % designacion.packQuantity !== 0;

  return (
    <article className="overflow-hidden rounded-xl border border-borde bg-fondo">
      <div className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="designacion text-lg font-semibold text-primario">
              {designacion.designacion}
            </h3>
            <p className="mt-1 text-sm text-texto-tenue">{designacion.descripcion}</p>
          </div>
          <EtiquetaQMS designacion={designacion} />
        </div>

        <div className="mt-4 grid grid-cols-3 divide-x divide-borde rounded-lg border border-borde">
          {ALMACENES.map((almacen) => (
            <div key={almacen} className="px-3 py-2 text-center">
              <p className="text-xs font-medium text-texto-tenue">Almacén {almacen}</p>
              <p className="mt-0.5 designacion text-base font-semibold text-texto">
                {plantaEnVentana ? "—" : (stock[almacen] ?? 0)}
              </p>
            </div>
          ))}
        </div>

        {plantaEnVentana && (
          <div className="mt-3 rounded-lg border border-desconexion bg-desconexion-suave p-3 text-sm text-desconexion">
            <p className="font-medium">Inventario en vivo no disponible</p>
            <p className="mt-1">
              {plantaEnVentana.planta} ({plantaEnVentana.pdiv}) está desconectada. No mostramos
              existencias sin confirmar; el precio, el contexto QMS y el TE histórico siguen
              disponibles como orientación.
            </p>
          </div>
        )}

        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-texto-tenue">Cantidad mínima de orden (MOQ)</dt>
            <dd className="font-medium text-texto">{designacion.moq}</dd>
          </div>
          <div>
            <dt className="text-texto-tenue">Pack quantity</dt>
            <dd className="font-medium text-texto">{designacion.packQuantity}</dd>
          </div>
        </dl>

        {(incumpleMoq || incumplePack) && (
          <div className="mt-3 rounded-lg border border-borde bg-fondo-sutil p-3 text-sm text-texto">
            {incumpleMoq && (
              <p>
                La cantidad solicitada ({cantidad}) es menor al MOQ de {designacion.moq}.
              </p>
            )}
            {incumplePack && (
              <p>
                La cantidad debe ajustarse al múltiplo de pack quantity. Cantidad efectiva:{" "}
                {evaluacion.cantidadEfectiva}.
              </p>
            )}
          </div>
        )}

        <div className="mt-3 space-y-2 text-sm">
          {designacion.reemplazadoPor && (
            <p>
              Reemplazo disponible:{" "}
              <span className="designacion font-medium">{designacion.reemplazadoPor}</span>
            </p>
          )}
          {designacion.reemplazoIndicadoFabrica && (
            <p>
              Reemplazo indicado por fábrica:{" "}
              <span className="designacion font-medium">
                {designacion.reemplazoIndicadoFabrica}
              </span>
              ; aún no existe en el catálogo.
            </p>
          )}
          {evaluacion.avisos.map((aviso) => (
            <p key={`${aviso.tipo}-${aviso.punto}`} className="text-texto-tenue">
              <span className="font-medium text-texto">Punto {aviso.punto}:</span> {aviso.mensaje}
            </p>
          ))}
          {!sugerencia.planta?.tieneConexion && !sugerencia.planta?.tieneRutaEmbarque && (
            <p className="text-error">
              La planta no tiene conexión ni ruta de embarque; la solicitud sería declinada.
            </p>
          )}
        </div>

        <div className="mt-4 border-l-2 border-primario pl-3 text-sm">
          <p className="font-medium text-texto">Regla QMS · punto {evaluacion.punto}</p>
          <p className="mt-1 text-texto-tenue">{evaluacion.mensaje}</p>
        </div>
      </div>
      <DetalleDesignacion
        sugerencia={sugerencia}
        estimacion={estimacion}
        cantidad={cantidad}
        estrategia={estrategia}
        plantaEnVentana={plantaEnVentana}
      />
    </article>
  );
}
