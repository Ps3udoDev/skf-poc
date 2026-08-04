import { describe, expect, it } from "vitest";
import { prepararMarkdown } from "./formato";

describe("Marcadores durante el streaming", () => {
  it("cierra una negrita que aun no termina de llegar", () => {
    expect(prepararMarkdown("El **tiempo estimado")).toBe("El **tiempo estimado**");
  });

  it("retira el marcador recien abierto en vez de cerrarlo en vacio", () => {
    expect(prepararMarkdown("El tiempo **")).toBe("El tiempo ");
  });

  it("no altera una negrita completa", () => {
    expect(prepararMarkdown("El **tiempo estimado** es un rango")).toBe(
      "El **tiempo estimado** es un rango",
    );
  });

  it("cierra un bloque cercado abierto", () => {
    expect(prepararMarkdown("```\nMOQ 50")).toBe("```\nMOQ 50\n```");
  });

  it("cierra un code en linea abierto", () => {
    expect(prepararMarkdown("El punto `4.4")).toBe("El punto `4.4`");
  });
});

describe("Designaciones en monoespaciada", () => {
  it("envuelve una designacion suelta", () => {
    expect(prepararMarkdown("Consulta DEMO-6205-2RSH/C3 en el portal")).toBe(
      "Consulta `DEMO-6205-2RSH/C3` en el portal",
    );
  });

  it("no vuelve a envolver una designacion que ya venia en code", () => {
    expect(prepararMarkdown("Consulta `DEMO-6205-2RSH/C3` en el portal")).toBe(
      "Consulta `DEMO-6205-2RSH/C3` en el portal",
    );
  });

  it("deja intacto lo que viene dentro de un bloque cercado", () => {
    expect(prepararMarkdown("```\nDEMO-PACK-20\n```")).toBe("```\nDEMO-PACK-20\n```");
  });

  it("envuelve varias designaciones de la misma linea", () => {
    expect(prepararMarkdown("DEMO-OBS-SIN se reemplaza por DEMO-MOQ-50.")).toBe(
      "`DEMO-OBS-SIN` se reemplaza por `DEMO-MOQ-50`.",
    );
  });

  it("no arrastra la puntuacion final", () => {
    expect(prepararMarkdown("Pide DEMO-VENTANA.")).toBe("Pide `DEMO-VENTANA`.");
  });

  it("conserva la negrita alrededor de la designacion", () => {
    expect(prepararMarkdown("**DEMO-NUEVA** es de nueva creacion")).toBe(
      "**`DEMO-NUEVA`** es de nueva creacion",
    );
  });
});
