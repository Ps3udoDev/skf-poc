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

export interface Designacion {
  designacion: string;
  descripcion: string;
  familia: string;
  pcc: PCC;
  lcc: LCC;
  fpc: FPC;
  pdiv: string;
  moq: number;
  packQuantity: number;
  precioLista: number;
  vigente: boolean;
  reemplazadoPor: string | null;
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
  /** Designación de reemplazo ya resuelta, si la hay (punto 4.6). */
  reemplazo: Designacion | null;
  /**
   * `true` cuando el reemplazo no está en el sistema pero la fábrica lo indica.
   * Es el segundo sub-caso del 4.6, el único que obliga a validar con el
   * Ingeniero de Ventas.
   */
  reemplazoSoloIndicadoPorFabrica?: boolean;
}

export type RutaQMS =
  | "declinar_designacion_invalida"
  | "declinar_planta_sin_ruta"
  | "declinar_obsoleto_sin_reemplazo"
  | "declinar_moq"
  | "declinar_ya_disponible"
  | "cotizar_con_reemplazo"
  | "solicitar_lt_planner"
  | "revisar_disponibilidad_np"
  | "ingresar_pinq";

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
