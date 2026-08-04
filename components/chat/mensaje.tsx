import type { UIMessage } from "ai";
import { TarjetaProducto } from "./tarjeta-producto";

export function Mensaje({ mensaje }: { mensaje: UIMessage }) {
  const referencias = mensaje.parts.flatMap((parte) =>
    parte.type === "text"
      ? [...parte.text.matchAll(/\b(?:4|5)\.\d[a-b]?\b/g)].map((coincidencia) => coincidencia[0])
      : [],
  );
  return (
    <article
      className={
        mensaje.role === "user"
          ? "ml-8 rounded-xl bg-primario px-3 py-2 text-sm text-primario-contraste"
          : "mr-4 rounded-xl border border-borde bg-fondo px-3 py-2 text-sm text-texto"
      }
    >
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide opacity-70">
        {mensaje.role === "user" ? "Tú" : "Asistente"}
      </p>
      {mensaje.parts.map((parte) => {
        const identidad = parte as unknown as { type: string; toolCallId?: string };
        const clave =
          parte.type === "text"
            ? `${mensaje.id}-texto-${parte.text}`
            : `${mensaje.id}-${identidad.type}-${identidad.toolCallId ?? "parte"}`;
        if (parte.type === "text")
          return (
            <p key={clave} className="whitespace-pre-wrap leading-6">
              {parte.text}
            </p>
          );
        const herramienta = parte as unknown as { type: string; state?: string; output?: unknown };
        if (
          herramienta.type === "tool-buscarDesignacion" &&
          herramienta.state === "output-available"
        )
          return <TarjetaProducto key={clave} salida={herramienta.output} />;
        if (herramienta.type.startsWith("tool-") && herramienta.state !== "output-available")
          return (
            <p key={clave} className="text-xs text-texto-tenue">
              Consultando datos verificados…
            </p>
          );
        return null;
      })}
      {referencias.length > 0 && (
        <p className="mt-2 text-xs text-texto-tenue">
          Referencias QMS: {[...new Set(referencias)].join(", ")}
        </p>
      )}
    </article>
  );
}
