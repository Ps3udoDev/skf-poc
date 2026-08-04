import { describe, expect, it } from "vitest";
import { avisoReemplazo, designacionValida, esObsoleto, plantaCotizable } from "./catalogo";
import type { Designacion, Planta } from "./tipos";

const base: Designacion = {
  designacion: "6205-2RSH/C3",
  descripcion: "Rodamiento rigido de bolas",
  familia: "Rodamiento rigido de bolas",
  pcc: "C",
  lcc: "PLAN",
  fpc: "1",
  pdiv: "P100",
  segmento: "rodamiento",
  moq: 1,
  packQuantity: 1,
  precioLista: 120.5,
  vigente: true,
  reemplazadoPor: null,
  reemplazoIndicadoFabrica: null,
  esNuevaCreacion: false,
};

const planta: Planta = {
  pdiv: "P100",
  nombre: "Planta Europa 1",
  tieneConexion: true,
  tieneRutaEmbarque: true,
};

describe("Designacion inexistente (punto 4.8)", () => {
  it("es invalida cuando no se resolvio en el catalogo", () => {
    expect(designacionValida(null)).toBe(false);
  });

  it("es valida cuando existe", () => {
    expect(designacionValida(base)).toBe(true);
  });
});

describe("Fabrica con conexion y ruta (punto 4.5b)", () => {
  it("no es cotizable sin conexion", () => {
    expect(plantaCotizable({ ...planta, tieneConexion: false })).toBe(false);
  });

  it("no es cotizable sin ruta de embarque", () => {
    expect(plantaCotizable({ ...planta, tieneRutaEmbarque: false })).toBe(false);
  });

  it("no es cotizable si no se resolvio la planta", () => {
    expect(plantaCotizable(null)).toBe(false);
  });

  it("es cotizable con ambas condiciones", () => {
    expect(plantaCotizable(planta)).toBe(true);
  });
});

describe("Obsolescencia (puntos 4.6 y 4.7)", () => {
  it("PCC=O marca obsoleto", () => {
    expect(esObsoleto({ ...base, pcc: "O", vigente: false })).toBe(true);
  });

  it("un producto vigente no es obsoleto", () => {
    expect(esObsoleto(base)).toBe(false);
  });

  it("exige validar con Ing. de Ventas cuando la fabrica indica un reemplazo fuera de sistema", () => {
    const aviso = avisoReemplazo({
      ...base,
      pcc: "O",
      vigente: false,
      reemplazoIndicadoFabrica: "6205-2RSL/C3",
    });
    expect(aviso?.tipo).toBe("validar_con_ingeniero_ventas");
    expect(aviso?.punto).toBe("4.6");
    expect(aviso?.mensaje).toContain("Ingeniero de Ventas");
  });

  it("el aviso nombra la designacion original y el codigo que indica la fabrica", () => {
    const aviso = avisoReemplazo({
      ...base,
      pcc: "O",
      vigente: false,
      reemplazoIndicadoFabrica: "6205-2RSL/C3",
    });
    expect(aviso?.mensaje).toContain("6205-2RSH/C3");
    expect(aviso?.mensaje).toContain("6205-2RSL/C3");
  });

  it("no hay aviso cuando la fabrica no indica ningun reemplazo fuera de sistema", () => {
    // El primer sub-caso (reemplazo en sistema) se resuelve por reemplazadoPor
    // y no exige validacion tecnica.
    expect(avisoReemplazo({ ...base, reemplazadoPor: "6205-2RSL/C3" })).toBeNull();
  });
});
