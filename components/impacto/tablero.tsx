"use client";

import { BusquedasPorHora } from "@/components/impacto/busquedas-por-hora";
import { CargaCsrPanel } from "@/components/impacto/carga-csr";
import { CumplimientoSlaPanel } from "@/components/impacto/cumplimiento-sla";
import { TarjetaMetrica } from "@/components/impacto/tarjeta-metrica";
import { VentanasSemana } from "@/components/impacto/ventanas-semana";
import { useIndicadores } from "@/components/metricas/uso-indicadores";
import { type Indicadores, MINUTOS_POR_SOLICITUD } from "@/lib/metricas/calculo";
import type { PanelOperativo } from "@/lib/metricas/operacion";

const PORCENTAJE = new Intl.NumberFormat("es-MX", { style: "percent", maximumFractionDigits: 0 });

export function Tablero({
  indicadoresIniciales,
  panelInicial,
}: {
  indicadoresIniciales: Indicadores;
  panelInicial: PanelOperativo | null;
}) {
  const { indicadores, panel } = useIndicadores(indicadoresIniciales, panelInicial);

  return (
    <div className="space-y-6">
      <section aria-labelledby="titulo-metricas">
        <h2 id="titulo-metricas" className="text-lg font-semibold text-texto">
          Impacto de la sesión
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <TarjetaMetrica
            etiqueta="Solicitudes evitadas"
            valor={String(indicadores.solicitudesEvitadas)}
            nota="Consultas resueltas en el portal que no llegaron a Servicio al Cliente."
            destacada
          />
          <TarjetaMetrica
            etiqueta="Minutos de operador liberados"
            valor={String(indicadores.minutosOperadorLiberados)}
            nota={`Supuesto del POC: ${MINUTOS_POR_SOLICITUD} minutos por solicitud evitada. No es una medición; confirmarlo es objetivo de la Fase 1.`}
          />
          <TarjetaMetrica
            etiqueta="Errores de homólogo prevenidos"
            valor={String(indicadores.confirmacionesHomologo)}
            nota="Confirmaciones guiadas completadas paso por paso (punto 4.6)."
          />
          <TarjetaMetrica
            etiqueta="Avisos anticipados"
            valor={String(indicadores.avisosAnticipados)}
            nota="MOQ y pack quantity advertidos antes de enviar (puntos 4.4 y 4.5a)."
          />
          <TarjetaMetrica
            etiqueta="Solicitudes generadas"
            valor={String(indicadores.solicitudesGeneradas)}
            nota="Las que sí requirieron intervención humana."
          />
          <TarjetaMetrica
            etiqueta="Resueltas sin solicitud"
            valor={PORCENTAJE.format(indicadores.tasaResueltasSinSolicitud)}
            nota="Evitadas sobre el total de consultas que terminaron en una decisión."
          />
          <TarjetaMetrica
            etiqueta="Llamadas al modelo"
            valor={String(indicadores.llamadasModelo)}
            nota="Consultas atendidas por el asistente en los dos perfiles."
          />
        </div>
      </section>

      <BusquedasPorHora datos={indicadores.busquedasPorHora} />

      {panel && (
        <section aria-labelledby="titulo-operacion" className="space-y-6">
          <h2 id="titulo-operacion" className="text-lg font-semibold text-texto">
            Operación
          </h2>
          <div className="grid gap-6 xl:grid-cols-2">
            <CargaCsrPanel cargas={panel.cargas} sinAsignar={panel.sinAsignar} />
            <CumplimientoSlaPanel sla={panel.sla} />
          </div>
          <VentanasSemana franjas={panel.franjas} minutosSemana={panel.minutosVentanaSemana} />
        </section>
      )}
    </div>
  );
}
