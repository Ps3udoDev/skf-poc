import { avisoPackQuantity, incumpleMoq, redondearAPack } from "./cantidades";
import { avisoReemplazo, designacionValida, esObsoleto, plantaCotizable } from "./catalogo";
import { esPlaneado, rutaNoPlaneado, rutaPlaneado, stockTotal } from "./planeacion";
import { avisoNuevaCreacion, avisoPrecio, semanasExtraPorNuevaCreacion } from "./tiempos";
import type { Aviso, ContextoSolicitud, EvaluacionQMS } from "./tipos";

export * from "./cantidades";
export * from "./catalogo";
export * from "./planeacion";
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
  let rutaObsoleto: "cotizar_con_reemplazo" | null = null;

  if (esObsoleto(designacion)) {
    // 4.7 — obsoleto sin reemplazo.
    if (!ctx.reemplazo) {
      return declinar(
        "declinar_obsoleto_sin_reemplazo",
        "4.7",
        `${designacion.designacion} está obsoleta y no tiene reemplazo. Se declina y se informa al cliente.`,
      );
    }
    // 4.6 — obsoleto con reemplazo: se cotiza indicando el cambio.
    efectiva = ctx.reemplazo;
    rutaObsoleto = "cotizar_con_reemplazo";
    const aviso = avisoReemplazo(ctx.reemplazoSoloIndicadoPorFabrica === true);
    if (aviso) avisos.push(aviso);
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

  // 4.9 y 5.3 — avisos que se acumulan sin alterar la ruta.
  const avisoCreacion = avisoNuevaCreacion(efectiva);
  if (avisoCreacion) avisos.push(avisoCreacion);
  const avisoLpc = avisoPrecio(efectiva);
  if (avisoLpc) avisos.push(avisoLpc);

  const semanasExtraTE = semanasExtraPorNuevaCreacion(efectiva);

  // Si venimos de un obsoleto con reemplazo, esa es la ruta que se comunica.
  if (rutaObsoleto) {
    return {
      ruta: rutaObsoleto,
      punto: "4.6",
      mensaje:
        `${designacion.designacion} está obsoleta. Se cotiza su reemplazo ` +
        `${efectiva.designacion}, indicando el cambio al cliente.`,
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
          : `Producto planeado (LCC=PLAN) con existencias insuficientes: se solicita el tiempo de entrega al planner de la PDIV ${efectiva.pdiv}.`,
      declinada: ruta === "declinar_ya_disponible",
      avisos,
      cantidadEfectiva,
      semanasExtraTE,
    };
  }

  // 4.2 / 4.3 — no planeado.
  const ruta = rutaNoPlaneado(ctx.existencias);
  return {
    ruta,
    punto: ruta === "revisar_disponibilidad_np" ? "4.2" : "4.3",
    mensaje:
      ruta === "revisar_disponibilidad_np"
        ? "Producto No Planeado (LCC=NP) con disponibilidad: se revisa en SPQ+, SAP o Global Availability."
        : `Producto No Planeado (LCC=NP) sin disponibilidad: se ingresa PINQ a la fábrica ${efectiva.pdiv}.`,
    declinada: false,
    avisos,
    cantidadEfectiva,
    semanasExtraTE,
  };
}
