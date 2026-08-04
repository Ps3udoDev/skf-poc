import { describe, expect, it } from "vitest";
import { crearAleatorio } from "./aleatorio";
import {
  aplicarCasosCurados,
  aplicarHomologosCurados,
  CASOS_CURADOS,
  HOMOLOGOS_CURADOS,
} from "./casos-curados";
import { generarCatalogo } from "./designaciones";
import { resolverObsolescencia } from "./homologos";
import { generarInventario } from "./inventario";

function preparar() {
  const a = crearAleatorio(20260803);
  const catalogo = generarCatalogo(a, 3000);
  const inventario = generarInventario(a, catalogo);
  aplicarCasosCurados(catalogo, inventario);
  return { catalogo, inventario };
}

describe("insercion de los casos", () => {
  it("hay un caso por escena del guion", () => {
    expect(CASOS_CURADOS.length).toBeGreaterThanOrEqual(9);
  });

  it("todos quedan en el catalogo tras aplicarlos", () => {
    const { catalogo } = preparar();
    const codigos = new Set(catalogo.map((d) => d.designacion));
    for (const c of CASOS_CURADOS) expect(codigos.has(c.designacion.designacion)).toBe(true);
  });

  it("las designaciones reservadas llevan el prefijo DEMO- y no colisionan con el generador", () => {
    const { catalogo } = preparar();
    for (const c of CASOS_CURADOS) expect(c.designacion.designacion).toMatch(/^DEMO-/);
    const generadas = catalogo.filter((d) => !d.designacion.startsWith("DEMO-"));
    for (const d of generadas) expect(d.designacion.startsWith("DEMO-")).toBe(false);
  });

  it("NO sobrescribe la obsolescencia de los casos curados", () => {
    const a = crearAleatorio(20260803);
    const catalogo = generarCatalogo(a, 3000);
    const inventario = generarInventario(a, catalogo);
    aplicarCasosCurados(catalogo, inventario);
    resolverObsolescencia(a, catalogo);

    const buscar = (c: string) => catalogo.find((d) => d.designacion === c);
    expect(buscar("DEMO-OBS-CON")?.reemplazado_por).toBe("DEMO-6205-2RSH/C3");
    expect(buscar("DEMO-OBS-SIN")?.reemplazado_por).toBeNull();
    expect(buscar("DEMO-OBS-SIN")?.reemplazo_indicado_fabrica).toBeNull();
    expect(buscar("DEMO-OBS-FAB")?.reemplazo_indicado_fabrica).toBe("DEMO-OBS-FAB-NS");
    expect(buscar("DEMO-OBS-FAB")?.reemplazado_por).toBeNull();
  });

  it("aplicarCasosCurados es idempotente: aplicarlo dos veces no duplica", () => {
    const a = crearAleatorio(1);
    const catalogo = generarCatalogo(a, 1000);
    const inventario = generarInventario(a, catalogo);
    aplicarCasosCurados(catalogo, inventario);
    const catalogoTras1 = catalogo.length;
    const inventarioTras1 = inventario.length;
    aplicarCasosCurados(catalogo, inventario);
    expect(catalogo.length).toBe(catalogoTras1);
    expect(inventario.length).toBe(inventarioTras1);
  });

  it("inyecta de forma idempotente el homologo con diferencias tecnicas de la escena 3", () => {
    const homologos: import("./homologos").Homologo[] = [];
    aplicarHomologosCurados(homologos);
    aplicarHomologosCurados(homologos);

    expect(homologos).toHaveLength(HOMOLOGOS_CURADOS.length);
    const reemplazo = homologos.find((h) => h.origen === "DEMO-OBS-CON");
    expect(reemplazo?.equivalente).toBe("DEMO-6205-2RSH/C3");
    expect(reemplazo?.diferencias.length).toBeGreaterThanOrEqual(2);
  });
});

describe("cada caso se comporta como exige el guion", () => {
  const { catalogo, inventario } = preparar();
  const buscar = (codigo: string) => catalogo.find((d) => d.designacion === codigo);
  const stockDe = (codigo: string) =>
    inventario.filter((i) => i.designacion === codigo).reduce((s, i) => s + i.cantidad, 0);

  it("el caso truncado tiene al menos 3 designaciones que comparten su prefijo", () => {
    const prefijoIncompleto = "DEMO-6205-2RSH";
    const coincidencias = catalogo.filter((d) => d.designacion.startsWith(prefijoIncompleto));
    expect(buscar(prefijoIncompleto)).toBeUndefined();
    expect(coincidencias.length).toBeGreaterThanOrEqual(3);
  });

  it("el caso de MOQ tiene MOQ alto y precio unitario bajo", () => {
    const d = buscar("DEMO-MOQ-50");
    expect(d?.moq).toBe(50);
    expect(d?.precio_lista).not.toBeNull();
    expect(d?.precio_lista as number).toBeLessThan(100);
  });

  it("el caso de pack tiene pack de 20", () => {
    expect(buscar("DEMO-PACK-20")?.pack_quantity).toBe(20);
  });

  it("el obsoleto con reemplazo apunta a una designacion vigente del catalogo", () => {
    const d = buscar("DEMO-OBS-CON");
    expect(d?.vigente).toBe(false);
    expect(d?.reemplazado_por).not.toBeNull();
    expect(buscar(d?.reemplazado_por as string)?.vigente).toBe(true);
  });

  it("el obsoleto sin reemplazo no tiene ninguno de los dos campos", () => {
    const d = buscar("DEMO-OBS-SIN");
    expect(d?.vigente).toBe(false);
    expect(d?.reemplazado_por).toBeNull();
    expect(d?.reemplazo_indicado_fabrica).toBeNull();
  });

  it("el reemplazo indicado por fabrica no existe en el catalogo", () => {
    const d = buscar("DEMO-OBS-FAB");
    expect(d?.reemplazado_por).toBeNull();
    expect(d?.reemplazo_indicado_fabrica).not.toBeNull();
    expect(buscar(d?.reemplazo_indicado_fabrica as string)).toBeUndefined();
  });

  it("el caso de ventana es planeado, tiene stock y pertenece a una planta con ventana larga", () => {
    const d = buscar("DEMO-VENTANA");
    expect(d?.lcc).toBe("PLAN");
    expect(d?.vigente).toBe(true);
    expect(stockDe("DEMO-VENTANA")).toBeGreaterThan(0);
    expect(d?.pdiv).toBe("P103");
  });

  it("el caso de nueva creacion esta marcado como tal", () => {
    expect(buscar("DEMO-NUEVA")?.es_nueva_creacion).toBe(true);
  });

  it("el caso de transmision no tiene stock, para que llegue a la consulta al Planner", () => {
    expect(buscar("DEMO-PT-PLANNER")?.segmento).toBe("power_transmission");
    expect(buscar("DEMO-PT-PLANNER")?.lcc).toBe("NP");
    expect(stockDe("DEMO-PT-PLANNER")).toBe(0);
  });
});
