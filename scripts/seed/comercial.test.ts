import { describe, expect, it } from "vitest";
import { crearAleatorio } from "./aleatorio";
import {
  COLUMNAS_CLIENTES,
  filasClientes,
  filasOperadores,
  generarClientes,
  OPERADORES,
} from "./comercial";

describe("operadores", () => {
  it("son codigos CSR, nunca nombres de personas", () => {
    expect(OPERADORES.length).toBeGreaterThanOrEqual(6);
    for (const o of OPERADORES) expect(o.codigo).toMatch(/^CSR \d+$/);
  });

  it("los codigos son unicos", () => {
    expect(new Set(OPERADORES.map((o) => o.codigo)).size).toBe(OPERADORES.length);
  });

  it("filasOperadores produce dos columnas por operador", () => {
    for (const f of filasOperadores()) expect(f).toHaveLength(2);
  });
});

describe("clientes", () => {
  const clientes = generarClientes(crearAleatorio(20260803), 300);

  it("genera la cantidad pedida con nombres unicos", () => {
    expect(clientes).toHaveLength(300);
    expect(new Set(clientes.map((c) => c.nombre)).size).toBe(300);
  });

  it("es determinista con la misma semilla", () => {
    expect(generarClientes(crearAleatorio(5), 40)).toEqual(generarClientes(crearAleatorio(5), 40));
  });

  it("el descuento esta siempre dentro de [0, 1] (CHECK clientes_descuento_rango)", () => {
    for (const c of clientes) {
      expect(c.descuento).toBeGreaterThanOrEqual(0);
      expect(c.descuento).toBeLessThanOrEqual(1);
    }
  });

  it("cubre los tres tipos de cliente", () => {
    const tipos = new Set(clientes.map((c) => c.tipo));
    expect(tipos).toEqual(new Set(["AFT", "OEM", "USUARIO_FINAL"]));
  });

  it("hay clientes OEM que no usan WCL, como dice el procedimiento", () => {
    const oem = clientes.filter((c) => c.tipo === "OEM");
    expect(oem.some((c) => !c.usa_wcl)).toBe(true);
  });

  it("los AFT usan WCL en su gran mayoria", () => {
    const aft = clientes.filter((c) => c.tipo === "AFT");
    expect(aft.filter((c) => c.usa_wcl).length / aft.length).toBeGreaterThan(0.9);
  });

  it("filasClientes respeta el numero de columnas", () => {
    for (const f of filasClientes(clientes.slice(0, 5))) {
      expect(f).toHaveLength(COLUMNAS_CLIENTES.length);
    }
  });
});
