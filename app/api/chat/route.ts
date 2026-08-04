import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { MODELO_CHAT, modeloConfigurado } from "@/lib/ai/gateway";
import { CONDICION_FIN_HERRAMIENTAS, HERRAMIENTAS, type PerfilChat } from "@/lib/ai/herramientas";
import { INSTRUCCIONES_CLIENTE, INSTRUCCIONES_OPERADOR } from "@/lib/ai/instrucciones";
import { dentroDelLimite } from "@/lib/ai/limite";
import { respuestaPregrabada } from "@/lib/ai/respaldo";
import { emitirEvento } from "@/lib/metricas/emitir";

export const maxDuration = 30;

function textoDeMensaje(mensaje: UIMessage | undefined): string {
  if (!mensaje) return "";
  return mensaje.parts
    .filter(
      (parte): parte is Extract<(typeof mensaje.parts)[number], { type: "text" }> =>
        parte.type === "text",
    )
    .map((parte) => parte.text)
    .join(" ");
}

function respuestaEstatica(texto: string, status = 200): Response {
  return createUIMessageStreamResponse({
    status,
    stream: createUIMessageStream({
      execute({ writer }) {
        const id = "respuesta-respaldo";
        writer.write({ type: "text-start", id });
        writer.write({ type: "text-delta", id, delta: texto });
        writer.write({ type: "text-end", id });
      },
    }),
  });
}

export async function POST(peticion: Request) {
  const cuerpo = (await peticion.json()) as { messages?: UIMessage[]; perfil?: PerfilChat };
  const mensajes = cuerpo.messages ?? [];
  const perfil: PerfilChat = cuerpo.perfil === "operador" ? "operador" : "cliente";

  if (!dentroDelLimite(mensajes.length)) {
    return respuestaEstatica(
      "Esta conversación alcanzó el límite de mensajes de la demostración. Inicia una conversación nueva para continuar.",
      429,
    );
  }

  const pregunta = textoDeMensaje(
    [...mensajes].reverse().find((mensaje) => mensaje.role === "user"),
  );
  if (process.env.CHAT_RESPALDO === "true" || !modeloConfigurado()) {
    return respuestaEstatica(
      respuestaPregrabada(pregunta) ??
        "El asistente no está disponible en este momento. Puedo ayudarte desde el buscador o escalar la consulta a un CSR; no presentaré una respuesta sin datos verificados.",
    );
  }

  const herramientas = HERRAMIENTAS(perfil);
  await emitirEvento({ tipo: "llamada_modelo", perfil, detalle: { modelo: MODELO_CHAT } });
  const resultado = streamText({
    model: MODELO_CHAT,
    instructions: perfil === "operador" ? INSTRUCCIONES_OPERADOR : INSTRUCCIONES_CLIENTE,
    messages: await convertToModelMessages(mensajes),
    tools: herramientas,
    stopWhen: CONDICION_FIN_HERRAMIENTAS,
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: resultado.stream }),
  });
}
