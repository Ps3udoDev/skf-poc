import type { Homologo } from "@/lib/fuentes/homologos";

export interface PasoConfirmacion {
  atributo: string;
  valorOrigen: string;
  valorEquivalente: string;
  requiereValidacion: boolean;
}

export interface Confirmacion {
  origen: string;
  equivalente: string;
  motivo: string;
  pasos: PasoConfirmacion[];
  requiereIngenieriaVentas: boolean;
  punto: "4.6";
}

/**
 * Atributos cuya diferencia cambia el ajuste montado o el envolvente de
 * operación, y por tanto exige que el cliente lo revise con su Ingeniero de
 * Ventas antes de aceptar la equivalencia.
 *
 * SUPUESTO DEL POC, no una regla del QMS: el procedimiento pide la validación
 * pero no enumera los disparadores. Es una de las preguntas abiertas con SKF.
 * Los que quedan fuera —sellado, jaula, lubricación— cambian construcción o
 * suministro y se muestran igual, pero no bloquean la equivalencia.
 */
const ATRIBUTOS_CRITICOS = new Set(["juego interno", "temperatura maxima", "velocidad limite"]);

/** Sin acentos, sin mayúsculas y sin espacios sobrantes: el dato viene de siembra. */
function clave(atributo: string): string {
  return atributo.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/**
 * Pasos que el cliente debe reconocer uno por uno antes de aceptar un homólogo.
 *
 * La diferencia entre este POC y un buscador que sugiere piezas incompatibles
 * está aquí: la equivalencia no se presenta como confirmada mientras haya un
 * paso que exija validación técnica.
 */
export function construirConfirmacion(homologo: Homologo): Confirmacion {
  const pasos: PasoConfirmacion[] = homologo.diferencias.map((diferencia) => ({
    atributo: diferencia.atributo,
    valorOrigen: diferencia.valor_origen,
    valorEquivalente: diferencia.valor_equivalente,
    requiereValidacion: ATRIBUTOS_CRITICOS.has(clave(diferencia.atributo)),
  }));

  return {
    origen: homologo.origen,
    equivalente: homologo.equivalente,
    motivo: homologo.motivo,
    pasos,
    requiereIngenieriaVentas: pasos.some((paso) => paso.requiereValidacion),
    punto: "4.6",
  };
}
