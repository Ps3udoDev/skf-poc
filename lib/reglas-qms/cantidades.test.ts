import { describe, expect, it } from "vitest";
import { avisoPackQuantity, incumpleMoq, redondearAPack } from "./cantidades";
import type { Designacion } from "./tipos";

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

describe("MOQ (punto 4.4)", () => {
  it("incumple cuando la cantidad pedida es menor al MOQ", () => {
    expect(incumpleMoq({ ...base, moq: 50 }, 5)).toBe(true);
  });

  it("no incumple cuando la cantidad iguala al MOQ", () => {
    expect(incumpleMoq({ ...base, moq: 50 }, 50)).toBe(false);
  });

  it("no incumple cuando la cantidad supera al MOQ", () => {
    expect(incumpleMoq({ ...base, moq: 50 }, 100)).toBe(false);
  });
});

describe("Pack quantity (punto 4.5a)", () => {
  it("redondea hacia arriba al multiplo del pack", () => {
    expect(redondearAPack({ ...base, packQuantity: 20 }, 25)).toBe(40);
  });

  it("no altera una cantidad que ya es multiplo exacto", () => {
    expect(redondearAPack({ ...base, packQuantity: 20 }, 40)).toBe(40);
  });

  it("no altera nada cuando el pack es unitario", () => {
    expect(redondearAPack({ ...base, packQuantity: 1 }, 7)).toBe(7);
  });

  it("emite aviso explicando el cambio de cantidad", () => {
    const aviso = avisoPackQuantity({ ...base, packQuantity: 20 }, 25);
    expect(aviso?.tipo).toBe("pack_quantity_ajustado");
    expect(aviso?.punto).toBe("4.5a");
    expect(aviso?.mensaje).toContain("40");
  });

  it("no emite aviso cuando no hay cambio de cantidad", () => {
    expect(avisoPackQuantity({ ...base, packQuantity: 20 }, 40)).toBeNull();
  });
});
