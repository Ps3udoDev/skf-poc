import type { Aleatorio } from "./aleatorio";
import type { DesignacionCompleta } from "./designaciones";

export interface DiferenciaTecnica {
  atributo: string;
  valor_origen: string;
  valor_equivalente: string;
}

export interface Homologo {
  origen: string;
  equivalente: string;
  motivo: string;
  diferencias: DiferenciaTecnica[];
}

const MOTIVOS = [
  "Mismo dimensional, distinto tipo de sellado",
  "Mismo desempeño, distinta jaula",
  "Misma capacidad de carga, distinto juego interno",
  "Equivalente dimensional de otra planta",
  "Reemplazo por obsolescencia",
] as const;

const ATRIBUTOS: readonly (readonly [string, readonly string[]])[] = [
  [
    "Sellado",
    ["Abierto", "2 tapas metálicas (2Z)", "2 sellos de contacto (2RS1)", "1 sello (RS1)"],
  ],
  ["Juego interno", ["Normal (CN)", "Aumentado (C3)", "Muy aumentado (C4)", "Reducido (C2)"]],
  ["Jaula", ["Acero estampado", "Poliamida (TN9)", "Latón mecanizado (M)", "Bronce (MA)"]],
  ["Temperatura máxima", ["+120 °C", "+150 °C", "+200 °C"]],
  ["Velocidad límite", ["11 000 r/min", "15 000 r/min", "19 000 r/min", "24 000 r/min"]],
  ["Lubricación", ["Grasa estándar", "Grasa alta temperatura", "Sin lubricar"]],
] as const;

/**
 * Rellena las cadenas de obsolescencia **mutando** el catálogo.
 *
 * Reparte los obsoletos entre las tres salidas del punto 4 del QMS:
 *   55% con reemplazo en sistema      → 4.6, primer sub-caso
 *   20% con reemplazo solo de fábrica → 4.6, segundo sub-caso
 *   25% sin reemplazo                 → 4.7, se declina
 *
 * El código de `reemplazo_indicado_fabrica` se construye deliberadamente para
 * que NO exista en el catálogo: esa es exactamente su definición según el
 * procedimiento — "no está en sistema, pero la fábrica lo indica".
 */
export function resolverObsolescencia(a: Aleatorio, catalogo: DesignacionCompleta[]): void {
  const vigentesPorFamilia = new Map<string, DesignacionCompleta[]>();
  for (const d of catalogo) {
    if (!d.vigente) continue;
    const lista = vigentesPorFamilia.get(d.familia) ?? [];
    lista.push(d);
    vigentesPorFamilia.set(d.familia, lista);
  }

  const existentes = new Set(catalogo.map((d) => d.designacion));

  for (const d of catalogo) {
    if (d.vigente) continue;
    // Los casos curados traen su obsolescencia decidida a mano y el guion
    // depende de ella. El prefijo DEMO- está reservado justamente para poder
    // excluirlos aquí sin ambigüedad.
    if (d.designacion.startsWith("DEMO-")) continue;
    const caso = a.elegirPonderado<"SISTEMA" | "FABRICA" | "NINGUNO">([
      ["SISTEMA", 55],
      ["FABRICA", 20],
      ["NINGUNO", 25],
    ]);

    if (caso === "SISTEMA") {
      const candidatos = vigentesPorFamilia.get(d.familia);
      if (candidatos && candidatos.length > 0) {
        d.reemplazado_por = a.elegir(candidatos).designacion;
        continue;
      }
      // Sin candidato en su familia, se degrada al caso sin reemplazo.
      continue;
    }

    if (caso === "FABRICA") {
      // Sufijo que no produce ninguna designación del catálogo.
      let propuesto = `${d.designacion}-NS`;
      let intento = 0;
      while (existentes.has(propuesto) && intento < 50) {
        intento++;
        propuesto = `${d.designacion}-NS${intento}`;
      }
      if (!existentes.has(propuesto)) d.reemplazo_indicado_fabrica = propuesto;
    }
  }
}

/**
 * Relaciones de equivalencia dentro de una misma familia.
 *
 * El campo `diferencias` es lo que hace funcionar la confirmación guiada de la
 * escena 3: sin diferencias explícitas el diálogo queda vacío y no evidencia
 * nada.
 */
export function generarHomologos(
  a: Aleatorio,
  catalogo: readonly DesignacionCompleta[],
): Homologo[] {
  const porFamilia = new Map<string, DesignacionCompleta[]>();
  for (const d of catalogo) {
    const lista = porFamilia.get(d.familia) ?? [];
    lista.push(d);
    porFamilia.set(d.familia, lista);
  }

  const salida: Homologo[] = [];
  const pares = new Set<string>();

  for (const [, miembros] of porFamilia) {
    if (miembros.length < 2) continue;
    const cuantos = Math.floor(miembros.length * 0.14);
    for (let i = 0; i < cuantos; i++) {
      const origen = a.elegir(miembros);
      const equivalente = a.elegir(miembros);
      if (origen.designacion === equivalente.designacion) continue;
      const clave = `${origen.designacion}|${equivalente.designacion}`;
      if (pares.has(clave)) continue;
      pares.add(clave);

      const cuantasDiferencias = a.entero(1, 3);
      const atributos = a.barajar(ATRIBUTOS).slice(0, cuantasDiferencias);
      const diferencias: DiferenciaTecnica[] = [];
      for (const [atributo, valores] of atributos) {
        const barajados = a.barajar(valores);
        diferencias.push({
          atributo,
          valor_origen: barajados[0],
          valor_equivalente: barajados[1],
        });
      }

      salida.push({
        origen: origen.designacion,
        equivalente: equivalente.designacion,
        motivo: a.elegir(MOTIVOS),
        diferencias,
      });
    }
  }
  return salida;
}

export const COLUMNAS_HOMOLOGOS = ["origen", "equivalente", "motivo", "diferencias"] as const;

export function filasHomologos(homologos: readonly Homologo[]): unknown[][] {
  return homologos.map((h) => [h.origen, h.equivalente, h.motivo, JSON.stringify(h.diferencias)]);
}
