import type { DesignacionCompleta } from "./designaciones";
import type { Homologo } from "./homologos";
import type { FilaInventario } from "./inventario";

export interface CasoCurado {
  clave: string;
  escena: string;
  designacion: DesignacionCompleta;
  /** Existencias a inyectar. Lista vacía = sin stock, deliberadamente. */
  existencias: readonly { almacen: "PS" | "SL" | "XX"; cantidad: number }[];
}

function base(
  parcial: Partial<DesignacionCompleta> & { designacion: string },
): DesignacionCompleta {
  return {
    descripcion: "Caso preparado para la demostración",
    familia: "Rodamiento rígido de bolas",
    segmento: "rodamiento",
    pcc: "C",
    lcc: "PLAN",
    fpc: "1",
    pdiv: "P101",
    moq: 1,
    pack_quantity: 1,
    precio_lista: 250.0,
    vigente: true,
    reemplazado_por: null,
    reemplazo_indicado_fabrica: null,
    es_nueva_creacion: false,
    ...parcial,
  };
}

/**
 * Casos preparados a mano, uno por escena del guion.
 *
 * El prefijo DEMO- está reservado: el generador combinatorio nunca lo produce,
 * así que estos códigos no colisionan y el presentador puede escribirlos con
 * la certeza de que se comportarán igual en cada ensayo y en la presentación.
 */
export const CASOS_CURADOS: readonly CasoCurado[] = [
  // Escena 2 — la designación truncada. Tres variantes comparten prefijo.
  {
    clave: "truncada",
    escena: "2 — validador con designación incompleta",
    designacion: base({
      designacion: "DEMO-6205-2RSH/C3",
      descripcion: "Rodamiento rígido de bolas, 25 mm, sellado ambos lados, juego C3",
    }),
    existencias: [
      { almacen: "PS", cantidad: 1200 },
      { almacen: "SL", cantidad: 300 },
    ],
  },
  {
    clave: "truncada_alt_1",
    escena: "2 — alternativa cercana",
    designacion: base({
      designacion: "DEMO-6205-2RSH/C4",
      descripcion: "Rodamiento rígido de bolas, 25 mm, sellado ambos lados, juego C4",
    }),
    existencias: [{ almacen: "PS", cantidad: 240 }],
  },
  {
    clave: "truncada_alt_2",
    escena: "2 — alternativa cercana",
    designacion: base({
      designacion: "DEMO-6205-2RSH/W64",
      descripcion: "Rodamiento rígido de bolas, 25 mm, sellado ambos lados, lubricación sólida",
    }),
    existencias: [{ almacen: "PS", cantidad: 860 }],
  },
  // Escena 2 (variante) — MOQ mayor a lo pedido, punto 4.4.
  {
    clave: "moq",
    escena: "2 — aviso de MOQ antes de enviar",
    designacion: base({
      designacion: "DEMO-MOQ-50",
      descripcion: "Rodamiento rígido de bolas, 15 mm, mínimo de orden 50 piezas",
      moq: 50,
      precio_lista: 42.5,
      lcc: "NP",
      pcc: "N",
    }),
    existencias: [],
  },
  // Escena 2 (variante) — pack quantity, punto 4.5a.
  {
    clave: "pack",
    escena: "2 — ajuste por pack quantity",
    designacion: base({
      designacion: "DEMO-PACK-20",
      descripcion: "Rodamiento rígido de bolas, 20 mm, caja de 20 piezas",
      pack_quantity: 20,
      precio_lista: 88.0,
    }),
    existencias: [{ almacen: "PS", cantidad: 600 }],
  },
  // Escena 3 — obsoleto con reemplazo en sistema, punto 4.6 primer sub-caso.
  {
    clave: "obsoleto_con_reemplazo",
    escena: "3 — confirmación guiada de homólogos",
    designacion: base({
      designacion: "DEMO-OBS-CON",
      descripcion: "Rodamiento rígido de bolas, 30 mm, descontinuado",
      pcc: "O",
      vigente: false,
      reemplazado_por: "DEMO-6205-2RSH/C3",
    }),
    existencias: [],
  },
  // Escena 3 — obsoleto sin reemplazo, punto 4.7. El declinado legítimo.
  {
    clave: "obsoleto_sin_reemplazo",
    escena: "3 — declinado legítimo",
    designacion: base({
      designacion: "DEMO-OBS-SIN",
      descripcion: "Rodamiento de rodillos cónicos, 35 mm, descontinuado sin sustituto",
      familia: "Rodamiento de rodillos cónicos",
      pcc: "O",
      vigente: false,
    }),
    existencias: [],
  },
  // Escena 3 — reemplazo que solo indica la fábrica, punto 4.6 segundo sub-caso.
  {
    clave: "obsoleto_reemplazo_fabrica",
    escena: "3 — validar con el Ingeniero de Ventas",
    designacion: base({
      designacion: "DEMO-OBS-FAB",
      descripcion: "Rodamiento de rodillos a rótula, 40 mm, descontinuado",
      familia: "Rodamiento de rodillos a rótula",
      pcc: "O",
      vigente: false,
      reemplazo_indicado_fabrica: "DEMO-OBS-FAB-NS",
    }),
    existencias: [],
  },
  // Escena 4 — el caso clave: existe y hay stock, pero su planta entra en ventana.
  {
    clave: "ventana",
    escena: "4 — ventana de desconexión",
    designacion: base({
      designacion: "DEMO-VENTANA",
      descripcion: "Rodamiento rígido de bolas, 45 mm, planta con ventana amplia",
      pdiv: "P103",
      precio_lista: 615.0,
    }),
    existencias: [
      { almacen: "PS", cantidad: 2400 },
      { almacen: "SL", cantidad: 800 },
    ],
  },
  // Escena 5 — nueva creación, punto 4.9: +4 semanas de TE.
  {
    clave: "nueva_creacion",
    escena: "5 — estimador con +4 semanas",
    designacion: base({
      designacion: "DEMO-NUEVA",
      descripcion: "Rodamiento de rodillos cilíndricos, 50 mm, de nueva creación",
      familia: "Rodamiento de rodillos cilíndricos",
      lcc: "NP",
      pcc: "N",
      es_nueva_creacion: true,
      fpc: "2",
      precio_lista: null,
    }),
    existencias: [],
  },
  // Punto 4.3 — segmento de transmisión sin stock: se consulta al Planner.
  {
    clave: "transmision_planner",
    escena: "4 — consulta al Planner por segmento",
    designacion: base({
      designacion: "DEMO-PT-PLANNER",
      descripcion: "Componente de transmisión de potencia, sin existencias",
      familia: "Transmisión de potencia",
      segmento: "power_transmission",
      lcc: "NP",
      pcc: "N",
      pdiv: "P106",
    }),
    existencias: [],
  },
] as const;

