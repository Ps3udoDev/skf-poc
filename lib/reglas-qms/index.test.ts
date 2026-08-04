import { describe, expect, it } from "vitest";
import { evaluarSolicitud } from "./index";
import type { ContextoSolicitud, Designacion, Planta } from "./tipos";

const d = (extra: Partial<Designacion> = {}): Designacion => ({
  designacion: "6205-2RSH/C3",
  descripcion: "Rodamiento rigido de bolas 25x52x15",
  familia: "Rodamiento rigido de bolas",
  pcc: "C",
  lcc: "PLAN",
  fpc: "1",
  pdiv: "P100",
  moq: 1,
  packQuantity: 1,
  precioLista: 120.5,
  vigente: true,
  reemplazadoPor: null,
  esNuevaCreacion: false,
  ...extra,
});

const planta: Planta = {
  pdiv: "P100",
  nombre: "Planta Europa 1",
  tieneConexion: true,
  tieneRutaEmbarque: true,
};

const ctx = (extra: Partial<ContextoSolicitud> = {}): ContextoSolicitud => ({
  designacion: d(),
  cantidad: 10,
  existencias: [{ almacen: "PS", cantidad: 500 }],
  planta,
  reemplazo: null,
  ...extra,
});

describe("Corte por designacion inexistente (4.8)", () => {
  it("declina antes que cualquier otra regla", () => {
    const r = evaluarSolicitud(ctx({ designacion: null, planta: null }));
    expect(r.ruta).toBe("declinar_designacion_invalida");
    expect(r.punto).toBe("4.8");
    expect(r.declinada).toBe(true);
  });
});

describe("Corte por planta sin ruta (4.5b)", () => {
  it("declina aunque el producto exista y tenga stock", () => {
    const r = evaluarSolicitud(ctx({ planta: { ...planta, tieneRutaEmbarque: false } }));
    expect(r.ruta).toBe("declinar_planta_sin_ruta");
    expect(r.punto).toBe("4.5b");
    expect(r.declinada).toBe(true);
  });
});

describe("Obsoletos (4.6 y 4.7)", () => {
  it("declina el obsoleto sin reemplazo", () => {
    const r = evaluarSolicitud(ctx({ designacion: d({ pcc: "O", vigente: false }) }));
    expect(r.ruta).toBe("declinar_obsoleto_sin_reemplazo");
    expect(r.punto).toBe("4.7");
    expect(r.declinada).toBe(true);
  });

  it("cotiza el reemplazo cuando existe y no exige validacion si esta en sistema", () => {
    const r = evaluarSolicitud(
      ctx({
        designacion: d({ pcc: "O", vigente: false, reemplazadoPor: "6205-2RSL/C3" }),
        reemplazo: d({ designacion: "6205-2RSL/C3" }),
      }),
    );
    expect(r.ruta).toBe("cotizar_con_reemplazo");
    expect(r.punto).toBe("4.6");
    expect(r.declinada).toBe(false);
    expect(r.avisos.some((a) => a.tipo === "validar_con_ingeniero_ventas")).toBe(false);
  });

  it("exige validacion con Ing. de Ventas si el reemplazo solo lo indica la fabrica", () => {
    const r = evaluarSolicitud(
      ctx({
        designacion: d({ pcc: "O", vigente: false, reemplazadoPor: "6205-2RSL/C3" }),
        reemplazo: d({ designacion: "6205-2RSL/C3" }),
        reemplazoSoloIndicadoPorFabrica: true,
      }),
    );
    expect(r.avisos.some((a) => a.tipo === "validar_con_ingeniero_ventas")).toBe(true);
  });
});

describe("MOQ (4.4)", () => {
  it("declina antes de evaluar la planeacion", () => {
    const r = evaluarSolicitud(ctx({ designacion: d({ moq: 50 }), cantidad: 5 }));
    expect(r.ruta).toBe("declinar_moq");
    expect(r.punto).toBe("4.4");
    expect(r.mensaje).toContain("50");
  });
});

describe("Pack quantity (4.5a)", () => {
  it("ajusta la cantidad efectiva sin declinar", () => {
    // lcc/pcc no planeado: aisla el mecanismo de ajuste de pack quantity de la
    // regla 4.1 (planeado + stock suficiente declina por "ya disponible").
    const r = evaluarSolicitud(
      ctx({ designacion: d({ packQuantity: 20, lcc: "NP", pcc: "N" }), cantidad: 25 }),
    );
    expect(r.declinada).toBe(false);
    expect(r.cantidadEfectiva).toBe(40);
    expect(r.avisos.some((a) => a.tipo === "pack_quantity_ajustado")).toBe(true);
  });

  it("usa la cantidad efectiva al comparar contra el stock", () => {
    // 25 piezas caben en 30 de stock, pero redondeado a 40 ya no.
    const r = evaluarSolicitud(
      ctx({
        designacion: d({ packQuantity: 20 }),
        cantidad: 25,
        existencias: [{ almacen: "PS", cantidad: 30 }],
      }),
    );
    expect(r.ruta).toBe("solicitar_lt_planner");
  });
});

describe("Planeado y no planeado (4.1, 4.2, 4.3)", () => {
  it("declina el planeado que ya estaba disponible en WCL", () => {
    const r = evaluarSolicitud(ctx({ cantidad: 10 }));
    expect(r.ruta).toBe("declinar_ya_disponible");
    expect(r.punto).toBe("4.1");
    expect(r.declinada).toBe(true);
  });

  it("pide LT al planner si la cantidad supera el stock", () => {
    const r = evaluarSolicitud(ctx({ cantidad: 900 }));
    expect(r.ruta).toBe("solicitar_lt_planner");
    expect(r.declinada).toBe(false);
  });

  it("ingresa PINQ para el no planeado sin disponibilidad", () => {
    const r = evaluarSolicitud(ctx({ designacion: d({ lcc: "NP", pcc: "N" }), existencias: [] }));
    expect(r.ruta).toBe("ingresar_pinq");
    expect(r.punto).toBe("4.3");
  });

  it("revisa disponibilidad para el no planeado con existencias", () => {
    const r = evaluarSolicitud(ctx({ designacion: d({ lcc: "NP", pcc: "N" }) }));
    expect(r.ruta).toBe("revisar_disponibilidad_np");
    expect(r.punto).toBe("4.2");
  });
});

describe("Avisos acumulados (4.9 y 5.3)", () => {
  it("suma 4 semanas y avisa por nueva creacion y por FPC2", () => {
    const r = evaluarSolicitud(
      ctx({ designacion: d({ esNuevaCreacion: true, fpc: "2", lcc: "NP", pcc: "N" }) }),
    );
    expect(r.semanasExtraTE).toBe(4);
    expect(r.avisos.map((a) => a.tipo)).toContain("nueva_creacion");
    expect(r.avisos.map((a) => a.tipo)).toContain("precio_requiere_lpc");
  });

  it("no acumula avisos de TE ni precio cuando la solicitud se declina de entrada", () => {
    const r = evaluarSolicitud(ctx({ designacion: null, planta: null }));
    expect(r.avisos).toHaveLength(0);
    expect(r.semanasExtraTE).toBe(0);
  });
});
