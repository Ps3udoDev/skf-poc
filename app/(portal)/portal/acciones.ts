"use server";

import { revalidatePath } from "next/cache";
import type { Estimacion } from "@/lib/estimador/calculo";
import { estimarTE } from "@/lib/estimador/estimador";
import { construirContexto, obtenerDesignacion } from "@/lib/fuentes";
import { emitirEvento } from "@/lib/metricas/emitir";
import { evaluarSolicitud } from "@/lib/reglas-qms";
import { leerSesion } from "@/lib/sesion-demo/leer";
import { clienteAdmin } from "@/lib/supabase/admin";
import { validar } from "@/lib/validador/cascada";
import { construirSugerencia } from "@/lib/validador/sugerencia";
import type { ResultadoValidacion } from "@/lib/validador/tipos";

export interface ResultadoBusquedaPortal extends ResultadoValidacion {
  estimaciones: Record<string, Estimacion | null>;
}

async function conEstimaciones(resultado: ResultadoValidacion, cantidad: number) {
  const pares = await Promise.all(
    resultado.candidatos.map(
      async ({ designacion }) =>
        [designacion.designacion, await estimarTE(designacion.designacion, cantidad)] as const,
    ),
  );
  return { ...resultado, estimaciones: Object.fromEntries(pares) };
}

/** Único punto de bifurcación entre la experiencia actual y la solución. */
export async function buscarDesignacion(
  consulta: string,
  cantidad: number,
): Promise<ResultadoBusquedaPortal> {
  const sesion = await leerSesion();
  await emitirEvento({
    tipo: "busqueda",
    perfil: "cliente",
    designacion: consulta,
    detalle: { modo: sesion.modo, cantidad },
  });

  if (sesion.modo === "hoy") {
    const exacta = await obtenerDesignacion(consulta.trim());
    if (!exacta) {
      return {
        consulta,
        tipo: "no_encontrada",
        estrategia: "ninguna",
        mensaje: "No se encontraron resultados para esa designación.",
        candidatos: [],
        estimaciones: {},
      };
    }
    const sugerencia = await construirSugerencia(exacta.designacion, cantidad, 1);
    return conEstimaciones(
      {
        consulta,
        tipo: "exacta",
        estrategia: "exacta",
        mensaje: `Designación ${exacta.designacion} encontrada.`,
        candidatos: sugerencia ? [sugerencia] : [],
      },
      cantidad,
    );
  }

  return conEstimaciones(await validar(consulta, cantidad), cantidad);
}

function numeroDeSolicitud(): string {
  const anio = new Date().getFullYear();
  const secuencia = String(Math.floor(Math.random() * 100_000)).padStart(5, "0");
  return `${anio}Q${secuencia}`;
}

export async function generarSolicitud(consulta: string, cantidad: number): Promise<string> {
  const contexto = await construirContexto(consulta.trim(), cantidad);
  const evaluacion = evaluarSolicitud(contexto);
  let numero = "";
  let ultimoError = "";

  for (let intento = 0; intento < 5; intento++) {
    numero = numeroDeSolicitud();
    const { error } = await clienteAdmin().from("solicitudes").insert({
      numero,
      designacion_texto: consulta,
      cantidad,
      clasificacion_qms: evaluacion.ruta,
      punto_qms: evaluacion.punto,
    });
    if (!error) {
      ultimoError = "";
      break;
    }
    ultimoError = error.message;
    if (error.code !== "23505") break;
  }
  if (ultimoError) throw new Error(`No se pudo generar la solicitud: ${ultimoError}`);

  await emitirEvento({
    tipo: "solicitud_generada",
    perfil: "cliente",
    designacion: consulta,
    pdiv: contexto.designacion?.pdiv ?? null,
    detalle: { numero, ruta: evaluacion.ruta, punto: evaluacion.punto },
  });
  revalidatePath("/operador");
  return numero;
}

export async function registrarSolicitudEvitada(codigo: string): Promise<void> {
  await emitirEvento({ tipo: "solicitud_evitada", perfil: "cliente", designacion: codigo });
  revalidatePath("/operador");
}
