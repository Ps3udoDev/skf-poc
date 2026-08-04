import type { Aleatorio } from "./aleatorio";
import { type DesignacionBase, generarDesignaciones } from "./nomenclatura";
import { PLANTAS } from "./plantas";

export interface DesignacionCompleta extends DesignacionBase {
  pcc: "C" | "P" | "N" | "O";
  lcc: "PLAN" | "NP";
  fpc: "1" | "2";
  pdiv: string;
  moq: number;
  pack_quantity: number;
  precio_lista: number | null;
  vigente: boolean;
  reemplazado_por: string | null;
  reemplazo_indicado_fabrica: string | null;
  es_nueva_creacion: boolean;
}

/** Las europeas concentran el grueso del catálogo, como en la operación real. */
const PESOS_PLANTA = PLANTAS.map(
  (p) => [p.pdiv, p.pdiv.startsWith("P1") ? 6 : p.pdiv.startsWith("P2") ? 3 : 2] as const,
);

/**
 * Aplica la clasificación del procedimiento QMS al catálogo generado.
 *
 * `reemplazado_por` y `reemplazo_indicado_fabrica` quedan nulos: los resuelve
 * la tarea de homólogos, que es la única que ve el catálogo completo.
 */
export function generarCatalogo(a: Aleatorio, cantidad: number): DesignacionCompleta[] {
  return generarDesignaciones(a, cantidad).map((base) => {
    const clase = a.elegirPonderado<"PLAN" | "NP" | "OBSOLETO">([
      ["PLAN", 60],
      ["NP", 35],
      ["OBSOLETO", 5],
    ]);

    const esObsoleto = clase === "OBSOLETO";
    const lcc: "PLAN" | "NP" = esObsoleto
      ? a.elegirPonderado([
          ["PLAN", 40],
          ["NP", 60],
        ])
      : clase;

    // El CHECK obsoleto_no_vigente exige la bicondicional pcc='O' <=> !vigente.
    const pcc: DesignacionCompleta["pcc"] = esObsoleto
      ? "O"
      : lcc === "PLAN"
        ? "C"
        : a.elegirPonderado([
            ["N", 70],
            ["P", 30],
          ]);

    const fpc: "1" | "2" = a.elegirPonderado([
      ["1", 75],
      ["2", 25],
    ]);

    // FPC 2 no son productos de línea: la mayoría no tiene Precio de Lista.
    const tienePrecio = fpc === "1" || a.probabilidad(0.2);
    const precio_lista = tienePrecio ? a.decimal(35, 18500, 2) : null;

    const moq =
      lcc === "PLAN"
        ? a.elegirPonderado([
            [1, 90],
            [10, 8],
            [25, 2],
          ])
        : a.elegirPonderado([
            [1, 30],
            [10, 25],
            [25, 20],
            [50, 15],
            [100, 10],
          ]);

    return {
      ...base,
      pcc,
      lcc,
      fpc,
      pdiv: a.elegirPonderado(PESOS_PLANTA),
      moq,
      pack_quantity: a.elegirPonderado([
        [1, 55],
        [5, 15],
        [10, 15],
        [20, 10],
        [50, 5],
      ]),
      precio_lista,
      vigente: !esObsoleto,
      reemplazado_por: null,
      reemplazo_indicado_fabrica: null,
      es_nueva_creacion: a.probabilidad(0.02),
    };
  });
}

export const COLUMNAS_DESIGNACIONES = [
  "designacion",
  "descripcion",
  "familia",
  "pcc",
  "lcc",
  "fpc",
  "pdiv",
  "moq",
  "pack_quantity",
  "precio_lista",
  "vigente",
  "reemplazado_por",
  "reemplazo_indicado_fabrica",
  "es_nueva_creacion",
  "segmento",
] as const;

export function filasDesignaciones(catalogo: readonly DesignacionCompleta[]): unknown[][] {
  return catalogo.map((d) => [
    d.designacion,
    d.descripcion,
    d.familia,
    d.pcc,
    d.lcc,
    d.fpc,
    d.pdiv,
    d.moq,
    d.pack_quantity,
    d.precio_lista,
    d.vigente,
    d.reemplazado_por,
    d.reemplazo_indicado_fabrica,
    d.es_nueva_creacion,
    d.segmento,
  ]);
}
