import { completacionesDe, obtenerDesignacion, obtenerVarias, similaresA } from "@/lib/fuentes";
import { normalizar, variantesConfusion } from "./normalizar";
import { construirSugerencia, construirVarias } from "./sugerencia";
import type { ResultadoValidacion } from "./tipos";

/** Cuántas alternativas se ofrecen. Tres es lo que el guion muestra en pantalla. */
export const MAX_SUGERENCIAS = 3;

/**
 * Vecindario que pide la estrategia 2b por trigramas. Basta un número pequeño:
 * el candidato correcto comparte casi todos los trigramas con la consulta
 * normalizada y queda en los primeros lugares.
 */
export const VECINOS_NORMALIZADOS = 12;

/**
 * Cascada de estrategias del validador, en orden de menor a mayor
 * incertidumbre. Se detiene en la primera que resuelve.
 *
 * La estrategia 5 (similitud semántica sobre la descripción) queda reservada
 * para la versión 2: exige pgvector y a la escala de este catálogo no aporta
 * sobre los trigramas. La estrategia 6 (respaldo con LLM) la añade la tarea 8.
 */
export async function validar(consulta: string, cantidad: number): Promise<ResultadoValidacion> {
  const limpia = consulta.trim();
  if (limpia === "") {
    return {
      consulta,
      tipo: "no_encontrada",
      estrategia: "ninguna",
      mensaje: "Escribe una designación para consultar.",
      candidatos: [],
    };
  }

  // ── 1. Coincidencia exacta ────────────────────────────────────────────────
  const exacta = await obtenerDesignacion(limpia);
  if (exacta) {
    const sugerencia = await construirSugerencia(exacta.designacion, cantidad, 1);
    return {
      consulta,
      tipo: "exacta",
      estrategia: "exacta",
      mensaje: `Designación ${exacta.designacion} encontrada.`,
      candidatos: sugerencia ? [sugerencia] : [],
    };
  }

  // ── 2. Normalización y confusión de caracteres ────────────────────────────
  // Se prueban las variantes contra el catálogo; el código real siempre sale de
  // la base, nunca de la variante generada.
  const normalizada = normalizar(limpia);
  const variantes = variantesConfusion(normalizada);

  // 2a — coincidencia literal de alguna variante, en una sola consulta (.in).
  // Desviación del brief, que probaba variante por variante con
  // `obtenerDesignacion`: hasta 32 idas y vueltas secuenciales, y el buscador
  // de la escena 2 tiene que responder al instante. `obtenerVarias` preserva
  // el orden de las variantes, así que [0] es la de menos cambios.
  const [directa] = await obtenerVarias(variantes);
  let interpretada: string | null = directa?.designacion ?? null;

  // 2b — todo el catálogo sembrado lleva separadores (guiones y barras) y la
  // normalización los elimina, así que la comparación literal de arriba no
  // alcanza ningún código real. Se pide el vecindario por trigramas con dos
  // embudos —la forma normalizada y la captura en mayúsculas con sus
  // separadores, que se parece más al formato almacenado— y se acepta
  // ÚNICAMENTE el candidato cuya forma normalizada es una de las variantes:
  // los trigramas solo acotan el conjunto, la igualdad normalizada decide.
  if (interpretada === null) {
    const conjunto = new Set(variantes);
    const [porNormalizada, porCaptura] = await Promise.all([
      similaresA(normalizada, VECINOS_NORMALIZADOS),
      similaresA(limpia.toUpperCase(), VECINOS_NORMALIZADOS),
    ]);
    interpretada =
      [...porNormalizada, ...porCaptura].find((v) => conjunto.has(normalizar(v.designacion)))
        ?.designacion ?? null;
  }

  if (interpretada !== null) {
    const sugerencia = await construirSugerencia(interpretada, cantidad, 0.95);
    return {
      consulta,
      tipo: "exacta",
      estrategia: "normalizacion",
      mensaje: `Se interpretó "${limpia}" como ${interpretada}.`,
      candidatos: sugerencia ? [sugerencia] : [],
    };
  }

  // ── 3. Captura incompleta ─────────────────────────────────────────────────
  // El caso del copiado truncado desde Word. Merece mensaje propio: "parece
  // incompleta" y "no existe" llevan al usuario a acciones distintas.
  const completaciones = await completacionesDe(limpia, MAX_SUGERENCIAS);
  if (completaciones.length > 0) {
    return {
      consulta,
      tipo: "truncada",
      estrategia: "prefijo",
      mensaje:
        "La designación parece incompleta: falta el sufijo. Estas son las designaciones " +
        "que comienzan con lo que escribiste.",
      candidatos: await construirVarias(
        completaciones.map((codigo) => ({ codigo, puntaje: 0.9 })),
        cantidad,
      ),
    };
  }

  // ── 4. Similitud por trigramas ────────────────────────────────────────────
  const similares = await similaresA(limpia, MAX_SUGERENCIAS);
  if (similares.length > 0) {
    return {
      consulta,
      tipo: "similar",
      estrategia: "trigramas",
      mensaje: "No se encontró esa designación exacta. Las más parecidas del catálogo son:",
      candidatos: await construirVarias(
        similares.map((s) => ({ codigo: s.designacion, puntaje: s.puntaje })),
        cantidad,
      ),
    };
  }

  return {
    consulta,
    tipo: "no_encontrada",
    estrategia: "ninguna",
    mensaje:
      `No se encontró la designación "${limpia}" ni ninguna parecida en el catálogo. ` +
      "Según el procedimiento (punto 4.8) una solicitud con designación incorrecta se declina.",
    candidatos: [],
  };
}
