import { describe, expect, it } from "vitest";
import { crearAleatorio } from "./aleatorio";
import { generarCatalogo } from "./designaciones";
import { COLUMNAS_INVENTARIO, filasInventario, generarInventario } from "./inventario";

const a = crearAleatorio(20260803);
const catalogo = generarCatalogo(a, 6000);
const inventario = generarInventario(a, catalogo);

describe("estructura", () => {
  it("no repite el par designacion + almacen (lo impide la PK compuesta)", () => {
    const claves = new Set(inventario.map((i) => `${i.designacion}|${i.almacen}`));
    expect(claves.size).toBe(inventario.length);
  });

  it("solo usa los tres codigos de almacen del procedimiento", () => {
    for (const i of inventario) expect(["PS", "SL", "XX"]).toContain(i.almacen);
  });

  it("toda fila apunta a una designacion del catalogo", () => {
    const existentes = new Set(catalogo.map((d) => d.designacion));
    for (const i of inventario) expect(existentes.has(i.designacion)).toBe(true);
  });

  it("el pdiv dueno coincide con el de la designacion", () => {
    const pdiv = new Map(catalogo.map((d) => [d.designacion, d.pdiv]));
    for (const i of inventario) expect(i.pdiv_dueno).toBe(pdiv.get(i.designacion));
  });

  it("ninguna cantidad es negativa (CHECK cantidad_no_negativa)", () => {
    for (const i of inventario) expect(i.cantidad).toBeGreaterThanOrEqual(0);
  });
});

describe("la regla que dispara la cotizacion", () => {
  it("la gran mayoria de los planeados tiene stock", () => {
    const planeados = catalogo.filter((d) => d.lcc === "PLAN" && d.vigente);
    const conStock = new Set(inventario.filter((i) => i.cantidad > 0).map((i) => i.designacion));
    const proporcion =
      planeados.filter((d) => conStock.has(d.designacion)).length / planeados.length;
    expect(proporcion).toBeGreaterThan(0.8);
  });

  it("la gran mayoria de los no planeados NO tiene stock", () => {
    const noPlaneados = catalogo.filter((d) => d.lcc === "NP" && d.vigente);
    const conStock = new Set(inventario.filter((i) => i.cantidad > 0).map((i) => i.designacion));
    const proporcion =
      noPlaneados.filter((d) => conStock.has(d.designacion)).length / noPlaneados.length;
    expect(proporcion).toBeLessThan(0.2);
  });

  it("el almacen primario concentra mas existencias que el terciario", () => {
    const suma = (alm: string) =>
      inventario.filter((i) => i.almacen === alm).reduce((s, i) => s + i.cantidad, 0);
    expect(suma("PS")).toBeGreaterThan(suma("XX"));
  });
});

describe("serializacion", () => {
  it("filasInventario respeta el numero de columnas", () => {
    for (const f of filasInventario(inventario.slice(0, 10))) {
      expect(f).toHaveLength(COLUMNAS_INVENTARIO.length);
    }
  });
});
