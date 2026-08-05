"use server";

import { revalidatePath } from "next/cache";
import type { Estimacion } from "@/lib/estimador/calculo";
import { estimarTE } from "@/lib/estimador/estimador";
import {
  construirContexto,
  filaDeSolicitud,
  type Homologo,
  homologosDe,
  idDeOperador,
  type SolicitudResumen,
} from "@/lib/fuentes";
import {
  type ContextoSolicitud,
  type EvaluacionQMS,
  evaluarSolicitud,
  type MotivoDeclinado,
  motivoDeclinado,
  type RutaQMS,
} from "@/lib/reglas-qms";
import { clienteAdmin } from "@/lib/supabase/admin";

export interface DetalleSolicitud {
  fila: SolicitudResumen;
  contexto: ContextoSolicitud;
  evaluacion: EvaluacionQMS;
  homologos: Homologo[];
  estimacion: Estimacion | null;
}

/**
 * Detalle completo de una solicitud de la bandeja.
 *
 * Se compone aquí y no en `lib/fuentes`: la fuente devuelve la fila y los
 * motores hacen el resto. `designacionTexto` es lo que el cliente escribió sin
 * corregir, así que puede no existir en el catálogo — ese es exactamente el
 * caso del punto 4.8, y por eso `contexto.designacion` puede ser `null` sin
 * que nada falle.
 */
export async function detalleDeSolicitud(numero: string): Promise<DetalleSolicitud | null> {
  const fila = await filaDeSolicitud(numero);
  if (fila === null) return null;

  const contexto = await construirContexto(fila.designacionTexto.trim(), fila.cantidad);
  const evaluacion = evaluarSolicitud(contexto);
  const codigo = contexto.designacion?.designacion ?? null;

  const [homologos, estimacion] = await Promise.all([
    codigo === null ? Promise.resolve<Homologo[]>([]) : homologosDe(codigo),
    codigo === null ? Promise.resolve<Estimacion | null>(null) : estimarTE(codigo, fila.cantidad),
  ]);

  return { fila, contexto, evaluacion, homologos, estimacion };
}

/** `csr: null` devuelve la solicitud al montón sin asignar. */
export async function asignarSolicitud(numero: string, csr: string | null): Promise<void> {
  let id: number | null = null;
  if (csr !== null) {
    id = await idDeOperador(csr);
    if (id === null) throw new Error(`No existe el operador ${csr}.`);
  }

  const { error } = await clienteAdmin()
    .from("solicitudes")
    .update({ csr_asignado: id })
    .eq("numero", numero);
  if (error) throw new Error(`No se pudo asignar la solicitud ${numero}: ${error.message}`);
  revalidatePath("/operador");
}

export async function resolverSolicitud(
  numero: string,
  resultado: "cotizada" | "declinada",
  motivo?: MotivoDeclinado,
): Promise<void> {
  if (resultado === "cotizada" && motivo !== undefined) {
    throw new Error("Una solicitud cotizada no lleva motivo de declinación.");
  }

  let motivoFinal: MotivoDeclinado | null = null;
  if (resultado === "declinada") {
    motivoFinal = motivo ?? null;
    if (motivoFinal === null) {
      const fila = await filaDeSolicitud(numero);
      if (fila === null) throw new Error(`No existe la solicitud ${numero}.`);
      motivoFinal =
        fila.clasificacionQms === null ? null : motivoDeclinado(fila.clasificacionQms as RutaQMS);
    }
    if (motivoFinal === null) {
      throw new Error(
        "No se puede declinar sin motivo: la clasificación QMS de esta solicitud no corresponde " +
          "a una ruta que declina. Elige el motivo explícitamente.",
      );
    }
  }

  const { error } = await clienteAdmin()
    .from("solicitudes")
    .update({
      // Hora real, no simulada: el reloj del presentador gobierna las ventanas
      // de fábrica, no la auditoría de la solicitud.
      atendida_en: new Date().toISOString(),
      resultado,
      motivo_declinado: motivoFinal,
    })
    .eq("numero", numero);
  if (error) throw new Error(`No se pudo resolver la solicitud ${numero}: ${error.message}`);
  revalidatePath("/operador");
}
