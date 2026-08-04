"use client";

import Markdown, { type Components } from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { prepararMarkdown } from "@/lib/ai/formato";

/*
 * El modelo responde en Markdown: sin esto la burbuja mostraba `**texto**` en
 * crudo. Cada elemento se mapea a los tokens del sistema visual en vez de
 * heredar los estilos del navegador; `remark-breaks` conserva los saltos de
 * linea simples, que es como se veia antes con `whitespace-pre-wrap`.
 *
 * react-markdown no interpreta HTML embebido, asi que la respuesta del modelo
 * no puede inyectar marcado en la pagina.
 */

const COMPONENTES: Components = {
  p: ({ children }) => <p className="leading-6">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5">{children}</ol>,
  li: ({ children }) => <li className="leading-6 marker:text-texto-tenue">{children}</li>,
  h1: ({ children }) => <h3 className="text-sm font-semibold">{children}</h3>,
  h2: ({ children }) => <h3 className="text-sm font-semibold">{children}</h3>,
  h3: ({ children }) => <h3 className="text-sm font-semibold">{children}</h3>,
  h4: ({ children }) => <h4 className="text-sm font-semibold">{children}</h4>,
  a: ({ children, href }) => (
    <a
      href={href}
      className="font-medium underline underline-offset-2"
      target="_blank"
      rel="noreferrer"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-borde pl-3 text-texto-tenue">{children}</blockquote>
  ),
  hr: () => <hr className="border-borde" />,
  code: ({ children }) => (
    <code className="designacion rounded bg-fondo-sutil px-1 py-0.5 text-[0.92em] text-texto">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="overflow-x-auto rounded-lg border border-borde bg-fondo-sutil p-3 text-xs [&_code]:bg-transparent [&_code]:p-0">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-borde bg-fondo-sutil px-2 py-1 text-left font-semibold">
      {children}
    </th>
  ),
  td: ({ children }) => <td className="border border-borde px-2 py-1 align-top">{children}</td>,
};

export function TextoMarkdown({ texto }: { texto: string }) {
  return (
    <div className="space-y-2">
      <Markdown remarkPlugins={[remarkGfm, remarkBreaks]} components={COMPONENTES}>
        {prepararMarkdown(texto)}
      </Markdown>
    </div>
  );
}