/** Relación fija que alimenta las diferencias técnicas de la escena 3. */
export const HOMOLOGOS_CURADOS: readonly Homologo[] = [
  {
    origen: "DEMO-OBS-CON",
    equivalente: "DEMO-6205-2RSH/C3",
    motivo: "Reemplazo por obsolescencia con validación técnica",
    diferencias: [
      {
        atributo: "Sellado",
        valor_origen: "Sello de generación anterior",
        valor_equivalente: "2 sellos de contacto (2RSH)",
      },
      {
        atributo: "Juego interno",
        valor_origen: "Normal (CN)",
        valor_equivalente: "Aumentado (C3)",
      },
    ],
  },
] as const;

/**
 * Inyecta los casos en el catálogo y en el inventario. Idempotente: aplicarlo
 * dos veces no duplica nada.
 */
export function aplicarCasosCurados(
  catalogo: DesignacionCompleta[],
  inventario: FilaInventario[],
): void {
  const existentes = new Set(catalogo.map((d) => d.designacion));

  for (const caso of CASOS_CURADOS) {
    if (existentes.has(caso.designacion.designacion)) continue;
    catalogo.push({ ...caso.designacion });
    existentes.add(caso.designacion.designacion);

    for (const e of caso.existencias) {
      inventario.push({
        designacion: caso.designacion.designacion,
        almacen: e.almacen,
        cantidad: e.cantidad,
        pdiv_dueno: caso.designacion.pdiv,
      });
    }
  }
}

/** Inyecta las equivalencias fijas del guion sin duplicar pares existentes. */
export function aplicarHomologosCurados(homologos: Homologo[]): void {
  const pares = new Set(homologos.map((h) => `${h.origen}|${h.equivalente}`));
  for (const homologo of HOMOLOGOS_CURADOS) {
    const clave = `${homologo.origen}|${homologo.equivalente}`;
    if (pares.has(clave)) continue;
    homologos.push({
      ...homologo,
      diferencias: homologo.diferencias.map((diferencia) => ({ ...diferencia })),
    });
    pares.add(clave);
  }
}
