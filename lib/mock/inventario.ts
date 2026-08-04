import { ahoraSimulada, estadoDePlanta } from "@/lib/estado-fabricas";
import { existenciasDe, obtenerDesignacion, plantaCompleta } from "@/lib/fuentes";
import type { Existencia } from "@/lib/reglas-qms";
import { leerSesion } from "@/lib/sesion-demo/leer";
import { latenciaArtificial } from "./latencia";

export type ResultadoInventarioExterno =
  | { tipo: "designacion_no_encontrada" }
  | { tipo: "planta_no_encontrada" }
  | { tipo: "planta_en_ventana"; pdiv: string; planta: string }
  | {
      tipo: "disponible";
      designacion: string;
      pdiv: string;
      estado: "online" | "reactivando";
      existencias: Existencia[];
    };

/**
 * Comportamiento compartido del sistema externo de inventario.
 *
 * Tanto la ruta HTTP como el portal en modo `hoy` pasan por aquí. Así la
 * pantalla no puede mostrar inventario vivo cuando el mock responde 503.
 */
export async function consultarInventarioExterno(
  codigo: string,
): Promise<ResultadoInventarioExterno> {
  await latenciaArtificial();
  const producto = await obtenerDesignacion(codigo);
  if (!producto) return { tipo: "designacion_no_encontrada" };

  const [planta, sesion] = await Promise.all([plantaCompleta(producto.pdiv), leerSesion()]);
  if (!planta) return { tipo: "planta_no_encontrada" };

  const estado = estadoDePlanta(
    planta,
    ahoraSimulada(sesion.relojOffsetMin),
    sesion.plantasOverride[planta.pdiv],
  );
  if (estado === "ventana") {
    return { tipo: "planta_en_ventana", pdiv: planta.pdiv, planta: planta.nombre };
  }

  return {
    tipo: "disponible",
    designacion: producto.designacion,
    pdiv: planta.pdiv,
    estado,
    existencias: await existenciasDe(producto.designacion),
  };
}
