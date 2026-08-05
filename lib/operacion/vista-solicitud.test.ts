import { describe, expect, it } from "vitest";
import type { SolicitudResumen } from "@/lib/fuentes/solicitudes";
import { vistaDeSolicitud } from "./vista-solicitud";

const INICIADA_EN = "2026-08-05T00:00:00.000Z";

function solicitud(cambios: Partial<SolicitudResumen> = {}): SolicitudResumen {
  return {
    numero: "2026S56310",
    designacionTexto: "DEMO-6205-2RSH",
    cantidad: 100,
    clasificacionQms: "declinar_designacion_invalida",
    puntoQms: "4.8",
    creadaEn: "2026-08-05T02:45:00.000Z",
    csrAsignado: "CSR 1",
    atendidaEn: null,
    resultado: null,
    motivoDeclinado: null,
    ...cambios,
  };
}

describe("Solicitud inexistente", () => {
  it("no la da por encontrada", () => {
    const vista = vistaDeSolicitud("2026S00001", null, INICIADA_EN, "cliente");
    expect(vista.encontrada).toBe(false);
  });

  it("avisa cuando el numero tiene formato de cotizacion del historico", () => {
    const vista = vistaDeSolicitud("2026Q00847", null, INICIADA_EN, "cliente");
    expect(vista).toMatchObject({ encontrada: false, pareceCotizacion: true });
  });

  it("no confunde un numero de solicitud con una cotizacion", () => {
    const vista = vistaDeSolicitud("2026S00001", null, INICIADA_EN, "cliente");
    expect(vista).toMatchObject({ encontrada: false, pareceCotizacion: false });
  });
});

describe("Alcance de la sesion", () => {
  it("oculta una solicitud anterior al inicio de la sesion", () => {
    const previa = solicitud({ creadaEn: "2026-08-04T23:59:00.000Z" });
    expect(vistaDeSolicitud(previa.numero, previa, INICIADA_EN, "operador").encontrada).toBe(false);
  });

  it("incluye una solicitud creada justo al inicio de la sesion", () => {
    const limite = solicitud({ creadaEn: INICIADA_EN });
    expect(vistaDeSolicitud(limite.numero, limite, INICIADA_EN, "operador").encontrada).toBe(true);
  });
});

describe("Vista del cliente", () => {
  it("responde el estado sin exponer al CSR asignado", () => {
    const vista = vistaDeSolicitud("2026S56310", solicitud(), INICIADA_EN, "cliente");
    expect(vista).toMatchObject({
      encontrada: true,
      numero: "2026S56310",
      designacionCapturada: "DEMO-6205-2RSH",
      cantidad: 100,
      estado: "abierta",
    });
    expect(vista).not.toHaveProperty("csrAsignado");
  });

  it("no adelanta la preclasificacion QMS de una solicitud sin atender", () => {
    const vista = vistaDeSolicitud("2026S56310", solicitud(), INICIADA_EN, "cliente");
    expect(vista).not.toHaveProperty("clasificacionQms");
    expect(vista).not.toHaveProperty("puntoQms");
  });

  it("entrega el resultado y su punto una vez que un CSR la atendio", () => {
    const atendida = solicitud({
      atendidaEn: "2026-08-05T03:10:00.000Z",
      resultado: "declinada",
      motivoDeclinado: "designacion_invalida",
    });
    const vista = vistaDeSolicitud("2026S56310", atendida, INICIADA_EN, "cliente");
    expect(vista).toMatchObject({
      estado: "atendida",
      resultado: "declinada",
      motivoDeclinado: "designacion_invalida",
      puntoQms: "4.8",
    });
    expect(vista).not.toHaveProperty("csrAsignado");
  });

  it("mide los dias habiles transcurridos contra el SLA", () => {
    const vista = vistaDeSolicitud("2026S56310", solicitud(), INICIADA_EN, "cliente", {
      ahora: new Date("2026-08-07T03:00:00.000Z"),
    });
    expect(vista).toMatchObject({
      diasHabilesTranscurridos: 2,
      slaDiasHabiles: 4,
      dentroDelSla: true,
    });
  });

  it("marca fuera de SLA una solicitud abierta que ya paso los 4 dias habiles", () => {
    const vista = vistaDeSolicitud("2026S56310", solicitud(), INICIADA_EN, "cliente", {
      ahora: new Date("2026-08-14T03:00:00.000Z"),
    });
    expect(vista).toMatchObject({ diasHabilesTranscurridos: 7, dentroDelSla: false });
  });
});

describe("Vista del operador", () => {
  it("incluye el CSR y la preclasificacion aunque siga abierta", () => {
    const vista = vistaDeSolicitud("2026S56310", solicitud(), INICIADA_EN, "operador");
    expect(vista).toMatchObject({
      encontrada: true,
      estado: "abierta",
      csrAsignado: "CSR 1",
      clasificacionQms: "declinar_designacion_invalida",
      puntoQms: "4.8",
    });
  });

  it("muestra sin asignar como null y no lo omite", () => {
    const vista = vistaDeSolicitud(
      "2026S56310",
      solicitud({ csrAsignado: null }),
      INICIADA_EN,
      "operador",
    );
    expect(vista).toMatchObject({ csrAsignado: null });
  });
});
