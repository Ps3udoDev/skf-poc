import "server-only";
import { createClient } from "@supabase/supabase-js";
import { variableDeEntorno } from "./entorno";
import type { Database } from "./tipos";

/**
 * Cliente con service role. Ignora RLS.
 * SOLO servidor: nunca importar desde un Client Component.
 * La importación de "server-only" convierte esa regla en un error de
 * compilación si algún Client Component llega a importar este módulo.
 */
export function clienteAdmin() {
  const url = variableDeEntorno("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  const clave = variableDeEntorno(
    "SUPABASE_SERVICE_ROLE_KEY",
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  return createClient<Database>(url, clave, { auth: { persistSession: false } });
}
