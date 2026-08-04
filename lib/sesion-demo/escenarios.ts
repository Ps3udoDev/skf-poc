import type { EstadoPlanta } from "@/lib/estado-fabricas";

export interface Escenario {
  clave: string;
  nombre: string;
  escena: string;
  /** Qué debe teclear el presentador en el buscador. */
  consulta: string;
  cantidadSugerida: number;
  modo: "hoy" | "solucion" | null;
  /** Overrides de planta que el escenario deja activos. `null` los limpia. */
  overrides: Record<string, EstadoPlanta> | null;
  nota: string;
}

export const ESCENARIOS: readonly Escenario[] = [
  {
    clave: "truncada",
    nombre: "Designación truncada",
    escena: "Escenas 1 y 2",
    consulta: "DEMO-6205-2RSH",
    cantidadSugerida: 100,
    modo: null,
    overrides: {},
    nota: "Copiado incompleto desde Word. En modo hoy no encuentra nada; en modo solución ofrece las tres completaciones.",
  },
  {
    clave: "moq",
    nombre: "MOQ superior a lo pedido",
    escena: "Escena 2, variante",
    consulta: "DEMO-MOQ-50",
    cantidadSugerida: 5,
    modo: "solucion",
    overrides: {},
    nota: "Punto 4.4. El validador lo advierte antes de enviar; hoy llega a Customer Service y termina declinado.",
  },
  {
    clave: "pack",
    nombre: "Pack quantity",
    escena: "Escena 2, variante",
    consulta: "DEMO-PACK-20",
    cantidadSugerida: 25,
    modo: "solucion",
    overrides: {},
    nota: "Punto 4.5a. Ajusta la cantidad a 40 en vez de declinar.",
  },
  {
    clave: "obsoleto_con_reemplazo",
    nombre: "Obsoleto con reemplazo",
    escena: "Escena 3",
    consulta: "DEMO-OBS-CON",
    cantidadSugerida: 50,
    modo: "solucion",
    overrides: {},
    nota: "Punto 4.6, primer sub-caso. Diferencias técnicas visibles y validación con el Ing. de Ventas.",
  },
  {
    clave: "obsoleto_sin_reemplazo",
    nombre: "Obsoleto sin reemplazo",
    escena: "Escena 3",
    consulta: "DEMO-OBS-SIN",
    cantidadSugerida: 50,
    modo: "solucion",
    overrides: {},
    nota: "Punto 4.7. El declinado legítimo: no todo se puede salvar, y mostrarlo da credibilidad.",
  },
  {
    clave: "obsoleto_reemplazo_fabrica",
    nombre: "Reemplazo indicado por fábrica",
    escena: "Escena 3, variante",
    consulta: "DEMO-OBS-FAB",
    cantidadSugerida: 50,
    modo: "solucion",
    overrides: {},
    nota: "Punto 4.6, segundo sub-caso: el reemplazo no está en sistema. Hoy este caso se pierde.",
  },
  {
    clave: "ventana",
    nombre: "Planta en ventana de mantenimiento",
    escena: "Escena 4 — momento clave",
    consulta: "DEMO-VENTANA",
    cantidadSugerida: 200,
    modo: "hoy",
    // P103 es la planta belga, la de ventana de inicio variable.
    overrides: { P103: "ventana" },
    nota: "Existe y tiene stock, pero su planta está desconectada. Se presenta primero en modo hoy y luego en modo solución.",
  },
  {
    clave: "nueva_creacion",
    nombre: "Designación de nueva creación",
    escena: "Escena 2, variante",
    consulta: "DEMO-NUEVA",
    cantidadSugerida: 30,
    modo: "solucion",
    overrides: {},
    nota: "Punto 4.9: +4 semanas por creación del material, extensión en MDG-SAP, precio en SAP y seteo en WCL.",
  },
  {
    clave: "transmision_planner",
    nombre: "Transmisión de potencia sin disponibilidad",
    escena: "Escena 5, pregunta de procedimiento",
    consulta: "DEMO-PT-PLANNER",
    cantidadSugerida: 40,
    modo: "solucion",
    overrides: {},
    nota: "Punto 4.3: por segmento va al Planner vía PT Inquery, no por PINQ a fábrica.",
  },
];

export function escenarioPorClave(clave: string): Escenario | undefined {
  return ESCENARIOS.find((e) => e.clave === clave);
}
