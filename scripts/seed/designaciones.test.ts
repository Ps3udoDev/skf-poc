import { describe, expect, it } from "vitest";
import { crearAleatorio } from "./aleatorio";
import { COLUMNAS_DESIGNACIONES, filasDesignaciones, generarCatalogo } from "./designaciones";
import { PLANTAS } from "./plantas";

const catalogo = generarCatalogo(crearAleatorio(20260803), 6000);

describe("distribuciones del catalogo", () => {
  it("aproximadamente 60% planeados", () => {
    const p = catalogo.filter((d) => d.lcc === "PLAN").length / catalogo.length;
    expect(p).toBeGreaterThan(0.54);
    expect(p).toBeLessThan(0.66);
  });

  it("aproximadamente 5% obsoletos", () => {
    const o = catalogo.filter((d) => d.pcc === "O").length / catalogo.length;
    expect(o).toBeGreaterThan(0.03);
    expect(o).toBeLessThan(0.08);
  });

  it("aproximadamente 25% FPC 2", () => {
    const f = catalogo.filter((d) => d.fpc === "2").length / catalogo.length;
    expect(f).toBeGreaterThan(0.19);
    expect(f).toBeLessThan(0.31);
  });

  it("hay designaciones de nueva creacion, pero pocas", () => {
    const n = catalogo.filter((d) => d.es_nueva_creacion).length / catalogo.length;
    expect(n).toBeGreaterThan(0.005);
    expect(n).toBeLessThan(0.05);
  });
});

describe("coherencia con las restricciones de la base", () => {
  it("obsoleto si y solo si no vigente (CHECK obsoleto_no_vigente)", () => {
    for (const d of catalogo) expect(d.pcc === "O").toBe(d.vigente === false);
  });

  it("moq y pack_quantity son siempre mayores o iguales a 1", () => {
    for (const d of catalogo) {
      expect(d.moq).toBeGreaterThanOrEqual(1);
      expect(d.pack_quantity).toBeGreaterThanOrEqual(1);
    }
  });

  it("todo pdiv referenciado existe en PLANTAS", () => {
    const validos = new Set(PLANTAS.map((p) => p.pdiv));
    for (const d of catalogo) expect(validos.has(d.pdiv)).toBe(true);
  });

  it("los precios existentes son positivos", () => {
    for (const d of catalogo) {
      if (d.precio_lista !== null) expect(d.precio_lista).toBeGreaterThan(0);
    }
  });
});

describe("precio segun FPC", () => {
  it("todo FPC 1 tiene precio de lista", () => {
    for (const d of catalogo.filter((x) => x.fpc === "1")) {
      expect(d.precio_lista).not.toBeNull();
    }
  });

  it("la mayoria de los FPC 2 no tiene precio de lista", () => {
    const fpc2 = catalogo.filter((d) => d.fpc === "2");
    const sinPrecio = fpc2.filter((d) => d.precio_lista === null).length / fpc2.length;
    expect(sinPrecio).toBeGreaterThan(0.7);
  });
});

describe("obsolescencia diferida", () => {
  it("esta tarea deja las cadenas de reemplazo sin resolver", () => {
    for (const d of catalogo) {
      expect(d.reemplazado_por).toBeNull();
      expect(d.reemplazo_indicado_fabrica).toBeNull();
    }
  });
});

describe("determinismo y serializacion", () => {
  it("misma semilla, mismo catalogo", () => {
    expect(generarCatalogo(crearAleatorio(1), 200)).toEqual(
      generarCatalogo(crearAleatorio(1), 200),
    );
  });

  it("filasDesignaciones produce una columna por cada nombre declarado", () => {
    const filas = filasDesignaciones(catalogo.slice(0, 10));
    expect(filas).toHaveLength(10);
    for (const f of filas) expect(f).toHaveLength(COLUMNAS_DESIGNACIONES.length);
  });
});
