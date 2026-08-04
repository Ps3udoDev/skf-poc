import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { variableDeEntorno } from "./entorno";
import type { Database } from "./tipos";

export async function clienteServidor() {
  const almacen = await cookies();
  return createServerClient<Database>(
    variableDeEntorno("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    variableDeEntorno("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    {
      cookies: {
        getAll: () => almacen.getAll(),
        setAll: (galletas) => {
          try {
            for (const { name, value, options } of galletas) almacen.set(name, value, options);
          } catch {
            // Server Component: no puede escribir cookies. Sin sesión de usuario
            // en el POC, es irrelevante.
          }
        },
      },
    },
  );
}
