import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { variableDeEntorno } from "./entorno";
import type { Database } from "./tipos";

let cliente: SupabaseClient<Database> | null = null;

/**
 * Cliente de solo lectura con la clave anónima.
 *
 * No usa cookies: el POC no tiene sesión de usuario y `cookies()` solo existe
 * dentro del ciclo de una petición, lo que dejaría fuera a los tests de
 * integración. RLS garantiza que esta clave no puede escribir en ninguna tabla.
 */
export function clienteLectura(): SupabaseClient<Database> {
  if (cliente) return cliente;
  cliente = createClient<Database>(
    variableDeEntorno("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    variableDeEntorno("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    { auth: { persistSession: false } },
  );
  return cliente;
}
