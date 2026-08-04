import { describe, expect, it } from "vitest";
import { filasPlantas, PLANTAS } from "./plantas";

describe("catalogo de plantas", () => {
  it("tiene 18 plantas con pdiv unico", () => {
    expect(PLANTAS).toHaveLength(18);
    expect(new Set(PLANTAS.map((p) => p.pdiv)).size).toBe(18);
  });

  it("ninguna ventana dura menos de 2 h ni mas de 2.5 h", () => {
    for (const p of PLANTAS) {
      expect(p.ventana_duracion_min).toBeGreaterThanOrEqual(120);
      expect(p.ventana_duracion_min).toBeLessThanOrEqual(150);
    }
  });

  it("la mayoria de las plantas europeas abre su ventana en el pico de Mexico", () => {
    const europeas = PLANTAS.filter((p) => p.pdiv.startsWith("P1"));
    const enPico = europeas.filter(
      (p) => p.ventana_inicio_min >= 720 && p.ventana_inicio_min <= 900,
    );
    expect(europeas.length).toBeGreaterThanOrEqual(8);
    expect(enPico.length / europeas.length).toBeGreaterThan(0.7);
  });

  it("exactamente una planta tiene ventana de inicio variable", () => {
    const variables = PLANTAS.filter((p) => p.ventana_variabilidad_min > 0);
    expect(variables).toHaveLength(1);
    expect(variables[0].pais).toBe("Bélgica");
    expect(variables[0].ventana_variabilidad_min).toBeGreaterThanOrEqual(60);
  });

  it("al menos dos plantas no son cotizables, para ejercer el punto 4.5b", () => {
    const noCotizables = PLANTAS.filter((p) => !p.tiene_conexion || !p.tiene_ruta_embarque);
    expect(noCotizables.length).toBeGreaterThanOrEqual(2);
  });

  it("hay al menos una sin conexion y al menos una sin ruta de embarque", () => {
    expect(PLANTAS.some((p) => !p.tiene_conexion)).toBe(true);
    expect(PLANTAS.some((p) => !p.tiene_ruta_embarque)).toBe(true);
  });

  it("el desempeno de TE es siempre positivo", () => {
    for (const p of PLANTAS) expect(p.desempeno_te).toBeGreaterThan(0);
  });

  it("filasPlantas produce una fila por planta con 11 columnas", () => {
    const filas = filasPlantas();
    expect(filas).toHaveLength(18);
    for (const f of filas) expect(f).toHaveLength(11);
  });
});
