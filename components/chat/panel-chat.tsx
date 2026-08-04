"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { MessageCircle, Send, Square, X } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Mensaje } from "./mensaje";

const SUGERENCIAS = {
  cliente: [
    "¿Cuánto tarda el DEMO-6205-2RSH/C3 si pido 200 piezas?",
    "Necesito un equivalente al DEMO-6205-2RSH/C3 sellado por ambos lados",
    "¿Qué hago si el MOQ es mayor a lo que necesito?",
  ],
  operador: [
    "¿Qué solicitudes de productos planeados con stock suficiente se pueden declinar?",
    "Explícame el punto 4.6",
    "¿Cuál es el SLA de una cotización?",
  ],
} as const;

export function PanelChat({ perfil }: { perfil: "cliente" | "operador" }) {
  const [abierto, setAbierto] = useState(false);
  const [entrada, setEntrada] = useState("");
  const finalConversacion = useRef<HTMLDivElement>(null);
  const transporte = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat", body: { perfil } }),
    [perfil],
  );
  const { messages, sendMessage, status, error, stop } = useChat({ transport: transporte });
  const ocupado = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (messages.length > 0 || status === "submitted" || status === "streaming") {
      finalConversacion.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [messages.length, status]);

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const texto = entrada.trim();
    if (!texto || ocupado) return;
    void sendMessage({ text: texto });
    setEntrada("");
  }

  function preguntar(texto: string) {
    if (ocupado) return;
    setAbierto(true);
    void sendMessage({ text: texto });
  }

  return (
    <>
      {!abierto && (
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="fixed right-4 bottom-4 z-40 inline-flex items-center gap-2 rounded-full bg-primario px-4 py-3 text-sm font-semibold text-primario-contraste shadow-lg transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario sm:right-6 sm:bottom-6"
          aria-label="Abrir asistente de consultas"
        >
          <MessageCircle className="size-5" aria-hidden />
          <span>Asistente</span>
        </button>
      )}

      {abierto && (
        <aside
          aria-label="Asistente de consultas"
          className="fixed right-3 bottom-3 z-50 flex h-[min(620px,calc(100dvh-1.5rem))] w-[calc(100vw-1.5rem)] max-w-[400px] flex-col overflow-hidden rounded-2xl border border-borde bg-fondo shadow-2xl sm:right-6 sm:bottom-6 sm:h-[min(620px,calc(100dvh-3rem))]"
        >
          <header className="flex shrink-0 items-start justify-between gap-3 bg-primario px-4 py-3 text-primario-contraste">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-full bg-primario-contraste/15">
                <MessageCircle className="size-5" aria-hidden />
              </span>
              <div>
                <h2 className="text-sm font-semibold">Asistente de consultas</h2>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-primario-contraste/75">
                  <span className="size-1.5 rounded-full bg-primario-contraste" aria-hidden />
                  Datos verificados del portal
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="grid size-8 place-items-center rounded-full text-primario-contraste/80 hover:bg-primario-contraste/15 hover:text-primario-contraste focus-visible:outline-2 focus-visible:outline-primario-contraste"
              aria-label="Cerrar asistente"
            >
              <X className="size-5" aria-hidden />
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-fondo-sutil p-3 sm:p-4">
            {messages.length === 0 && (
              <div>
                <div className="rounded-2xl rounded-tl-md border border-borde bg-fondo p-3 text-sm leading-6 text-texto">
                  Hola. Puedo consultar designaciones, disponibilidad, TE y reglas QMS sin inventar
                  cifras.
                </div>
                <p className="mt-4 text-xs font-medium uppercase tracking-wide text-texto-tenue">
                  Prueba una pregunta
                </p>
                <div className="mt-2 space-y-2">
                  {SUGERENCIAS[perfil].map((sugerencia) => (
                    <button
                      key={sugerencia}
                      type="button"
                      onClick={() => preguntar(sugerencia)}
                      className="block w-full rounded-xl border border-borde bg-fondo p-2.5 text-left text-xs leading-5 text-texto hover:border-primario hover:bg-primario-suave focus-visible:outline-2 focus-visible:outline-primario"
                    >
                      {sugerencia}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((mensaje) => (
              <Mensaje key={mensaje.id} mensaje={mensaje} />
            ))}

            {status === "submitted" && (
              <div
                className="mr-auto flex w-fit items-center gap-1 rounded-2xl rounded-tl-md border border-borde bg-fondo px-3 py-2"
                role="status"
                aria-label="El asistente está consultando las fuentes"
              >
                <span className="size-1.5 animate-pulse rounded-full bg-texto-tenue" />
                <span className="size-1.5 animate-pulse rounded-full bg-texto-tenue [animation-delay:150ms]" />
                <span className="size-1.5 animate-pulse rounded-full bg-texto-tenue [animation-delay:300ms]" />
              </div>
            )}

            {error && (
              <p className="rounded-lg border border-error bg-error-suave p-3 text-sm text-error">
                El asistente no pudo completar la respuesta. Usa el buscador o escala la consulta a
                un CSR.
              </p>
            )}
            <div ref={finalConversacion} />
          </div>

          <form onSubmit={enviar} className="shrink-0 border-t border-borde bg-fondo p-3">
            <div className="flex items-end gap-2 rounded-2xl border border-borde bg-fondo-sutil p-1.5 focus-within:border-primario focus-within:ring-2 focus-within:ring-primario-suave">
              <textarea
                value={entrada}
                onChange={(evento) => setEntrada(evento.target.value)}
                onKeyDown={(evento) => {
                  if (evento.key === "Enter" && !evento.shiftKey) {
                    evento.preventDefault();
                    evento.currentTarget.form?.requestSubmit();
                  }
                }}
                rows={1}
                placeholder="Escribe una consulta…"
                className="max-h-24 min-h-9 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-texto outline-none"
              />
              {ocupado && (
                <button
                  type="button"
                  onClick={stop}
                  className="grid size-9 shrink-0 place-items-center rounded-full border border-borde bg-fondo text-texto hover:bg-fondo-sutil"
                  aria-label="Detener respuesta"
                >
                  <Square className="size-3.5 fill-current" aria-hidden />
                </button>
              )}
              <button
                type="submit"
                disabled={ocupado || !entrada.trim()}
                className="grid size-9 shrink-0 place-items-center rounded-full bg-primario text-primario-contraste hover:opacity-90 disabled:opacity-35"
                aria-label="Enviar mensaje"
              >
                <Send className="size-4" aria-hidden />
              </button>
            </div>
            <p className="mt-1.5 px-1 text-[11px] text-texto-tenue">
              Enter para enviar · Shift + Enter para nueva línea
            </p>
          </form>
        </aside>
      )}
    </>
  );
}
