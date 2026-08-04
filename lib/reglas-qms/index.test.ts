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
  segmento: "rodamiento",
  moq: 1,
  packQuantity: 1,
  precioLista: 120.5,
  vigente: true,
  reemplazadoPor: null,
  reemplazoIndicadoFabrica: null,
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
  // Las tres salidas de la rama de obsoletos, en el orden del procedimiento.

  it("SALIDA 1 · reemplazo en sistema: cotiza sin exigir validacion tecnica", () => {
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

  it("SALIDA 2 · reemplazo solo indicado por la fabrica: cotiza y exige Ing. de Ventas", () => {
    const r = evaluarSolicitud(
      ctx({
        designacion: d({
          pcc: "O",
          vigente: false,
          reemplazoIndicadoFabrica: "6205-2RSL/C3",
        }),
        reemplazo: null,
      }),
    );
    expect(r.ruta).toBe("cotizar_con_reemplazo");
    expect(r.punto).toBe("4.6");
    expect(r.declinada).toBe(false);
    expect(r.avisos.some((a) => a.tipo === "validar_con_ingeniero_ventas")).toBe(true);
  });

  it("SALIDA 2 · el mensaje nombra la original y el codigo que indica la fabrica", () => {
    const r = evaluarSolicitud(
      ctx({
        designacion: d({
          pcc: "O",
          vigente: false,
          reemplazoIndicadoFabrica: "6205-2RSL/C3",
        }),
      }),
    );
    expect(r.mensaje).toContain("6205-2RSH/C3");
    expect(r.mensaje).toContain("6205-2RSL/C3");
  });

  it("SALIDA 2 · el resto del arbol se evalua sobre la ORIGINAL, no sobre el reemplazo", () => {
    // Deliberado: no conocemos MOQ, pack quantity ni FPC del reemplazo porque
    // por definicion no esta en el sistema. Aqui la original tiene pack 20 y
    // la cantidad se ajusta con SU pack, no con uno inventado.
    const r = evaluarSolicitud(
      ctx({
        designacion: d({
          pcc: "O",
          vigente: false,
          reemplazoIndicadoFabrica: "6205-2RSL/C3",
          packQuantity: 20,
          fpc: "2",
        }),
        cantidad: 25,
      }),
    );
    expect(r.cantidadEfectiva).toBe(40);
    expect(r.avisos.map((a) => a.tipo)).toContain("pack_quantity_ajustado");
    expect(r.avisos.map((a) => a.tipo)).toContain("precio_requiere_lpc");
  });

  it("SALIDA 3 · obsoleto sin reemplazo de ninguna clase: declina por 4.7", () => {
    const r = evaluarSolicitud(
      ctx({
        designacion: d({ pcc: "O", vigente: false, reemplazoIndicadoFabrica: null }),
        reemplazo: null,
      }),
    );
    expect(r.ruta).toBe("declinar_obsoleto_sin_reemplazo");
    expect(r.punto).toBe("4.7");
    expect(r.declinada).toBe(true);
  });

  it("el aviso de Ing. de Ventas aparece SOLO en la segunda salida", () => {
    const tieneAviso = (c: Parameters<typeof evaluarSolicitud>[0]) =>
      evaluarSolicitud(c).avisos.some((a) => a.tipo === "validar_con_ingeniero_ventas");

    const enSistema = ctx({
      designacion: d({ pcc: "O", vigente: false, reemplazadoPor: "6205-2RSL/C3" }),
      reemplazo: d({ designacion: "6205-2RSL/C3" }),
    });
    const soloFabrica = ctx({
      designacion: d({ pcc: "O", vigente: false, reemplazoIndicadoFabrica: "6205-2RSL/C3" }),
    });
    const sinReemplazo = ctx({ designacion: d({ pcc: "O", vigente: false }) });
    const vigente = ctx();

    expect([
      tieneAviso(enSistema),
      tieneAviso(soloFabrica),
      tieneAviso(sinReemplazo),
      tieneAviso(vigente),
    ]).toEqual([false, true, false, false]);
  });

  it("el reemplazo en sistema tiene prioridad sobre el que indica la fabrica", () => {
    // Si ambos datos estan presentes gana el primer sub-caso: conocemos el
    // reemplazo por completo y no hace falta validacion tecnica.
    const r = evaluarSolicitud(
      ctx({
        designacion: d({
          pcc: "O",
          vigente: false,
          reemplazadoPor: "6205-2RSL/C3",
          reemplazoIndicadoFabrica: "6205-2RSK/C3",
        }),
        reemplazo: d({ designacion: "6205-2RSL/C3" }),
      }),
    );
    expect(r.mensaje).toContain("6205-2RSL/C3");
    expect(r.avisos.some((a) => a.tipo === "validar_con_ingeniero_ventas")).toBe(false);
  });

  it("el mensaje nombra tanto la designacion original como el reemplazo", () => {
    const r = evaluarSolicitud(
      ctx({
        designacion: d({ pcc: "O", vigente: false, reemplazadoPor: "6205-2RSL/C3" }),
        reemplazo: d({ designacion: "6205-2RSL/C3" }),
      }),
    );
    // El cliente necesita ver qué pidió (la original) y qué se le está
    // cotizando en su lugar (el reemplazo).
    expect(r.mensaje).toContain("6205-2RSH/C3");
    expect(r.mensaje).toContain("6205-2RSL/C3");
  });

  it("encadena 4.6 -> 4.4: declina si el reemplazo incumple su propio MOQ", () => {
    // La original tiene moq 1 (no incumpliría nada); el reemplazo exige 50.
    const r = evaluarSolicitud(
      ctx({
        designacion: d({ pcc: "O", vigente: false, reemplazadoPor: "6205-2RSL/C3" }),
        reemplazo: d({ designacion: "6205-2RSL/C3", moq: 50 }),
        cantidad: 5,
      }),
    );
    expect(r.ruta).toBe("declinar_moq");
    expect(r.punto).toBe("4.4");
    expect(r.declinada).toBe(true);
    // El MOQ citado es el del reemplazo (50), no el de la original (1).
    expect(r.mensaje).toContain("50");
    expect(r.mensaje).toContain("6205-2RSL/C3");
  });

  it("el pack quantity efectivo se calcula sobre el reemplazo, no sobre la original", () => {
    // La original tiene packQuantity 1 (no se ajustaría); el reemplazo se
    // surte en cajas de 20.
    const r = evaluarSolicitud(
      ctx({
        designacion: d({ pcc: "O", vigente: false, reemplazadoPor: "6205-2RSL/C3" }),
        reemplazo: d({ designacion: "6205-2RSL/C3", packQuantity: 20 }),
        cantidad: 25,
      }),
    );
    expect(r.cantidadEfectiva).toBe(40);
  });

  it("los avisos de nueva creacion y precio se acumulan sobre el reemplazo", () => {
    // Solo el reemplazo es de nueva creacion y FPC2; la original no lo es.
    const r = evaluarSolicitud(
      ctx({
        designacion: d({ pcc: "O", vigente: false, reemplazadoPor: "6205-2RSL/C3" }),
        reemplazo: d({ designacion: "6205-2RSL/C3", esNuevaCreacion: true, fpc: "2" }),
      }),
    );
    expect(r.semanasExtraTE).toBe(4);
    expect(r.avisos.map((a) => a.tipo)).toContain("nueva_creacion");
    expect(r.avisos.map((a) => a.tipo)).toContain("precio_requiere_lpc");
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
    expect(r.ruta).toBe("revisar_lt");
  });
});

