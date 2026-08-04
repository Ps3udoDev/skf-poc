/**
 * Estrategia 2 de la cascada: muchos "errores" del cliente desaparecen aquí.
 * La designación se compara sin espacios, guiones, barras, acentos ni
 * diferencias de mayúsculas.
 */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[\s\-/.]/g, "")
    .trim();
}

/**
 * Pares de caracteres que se confunden al leer un código impreso o al teclearlo
 * desde un PDF. Es una de las causas de designación mal ingresada que la
 * propuesta reporta.
 */
const CONFUSIONES: readonly (readonly [string, string])[] = [
  ["O", "0"],
  ["I", "1"],
  ["L", "1"],
  ["S", "5"],
  ["B", "8"],
  ["Z", "2"],
  ["G", "6"],
];

/**
 * Tope de variantes generadas.
 *
 * Cada variante es una consulta a la base. Sin tope, un código con diez
 * caracteres ambiguos produciría 1024 consultas y el buscador dejaría de ser
 * instantáneo — que es justo lo que la escena 2 necesita que sea.
 */
export const MAX_VARIANTES = 32;

export function variantesConfusion(texto: string): string[] {
  const alternoDe = new Map<string, string>();
  for (const [a, b] of CONFUSIONES) {
    alternoDe.set(a, b);
    alternoDe.set(b, a);
  }
  const ambiguas: { indice: number; alterno: string }[] = [];
  for (let i = 0; i < texto.length; i++) {
    const alterno = alternoDe.get(texto[i]);
    if (alterno) ambiguas.push({ indice: i, alterno });
  }

  const variantes: string[] = [texto];
  const vistas = new Set(variantes);
  // Se generan por número de cambios (primero todas las de un cambio, luego
  // las de dos…) en vez de posición por posición como hacía el brief. Con el
  // orden posicional el tope se agotaba en las primeras posiciones ambiguas:
  // un código con prefijo fijo ("DEMO62052R5HC3" tiene 7 caracteres
  // confundibles) nunca llegaba a generar la variante del caracter realmente
  // confundido, y la estrategia 2 no resolvía ni su propio caso del guion.
  let frontera = [texto];
  while (variantes.length < MAX_VARIANTES && frontera.length > 0) {
    const siguiente: string[] = [];
    for (const v of frontera) {
      for (const { indice, alterno } of ambiguas) {
        // Esa posición ya se cambió en esta variante: no se cambia dos veces.
        if (v[indice] !== texto[indice]) continue;
        const nueva = v.slice(0, indice) + alterno + v.slice(indice + 1);
        if (vistas.has(nueva)) continue;
        vistas.add(nueva);
        variantes.push(nueva);
        siguiente.push(nueva);
        if (variantes.length >= MAX_VARIANTES) return variantes;
      }
    }
    frontera = siguiente;
  }
  return variantes;
}
