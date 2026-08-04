import type { Aleatorio } from "./aleatorio";
import { OPERADORES } from "./comercial";
import type { DesignacionCompleta } from "./designaciones";
import type { FilaInventario } from "./inventario";

export type MotivoDeclinado =
  | "ya_disponible_wcl"
  | "moq_mayor"
  | "obsoleto_sin_reemplazo"
  | "designacion_invalida"
  | "planta_sin_ruta";

export interface Cotizacion {
  numero: string;
  cliente_id: number;
  designacion: string;
  cantidad: number;
  fecha_solicitud: Date;
  fecha_respuesta: Date | null;
  operador_id: number | null;
  resultado: "cotizada" | "declinada";
  motivo_declinado: MotivoDeclinado | null;
  te_semanas: number | null;
  precio: number | null;
  patron: string | null;
}

export interface OpcionesHistorico {
  desde: Date;
  hasta: Date;
  porDiaHabil: number;
}

const CONFUSIONES: Record<string, string> = {
  "0": "O",
  O: "0",
  "1": "I",
  I: "1",
  "5": "S",
  S: "5",
  "8": "B",
  B: "8",
};

/**
 * Introduce un error de captura verosímil.
 *
 * Estos son los errores reales que describe la minuta: caracteres
 * transpuestos, sufijo perdido al copiar desde Word, confusión de caracteres
 * visualmente similares, guiones de más o de menos, y capturas que solo
 * conservan los primeros dígitos de la serie.
 */
export function deformar(a: Aleatorio, designacion: string): string {
  const modos = ["truncar", "transponer", "confundir", "guion", "prefijo"] as const;

  for (let intento = 0; intento < 12; intento++) {
    const modo = a.elegir(modos);
    let salida = designacion;

    if (modo === "truncar" && designacion.length > 4) {
      salida = designacion.slice(0, a.entero(4, designacion.length - 1));
    } else if (modo === "transponer" && designacion.length > 3) {
      const i = a.entero(0, designacion.length - 2);
      const c = designacion.split("");
      [c[i], c[i + 1]] = [c[i + 1], c[i]];
      salida = c.join("");
    } else if (modo === "confundir") {
      const posiciones = [...designacion]
        .map((ch, i) => (CONFUSIONES[ch] ? i : -1))
        .filter((i) => i >= 0);
      if (posiciones.length > 0) {
        const i = a.elegir(posiciones);
        salida = designacion.slice(0, i) + CONFUSIONES[designacion[i]] + designacion.slice(i + 1);
      }
    } else if (modo === "guion") {
      salida = designacion.includes("-")
        ? designacion.replace("-", "")
        : `${designacion.slice(0, 4)}-${designacion.slice(4)}`;
    } else if (modo === "prefijo") {
      const soloDigitos = designacion.match(/^[A-Z]*\s?\d{3,5}/);
      if (soloDigitos) salida = soloDigitos[0];
    }

    if (salida !== designacion && salida.length > 0) return salida;
  }
  // Respaldo determinista: siempre distinto y no vacío.
  return `${designacion.slice(0, Math.max(1, designacion.length - 1))}X`;
}

function esDiaHabil(d: Date): boolean {
  const dia = d.getUTCDay();
  return dia !== 0 && dia !== 6;
}