describe("Planeado y no planeado (4.1, 4.2, 4.3)", () => {
  it("declina el planeado que ya estaba disponible en WCL", () => {
    const r = evaluarSolicitud(ctx({ cantidad: 10 }));
    expect(r.ruta).toBe("declinar_ya_disponible");
    expect(r.punto).toBe("4.1");
    expect(r.declinada).toBe(true);
  });

  it("revisa LT estandar o del planner si la cantidad supera el stock", () => {
    const r = evaluarSolicitud(ctx({ cantidad: 900 }));
    expect(r.ruta).toBe("revisar_lt");
    expect(r.declinada).toBe(false);
    // El punto 4.1 admite las dos vias; el mensaje no debe omitir la primera.
    expect(r.mensaje).toContain("LT estándar");
    expect(r.mensaje).toContain("planner");
  });

  it("ingresa PINQ para el no planeado sin disponibilidad", () => {
    const r = evaluarSolicitud(ctx({ designacion: d({ lcc: "NP", pcc: "N" }), existencias: [] }));
    expect(r.ruta).toBe("ingresar_pinq");
    expect(r.punto).toBe("4.3");
  });

  it("consulta al Planner para el Power Transmission sin disponibilidad (4.3)", () => {
    const r = evaluarSolicitud(
      ctx({
        designacion: d({ lcc: "NP", pcc: "N", segmento: "power_transmission" }),
        existencias: [],
      }),
    );
    expect(r.ruta).toBe("consultar_planner");
    expect(r.punto).toBe("4.3");
    expect(r.declinada).toBe(false);
    expect(r.mensaje).toContain("Planner");
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

  it("si declina por 4.1 (ya disponible) SI conserva los avisos acumulados", () => {
    // A diferencia de las declinaciones tempranas (4.8, 4.5b, 4.7, 4.4), la
    // declinacion de 4.1 ocurre despues de calcular los avisos de 4.5a/4.9/5.3:
    // esa informacion sigue siendo util para el cliente aunque no se cotice.
    const r = evaluarSolicitud(ctx({ designacion: d({ packQuantity: 5 }), cantidad: 12 }));
    expect(r.ruta).toBe("declinar_ya_disponible");
    expect(r.declinada).toBe(true);
    expect(r.avisos.some((a) => a.tipo === "pack_quantity_ajustado")).toBe(true);
  });
});
