import "server-only";

/**
 * Modelo enrutado por Vercel AI Gateway. Cambiarlo no requiere tocar código:
 * el identificador vive en CHAT_MODEL de `.env.local`.
 */
export const MODELO_CHAT = process.env.CHAT_MODEL ?? "anthropic/claude-sonnet-5";

/**
 * El Gateway puede no estar configurado en un entorno de desarrollo. Todo lo
 * que dependa del modelo tiene que degradar, no romper: el validador
 * determinista y el estimador siguen funcionando sin él.
 */
export function modeloConfigurado(): boolean {
  return Boolean(process.env.AI_GATEWAY_API_KEY);
}
