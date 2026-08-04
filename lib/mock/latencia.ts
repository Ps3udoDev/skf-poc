/**
 * Latencia de los sistemas externos simulados.
 *
 * Se aplica SOLO a lo que representa un sistema corporativo (inventario, precio
 * WCL, PinQ) y NUNCA al buscador ni al validador. La razón es narrativa: en
 * pantalla debe verse que los sistemas corporativos tardan y que la capa
 * complementaria responde al instante.
 */
export const MS_LATENCIA_MIN = 200;
export const MS_LATENCIA_MAX = 800;

export function calcularLatencia(): number {
  return MS_LATENCIA_MIN + Math.floor(Math.random() * (MS_LATENCIA_MAX - MS_LATENCIA_MIN + 1));
}

export async function latenciaArtificial(): Promise<void> {
  // Los tests no pagan la espera: una suite con decenas de llamadas tardaría
  // minutos en simular algo que solo tiene sentido delante de una audiencia.
  if (process.env.NODE_ENV === "test" || process.env.VITEST) return;
  await new Promise((listo) => setTimeout(listo, calcularLatencia()));
}
