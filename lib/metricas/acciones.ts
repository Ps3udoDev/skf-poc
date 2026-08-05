"use server";

import { ahoraSimulada } from "@/lib/estado-fabricas";
import { franjasDeLaSemana } from "@/lib/estado-fabricas/semana";
import { cargaPorCsr, cumplimientoSla, solicitudesFiltradas, todasLasPlantas } from "@/lib/fuentes";
import { leerSesion } from "@/lib/sesion-demo/leer";
import type { Indicadores } from "./calculo";
import { indicadoresDeSesion } from "./indicadores";
import { type PanelOperativo, resumirOperacion } from "./operacion";

/**
 * Recálculo de indicadores para el cliente.
 *
 * Es una envoltura a propósito: el cliente nunca reimplementa
 * `calcularIndicadores()`, porque dos implementaciones de la misma métrica es
 * cómo se llega a dos cifras distintas en dos pantallas durante la
 * presentación.
 */
export async function refrescarIndicadores(): Promise<Indicadores> {
  return indicadoresDeSesion();
}

export async function refrescarPanelOperativo(): Promise<PanelOperativo> {
  const sesion = await leerSesion();
  const [cargas, sla, plantas, sinAsignar] = await Promise.all([
    cargaPorCsr(sesion.iniciadaEn),
    cumplimientoSla(),
    todasLasPlantas(),
    solicitudesFiltradas({ desde: sesion.iniciadaEn, csr: null }),
  ]);

  return resumirOperacion({
    cargas,
    sinAsignar: sinAsignar.length,
    sla,
    // La línea de tiempo sigue el reloj simulado: si el presentador adelanta la
    // hora en la escena 4, la semana proyectada avanza con él.
    franjas: franjasDeLaSemana(plantas, ahoraSimulada(sesion.relojOffsetMin)),
  });
}
