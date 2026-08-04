/**
 * Tipos del árbol de decisión del punto 4 del procedimiento QMS
 * "Consultas y Cotizaciones" Rev. 3 (13/07/2026).
 *
 * El documento original numera DOS puntos como 4.5. Aquí se distinguen
 * como '4.5a' (pack quantity) y '4.5b' (fábricas con conexión y ruta).
 */

export type PCC = "C" | "P" | "N" | "O";
export type LCC = "PLAN" | "NP";
export type FPC = "1" | "2";
export type Almacen = "PS" | "SL" | "XX";

/**
 * Punto 4.3 — "se ingresa la PINQ a fábrica o se consulta directo con el
 * Planner dependiendo del segmento del producto". El QMS define *PT Inquery*
 * como la herramienta de TE y PS de las designaciones de Power Transmission,
 * frente a *OPI/PINQ* para el resto.
 */
export type Segmento = "rodamiento" | "power_transmission";

export interface Designacion {
  designacion: string;
  descripcion: string;
  familia: string;
  pcc: PCC;
  lcc: LCC;
  fpc: FPC;
  pdiv: string;
  segmento: Segmento;
  moq: number;
  packQuantity: number;
  /**
   * `null` cuando no hay Precio de Lista publicado: es la norma en FPC 2 (no
   * son productos de Línea) y ocurre también en FPC 1 según el punto 5.2.
   */
  precioLista: number | null;
  vigente: boolean;
  /** Punto 4.6, primer sub-caso: reemplazo que SÍ está en el catálogo. */
  reemplazadoPor: string | null;
  /**
   * Punto 4.6, segundo sub-caso: el código de reemplazo que la fábrica indica
   * pero que NO está dado de alta en sistema. Por eso es texto libre y no una
   * referencia al catálogo: ese código no existe en él.
   */
  reemplazoIndicadoFabrica: string | null;
  esNuevaCreacion: boolean;
}

export interface Planta {
  pdiv: string;
  nombre: string;
  tieneConexion: boolean;
  tieneRutaEmbarque: boolean;
}

export interface Existencia {
  almacen: Almacen;
  cantidad: number;
}

/** Contexto ya resuelto que recibe el motor. Nunca consulta la base por su cuenta. */
export interface ContextoSolicitud {
  /** `null` cuando la designación capturada no existe en el catálogo (punto 4.8). */
  designacion: Designacion | null;
  cantidad: number;
  existencias: Existencia[];
  planta: Planta | null;
  /**
   * Designación de reemplazo ya resuelta, si la hay (punto 4.6, PRIMER
   * sub-caso: el reemplazo está en sistema). El segundo sub-caso no se pasa
   * como bandera: se deriva de `designacion.reemplazoIndicadoFabrica`.
   */
  reemplazo: Designacion | null;
}

/**
 * Rutas del árbol del punto 4. La lista es un `const` y no solo un tipo para
 * que los tests puedan recorrerla exhaustivamente en tiempo de ejecución: el
 * puente hacia el enum SQL `motivo_declinado` depende de esa exhaustividad.
 */
export const RUTAS_QMS = [
  "declinar_designacion_invalida",
  "declinar_planta_sin_ruta",
  "declinar_obsoleto_sin_reemplazo",
  "declinar_moq",
  "declinar_ya_disponible",
  "cotizar_con_reemplazo",
  "revisar_lt",
  "revisar_disponibilidad_np",
  "ingresar_pinq",
  "consultar_planner",
] as const;

export type RutaQMS = (typeof RUTAS_QMS)[number];

export type TipoAviso =
  | "pack_quantity_ajustado"
  | "nueva_creacion"
  | "validar_con_ingeniero_ventas"
  | "precio_requiere_lpc";

export interface Aviso {
  tipo: TipoAviso;
  punto: string;
  mensaje: string;
}

export interface EvaluacionQMS {
  ruta: RutaQMS;
  /** Punto literal del procedimiento que justifica la ruta. Se muestra en la UI. */
  punto: string;
  mensaje: string;
  /** Se declina la solicitud según el procedimiento. */
  declinada: boolean;
  avisos: Aviso[];
  /** Cantidad efectiva tras el redondeo al pack quantity (punto 4.5a). */
  cantidadEfectiva: number;
  /** Semanas a sumar al TE base. 4 si es de nueva creación (punto 4.9). */
  semanasExtraTE: number;
}
