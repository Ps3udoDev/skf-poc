import { describe, expect, it } from "vitest";
import { crearAleatorio } from "./aleatorio";

describe("determinismo", () => {
  it("dos generadores con la misma semilla producen la misma secuencia", () => {
    const a = crearAleatorio(20260803);
    const b = crearAleatorio(20260803);
    const serieA = Array.from({ length: 50 }, () => a.entero(0, 1000));
    const serieB = Array.from({ length: 50 }, () => b.entero(0, 1000));
    expect(serieA).toEqual(serieB);
  });

  it("semillas distintas producen secuencias distintas", () => {
    const a = crearAleatorio(1);
    const b = crearAleatorio(2);
    expect(a.entero(0, 1e9)).not.toBe(b.entero(0, 1e9));
  });
});

describe("rangos", () => {
  it("entero respeta ambos extremos inclusive", () => {
    const a = crearAleatorio(7);
    const vistos = new Set<number>();
    for (let i = 0; i < 500; i++) vistos.add(a.entero(1, 3));
    expect([...vistos].sort()).toEqual([1, 2, 3]);
  });

  it("decimal respeta el numero de decimales", () => {
    const a = crearAleatorio(7);
    const v = a.decimal(0, 100, 2);
    expect(v).toBe(Number(v.toFixed(2)));
  });
});

describe("muestreo", () => {
  it("elegirPonderado respeta las proporciones de forma aproximada", () => {
    const a = crearAleatorio(11);
    const conteo = { alto: 0, bajo: 0 };
    for (let i = 0; i < 10000; i++) {
      conteo[
        a.elegirPonderado<"alto" | "bajo">([
          ["alto", 80],
          ["bajo", 20],
        ])
      ]++;
    }
    expect(conteo.alto / 10000).toBeGreaterThan(0.77);
    expect(conteo.alto / 10000).toBeLessThan(0.83);
  });

  it("barajar no pierde ni duplica elementos", () => {
    const a = crearAleatorio(3);
    const original = [1, 2, 3, 4, 5, 6, 7, 8];
    const barajado = a.barajar(original);
    expect([...barajado].sort((x, y) => x - y)).toEqual(original);
  });

  it("barajar no muta la lista de entrada", () => {
    const a = crearAleatorio(3);
    const original = [1, 2, 3, 4, 5];
    a.barajar(original);
    expect(original).toEqual([1, 2, 3, 4, 5]);
  });

  it("probabilidad(1) siempre es cierto y probabilidad(0) siempre falso", () => {
    const a = crearAleatorio(5);
    for (let i = 0; i < 20; i++) {
      expect(a.probabilidad(1)).toBe(true);
      expect(a.probabilidad(0)).toBe(false);
    }
  });
});

describe("errores en listas vacías", () => {
  it("elegir lanza un error nombrando la función si la lista está vacía", () => {
    const a = crearAleatorio(9);
    expect(() => a.elegir([])).toThrow(/elegir/);
  });

  it("elegirPonderado lanza un error nombrando la función si las opciones están vacías", () => {
    const a = crearAleatorio(9);
    expect(() => a.elegirPonderado([])).toThrow(/elegirPonderado/);
  });
});
