/**
 * Test de INTEGRACIÓN: golpea el proyecto real de Supabase por la red.
 *
 * Está fuera de `pnpm test` a propósito. Si el proyecto se suspende por
 * inactividad —o simplemente no hay red— la suite se pondría en rojo por una
 * causa ajena al código, y eso no puede pasar el día de la presentación.
 * `pnpm test` queda hermético; esto se corre aparte con `pnpm test:integracion`.
 */
import { config } from "dotenv";
import { beforeAll, describe, expect, it } from "vitest";
import { clienteAdmin } from "./admin";

beforeAll(() => config({ path: ".env.local", quiet: true }));

describe("clienteAdmin", () => {
  it("lee sesion_demo con tipos correctos", async () => {
    const { data, error } = await clienteAdmin().from("sesion_demo").select("modo").single();
    expect(error).toBeNull();
    expect(["hoy", "solucion"]).toContain(data?.modo);
  });

  it("atraviesa RLS y lee designaciones con tipos correctos", async () => {
    const { error } = await clienteAdmin().from("designaciones").select("designacion").limit(1);
    expect(error).toBeNull();
  });
});
