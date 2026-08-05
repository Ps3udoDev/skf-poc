import { describe, expect, it } from "vitest";
import { esNumeroDeCotizacion, esNumeroDeSolicitud, numeroDeSolicitud } from "./numeracion";

describe("Numero de solicitud", () => {
  it("usa el prefijo S y no el de cotizacion", () => {
    expect(numeroDeSolicitud(new Date("2026-08-05T00:00:00Z"), () => 0.5631)).toBe("2026S56310");
  });

  it("cumple el formato AAAAS##### en cualquier sorteo", () => {
    for (let i = 0; i < 200; i++) {
      expect(numeroDeSolicitud()).toMatch(/^\d{4}S\d{5}$/);
    }
  });

  // Mediodia UTC a proposito: el año es el local, y una medianoche UTC caeria
  // en el año anterior al oeste de Greenwich.
  it("rellena con ceros a la izquierda", () => {
    expect(numeroDeSolicitud(new Date("2026-06-15T12:00:00Z"), () => 0)).toBe("2026S00000");
  });

  it("nunca genera un numero con el formato de cotizacion", () => {
    for (let i = 0; i < 200; i++) {
      expect(esNumeroDeCotizacion(numeroDeSolicitud())).toBe(false);
    }
  });
});

describe("Reconocimiento de formatos", () => {
  it("distingue una solicitud de una cotizacion", () => {
    expect(esNumeroDeSolicitud("2026S56310")).toBe(true);
    expect(esNumeroDeSolicitud("2026Q56310")).toBe(false);
    expect(esNumeroDeCotizacion("2026Q56310")).toBe(true);
    expect(esNumeroDeCotizacion("2026S56310")).toBe(false);
  });

  it("no acepta un numero con longitud equivocada", () => {
    expect(esNumeroDeSolicitud("2026S5631")).toBe(false);
    expect(esNumeroDeSolicitud("2026S563100")).toBe(false);
    expect(esNumeroDeCotizacion("26Q56310")).toBe(false);
  });

  it("acepta minusculas y espacios alrededor, como los escribe un usuario", () => {
    expect(esNumeroDeSolicitud(" 2026s56310 ")).toBe(true);
    expect(esNumeroDeCotizacion(" 2026q56310 ")).toBe(true);
  });
});
