import type { PlantaCompleta } from "@/lib/fuentes/plantas";
import { fechaEnHuso, minutosDelDia } from "./reloj";

export type EstadoPlanta = "online" | "ventana" | "reactivando";

/**
 * Minutos tras el cierre de la ventana en los que la planta ya responde pero
 * aún está poniéndose al día. Da al presentador un estado intermedio visible
 * cuando salta el reloj hasta el final de la ventana en la escena 4.
 */
export const MINUTOS_REACTIVANDO = 15;

const MINUTOS_DIA = 1440;

/** Hash estable de una cadena. No criptográfico: solo reparte de forma fija. */
function hash(texto: string): number {
  let valor = 0;
  for (let i = 0; i < texto.length; i++) {
    valor = (valor * 31 + texto.charCodeAt(i)) >>> 0;
  }
  return valor;
}

/**
 * Minuto de inicio de la ventana de esa planta ese día.
 *
 * Con `ventanaVariabilidadMin > 0` (la planta belga) el inicio se desplaza
 * dentro de esa franja. El desplazamiento se deriva de la fecha local y del
 * PDIV, no del azar: si fuera aleatorio, la ventana se movería entre dos
 * renders de la misma pantalla y el banner mentiría a mitad de la escena.
 */
export function inicioDeVentana(planta: PlantaCompleta, momento: Date): number {
  if (planta.ventanaVariabilidadMin === 0) return planta.ventanaInicioMin;
  const semilla = hash(`${planta.pdiv}|${fechaEnHuso(momento)}`);
  const desplazamiento =
    (semilla % (planta.ventanaVariabilidadMin + 1)) - Math.floor(planta.ventanaVariabilidadMin / 2);
  return planta.ventanaInicioMin + desplazamiento;
}

/** ¿Está `minuto` dentro de [inicio, inicio + duracion), con vuelta de día? */
function dentro(minuto: number, inicio: number, duracion: number): boolean {
  const desde = ((inicio % MINUTOS_DIA) + MINUTOS_DIA) % MINUTOS_DIA;
  const transcurrido = (minuto - desde + MINUTOS_DIA) % MINUTOS_DIA;
  return transcurrido < duracion;
}

/**
 * Estado de una planta en un instante dado.
 *
 * El override del presentador siempre gana: durante la demostración el guion
 * manda sobre el calendario.
 */
export function estadoDePlanta(
  planta: PlantaCompleta,
  momento: Date,
  override?: EstadoPlanta,
): EstadoPlanta {
  if (override) return override;

  const minuto = minutosDelDia(momento);
  const inicio = inicioDeVentana(planta, momento);

  if (dentro(minuto, inicio, planta.ventanaDuracionMin)) return "ventana";
  if (dentro(minuto, inicio + planta.ventanaDuracionMin, MINUTOS_REACTIVANDO)) return "reactivando";
  return "online";
}

/** Minutos que faltan para que la planta reabra, o `null` si no está en ventana. */
export function minutosParaReapertura(planta: PlantaCompleta, momento: Date): number | null {
  const minuto = minutosDelDia(momento);
  const inicio = inicioDeVentana(planta, momento);
  if (!dentro(minuto, inicio, planta.ventanaDuracionMin)) return null;
  const transcurrido = (minuto - inicio + MINUTOS_DIA) % MINUTOS_DIA;
  return planta.ventanaDuracionMin - transcurrido;
}

export function estadoDeTodas(
  plantas: readonly PlantaCompleta[],
  momento: Date,
  overrides: Record<string, EstadoPlanta> = {},
): Record<string, EstadoPlanta> {
  const salida: Record<string, EstadoPlanta> = {};
  for (const p of plantas) salida[p.pdiv] = estadoDePlanta(p, momento, overrides[p.pdiv]);
  return salida;
}
