import { describe, expect, it } from "vitest";
import {
  esPlaneado,
  rutaNoPlaneado,
  rutaPlaneado,
  stockPorAlmacen,
  stockTotal,
} from "./planeacion";
import type { Designacion, Existencia } from "./tipos";

const base: Designacion = {
  designacion: "6205-2RSH/C3",
  descripcion: "Rodamiento rigido de bolas",
  familia: "Rodamiento rigido de bolas",
  pcc: "C",
  lcc: "PLAN",
  fpc: "1",
  pdiv: "P100",
  moq: 1,
  packQuantity: 1,
  precioLista: 120.5,
  vigente: true,
  reemplazadoPor: null,
  esNuevaCreacion: false,
};

const conStock: Existencia[] = [
  { almacen: "PS", cantidad: 300 },
  { almacen: "SL", cantidad: 50 },
  { almacen: "XX", cantidad: 0 },
];

describe("Clasificacion planeado / no planeado (punto 4.1)", () => {
  it("LCC=PLAN es planeado", () => {
    expect(esPlaneado(base)).toBe(true);
  });

  it("LCC=NP no es planeado", () => {
    expect(esPlaneado({ ...base, lcc: "NP" })).toBe(false);
  });
});

describe("Existencias escalonadas PS / SL / XX", () => {
  it("suma las tres bodegas", () => {
    expect(stockTotal(conStock)).toBe(350);
  });

  it("desglosa por almacen con ceros por defecto", () => {
    expect(stockPorAlmacen([{ almacen: "PS", cantidad: 10 }])).toEqual({ PS: 10, SL: 0, XX: 0 });
  });
});

describe("Ruta de producto planeado (punto 4.1)", () => {
  it("declina cuando la cantidad pedida es menor al stock: ya estaba disponible en WCL", () => {
    expect(rutaPlaneado(base, 100, conStock)).toBe("declinar_ya_disponible");
  });

  it("declina cuando la cantidad iguala al stock", () => {
    expect(rutaPlaneado(base, 350, conStock)).toBe("declinar_ya_disponible");
  });

  it("pide LT al planner cuando la cantidad supera el stock", () => {
    expect(rutaPlaneado(base, 500, conStock)).toBe("solicitar_lt_planner");
  });

  it("pide LT al planner cuando no hay ninguna existencia", () => {
    expect(rutaPlaneado(base, 1, [])).toBe("solicitar_lt_planner");
  });
});

describe("Ruta de producto no planeado (puntos 4.2 y 4.3)", () => {
  it("revisa disponibilidad cuando hay existencias", () => {
    expect(rutaNoPlaneado(conStock)).toBe("revisar_disponibilidad_np");
  });

  it("ingresa PINQ a fabrica cuando no hay disponibilidad", () => {
    expect(rutaNoPlaneado([{ almacen: "PS", cantidad: 0 }])).toBe("ingresar_pinq");
  });

  it("ingresa PINQ cuando no hay ni registro de inventario", () => {
    expect(rutaNoPlaneado([])).toBe("ingresar_pinq");
  });
});
