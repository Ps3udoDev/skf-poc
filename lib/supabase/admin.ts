import { createClient } from "@supabase/supabase-js";
import type { Database } from "./tipos";

/**
 * Cliente con service role. Ignora RLS.
 * SOLO servidor: nunca importar desde un Client Component.
 */
export function clienteAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !clave)
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  return createClient<Database>(url, clave, { auth: { persistSession: false } });
}
