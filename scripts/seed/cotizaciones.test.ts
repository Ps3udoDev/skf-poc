import { describe, expect, it } from "vitest";
import { crearAleatorio } from "./aleatorio";
import { OPERADORES } from "./comercial";
import {
  COLUMNAS_COTIZACIONES,
  deformar,
  filasCotizaciones,
  generarCotizaciones,
} from "./cotizaciones";
import { generarCatalogo } from "./designaciones";
import { generarInventario } from "./inventario";

const a = crearAleatorio(20260803);
const catalogo = generarCatalogo(a, 6000);
const inventario = generarInventario(a, catalogo);
const cotizaciones = generarCotizaciones(a, catalogo, inventario, 300, {
  desde: new Date("2026-02-02T00:00:00Z"),
  hasta: new Date("2026-08-01T00:00:00Z"),
  porDiaHabil: 65,
});

describe("deformacion de designaciones", () => {
  it("siempre devuelve algo distinto del original", () => {
    const al = crearAleatorio(3);
    for (const codigo of ["6205-2RSH/C3", "NU2205 ECP", "22308 CC/W33", "YAR 205-2F"]) {
      for (let i = 0; i < 20; i++) expect(deformar(al, codigo)).not.toBe(codigo);
    }
  });

  it("nunca devuelve cadena vacia", () => {
    const al = crearAleatorio(4);
    for (let i = 0; i < 200; i++) {
      expect(deformar(al, "6205-2RSH/C3").length).toBeGreaterThan(0);
    }
  });

  it("produce truncamientos: alguna deformacion es prefijo del original", () => {
    const al = crearAleatorio(20260803);
    const truncados = Array.from({ length: 300 }, () => deformar(al, "6205-2RSH/C3")).filter((d) =>
      "6205-2RSH/C3".startsWith(d),
    );
    expect(truncados.length).toBeGreaterThan(10);
  });
});

describe("volumen y formato", () => {
  it("genera entre 7000 y 11000 cotizaciones para 6 meses a 65 por dia habil", () => {
    expect(cotizaciones.length).toBeGreaterThan(7000);
    expect(cotizaciones.length).toBeLessThan(11000);
  });

  it("todo numero cumple el formato AAAAQ##### que exige el CHECK", () => {
    for (const c of cotizaciones) expect(c.numero).toMatch(/^\d{4}Q\d{5}$/);
  });

  it("los numeros no se repiten", () => {
    expect(new Set(cotizaciones.map((c) => c.numero)).size).toBe(cotizaciones.length);
  });

  it("toda cantidad es positiva (CHECK cotizaciones_cantidad_positiva)", () => {
    for (const c of cotizaciones) expect(c.cantidad).toBeGreaterThan(0);
  });

  it("no hay solicitudes en sabado ni domingo", () => {
    for (const c of cotizaciones) {
      const dia = c.fecha_solicitud.getUTCDay();
      expect(dia).not.toBe(0);
      expect(dia).not.toBe(6);
    }
  });
});

describe("restricciones de coherencia de la base", () => {
  it("cotizada implica te_semanas y precio no nulos", () => {
    for (const c of cotizaciones.filter((x) => x.resultado === "cotizada")) {
      expect(c.te_semanas).not.toBeNull();
      expect(c.precio).not.toBeNull();
      expect(c.motivo_declinado).toBeNull();
    }
  });

  it("declinada implica motivo no nulo", () => {
    for (const c of cotizaciones.filter((x) => x.resultado === "declinada")) {
      expect(c.motivo_declinado).not.toBeNull();
    }
  });

  it("la fecha de respuesta nunca precede a la de solicitud", () => {
    for (const c of cotizaciones) {
      if (c.fecha_respuesta) {
        expect(c.fecha_respuesta.getTime()).toBeGreaterThanOrEqual(c.fecha_solicitud.getTime());
      }
    }
  });

  it("solo asigna operadores activos usando sus ids reales de insercion", () => {
    const idsActivos = new Set(
      OPERADORES.map((operador, indice) => ({ operador, id: indice + 1 }))
        .filter(({ operador }) => operador.activo)
        .map(({ id }) => id),
    );
    for (const c of cotizaciones) expect(idsActivos.has(c.operador_id as number)).toBe(true);
  });
});

