/**
 * El modelo responde en Markdown y la burbuja del asistente lo renderiza. Este
 * modulo prepara el texto antes de parsearlo y resuelve dos cosas que el
 * parser por si solo no cubre:
 *
 * 1. **Marcadores a medio escribir.** Durante el streaming llega `**Tiempo`
 *    antes que su cierre; sin esto la sala ve asteriscos sueltos parpadeando en
 *    cada respuesta. Se cierran los marcadores abiertos (o se retira el que
 *    apenas se abrio) para que la negrita aparezca ya formada.
 * 2. **Designaciones en monoespaciada.** El sistema visual exige que toda
 *    designacion vaya en monoespaciada en cualquier pantalla, y el modelo no
 *    siempre las entrecomilla. Se envuelven en `code` salvo que ya esten dentro
 *    de codigo.
 */

/** Bloques cercados y `code` en linea: lo que no se debe tocar. */
const LITERALES = /```[\s\S]*?```|`[^`\n]*`/;

/** Designaciones del catalogo del POC: siempre con prefijo `DEMO-`. */
const DESIGNACION = /\bDEMO-[A-Z0-9]+(?:[-/.][A-Z0-9]+)*/g;

function contar(texto: string, patron: RegExp): number {
  return texto.match(patron)?.length ?? 0;
}

function sinCodigo(texto: string): string {
  return texto.replace(new RegExp(LITERALES.source, "g"), "");
}

function completarMarcadores(texto: string): string {
  let resultado = texto;
  if (contar(resultado, /```/g) % 2 === 1) resultado = `${resultado}\n\`\`\``;
  if (contar(sinCodigo(resultado), /`/g) % 2 === 1) resultado = `${resultado}\``;
  if (contar(sinCodigo(resultado), /\*\*/g) % 2 === 1) {
    // Si el fragmento termina en asteriscos, el marcador acaba de abrirse y
    // aun no hay texto que emfatizar: se retira en vez de cerrarlo en vacio.
    resultado = /\*+$/.test(resultado) ? resultado.replace(/\*+$/, "") : `${resultado}**`;
  }
  return resultado;
}

function resaltarDesignaciones(texto: string): string {
  return texto
    .split(new RegExp(`(${LITERALES.source})`, "g"))
    .map((fragmento, indice) =>
      indice % 2 === 1 ? fragmento : fragmento.replace(DESIGNACION, "`$&`"),
    )
    .join("");
}

export function prepararMarkdown(texto: string): string {
  return resaltarDesignaciones(completarMarcadores(texto));
}