function diasHabiles(desde: Date, hasta: Date): Date[] {
  const salida: Date[] = [];
  const cursor = new Date(desde.getTime());
  while (cursor < hasta) {
    if (esDiaHabil(cursor)) salida.push(new Date(cursor.getTime()));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return salida;
}

/** Los últimos 5 días hábiles de cada mes: el procedimiento los asigna al equipo OEM. */
function marcarCierreDeMes(dias: readonly Date[]): Set<string> {
  const porMes = new Map<string, Date[]>();
  for (const d of dias) {
    const clave = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    const lista = porMes.get(clave) ?? [];
    lista.push(d);
    porMes.set(clave, lista);
  }
  const cierre = new Set<string>();
  for (const [, lista] of porMes) {
    for (const d of lista.slice(-5)) cierre.add(d.toISOString().slice(0, 10));
  }
  return cierre;
}

export function generarCotizaciones(
  a: Aleatorio,
  catalogo: readonly DesignacionCompleta[],
  inventario: readonly FilaInventario[],
  numClientes: number,
  opciones: OpcionesHistorico,
): Cotizacion[] {
  const stock = new Map<string, number>();
  for (const i of inventario) {
    stock.set(i.designacion, (stock.get(i.designacion) ?? 0) + i.cantidad);
  }

  const dias = diasHabiles(opciones.desde, opciones.hasta);
  const cierre = marcarCierreDeMes(dias);
  const activos = OPERADORES.map((operador, indice) => ({
    ...operador,
    id: indice + 1,
  })).filter((operador) => operador.activo);
  const salida: Cotizacion[] = [];
  let consecutivo = 1;

  for (const dia of dias) {
    const claveDia = dia.toISOString().slice(0, 10);
    const esCierre = cierre.has(claveDia);
    // Estacionalidad ligera: el cierre de mes baja el volumen del equipo AFT.
    const cuantas = Math.round(opciones.porDiaHabil * (esCierre ? 0.75 : a.decimal(0.85, 1.15, 2)));

    for (let i = 0; i < cuantas; i++) {
      // El pico de la ventana de desconexión: 12:30 a 15:00 hora de México.
      const enPico = a.probabilidad(0.55);
      // Jornada de 08:00 a 18:00. La franja de pico se solapa a propósito con
      // el tráfico normal: durante la ventana también hay consultas legítimas.
      const minutoDia = enPico ? a.entero(750, 899) : a.entero(480, 1079);
      const fecha_solicitud = new Date(dia.getTime());
      fecha_solicitud.setUTCHours(Math.floor(minutoDia / 60), minutoDia % 60, a.entero(0, 59), 0);

      const d = a.elegir(catalogo);
      const disponible = stock.get(d.designacion) ?? 0;

      let designacion = d.designacion;
      let resultado: Cotizacion["resultado"] = "cotizada";
      let motivo: MotivoDeclinado | null = null;
      let patron: string | null = esCierre ? "cierre_mes_oem" : null;

      // Patrón 2: designaciones mal ingresadas.
      if (a.probabilidad(0.16)) {
        designacion = deformar(a, d.designacion);
        resultado = "declinada";
        motivo = "designacion_invalida";
        patron = patron ?? "designacion_mal_ingresada";
      } else if (enPico && d.lcc === "PLAN" && disponible > 0 && a.probabilidad(0.92)) {
        // Patrón 1: cotización innecesaria durante la ventana de desconexión.
        resultado = "declinada";
        motivo = "ya_disponible_wcl";
        patron = patron ?? "ventana_desconexion";
      } else if (
        !d.vigente &&
        d.reemplazado_por === null &&
        d.reemplazo_indicado_fabrica === null
      ) {
        resultado = "declinada";
        motivo = "obsoleto_sin_reemplazo";
      } else if (d.pdiv === "P110" || d.pdiv === "P204") {
        // Las dos plantas sin ruta o sin conexión: punto 4.5b.
        resultado = "declinada";
        motivo = "planta_sin_ruta";
      }

      const cantidad = a.elegirPonderado([
        [a.entero(1, 9), 45],
        [a.entero(10, 99), 40],
        [a.entero(100, 2000), 15],
      ]);
      if (resultado === "cotizada" && cantidad < d.moq) {
        resultado = "declinada";
        motivo = "moq_mayor";
      }

      // SLA: 4 días hábiles de PROMEDIO, con cola que lo excede.
      const diasRespuesta = a.probabilidad(0.12) ? a.decimal(6.5, 14, 2) : a.decimal(0.5, 5.5, 2);
      const fecha_respuesta = new Date(fecha_solicitud.getTime() + diasRespuesta * 86400000);

      const cotizada = resultado === "cotizada";
      salida.push({
        numero: `${fecha_solicitud.getUTCFullYear()}Q${String(consecutivo++).padStart(5, "0")}`,
        cliente_id: a.entero(1, numClientes),
        designacion,
        cantidad,
        fecha_solicitud,
        fecha_respuesta,
        operador_id: a.elegir(activos).id,
        resultado,
        motivo_declinado: cotizada ? null : motivo,
        te_semanas: cotizada ? a.decimal(1, 26, 1) : null,
        precio: cotizada ? (d.precio_lista ?? a.decimal(40, 9000, 2)) : null,
        patron,
      });
    }
  }
  return salida;
}

export const COLUMNAS_COTIZACIONES = [
  "numero",
  "cliente_id",
  "designacion",
  "cantidad",
  "fecha_solicitud",
  "fecha_respuesta",
  "operador_id",
  "resultado",
  "motivo_declinado",
  "te_semanas",
  "precio",
  "patron",
] as const;

export function filasCotizaciones(cotizaciones: readonly Cotizacion[]): unknown[][] {
  return cotizaciones.map((c) => [
    c.numero,
    c.cliente_id,
    c.designacion,
    c.cantidad,
    c.fecha_solicitud,
    c.fecha_respuesta,
    c.operador_id,
    c.resultado,
    c.motivo_declinado,
    c.te_semanas,
    c.precio,
    c.patron,
  ]);
}
