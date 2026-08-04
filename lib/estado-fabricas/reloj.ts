/** Huso de referencia: las ventanas del Plan 2 están en minutos hora de México. */
export const HUSO_MEXICO = "America/Mexico_City";

/**
 * Hora simulada del demo.
 *
 * El offset se guarda en minutos contra la hora real y NO como hora absoluta:
 * así el reloj sigue corriendo solo después de cada salto del presentador. Con
 * una hora absoluta, la cuenta regresiva del banner de ventana se congelaría.
 */
export function ahoraSimulada(offsetMin: number, base: Date = new Date()): Date {
  return new Date(base.getTime() + offsetMin * 60_000);
}

/** Minutos transcurridos desde la medianoche local del huso indicado. */
export function minutosDelDia(momento: Date, huso: string = HUSO_MEXICO): number {
  const partes = new Intl.DateTimeFormat("es-MX", {
    timeZone: huso,
    hour: "2-digit",
    minute: "2-digit",
    // h23 evita que la medianoche se formatee como "24:00" en algunas versiones
    // de ICU, que daría 1440 en vez de 0 y rompería toda comparación de ventana.
    hourCycle: "h23",
  }).formatToParts(momento);

  const hora = Number(partes.find((p) => p.type === "hour")?.value ?? "0");
  const minuto = Number(partes.find((p) => p.type === "minute")?.value ?? "0");
  return hora * 60 + minuto;
}

/** Fecha local en formato AAAA-MM-DD. Base determinista de la variabilidad. */
export function fechaEnHuso(momento: Date, huso: string = HUSO_MEXICO): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: huso,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(momento);
  const valor = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "";
  return `${valor("year")}-${valor("month")}-${valor("day")}`;
}
