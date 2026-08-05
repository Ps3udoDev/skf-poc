import type { SolicitudResumen } from "@/lib/fuentes/solicitudes";
import { DIAS_SLA, diasHabiles } from "@/lib/reglas-qms";
import { esNumeroDeCotizacion } from "./numeracion";

export type PerfilSolicitud = "cliente" | "operador";

export interface OpcionesVista {
  /** Inyectable para que el cálculo de días hábiles no dependa del reloj. */
  ahora?: Date;
}

/**
 * Proyección de una solicitud según quién pregunta.
 *
 * Función pura: recibe la fila ya leída y no consulta la base. Aquí vive la
 * única decisión delicada de la herramienta `consultarSolicitud`, y por eso se
 * prueba aparte de la I/O.
 *
 * Dos reglas que no son obvias:
 *
 * 1. El cliente NUNCA ve el CSR asignado. El reparto es interno.
 * 2. El cliente no ve la clasificación QMS mientras la solicitud sigue abierta.
 *    `clasificacion_qms` es una PREclasificación que el motor de reglas escribe
 *    al dar de alta; presentarla como respuesta sería convertir una sugerencia
 *    de ruteo en una decisión que ningún CSR ha tomado todavía. En cuanto la
 *    solicitud está atendida sí es una decisión, y entonces se entrega con su
 *    punto del procedimiento.
 */
export function vistaDeSolicitud(
  numero: string,
  solicitud: SolicitudResumen | null,
  iniciadaEn: string,
  perfil: PerfilSolicitud,
  opciones: OpcionesVista = {},
) {
  const fuera = solicitud !== null && new Date(solicitud.creadaEn) < new Date(iniciadaEn);
  if (solicitud === null || fuera) {
    return {
      encontrada: false as const,
      numero,
      // Deja que el modelo redirija en vez de insistir: el histórico se
      // consulta con `consultarCotizacion`, que lee otra tabla.
      pareceCotizacion: esNumeroDeCotizacion(numero),
    };
  }

  const ahora = opciones.ahora ?? new Date();
  const transcurridos = diasHabiles(
    solicitud.creadaEn,
    solicitud.atendidaEn ? new Date(solicitud.atendidaEn) : ahora,
  );
  const atendida = solicitud.atendidaEn !== null;

  const comun = {
    encontrada: true as const,
    numero: solicitud.numero,
    designacionCapturada: solicitud.designacionTexto,
    cantidad: solicitud.cantidad,
    estado: atendida ? ("atendida" as const) : ("abierta" as const),
    creadaEn: solicitud.creadaEn,
    diasHabilesTranscurridos: transcurridos,
    slaDiasHabiles: DIAS_SLA,
    dentroDelSla: transcurridos <= DIAS_SLA,
  };

  if (perfil === "operador") {
    return {
      ...comun,
      csrAsignado: solicitud.csrAsignado,
      clasificacionQms: solicitud.clasificacionQms,
      puntoQms: solicitud.puntoQms,
      resultado: solicitud.resultado,
      motivoDeclinado: solicitud.motivoDeclinado,
    };
  }

  return atendida
    ? {
        ...comun,
        resultado: solicitud.resultado,
        motivoDeclinado: solicitud.motivoDeclinado,
        puntoQms: solicitud.puntoQms,
      }
    : comun;
}
