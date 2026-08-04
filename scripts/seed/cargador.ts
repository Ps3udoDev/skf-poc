import { config } from "dotenv";
import { Client } from "pg";

config({ path: ".env.local", quiet: true });

/**
 * Inserción masiva por COPY.
 *
 * A 30.000 designaciones la diferencia contra la API REST es de minutos
 * contra horas, y contra INSERT fila a fila es de segundos contra minutos.
 *
 * Se conecta por el pooler de sesión: la conexión directa a
 * db.<ref>.supabase.co es IPv6 y no resuelve desde redes domésticas.
 */
export function conectar(): Client {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) throw new Error("Falta la variable de entorno SUPABASE_DB_URL");
  return new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
}

/** Escapa un valor al formato de texto de COPY. */
function escapar(valor: unknown): string {
  if (valor === null || valor === undefined) return "\\N";
  if (valor instanceof Date) return valor.toISOString();
  if (typeof valor === "boolean") return valor ? "t" : "f";
  return String(valor)
    .replace(/\\/g, "\\\\")
    .replace(/\t/g, "\\t")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
}

export async function cargar(
  cliente: Client,
  tabla: string,
  columnas: readonly string[],
  filas: readonly unknown[][],
  tamanoLote = 5000,
): Promise<number> {
  if (filas.length === 0) return 0;
  const { from } = await import("pg-copy-streams");
  let insertadas = 0;

  for (let i = 0; i < filas.length; i += tamanoLote) {
    const lote = filas.slice(i, i + tamanoLote);
    const flujo = cliente.query(from(`COPY ${tabla} (${columnas.join(", ")}) FROM STDIN`));
    const texto = `${lote.map((f) => f.map(escapar).join("\t")).join("\n")}\n`;
    await new Promise<void>((resolver, rechazar) => {
      flujo.on("finish", resolver);
      flujo.on("error", rechazar);
      flujo.write(texto);
      flujo.end();
    });
    insertadas += lote.length;
  }
  return insertadas;
}
