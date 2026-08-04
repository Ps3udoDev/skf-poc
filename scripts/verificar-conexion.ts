/**
 * Verificación de conectividad del POC.
 *
 * Comprueba las tres dependencias externas antes de trabajar o de presentar:
 * la API REST de Supabase, la base de datos por sus tres rutas posibles, y el
 * enrutado del modelo por Vercel AI Gateway.
 *
 *   pnpm verificar
 */
import { config } from "dotenv";
import { Client } from "pg";

config({ path: ".env.local", quiet: true });

const REF = process.env.SUPABASE_PROJECT_REF;
const PWD = process.env.SUPABASE_DB_PASSWORD;
const URL_SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const ok = (m: string) => console.log(`  \x1b[32m✓\x1b[0m ${m}`);
const falla = (m: string) => console.log(`  \x1b[31m✗\x1b[0m ${m}`);
const titulo = (m: string) => console.log(`\n\x1b[1m${m}\x1b[0m`);

async function verificarRest(): Promise<boolean> {
  titulo("1. API REST de Supabase");
  try {
    const r = await fetch(`${URL_SUPABASE}/rest/v1/sesion_demo?select=modo&limit=1`, {
      headers: { apikey: ANON ?? "", Authorization: `Bearer ${ANON}` },
    });
    const cuerpo = await r.json();
    if (r.ok) {
      ok(`autenticado · sesion_demo accesible → ${JSON.stringify(cuerpo)}`);
      return true;
    }
    if (cuerpo?.code === "PGRST205") {
      ok("autenticado · sesion_demo aún no existe (esperado antes de migrar)");
      return true;
    }
    falla(`HTTP ${r.status} · ${JSON.stringify(cuerpo)}`);
    return false;
  } catch (e) {
    falla((e as Error).message);
    return false;
  }
}

async function verificarBaseDeDatos(): Promise<boolean> {
  titulo("2. Base de datos PostgreSQL");
  // La conexión directa (db.<ref>.supabase.co) queda fuera a propósito: es
  // IPv6 y no resuelve desde redes domésticas. Todo el POC va por el pooler.
  const rutas: [string, string][] = [
    [
      "pooler sesión :5432",
      `postgresql://postgres.${REF}:${PWD}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`,
    ],
    [
      "pooler transacción :6543",
      `postgresql://postgres.${REF}:${PWD}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
    ],
  ];

  let viables = 0;
  for (const [nombre, url] of rutas) {
    const c = new Client({
      connectionString: url,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 12000,
    });
    try {
      await c.connect();
      const r = await c.query("select current_user, current_database()");
      ok(`${nombre} · ${r.rows[0].current_user}@${r.rows[0].current_database}`);
      viables++;
      await c.end();
    } catch (e) {
      const err = e as Error & { code?: string };
      falla(`${nombre} · ${err.code ?? ""} ${err.message}`);
      await c.end().catch(() => {});
    }
  }
  if (viables === 0) console.log("\n  Ninguna ruta funciona. Revisa SUPABASE_DB_PASSWORD.");
  return viables > 0;
}

/**
 * La apuesta arquitectónica del §5: el interruptor de /demo debe propagarse a
 * la pantalla proyectada. Se comprueba de punta a punta — un cliente anónimo
 * se suscribe, otro con service role escribe, y se mide cuánto tarda en llegar.
 */
async function verificarRealtime(): Promise<boolean> {
  titulo("3. Realtime (propagación del interruptor del presentador)");
  const { createClient } = await import("@supabase/supabase-js");

  const oyente = createClient(URL_SUPABASE ?? "", ANON ?? "", {
    realtime: { params: { eventsPerSecond: 10 } },
  });
  const escritor = createClient(URL_SUPABASE ?? "", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "");

  try {
    let anunciarEvento: (modo: string) => void;
    let anunciarFallo: (e: Error) => void;
    const recibido = new Promise<string>((resolve, reject) => {
      anunciarEvento = resolve;
      anunciarFallo = reject;
      setTimeout(() => reject(new Error("sin evento en 15 s")), 15000);
    });

    // Hay que esperar el estado SUBSCRIBED antes de escribir: un sleep fijo no
    // basta, y si se escribe antes de que el canal esté activo el evento se
    // pierde sin error visible.
    const suscrito = new Promise<void>((resolve, reject) => {
      const tiempoLimite = setTimeout(() => reject(new Error("suscripción no confirmada")), 15000);
      oyente
        .channel("verificacion-sesion-demo")
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "sesion_demo" },
          (payload) => anunciarEvento((payload.new as { modo: string }).modo),
        )
        .subscribe((estado, err) => {
          if (estado === "SUBSCRIBED") {
            clearTimeout(tiempoLimite);
            resolve();
          } else if (estado === "CHANNEL_ERROR" || estado === "TIMED_OUT") {
            clearTimeout(tiempoLimite);
            const e = new Error(`suscripción falló: ${estado} ${err?.message ?? ""}`);
            reject(e);
            anunciarFallo(e);
          }
        });
    });

    await suscrito;
    const inicio = Date.now();
    const { error } = await escritor.from("sesion_demo").update({ modo: "solucion" }).eq("id", 1);
    if (error) throw new Error(`escritura con service role: ${error.message}`);

    const modo = await recibido;
    ok(`UPDATE propagado en ${Date.now() - inicio} ms · modo recibido "${modo}"`);

    await escritor.from("sesion_demo").update({ modo: "hoy" }).eq("id", 1);
    await oyente.removeAllChannels();
    return true;
  } catch (e) {
    falla((e as Error).message);
    await oyente.removeAllChannels().catch(() => {});
    return false;
  }
}

async function verificarGateway(): Promise<boolean> {
  titulo("4. Vercel AI Gateway");
  try {
    const { generateText } = await import("ai");
    const modelo = process.env.CHAT_MODEL ?? "anthropic/claude-sonnet-5";
    const inicio = Date.now();
    const { text, usage } = await generateText({
      model: modelo,
      prompt: "Responde únicamente con la palabra: LISTO",
    });
    ok(
      `${modelo} · respuesta "${text.trim()}" en ${Date.now() - inicio} ms · ` +
        `${usage?.totalTokens ?? "?"} tokens`,
    );
    return true;
  } catch (e) {
    falla((e as Error).message);
    return false;
  }
}

async function main() {
  const resultados = [
    await verificarRest(),
    await verificarBaseDeDatos(),
    await verificarRealtime(),
    await verificarGateway(),
  ];
  const fallidas = resultados.filter((r) => !r).length;
  console.log(
    fallidas === 0
      ? "\n\x1b[32mTodo conectado.\x1b[0m\n"
      : `\n\x1b[31m${fallidas} verificación(es) fallida(s).\x1b[0m\n`,
  );
  process.exit(fallidas === 0 ? 0 : 1);
}

main();
