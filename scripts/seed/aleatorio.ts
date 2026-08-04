/**
 * Generador pseudoaleatorio determinista para la siembra.
 *
 * Con la misma semilla produce siempre la misma secuencia: reconstruir la base
 * antes de una presentación da un resultado idéntico al anterior.
 *
 * Algoritmo mulberry32. NO es criptográfico: no usar para nada que no sea
 * generar este catálogo de demostración.
 */
export interface Aleatorio {
  entero(min: number, max: number): number;
  decimal(min: number, max: number, decimales: number): number;
  elegir<T>(lista: readonly T[]): T;
  elegirPonderado<T>(opciones: readonly (readonly [T, number])[]): T;
  probabilidad(p: number): boolean;
  barajar<T>(lista: readonly T[]): T[];
}

export function crearAleatorio(semilla: number): Aleatorio {
  let estado = semilla >>> 0;

  const siguiente = (): number => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const entero = (min: number, max: number) => min + Math.floor(siguiente() * (max - min + 1));

  return {
    entero,
    decimal: (min, max, decimales) => Number((min + siguiente() * (max - min)).toFixed(decimales)),
    elegir: <T>(lista: readonly T[]) => {
      if (lista.length === 0) throw new Error("elegir(): la lista recibida está vacía");
      return lista[entero(0, lista.length - 1)];
    },
    elegirPonderado: <T>(opciones: readonly (readonly [T, number])[]) => {
      if (opciones.length === 0) {
        throw new Error("elegirPonderado(): la lista de opciones recibida está vacía");
      }
      const total = opciones.reduce((s, [, peso]) => s + peso, 0);
      let corte = siguiente() * total;
      for (const [valor, peso] of opciones) {
        corte -= peso;
        if (corte <= 0) return valor;
      }
      return opciones[opciones.length - 1][0];
    },
    probabilidad: (p) => siguiente() < p,
    barajar: <T>(lista: readonly T[]) => {
      const copia = [...lista];
      for (let i = copia.length - 1; i > 0; i--) {
        const j = entero(0, i);
        [copia[i], copia[j]] = [copia[j], copia[i]];
      }
      return copia;
    },
  };
}
