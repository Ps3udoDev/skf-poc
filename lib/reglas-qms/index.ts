import { avisoPackQuantity, incumpleMoq, redondearAPack } from "./cantidades";
import { avisoReemplazo, designacionValida, esObsoleto, plantaCotizable } from "./catalogo";
import { esPlaneado, rutaNoPlaneado, rutaPlaneado, stockTotal } from "./planeacion";
import { avisoNuevaCreacion, avisoPrecio, semanasExtraPorNuevaCreacion } from "./tiempos";
import type { Aviso, ContextoSolicitud, Designacion, EvaluacionQMS } from "./tipos";

export * from "./cantidades";
export * from "./catalogo";
export * from "./motivos";
export * from "./planeacion";
export * from "./sla";
export * from "./tiempos";
export * from "./tipos";

function declinar(ruta: EvaluacionQMS["ruta"], punto: string, mensaje: string): EvaluacionQMS {
  return {
    ruta,
    punto,
    mensaje,
    declinada: true,
    avisos: [],
    cantidadEfectiva: 0,
    semanasExtraTE: 0,
  };
}

/**
 * Árbol de decisión del punto 4 del procedimiento QMS Rev. 3.
 *
 * El procedimiento enumera las reglas pero no fija un orden de evaluación.
 * Aquí se aplican por poder de corte: primero lo que invalida la solicitud
 * entera (4.8, 4.5b, 4.7), después lo que la ajusta (4.5a) y por último la
 * clasificación de planeación (4.1–4.3).
 *
 * Función pura: no consulta la base. El contexto llega ya resuelto.
 */