describe("patrones sembrados deliberadamente", () => {
  it("hay un pico visible en la franja de desconexion de 12:30 a 15:00", () => {
    const enFranja = cotizaciones.filter((c) => {
      const min = c.fecha_solicitud.getUTCHours() * 60 + c.fecha_solicitud.getUTCMinutes();
      return min >= 750 && min < 900;
    });
    expect(enFranja.length / cotizaciones.length).toBeGreaterThan(0.38);
  });

  it("el pico esta dominado por el motivo 'ya estaba disponible en WCL'", () => {
    const enFranjaDeclinadas = cotizaciones.filter((c) => {
      const min = c.fecha_solicitud.getUTCHours() * 60 + c.fecha_solicitud.getUTCMinutes();
      return min >= 750 && min < 900 && c.resultado === "declinada";
    });
    const yaDisponible = enFranjaDeclinadas.filter(
      (c) => c.motivo_declinado === "ya_disponible_wcl",
    );
    expect(yaDisponible.length / enFranjaDeclinadas.length).toBeGreaterThan(0.5);
  });

  it("hay un volumen sustancial de designaciones mal ingresadas", () => {
    const invalidas = cotizaciones.filter((c) => c.motivo_declinado === "designacion_invalida");
    expect(invalidas.length / cotizaciones.length).toBeGreaterThan(0.1);
  });

  it("las designaciones invalidas no existen en el catalogo, que es el punto 4.8", () => {
    const existentes = new Set(catalogo.map((d) => d.designacion));
    const invalidas = cotizaciones.filter((c) => c.motivo_declinado === "designacion_invalida");
    const fuera = invalidas.filter((c) => !existentes.has(c.designacion));
    expect(fuera.length / invalidas.length).toBeGreaterThan(0.9);
  });

  it("el promedio de respuesta ronda los 4 dias habiles del SLA", () => {
    const atendidas = cotizaciones.filter((c) => c.fecha_respuesta !== null);
    const dias = atendidas.map(
      (c) => ((c.fecha_respuesta as Date).getTime() - c.fecha_solicitud.getTime()) / 86400000,
    );
    const promedio = dias.reduce((s, d) => s + d, 0) / dias.length;
    expect(promedio).toBeGreaterThan(2.5);
    expect(promedio).toBeLessThan(5.5);
  });

  it("existe una cola de casos que exceden el SLA", () => {
    const atendidas = cotizaciones.filter((c) => c.fecha_respuesta !== null);
    const excedidas = atendidas.filter(
      (c) => ((c.fecha_respuesta as Date).getTime() - c.fecha_solicitud.getTime()) / 86400000 > 6,
    );
    expect(excedidas.length / atendidas.length).toBeGreaterThan(0.05);
  });

  it("los cinco ultimos dias habiles del mes se asignan al equipo OEM", () => {
    const cierre = cotizaciones.filter((c) => c.patron === "cierre_mes_oem");
    expect(cierre.length).toBeGreaterThan(200);
  });

  it("cubre los cinco motivos de declinado del arbol", () => {
    const motivos = new Set(
      cotizaciones.filter((c) => c.motivo_declinado).map((c) => c.motivo_declinado),
    );
    expect(motivos.size).toBe(5);
  });
});

describe("determinismo y serializacion", () => {
  it("misma semilla, mismo historico", () => {
    const opciones = {
      desde: new Date("2026-06-01T00:00:00Z"),
      hasta: new Date("2026-06-30T00:00:00Z"),
      porDiaHabil: 10,
    };
    const x = crearAleatorio(9);
    const cat = generarCatalogo(x, 500);
    const inv = generarInventario(x, cat);
    const y = crearAleatorio(9);
    const cat2 = generarCatalogo(y, 500);
    const inv2 = generarInventario(y, cat2);
    expect(generarCotizaciones(crearAleatorio(1), cat, inv, 20, opciones)).toEqual(
      generarCotizaciones(crearAleatorio(1), cat2, inv2, 20, opciones),
    );
  });

  it("filasCotizaciones respeta el numero de columnas", () => {
    for (const f of filasCotizaciones(cotizaciones.slice(0, 10))) {
      expect(f).toHaveLength(COLUMNAS_COTIZACIONES.length);
    }
  });
});
