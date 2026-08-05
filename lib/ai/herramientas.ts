import "server-only";
import { isStepCount, tool } from "ai";
import { z } from "zod";
import { ahoraSimulada, estadoDePlanta } from "@/lib/estado-fabricas";
import { estimarTE } from "@/lib/estimador/estimador";
import {
  existenciasDe,
  homologosDe,
  obtenerCotizacion,
  obtenerDesignacion,
  plantaCompleta,
} from "@/lib/fuentes";
import { DIAS_SLA, diasHabiles } from "@/lib/reglas-qms";
import { leerSesion } from "@/lib/sesion-demo/leer";
import { validar } from "@/lib/validador/cascada";
import { buscarFragmento } from "./procedimiento";

export type PerfilChat = "cliente" | "operador";

/** Cinco herramientas cerradas sobre las mismas fuentes que usa el portal. */
export function HERRAMIENTAS(perfil: PerfilChat) {
  return {
    buscarDesignacion: tool({
      description:
        "Valida una designación contra el catálogo cerrado y devuelve candidatos con contexto QMS y homólogos. Úsala antes de afirmar que un código existe.",
      inputSchema: z.object({ consulta: z.string().min(1), cantidad: z.number().int().positive() }),
      execute: async ({ consulta, cantidad }) => {
        const resultado = await validar(consulta, cantidad);
        const candidatos = await Promise.all(
          resultado.candidatos.map(async (candidato) => ({
            ...candidato,
            estimacion: await estimarTE(candidato.designacion.designacion, cantidad),
            homologos: await homologosDe(candidato.designacion.designacion),
          })),
        );
        return { ...resultado, candidatos };
      },
    }),
    consultarDisponibilidad: tool({
      description:
        "Consulta existencias PS/SL/XX y el estado actual de la planta propietaria. No inventa disponibilidad durante una ventana.",
      inputSchema: z.object({ designacion: z.string().min(1) }),
      execute: async ({ designacion }) => {
        const producto = await obtenerDesignacion(designacion);
        if (!producto) return { encontrada: false, designacion };
        const [existencias, planta, sesion] = await Promise.all([
          existenciasDe(producto.designacion),
          plantaCompleta(producto.pdiv),
          leerSesion(),
        ]);
        return {
          encontrada: true,
          designacion: producto.designacion,
          precioLista: producto.precioLista,
          pdiv: producto.pdiv,
          planta: planta?.nombre ?? null,
          estado: planta
            ? estadoDePlanta(
                planta,
                ahoraSimulada(sesion.relojOffsetMin),
                sesion.plantasOverride[planta.pdiv],
              )
            : null,
          existencias,
        };
      },
    }),
    estimarTiempoEntrega: tool({
      description:
        "Calcula un rango de TE a partir del histórico. Devuelve rango, casos, confianza y base; nunca un plazo confirmado.",
      inputSchema: z.object({
        designacion: z.string().min(1),
        cantidad: z.number().int().positive(),
      }),
      execute: async ({ designacion, cantidad }) => ({
        designacion,
        estimacion: await estimarTE(designacion, cantidad),
        compromiso:
          "Estimación no confirmada; el TE en firme se confirma al procesar la cotización.",
      }),
    }),
    consultarCotizacion: tool({
      description:
        "Consulta una cotización por número y calcula días hábiles transcurridos contra el SLA de 4 días.",
      inputSchema: z.object({ numero: z.string().min(1) }),
      execute: async ({ numero }) => {
        const cotizacion = await obtenerCotizacion(numero);
        if (!cotizacion) return { encontrada: false, numero };
        const transcurridos = diasHabiles(
          cotizacion.fechaSolicitud,
          cotizacion.fechaRespuesta ? new Date(cotizacion.fechaRespuesta) : new Date(),
        );
        const comun = {
          encontrada: true,
          numero: cotizacion.numero,
          estado: cotizacion.fechaRespuesta ? "respondida" : "en_proceso",
          diasHabilesTranscurridos: transcurridos,
          slaDiasHabiles: DIAS_SLA,
          dentroDelSla: transcurridos <= DIAS_SLA,
        };
        return perfil === "operador"
          ? {
              ...comun,
              resultado: cotizacion.resultado,
              motivoDeclinado: cotizacion.motivoDeclinado,
              designacion: cotizacion.designacion,
              cantidad: cotizacion.cantidad,
            }
          : comun;
      },
    }),
    consultarProcedimiento: tool({
      description:
        "Recupera los puntos del procedimiento QMS relacionados con una duda. Cita siempre el punto devuelto.",
      inputSchema: z.object({ consulta: z.string().min(1) }),
      execute: async ({ consulta }) => buscarFragmento(consulta),
    }),
  };
}

export const CONDICION_FIN_HERRAMIENTAS = isStepCount(5);
