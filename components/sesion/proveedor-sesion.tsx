"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ahoraSimulada, type EstadoPlanta, estadoDeTodas } from "@/lib/estado-fabricas";
import type { PlantaCompleta } from "@/lib/fuentes/plantas";
import { debeSondear, MS_INTERVALO_SONDEO } from "@/lib/sesion-demo/sondeo";
import type { EstadoCanal, SesionDemo } from "@/lib/sesion-demo/tipos";
import { clienteNavegador } from "@/lib/supabase/navegador";

interface ValorSesion {
  sesion: SesionDemo;
  estadoCanal: EstadoCanal;
  plantas: readonly PlantaCompleta[];
  estados: Record<string, EstadoPlanta>;
  ahora: Date;
}

const Contexto = createContext<ValorSesion | null>(null);

export function useSesion(): ValorSesion {
  const valor = useContext(Contexto);
  if (!valor) throw new Error("useSesion debe usarse dentro de <ProveedorSesion>");
  return valor;
}

/** Cada cuánto refresca el reloj de pantalla la cuenta regresiva del banner. */
const MS_TIC_RELOJ = 15_000;

export function ProveedorSesion({
  sesionInicial,
  plantas,
  children,
}: {
  sesionInicial: SesionDemo;
  plantas: readonly PlantaCompleta[];
  children: ReactNode;
}) {
  const [sesion, setSesion] = useState(sesionInicial);
  const [estadoCanal, setEstadoCanal] = useState<EstadoCanal>("conectando");
  const [ahora, setAhora] = useState(() => new Date());
  const abiertoEn = useRef(Date.now());

  // Suscripción TEMPRANA: se abre al montar la pantalla, no al primer cambio de
  // estado. Así el arranque en frío del servicio —que el Plan 1 midió en más de
  // 15 s tras inactividad— ocurre mientras el presentador todavía está hablando,
  // y no cuando toca el interruptor delante del cliente.
  useEffect(() => {
    const supabase = clienteNavegador();
    const canal = supabase
      .channel("sesion-demo")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "sesion_demo" },
        (evento) => {
          const fila = evento.new as Record<string, unknown>;
          setSesion({
            modo: fila.modo as SesionDemo["modo"],
            plantasOverride: (fila.plantas_override ?? {}) as SesionDemo["plantasOverride"],
            relojOffsetMin: fila.reloj_offset_min as number,
            escenarioActivo: (fila.escenario_activo as string | null) ?? null,
            iniciadaEn: fila.iniciada_en as string,
          });
        },
      )
      .subscribe((estado) => {
        if (estado === "SUBSCRIBED") setEstadoCanal("suscrito");
        else if (estado === "CHANNEL_ERROR" || estado === "TIMED_OUT") setEstadoCanal("error");
        else if (estado === "CLOSED") setEstadoCanal("cerrado");
      });

    return () => {
      void supabase.removeChannel(canal);
    };
  }, []);

  // Respaldo por sondeo. Es un POC: una consulta de más cada dos segundos
  // cuesta mucho menos que una pantalla congelada delante del cliente.
  useEffect(() => {
    const temporizador = setInterval(async () => {
      if (!debeSondear(estadoCanal, Date.now() - abiertoEn.current)) return;
      const { data } = await clienteNavegador()
        .from("sesion_demo")
        .select("modo, plantas_override, reloj_offset_min, escenario_activo, iniciada_en")
        .eq("id", 1)
        .maybeSingle();
      if (!data) return;
      setSesion({
        modo: data.modo,
        plantasOverride: (data.plantas_override ?? {}) as SesionDemo["plantasOverride"],
        relojOffsetMin: data.reloj_offset_min,
        escenarioActivo: data.escenario_activo,
        iniciadaEn: data.iniciada_en,
      });
    }, MS_INTERVALO_SONDEO);
    return () => clearInterval(temporizador);
  }, [estadoCanal]);

  // El reloj de pantalla avanza solo: la cuenta regresiva del banner de ventana
  // tiene que verse correr durante la escena 4.
  useEffect(() => {
    const temporizador = setInterval(() => setAhora(new Date()), MS_TIC_RELOJ);
    return () => clearInterval(temporizador);
  }, []);

  const valor = useMemo<ValorSesion>(() => {
    const momento = ahoraSimulada(sesion.relojOffsetMin, ahora);
    return {
      sesion,
      estadoCanal,
      plantas,
      estados: estadoDeTodas(plantas, momento, sesion.plantasOverride),
      ahora: momento,
    };
  }, [sesion, estadoCanal, plantas, ahora]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}
