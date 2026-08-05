"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { refrescarIndicadores, refrescarPanelOperativo } from "@/lib/metricas/acciones";
import type { Indicadores } from "@/lib/metricas/calculo";
import type { PanelOperativo } from "@/lib/metricas/operacion";
import { debeSondear, MS_INTERVALO_SONDEO } from "@/lib/sesion-demo/sondeo";
import type { EstadoCanal } from "@/lib/sesion-demo/tipos";
import { clienteNavegador } from "@/lib/supabase/navegador";

/**
 * Margen de agrupación de INSERT.
 *
 * Una sola búsqueda puede emitir `busqueda`, `aviso_moq` y
 * `aviso_pack_quantity` casi a la vez: sin este margen, la escena 2 dispara
 * tres recálculos idénticos seguidos contra el servidor.
 */
const MS_AGRUPACION = 400;

/**
 * Indicadores que se actualizan solos.
 *
 * El canal de Realtime sobre `eventos_demo` **solo invalida**: al recibir un
 * INSERT, el hook vuelve a pedir el cálculo al servidor. No transporta el
 * evento ni lo suma en el cliente.
 *
 * Pasa `panelInicial` para que además refresque el panel operativo; con `null`
 * solo mantiene los indicadores, que es lo que necesita `/demo`.
 */
export function useIndicadores(
  inicial: Indicadores,
  panelInicial: PanelOperativo | null = null,
): { indicadores: Indicadores; panel: PanelOperativo | null; estadoCanal: EstadoCanal } {
  const [indicadores, setIndicadores] = useState(inicial);
  const [panel, setPanel] = useState<PanelOperativo | null>(panelInicial);
  const [estadoCanal, setEstadoCanal] = useState<EstadoCanal>("conectando");
  const abiertoEn = useRef(Date.now());
  const agrupador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const conPanel = panelInicial !== null;

  const refrescar = useCallback(() => {
    // Un fallo de métrica no puede tumbar la pantalla proyectada: se queda con
    // la última cifra buena, igual que hace <ColaIntenciones>.
    refrescarIndicadores()
      .then(setIndicadores)
      .catch(() => {});
    if (!conPanel) return;
    refrescarPanelOperativo()
      .then(setPanel)
      .catch(() => {});
  }, [conPanel]);

  const agrupar = useCallback(() => {
    if (agrupador.current) return;
    agrupador.current = setTimeout(() => {
      agrupador.current = null;
      refrescar();
    }, MS_AGRUPACION);
  }, [refrescar]);

  // Suscripción TEMPRANA, igual que <ProveedorSesion>: el arranque en frío de
  // Realtime que el Plan 1 midió por encima de 15 s tras inactividad tiene que
  // ocurrir mientras el presentador habla, no cuando proyecta la pantalla.
  useEffect(() => {
    const supabase = clienteNavegador();
    const canal = supabase
      .channel("eventos-demo")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "eventos_demo" }, agrupar)
      .subscribe((estado) => {
        if (estado === "SUBSCRIBED") setEstadoCanal("suscrito");
        else if (estado === "CHANNEL_ERROR" || estado === "TIMED_OUT") setEstadoCanal("error");
        else if (estado === "CLOSED") setEstadoCanal("cerrado");
      });

    return () => {
      if (agrupador.current) clearTimeout(agrupador.current);
      void supabase.removeChannel(canal);
    };
  }, [agrupar]);

  // Respaldo por sondeo, con las mismas constantes que la sesión. No se abre un
  // mecanismo de sincronización nuevo ni se duplican esos valores.
  useEffect(() => {
    const temporizador = setInterval(() => {
      if (!debeSondear(estadoCanal, Date.now() - abiertoEn.current)) return;
      refrescar();
    }, MS_INTERVALO_SONDEO);
    return () => clearInterval(temporizador);
  }, [estadoCanal, refrescar]);

  return { indicadores, panel, estadoCanal };
}
