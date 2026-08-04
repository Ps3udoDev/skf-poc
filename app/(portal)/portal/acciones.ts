"use server";

import { revalidatePath } from "next/cache";
import { ahoraSimulada, estadoDePlanta } from "@/lib/estado-fabricas";
import type { Estimacion } from "@/lib/estimador/calculo";
import { estimarTE } from "@/lib/estimador/estimador";
import { construirContexto, obtenerDesignacion, plantaCompleta } from "@/lib/fuentes";
import { emitirEvento } from "@/lib/metricas/emitir";
import { consultarInventarioExterno } from "@/lib/mock/inventario";
import { evaluarSolicitud } from "@/lib/reglas-qms";
import { leerSesion } from "@/lib/sesion-demo/leer";
import type { SesionDemo } from "@/lib/sesion-demo/tipos";
import { clienteAdmin } from "@/lib/supabase/admin";
import { validar } from "@/lib/validador/cascada";
import { construirSugerencia } from "@/lib/validador/sugerencia";
import type { ResultadoValidacion } from "@/lib/validador/tipos";

export interface ResultadoBusquedaPortal extends ResultadoValidacion {
  estimaciones: Record<string, Estimacion | null>;
  sistemaNoDisponible?: { pdiv: string; planta: string };
  plantasEnVentana: Record<string, { pdiv: string; planta: string }>;
}

async function conEstimaciones(
  resultado: ResultadoValidacion,
  cantidad: number,
  sesion: SesionDemo,
): Promise<ResultadoBusquedaPortal> {
  const contextoCandidatos = await Promise.all(
    resultado.candidatos.map(async ({ designacion }) => {
      const [estimacion, planta] = await Promise.all([
        estimarTE(designacion.designacion, cantidad),
        plantaCompleta(designacion.pdiv),
      ]);
      const enVentana =
        planta &&
        estadoDePlanta(
          planta,
          ahoraSimulada(sesion.relojOffsetMin),
          sesion.plantasOverride[planta.pdiv],
        ) === "ventana"
          ? { pdiv: planta.pdiv, planta: planta.nombre }
          : null;
      return { codigo: designacion.designacion, estimacion, enVentana };
    }),
  );
  const plantasEnVentana: Record<string, { pdiv: string; planta: string }> = {};
  for (const { codigo, enVentana } of contextoCandidatos) {
    if (enVentana) plantasEnVentana[codigo] = enVentana;
  }
  return {
    ...resultado,
    estimaciones: Object.fromEntries(
      contextoCandidatos.map(({ codigo, estimacion }) => [codigo, estimacion]),
    ),
    plantasEnVentana,
  };
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
        plantasEnVentana: {},
      };
    }
    const inventario = await consultarInventarioExterno(exacta.designacion);
    if (inventario.tipo === "planta_en_ventana") {
      return {
        consulta,
        tipo: "exacta",
        estrategia: "exacta",
        mensaje: "El sistema de la planta no está disponible en este momento.",
        candidatos: [],
        estimaciones: {},
        plantasEnVentana: {},
        sistemaNoDisponible: { pdiv: inventario.pdiv, planta: inventario.planta },
      };
    }
    const sugerencia = await construirSugerencia(exacta.designacion, cantidad, 1);
    return conEstimaciones(
      {
        consulta,
        tipo: "exacta",
        estrategia: "exacta",
        mensaje: `Designación ${exacta.designacion} encontrada.`,
        candidatos:
          sugerencia && inventario.tipo === "disponible"
            ? [{ ...sugerencia, existencias: inventario.existencias }]
            : sugerencia
              ? [sugerencia]
              : [],
      },
      cantidad,
      sesion,
    );
  }

  return conEstimaciones(await validar(consulta, cantidad), cantidad, sesion);
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
