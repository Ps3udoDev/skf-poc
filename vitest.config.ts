import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

/**
 * `pnpm test` corre solo la suite hermética; `pnpm test:integracion` corre la
 * que sí toca la red (`--mode integracion`).
 *
 * Los `*.integracion.test.ts` se separan a propósito: golpean el proyecto de
 * Supabase, y un proyecto suspendido por inactividad pondría la suite en rojo
 * el día de la presentación por una causa ajena al código.
 */
export default defineConfig(({ mode }) => {
  const integracion = mode === "integracion";
  return {
    test: {
      environment: "node",
      // El pool `forks` por defecto cae con "Fatal process out of memory" en
      // la máquina de desarrollo, y el Plan 3 multiplicará los tests.
      pool: "threads",
      include: integracion
        ? ["lib/**/*.integracion.test.ts", "scripts/**/*.integracion.test.ts"]
        : ["lib/**/*.test.ts", "scripts/**/*.test.ts"],
      exclude: integracion
        ? [...configDefaults.exclude]
        : [...configDefaults.exclude, "**/*.integracion.test.ts"],
    },
    resolve: {
      alias: {
        "@": fileURLToPath(new URL(".", import.meta.url)),
      },
      conditions: ["react-server"],
    },
    ssr: {
      resolve: {
        conditions: ["react-server"],
      },
    },
  };
});
