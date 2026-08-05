import type { FranjaVentana } from "@/lib/estado-fabricas/semana";
import type { CumplimientoSla } from "@/lib/fuentes/cotizaciones";
import type { CargaCsr } from "@/lib/operacion/asignacion";

export interface EntradaOperacion {
  cargas: readonly CargaCsr[];
  sinAsignar: number;
  sla: CumplimientoSla;
  franjas: readonly FranjaVentana[];
}

export interface PanelOperativo {
  /** Activos primero; dentro de cada grupo, de más cargado a menos. */
  cargas: CargaCsr[];
  sinAsignar: number;
  sla: CumplimientoSla;
  franjas: FranjaVentana[];
  minutosVentanaSemana: number;
}

/**
 * Agregado operativo del dashboard. Sin acceso a red ni a base: recibe todo
 * resuelto, igual que `elegirCsr()` y `reconciliar()`.
 *
 * El orden es determinista por la misma razón que lo es el desempate de la
 * asignación: el ensayo cronometrado repite el mismo recorrido varias veces y
 * un reparto que se reordena solo entre pasadas no se puede ensayar.
 */
export function resumirOperacion(entrada: EntradaOperacion): PanelOperativo {
  const cargas = [...entrada.cargas].sort((a, b) => {
    if (a.activo !== b.activo) return a.activo ? -1 : 1;
    if (a.abiertas !== b.abiertas) return b.abiertas - a.abiertas;
    return a.codigo.localeCompare(b.codigo);
  });

  return {
    cargas,
    sinAsignar: entrada.sinAsignar,
    sla: entrada.sla,
    franjas: [...entrada.franjas],
    minutosVentanaSemana: entrada.franjas.reduce((total, f) => total + f.duracionMin, 0),
  };
}
