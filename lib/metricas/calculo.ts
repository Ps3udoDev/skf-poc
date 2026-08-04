import { minutosDelDia } from "@/lib/estado-fabricas";
import type { Database } from "@/lib/supabase/tipos";

export type TipoEvento = Database["public"]["Enums"]["tipo_evento"];

export interface EventoDemo {
  tipo: TipoEvento;
  perfil: string | null;
  designacion: string | null;
  pdiv: string | null;
  detalle: Record<string, unknown>;
  ocurridoEn?: string;
}

/**
 * Minutos que consume una solicitud de cotización en el lado del operador.
 *
 * Es un supuesto del POC, no una medición: se presenta siempre acompañado de
 * "sobre datos simulados" y su valor real es una de las preguntas de la Fase 1.
 */
export const MINUTOS_POR_SOLICITUD = 12;

export interface Indicadores {
  solicitudesEvitadas: number;
  solicitudesGeneradas: number;
  minutosOperadorLiberados: number;
  confirmacionesHomologo: number;
  avisosAnticipados: number;
  tasaResueltasSinSolicitud: number;
  busquedasPorHora: Record<string, number>;
  llamadasModelo: number;
}

export function calcularIndicadores(eventos: readonly EventoDemo[]): Indicadores {
  const contar = (...tipos: TipoEvento[]) => eventos.filter((e) => tipos.includes(e.tipo)).length;

  const solicitudesEvitadas = contar("solicitud_evitada");
  const solicitudesGeneradas = contar("solicitud_generada");
  const total = solicitudesEvitadas + solicitudesGeneradas;

  const busquedasPorHora: Record<string, number> = {};
  for (const e of eventos) {
    if (e.tipo !== "busqueda" || !e.ocurridoEn) continue;
    const hora = String(Math.floor(minutosDelDia(new Date(e.ocurridoEn)) / 60));
    busquedasPorHora[hora] = (busquedasPorHora[hora] ?? 0) + 1;
  }

  return {
    solicitudesEvitadas,
    solicitudesGeneradas,
    minutosOperadorLiberados: solicitudesEvitadas * MINUTOS_POR_SOLICITUD,
    confirmacionesHomologo: contar("confirmacion_homologo"),
    avisosAnticipados: contar("aviso_moq", "aviso_pack_quantity"),
    // 0/0 daría NaN, y "NaN%" en pantalla delante del cliente es peor que un 0.
    tasaResueltasSinSolicitud: total === 0 ? 0 : solicitudesEvitadas / total,
    busquedasPorHora,
    llamadasModelo: contar("llamada_modelo"),
  };
}
