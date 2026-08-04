import { describe, expect, it } from "vitest";
import { Constants } from "@/lib/supabase/tipos";
import { MOTIVO_POR_RUTA, motivoDeclinado } from "./motivos";
import { RUTAS_QMS } from "./tipos";

/** Valores del enum SQL, leídos del esquema generado, no transcritos a mano. */
const MOTIVOS_SQL = Constants.public.Enums.motivo_declinado;

describe("Puente entre RutaQMS y el enum motivo_declinado", () => {
  it("toda ruta declinar_* tiene motivo y ninguna otra lo tiene", () => {
    // Recorre TODAS las rutas del dominio, no una muestra: si mañana se agrega
    // una ruta nueva a RUTAS_QMS, este test la incluye automaticamente.
    const conMotivo = RUTAS_QMS.filter((r) => motivoDeclinado(r) !== null);
    const declinantes = RUTAS_QMS.filter((r) => r.startsWith("declinar_"));
    expect([...conMotivo].sort()).toEqual([...declinantes].sort());
  });

  it("las rutas que no declinan devuelven null", () => {
    const noDeclinantes = RUTAS_QMS.filter((r) => !r.startsWith("declinar_"));
    // Salvaguarda: si el filtro dejara de encontrar rutas la asercion siguiente
    // pasaria en vacio.
    expect(noDeclinantes.length).toBeGreaterThan(0);
    for (const ruta of noDeclinantes) {
      expect(motivoDeclinado(ruta)).toBeNull();
    }
  });

  it("cada motivo devuelto existe en el enum de la base", () => {
    for (const ruta of RUTAS_QMS) {
      const motivo = motivoDeclinado(ruta);
      if (motivo !== null) expect(MOTIVOS_SQL).toContain(motivo);
    }
  });

  it("ningun valor del enum SQL se queda sin ruta que lo produzca", () => {
    // Sentido inverso al que garantiza el compilador: si la base gana un
    // motivo nuevo, alguna ruta del dominio tiene que emitirlo.
    const emitidos = new Set<string>(Object.values(MOTIVO_POR_RUTA));
    expect([...MOTIVOS_SQL].sort()).toEqual([...emitidos].sort());
  });

  it("la correspondencia es 1:1: ningun motivo se repite en dos rutas", () => {
    const valores = Object.values(MOTIVO_POR_RUTA);
    expect(new Set(valores).size).toBe(valores.length);
  });
});
