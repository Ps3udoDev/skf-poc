import type { EstadoIntencion, Intencion } from "@/lib/fuentes/intenciones";
import { type Existencia, incumpleMoq, redondearAPack } from "@/lib/reglas-qms";

export interface EntradaReconciliacion {
  intencion: Intencion;
  /** Ya resueltas por `existenciasDe()`, en orden PS, SL, XX. */
  existencias: Existencia[];
  moq: number;
  packQuantity: number;
}

export interface ResultadoReconciliacion {
  estado: Exclude<EstadoIntencion, "encolada">;
  cantidadFinal: number;
  nota: string;
  /** Punto del QMS que justifica el ajuste, o `null` si no lo hay. */
  punto: string | null;
}

/**
 * Qué pasa con una intención cuando la planta vuelve.
 *
 * Puro: recibe el inventario ya resuelto y no toca la base. Las reglas se
 * aplican en orden y con retorno inmediato, igual que `evaluarSolicitud`.
 *
 * NINGUNA NOTA LLEVA FECHA. La reconciliación confirma disponibilidad, no
 * plazo: el tiempo de entrega en firme sigue saliendo al procesar la
 * cotización. Es la invariante de honestidad aplicada al caso más tentador de
 * romperla — el cliente acaba de esperar una ventana y quiere una fecha.
 */
export function reconciliar({
  intencion,
  existencias,
  moq,
  packQuantity,
}: EntradaReconciliacion): ResultadoReconciliacion {
  const { cantidad } = intencion;

  // 4.4 — por debajo del MOQ no hay pedido que ajustar.
  if (incumpleMoq({ moq }, cantidad)) {
    return {
      estado: "escalada",
      cantidadFinal: cantidad,
      nota:
        `La cantidad mínima de orden es ${moq} piezas y la intención quedó registrada por ` +
        `${cantidad}. Un CSR contactará al cliente para ajustar el pedido.`,
      punto: "4.4",
    };
  }

  // 4.5a — el pack quantity ajusta, no declina.
  const cantidadFinal = redondearAPack({ packQuantity }, cantidad);
  if (cantidadFinal !== cantidad) {
    return {
      estado: "ajustada",
      cantidadFinal,
      nota:
        `La cantidad se ajusta de ${cantidad} a ${cantidadFinal} piezas: esta designación se ` +
        `surte en cajas de ${packQuantity}. Un CSR confirma la disponibilidad al procesar la ` +
        "cotización.",
      punto: "4.5a",
    };
  }

  const disponible = existencias.reduce((suma, existencia) => suma + existencia.cantidad, 0);
  if (disponible >= cantidadFinal) {
    const principal = existencias.find((existencia) => existencia.cantidad > 0);
    return {
      estado: "confirmada",
      cantidadFinal,
      nota:
        `Hay ${disponible} piezas disponibles` +
        (principal ? ` (almacén ${principal.almacen} como principal)` : "") +
        ` para las ${cantidadFinal} de la intención.`,
      punto: null,
    };
  }

  return {
    estado: "escalada",
    cantidadFinal,
    nota:
      `Las existencias disponibles (${disponible} piezas) no cubren las ${cantidadFinal} de la ` +
      "intención: requiere consulta a fábrica.",
    punto: null,
  };
}
