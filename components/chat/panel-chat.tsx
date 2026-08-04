"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { type FormEvent, useMemo, useState } from "react";
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
  const transporte = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat", body: { perfil } }),
    [perfil],
  );
  const { messages, sendMessage, status, error, stop } = useChat({ transport: transporte });
  const ocupado = status === "submitted" || status === "streaming";

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
      <button
        type="button"
        onClick={() => setAbierto((valor) => !valor)}
        className="fixed right-6 bottom-6 z-40 rounded-full bg-primario px-5 py-3 text-sm font-semibold text-primario-contraste shadow-lg"
      >
        {abierto ? "Cerrar asistente" : "Abrir asistente"}
      </button>
      {abierto && (
        <aside
          aria-label="Asistente de consultas"
          className="fixed top-0 right-0 z-30 flex h-screen w-full max-w-md flex-col border-l border-borde bg-fondo-sutil pt-16 shadow-xl"
        >
          <div className="border-b border-borde bg-fondo px-4 py-3">
            <h2 className="font-semibold text-texto">Asistente de consultas</h2>
            <p className="mt-1 text-xs text-texto-tenue">
              Las cifras provienen de las mismas fuentes verificadas del portal.
            </p>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div>
                <p className="text-sm font-medium text-texto">Puedes empezar con:</p>
                <div className="mt-3 space-y-2">
                  {SUGERENCIAS[perfil].map((sugerencia) => (
                    <button
                      key={sugerencia}
                      type="button"
                      onClick={() => preguntar(sugerencia)}
                      className="block w-full rounded-lg border border-borde bg-fondo p-3 text-left text-sm text-texto hover:border-primario"
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
              <p className="text-sm text-texto-tenue">Consultando las fuentes…</p>
            )}
            {error && (
              <p className="rounded-lg border border-error bg-error-suave p-3 text-sm text-error">
                El asistente no pudo completar la respuesta. Usa el buscador o escala la consulta a
                un CSR.
              </p>
            )}
          </div>
          <form onSubmit={enviar} className="border-t border-borde bg-fondo p-4">
            <textarea
              value={entrada}
              onChange={(evento) => setEntrada(evento.target.value)}
              rows={3}
              placeholder="Escribe una consulta…"
              className="w-full resize-none rounded-lg border border-borde p-3 text-sm text-texto outline-none focus:border-primario"
            />
            <div className="mt-2 flex justify-end gap-2">
              {ocupado && (
                <button
                  type="button"
                  onClick={stop}
                  className="rounded-lg border border-borde px-3 py-2 text-sm text-texto"
                >
                  Detener
                </button>
              )}
              <button
                type="submit"
                disabled={ocupado || !entrada.trim()}
                className="rounded-lg bg-primario px-4 py-2 text-sm font-medium text-primario-contraste disabled:opacity-40"
              >
                {ocupado ? "Respondiendo…" : "Enviar"}
              </button>
            </div>
          </form>
        </aside>
      )}
    </>
  );
}
