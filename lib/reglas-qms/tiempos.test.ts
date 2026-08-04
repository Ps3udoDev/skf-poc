import { describe, expect, it } from "vitest";
import {
  avisoNuevaCreacion,
  avisoPrecio,
  SEMANAS_NUEVA_CREACION,
  semanasExtraPorNuevaCreacion,
} from "./tiempos";
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

describe("Nueva creacion (punto 4.9)", () => {
  it("la constante del procedimiento son 4 semanas", () => {
    expect(SEMANAS_NUEVA_CREACION).toBe(4);
  });

  it("suma 4 semanas si es de nueva creacion", () => {
    expect(semanasExtraPorNuevaCreacion({ ...base, esNuevaCreacion: true })).toBe(4);
  });

  it("no suma nada si no lo es", () => {
    expect(semanasExtraPorNuevaCreacion(base)).toBe(0);
  });

  it("emite aviso citando MDG-SAP", () => {
    const aviso = avisoNuevaCreacion({ ...base, esNuevaCreacion: true });
    expect(aviso?.tipo).toBe("nueva_creacion");
    expect(aviso?.punto).toBe("4.9");
    expect(aviso?.mensaje).toContain("MDG-SAP");
  });

  it("no emite aviso si no es de nueva creacion", () => {
    expect(avisoNuevaCreacion(base)).toBeNull();
  });
});

describe("Precio segun FPC (punto 5)", () => {
  it("FPC2 avisa que el precio depende del LPC de fabrica", () => {
    const aviso = avisoPrecio({ ...base, fpc: "2" });
    expect(aviso?.tipo).toBe("precio_requiere_lpc");
    expect(aviso?.mensaje).toContain("LPC");
  });

  it("FPC1 no genera aviso: hay precio de lista o parametros SPQ+", () => {
    expect(avisoPrecio(base)).toBeNull();
  });
});
