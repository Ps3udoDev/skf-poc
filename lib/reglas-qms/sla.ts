/**
 * SLA de respuesta a cotizaciones.
 *
 * No es un punto del procedimiento QMS: es el KPI que SKF declara como propio
 * —«≤ 4 días hábiles promedio de respuesta», `docs/01_analisis_documentos.md`—
 * y en cuya unidad tiene que hablar el dashboard para que el cliente reconozca
 * la cifra como suya.
 *
 * Supuesto abierto con SKF: se excluyen sábados y domingos y NO se excluyen
 * festivos locales, porque el cliente todavía no confirmó cómo los trata. Toda
 * pantalla que muestre esta cifra lo declara.
 */
export const DIAS_SLA = 4;

/**
 * Días hábiles completos entre dos instantes.
 *
 * No cuenta el día de inicio: una cotización solicitada y respondida el mismo
 * día lleva cero días hábiles, no uno.
 */
export function diasHabiles(desde: string | Date, hasta: string | Date = new Date()): number {
  const cursor = new Date(desde);
  cursor.setHours(0, 0, 0, 0);
  const fin = new Date(hasta);
  fin.setHours(0, 0, 0, 0);
  let dias = 0;
  while (cursor < fin) {
    cursor.setDate(cursor.getDate() + 1);
    if (cursor.getDay() !== 0 && cursor.getDay() !== 6) dias++;
  }
  return dias;
}

export function dentroDelSla(solicitud: string | Date, respuesta: string | Date): boolean {
  return diasHabiles(solicitud, respuesta) <= DIAS_SLA;
}
