import "server-only";

import { generateObject, type LanguageModel } from "ai";
import { z } from "zod";
import { MODELO_CHAT, modeloConfigurado } from "@/lib/ai/gateway";

const INSTRUCCIONES =
  "Eres un asistente de catálogo de componentes industriales. El usuario escribió una " +
  "designación de producto que no se encontró exactamente. Elige cuál de las designaciones " +
  "de la lista quiso escribir. Si ninguna corresponde con claridad, devuelve null en codigo. " +
  "NUNCA propongas una designación que no esté en la lista. Responde en español.";

/**
 * Estrategia 6 de la cascada: solo se llega aquí si las cuatro anteriores
 * fallaron.
 *
 * Barrera 1: el esquema restringe la respuesta al conjunto cerrado.
 * Barrera 2: la salida se vuelve a validar contra ese conjunto.
 *
 * Es deliberadamente redundante. Esa redundancia es la respuesta a "¿y si se
 * inventa un código?".
 */
export async function elegirDelConjunto(
  consulta: string,
  candidatos: readonly string[],
  modelo?: unknown,
): Promise<{ codigo: string; explicacion: string } | null> {
  if (candidatos.length === 0) return null;
  if (!modelo && !modeloConfigurado()) return null;

  const esquema = z.object({
    codigo: z.enum(candidatos as [string, ...string[]]).nullable(),
    explicacion: z.string(),
  });

  try {
    // En AI SDK v7 el modelo se pasa como cadena "proveedor/modelo": sin un
    // proveedor global registrado, la cadena la resuelve el proveedor por
    // defecto, que es el Vercel AI Gateway (lee AI_GATEWAY_API_KEY del
    // entorno, solo disponible en el servidor).
    const { object } = await generateObject({
      model: (modelo ?? MODELO_CHAT) as LanguageModel,
      schema: esquema,
      system: INSTRUCCIONES,
      prompt: `Texto del usuario: "${consulta}"\nDesignaciones disponibles:\n${candidatos.join("\n")}`,
    });

    if (!object.codigo) return null;
    // Barrera 2.
    if (!candidatos.includes(object.codigo)) return null;
    return { codigo: object.codigo, explicacion: object.explicacion };
  } catch (fallo) {
    // Si el Gateway falla, la cascada se queda con lo que dieron los trigramas.
    // Nunca se propaga el error: el buscador no puede romperse en vivo.
    console.error("[validador] el respaldo con LLM falló:", fallo);
    return null;
  }
}
