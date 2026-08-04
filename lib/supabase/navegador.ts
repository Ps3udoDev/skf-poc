import { createBrowserClient } from "@supabase/ssr";
import { variableDeEntorno } from "./entorno";
import type { Database } from "./tipos";

export function clienteNavegador() {
  return createBrowserClient<Database>(
    variableDeEntorno("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    variableDeEntorno("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );
}
