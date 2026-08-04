import { describe, expect, it } from "vitest";
import { crearAleatorio } from "./aleatorio";
import { generarCatalogo } from "./designaciones";
import {
  COLUMNAS_HOMOLOGOS,
  filasHomologos,
  generarHomologos,
  resolverObsolescencia,
} from "./homologos";

function preparar(semilla = 20260803, n = 6000) {
  const a = crearAleatorio(semilla);
  const catalogo = generarCatalogo(a, n);
  resolverObsolescencia(a, catalogo);
  return { a, catalogo };
}

describe("reparto de los obsoletos", () => {
  it("cubre los tres casos del arbol en proporciones razonables", () => {
    const { catalogo } = preparar();
    const obs = catalogo.filter((d) => d.pcc === "O");
    expect(obs.length).toBeGreaterThan(100);

    const enSistema = obs.filter((d) => d.reemplazado_por !== null).length / obs.length;
    const porFabrica =
      obs.filter((d) => d.reemplazado_por === null && d.reemplazo_indicado_fabrica !== null)
        .length / obs.length;
    const sinNada =
      obs.filter((d) => d.reemplazado_por === null && d.reemplazo_indicado_fabrica === null)
        .length / obs.length;

    expect(enSistema).toBeGreaterThan(0.45);
    expect(porFabrica).toBeGreaterThan(0.12);
    expect(sinNada).toBeGreaterThan(0.15);
    expect(enSistema + porFabrica + sinNada).toBeCloseTo(1, 5);
  });

  it("ninguna designacion vigente queda marcada como reemplazada", () => {
    const { catalogo } = preparar();
    for (const d of catalogo.filter((x) => x.vigente)) {
      expect(d.reemplazado_por).toBeNull();
      expect(d.reemplazo_indicado_fabrica).toBeNull();
    }
  });

  it("todo reemplazado_por apunta a una designacion existente y vigente", () => {
    const { catalogo } = preparar();
    const vigentes = new Set(catalogo.filter((d) => d.vigente).map((d) => d.designacion));
    for (const d of catalogo.filter((x) => x.reemplazado_por !== null)) {
      expect(vigentes.has(d.reemplazado_por as string)).toBe(true);
    }
  });

  it("reemplazo_indicado_fabrica NO existe en el catalogo, que es justo su razon de ser", () => {
    const { catalogo } = preparar();
    const existentes = new Set(catalogo.map((d) => d.designacion));
    const marcadas = catalogo.filter((d) => d.reemplazo_indicado_fabrica !== null);
    expect(marcadas.length).toBeGreaterThan(20);
    for (const d of marcadas) {
      expect(existentes.has(d.reemplazo_indicado_fabrica as string)).toBe(false);
    }
  });

  it("ninguna designacion tiene los dos tipos de reemplazo a la vez", () => {
    const { catalogo } = preparar();
    for (const d of catalogo) {
      expect(d.reemplazado_por !== null && d.reemplazo_indicado_fabrica !== null).toBe(false);
    }
  });
});

describe("homologos", () => {
  it("genera relaciones entre designaciones existentes, sin reflexivas ni duplicadas", () => {
    const { a, catalogo } = preparar();
    const h = generarHomologos(a, catalogo);
    const existentes = new Set(catalogo.map((d) => d.designacion));
    const pares = new Set<string>();
    expect(h.length).toBeGreaterThan(300);
    for (const r of h) {
      expect(existentes.has(r.origen)).toBe(true);
      expect(existentes.has(r.equivalente)).toBe(true);
      expect(r.origen).not.toBe(r.equivalente);
      const clave = `${r.origen}|${r.equivalente}`;
      expect(pares.has(clave)).toBe(false);
      pares.add(clave);
    }
  });

  it("toda relacion trae motivo y al menos una diferencia tecnica descrita", () => {
    const { a, catalogo } = preparar();
    for (const r of generarHomologos(a, catalogo)) {
      expect(r.motivo.length).toBeGreaterThan(5);
      expect(r.diferencias.length).toBeGreaterThan(0);
      for (const d of r.diferencias) {
        expect(d.atributo.length).toBeGreaterThan(0);
        expect(d.valor_origen).not.toBe(d.valor_equivalente);
      }
    }
  });

  it("los homologos son de la misma familia: una equivalencia entre familias no tendria sentido", () => {
    const { a, catalogo } = preparar();
    const familia = new Map(catalogo.map((d) => [d.designacion, d.familia]));
    for (const r of generarHomologos(a, catalogo)) {
      expect(familia.get(r.origen)).toBe(familia.get(r.equivalente));
    }
  });

  it("filasHomologos serializa las diferencias como JSON", () => {
    const { a, catalogo } = preparar();
    const filas = filasHomologos(generarHomologos(a, catalogo).slice(0, 5));
    for (const f of filas) {
      expect(f).toHaveLength(COLUMNAS_HOMOLOGOS.length);
      expect(() => JSON.parse(f[3] as string)).not.toThrow();
    }
  });
});
