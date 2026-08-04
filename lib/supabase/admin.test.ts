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
