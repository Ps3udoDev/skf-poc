import type { PlantaCompleta } from "@/lib/fuentes/plantas";
import { inicioDeVentana } from "./ventanas";

export interface FranjaVentana {
  pdiv: string;
  /** 0 = el día de `desde`. Es el orden real de la semana proyectada. */
  diaOffset: number;
  /** `Date.getDay()` del día representado: 0 = domingo. Solo para etiquetar. */
  dia: number;
  /** Minutos del día en huso de México, igual que `ventanaInicioMin`. */
  inicioMin: number;
  duracionMin: number;
}

const DIAS_SEMANA = 7;

/**
 * Ventanas de mantenimiento de los próximos siete días.
 *
 * Se calcula día a día en vez de repetir el mismo horario siete veces porque
 * la planta con `ventanaVariabilidadMin > 0` empieza a distinta hora cada día,
 * y esa irregularidad es justamente lo que hace creíble la línea de tiempo.
 */
export function franjasDeLaSemana(
  plantas: readonly PlantaCompleta[],
  desde: Date,
): FranjaVentana[] {
  const franjas: FranjaVentana[] = [];
  for (const planta of plantas) {
    for (let diaOffset = 0; diaOffset < DIAS_SEMANA; diaOffset++) {
      const dia = new Date(desde);
      dia.setDate(dia.getDate() + diaOffset);
      franjas.push({
        pdiv: planta.pdiv,
        diaOffset,
        dia: dia.getDay(),
        inicioMin: inicioDeVentana(planta, dia),
        duracionMin: planta.ventanaDuracionMin,
      });
    }
  }
  return franjas;
}