export function evaluarSolicitud(ctx: ContextoSolicitud): EvaluacionQMS {
  const { designacion, planta, cantidad } = ctx;

  // 4.8 — no existe o está incorrecta.
  if (!designacionValida(designacion)) {
    return declinar(
      "declinar_designacion_invalida",
      "4.8",
      "La designación no existe o está incorrecta. Según el procedimiento se declina y se informa al cliente.",
    );
  }

  // 4.5b — solo se cotiza con fábricas con conexión y ruta de embarque.
  if (!plantaCotizable(planta)) {
    return declinar(
      "declinar_planta_sin_ruta",
      "4.5b",
      `El material se origina en ${planta?.nombre ?? "una fábrica"} sin conexión o sin ruta de embarque habilitada.`,
    );
  }

  // Trabajamos sobre el reemplazo si el original es obsoleto (4.6).
  let efectiva = designacion;
  const avisos: Aviso[] = [];
  let mensajeObsoleto: string | null = null;

  if (esObsoleto(designacion)) {
    if (ctx.reemplazo) {
      // 4.6, primer sub-caso — "si el reemplazo está en sistema se cotiza
      // indicando al cliente el cambio". Conocemos el reemplazo por completo,
      // así que el resto del árbol se evalúa sobre él. Sin aviso de Ing. de
      // Ventas: esa validación es exclusiva del segundo sub-caso.
      efectiva = ctx.reemplazo;
      mensajeObsoleto =
        `${designacion.designacion} está obsoleta. Se cotiza su reemplazo ` +
        `${ctx.reemplazo.designacion}, indicando el cambio al cliente.`;
    } else if (designacion.reemplazoIndicadoFabrica !== null) {
      // 4.6, segundo sub-caso — "si no está en sistema, pero la fábrica lo
      // indica se cotiza y se le pide al cliente que revise con su Ing. de
      // Ventas si dicho reemplazo cumple con sus necesidades técnicas".
      //
      // DELIBERADO: el resto del árbol (MOQ, pack quantity, FPC, planeación)
      // se sigue evaluando sobre la designación ORIGINAL, no sobre el
      // reemplazo. No conocemos el MOQ, el pack quantity ni el FPC del
      // reemplazo porque, por definición de este sub-caso, no está en el
      // sistema. Inventarlos sería exactamente la alucinación que el diseño
      // del POC prohíbe. El aviso de validación con el Ing. de Ventas es lo
      // que cubre esa incertidumbre frente al cliente.
      mensajeObsoleto =
        `${designacion.designacion} está obsoleta. La fábrica indica como reemplazo ` +
        `${designacion.reemplazoIndicadoFabrica}, que aún no está en sistema: se cotiza ` +
        "sobre los datos de la designación original.";
      const aviso = avisoReemplazo(designacion);
      if (aviso) avisos.push(aviso);
    } else {
      // 4.7 — obsoleto sin reemplazo de ninguna de las dos clases.
      return declinar(
        "declinar_obsoleto_sin_reemplazo",
        "4.7",
        `${designacion.designacion} está obsoleta y no tiene reemplazo. Se declina y se informa al cliente.`,
      );
    }
  }

  // 4.4 — MOQ mayor a lo pedido.
  if (incumpleMoq(efectiva, cantidad)) {
    return declinar(
      "declinar_moq",
      "4.4",
      `La cantidad mínima de orden de ${efectiva.designacion} es ${efectiva.moq} piezas y se solicitaron ${cantidad}.`,
    );
  }

  // 4.5a — pack quantity: ajusta, no declina.
  const cantidadEfectiva = redondearAPack(efectiva, cantidad);
  const avisoPack = avisoPackQuantity(efectiva, cantidad);
  if (avisoPack) avisos.push(avisoPack);

  // 4.9 y 5.2/5.3 — avisos que se acumulan sin alterar la ruta.
  const avisoCreacion = avisoNuevaCreacion(efectiva);
  if (avisoCreacion) avisos.push(avisoCreacion);
  const avisoDePrecio = avisoPrecio(efectiva);
  if (avisoDePrecio) avisos.push(avisoDePrecio);

  const semanasExtraTE = semanasExtraPorNuevaCreacion(efectiva);

  // Si venimos de un obsoleto con reemplazo (de cualquiera de los dos
  // sub-casos del 4.6), esa es la ruta que se comunica.
  if (mensajeObsoleto !== null) {
    return {
      ruta: "cotizar_con_reemplazo",
      punto: "4.6",
      mensaje: mensajeObsoleto,
      declinada: false,
      avisos,
      cantidadEfectiva,
      semanasExtraTE,
    };
  }

  // 4.1 — planeado.
  if (esPlaneado(efectiva)) {
    const ruta = rutaPlaneado(efectiva, cantidadEfectiva, ctx.existencias);
    return {
      ruta,
      punto: "4.1",
      mensaje:
        ruta === "declinar_ya_disponible"
          ? `Producto planeado (LCC=PLAN) con ${stockTotal(ctx.existencias)} piezas disponibles: ya estaba visible en WCL, no requiere cotización.`
          : `Producto planeado (LCC=PLAN) con existencias insuficientes: se revisa el LT estándar o se solicita el tiempo de entrega al planner de la PDIV ${efectiva.pdiv}.`,
      declinada: ruta === "declinar_ya_disponible",
      avisos,
      cantidadEfectiva,
      semanasExtraTE,
    };
  }

  // 4.2 / 4.3 — no planeado.
  const ruta = rutaNoPlaneado(efectiva, ctx.existencias);
  return {
    ruta,
    punto: ruta === "revisar_disponibilidad_np" ? "4.2" : "4.3",
    mensaje: mensajeNoPlaneado(ruta, efectiva),
    declinada: false,
    avisos,
    cantidadEfectiva,
    semanasExtraTE,
  };
}

/** Puntos 4.2 y 4.3 — las tres salidas del no planeado. */
function mensajeNoPlaneado(
  ruta: "revisar_disponibilidad_np" | "ingresar_pinq" | "consultar_planner",
  d: Designacion,
): string {
  switch (ruta) {
    case "revisar_disponibilidad_np":
      return "Producto No Planeado (LCC=NP) con disponibilidad: se revisa en SPQ+, SAP o Global Availability.";
    case "consultar_planner":
      return (
        "Producto No Planeado (LCC=NP) sin disponibilidad y del segmento Power Transmission: " +
        `se consulta directo con el Planner de la PDIV ${d.pdiv} vía PT Inquery.`
      );
    default:
      return `Producto No Planeado (LCC=NP) sin disponibilidad: se ingresa PINQ a la fábrica ${d.pdiv}.`;
  }
}
