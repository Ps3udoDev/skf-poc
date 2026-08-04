import { describe, expect, it } from "vitest";
import { crearAleatorio } from "./aleatorio";
import { diametroInterior, FAMILIAS, generarDesignaciones } from "./nomenclatura";

describe("codificacion del diametro interior", () => {
  it("respeta los cuatro codigos especiales", () => {
    expect(diametroInterior("00")).toBe(10);
    expect(diametroInterior("01")).toBe(12);
    expect(diametroInterior("02")).toBe(15);
    expect(diametroInterior("03")).toBe(17);
  });

  it("de 04 en adelante multiplica por 5", () => {
    expect(diametroInterior("04")).toBe(20);
    expect(diametroInterior("05")).toBe(25);
    expect(diametroInterior("20")).toBe(100);
  });
});

describe("familias", () => {
  it("cubre al menos 7 familias", () => {
    expect(FAMILIAS.length).toBeGreaterThanOrEqual(7);
  });

  it("al menos una familia es de transmision de potencia", () => {
    expect(FAMILIAS.some((f) => f.segmento === "power_transmission")).toBe(true);
  });
});

describe("generacion", () => {
  it("produce la cantidad pedida sin designaciones repetidas", () => {
    const d = generarDesignaciones(crearAleatorio(20260803), 5000);
    expect(d).toHaveLength(5000);
    expect(new Set(d.map((x) => x.designacion)).size).toBe(5000);
  });

  it("es determinista con la misma semilla", () => {
    const a = generarDesignaciones(crearAleatorio(42), 300);
    const b = generarDesignaciones(crearAleatorio(42), 300);
    expect(a).toEqual(b);
  });

  it("toda designacion tiene descripcion no vacia y familia conocida", () => {
    const nombres = new Set(FAMILIAS.map((f) => f.nombre));
    for (const x of generarDesignaciones(crearAleatorio(9), 500)) {
      expect(x.descripcion.length).toBeGreaterThan(10);
      expect(nombres.has(x.familia)).toBe(true);
    }
  });

  it("genera designaciones con sufijo y sin sufijo, para que existan truncamientos verosimiles", () => {
    const d = generarDesignaciones(crearAleatorio(4), 2000);
    const conSufijo = d.filter((x) => /[-/]/.test(x.designacion));
    expect(conSufijo.length).toBeGreaterThan(200);
    expect(conSufijo.length).toBeLessThan(d.length);
  });

  it("existen pares donde una designacion es prefijo de otra (el caso del copiado truncado)", () => {
    const d = generarDesignaciones(crearAleatorio(20260803), 5000);
    const codigos = d.map((x) => x.designacion);
    const conjunto = new Set(codigos);
    const prefijos = codigos.filter((c) => {
      for (const otro of conjunto) if (otro !== c && otro.startsWith(c)) return true;
      return false;
    });
    expect(prefijos.length).toBeGreaterThan(50);
  });

  it("la proporcion de transmision de potencia esta entre 8% y 25%", () => {
    const d = generarDesignaciones(crearAleatorio(20260803), 5000);
    const pt = d.filter((x) => x.segmento === "power_transmission").length / d.length;
    expect(pt).toBeGreaterThan(0.08);
    expect(pt).toBeLessThan(0.25);
  });
});
