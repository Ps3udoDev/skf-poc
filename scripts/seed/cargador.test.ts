import { describe, expect, it } from "vitest";
import { escapar } from "./cargador";

describe("escapar", () => {
  it("serializa arrays como JSON, no como String()", () => {
    // String([5]) === "5" (join por comas) — si escapar() cayera en esa rama,
    // un array se insertaría como el escalar 5 en una columna jsonb, sin error.
    expect(String([5])).toBe("5");
    expect(escapar([5])).toBe("[5]");
    expect(escapar([1, "a", true])).toBe('[1,"a",true]');
  });

  it("serializa objetos como JSON, no como String()", () => {
    // String({a: 1}) === "[object Object]" — la corrupción aquí sería ruidosa
    // (un texto obviamente inválido), pero sigue siendo la rama equivocada.
    expect(String({ a: 1 })).toBe("[object Object]");
    expect(escapar({ a: 1, b: "x" })).toBe('{"a":1,"b":"x"}');
  });

  it("el JSON serializado también pasa por el escapado de texto de COPY", () => {
    const objeto = { nota: "línea1\nlínea2" };
    // JSON.stringify ya convierte el salto de línea real en la secuencia de
    // texto \n (un backslash literal seguido de "n"); escapar() debe además
    // duplicar ese backslash, como exige el formato de COPY.
    const json = JSON.stringify(objeto);
    expect(escapar(objeto)).toBe(json.replace(/\\/g, "\\\\"));
  });

  it("null y undefined siguen produciendo NULL de COPY", () => {
    expect(escapar(null)).toBe("\\N");
    expect(escapar(undefined)).toBe("\\N");
  });

  it("Date sigue produciendo ISO 8601, no JSON", () => {
    const fecha = new Date("2026-08-03T12:00:00.000Z");
    expect(escapar(fecha)).toBe("2026-08-03T12:00:00.000Z");
  });

  it("booleanos siguen produciendo t/f", () => {
    expect(escapar(true)).toBe("t");
    expect(escapar(false)).toBe("f");
  });

  it("números finitos se escapan normalmente", () => {
    expect(escapar(5)).toBe("5");
    expect(escapar(5.5)).toBe("5.5");
    expect(escapar(0)).toBe("0");
  });

  it("lanza un error nombrando el valor si el número no es finito", () => {
    expect(() => escapar(Number.NaN)).toThrow(/NaN/);
    expect(() => escapar(Number.POSITIVE_INFINITY)).toThrow(/Infinity/);
    expect(() => escapar(Number.NEGATIVE_INFINITY)).toThrow(/-Infinity/);
  });

  it("texto con tabulador, salto de línea y backslash se escapa para COPY", () => {
    expect(escapar("a\tb\nc\\d")).toBe("a\\tb\\nc\\\\d");
  });
});
