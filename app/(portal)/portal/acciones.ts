"use server";

import { revalidatePath } from "next/cache";
import { ahoraSimulada, estadoDePlanta } from "@/lib/estado-fabricas";
import type { Estimacion } from "@/lib/estimador/calculo";
import { estimarTE } from "@/lib/estimador/estimador";
import {
  cargaPorCsr,
  construirContexto,
  homologosDe,
  type Intencion,
  idDeOperador,
  intencionesDesde,
  obtenerDesignacion,
  plantaCompleta,
} from "@/lib/fuentes";
import { emitirEvento } from "@/lib/metricas/emitir";
import { consultarInventarioExterno } from "@/lib/mock/inventario";
import { elegirCsr } from "@/lib/operacion/asignacion";
import { evaluarSolicitud } from "@/lib/reglas-qms";
import { leerSesion } from "@/lib/sesion-demo/leer";
import type { SesionDemo } from "@/lib/sesion-demo/tipos";
import { clienteAdmin } from "@/lib/supabase/admin";
import { validar } from "@/lib/validador/cascada";
import type { Confirmacion } from "@/lib/validador/confirmacion";
import { construirConfirmacion } from "@/lib/validador/confirmacion";
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
  const [contexto, sesion] = await Promise.all([
    construirContexto(consulta.trim(), cantidad),
    leerSesion(),
  ]);
  const evaluacion = evaluarSolicitud(contexto);

  // Reparto automático. `null` es un resultado válido: sin operadores activos
  // la solicitud se crea igual y la bandeja la muestra como «Sin asignar».
  const csr = elegirCsr(await cargaPorCsr(sesion.iniciadaEn));
  const csrId = csr === null ? null : await idDeOperador(csr);

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
      csr_asignado: csrId,
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
    detalle: { numero, ruta: evaluacion.ruta, punto: evaluacion.punto, csr },
  });
  revalidatePath("/operador");
  return numero;
}

export async function registrarSolicitudEvitada(codigo: string): Promise<void> {
  await emitirEvento({ tipo: "solicitud_evitada", perfil: "cliente", designacion: codigo });
  revalidatePath("/operador");
}

/** Equivalencias registradas de una designación, ya convertidas en pasos. */
export async function equivalenciasDe(codigo: string): Promise<Confirmacion[]> {
  const homologos = await homologosDe(codigo);
  return homologos.map(construirConfirmacion);
}

/**
 * Cierre de la confirmación guiada.
 *
 * Se vuelve a resolver el homólogo en el servidor en vez de confiar en lo que
 * manda el navegador: la equivalencia tiene que existir en la base, igual que
 * el validador solo elige designaciones del catálogo.
 */
export async function confirmarHomologo(
  origen: string,
  equivalente: string,
  cantidad: number,
): Promise<{ designacion: string; requiereIngenieriaVentas: boolean }> {
  const homologos = await homologosDe(origen);
  const elegido = homologos.find((homologo) => homologo.equivalente === equivalente);
  if (!elegido) throw new Error(`${equivalente} no es un homólogo registrado de ${origen}.`);

  const designacion = await obtenerDesignacion(equivalente);
  if (!designacion) throw new Error(`${equivalente} no existe en el catálogo.`);

  const confirmacion = construirConfirmacion(elegido);
  await emitirEvento({
    tipo: "confirmacion_homologo",
    perfil: "cliente",
    designacion: origen,
    pdiv: designacion.pdiv,
    detalle: {
      equivalente,
      cantidad,
      pasos: confirmacion.pasos.length,
      requiereIngenieriaVentas: confirmacion.requiereIngenieriaVentas,
    },
  });
  revalidatePath("/operador");

  return {
    designacion: equivalente,
    requiereIngenieriaVentas: confirmacion.requiereIngenieriaVentas,
  };
}

/**
 * Registra la intención de pedido de un cliente mientras su planta está en
 * ventana de mantenimiento.
 *
 * Solo procede si la planta está realmente en `ventana`. Fuera de ventana
 * devuelve error: encolar con la planta viva sería resolver un problema que no
 * existe, y en pantalla se leería como un rodeo innecesario.
 */
export async function encolarIntencion(
  codigo: string,
  cantidad: number,
): Promise<{ id: number; pdiv: string }> {
  const designacion = await obtenerDesignacion(codigo);
  if (!designacion) throw new Error(`La designación ${codigo} no existe en el catálogo.`);

  const [planta, sesion] = await Promise.all([plantaCompleta(designacion.pdiv), leerSesion()]);
  if (!planta) throw new Error(`No se encontró la planta ${designacion.pdiv}.`);

  const estado = estadoDePlanta(
    planta,
    ahoraSimulada(sesion.relojOffsetMin),
    sesion.plantasOverride[planta.pdiv],
  );
  if (estado !== "ventana") {
    throw new Error(
      `${planta.nombre} no está en ventana de mantenimiento: la consulta se resuelve en vivo y no ` +
        "hace falta encolar.",
    );
  }

  const { data, error } = await clienteAdmin()
    .from("intenciones_pedido")
    .insert({ designacion: designacion.designacion, cantidad, pdiv: planta.pdiv })
    .select("id")
    .single();
  if (error) throw new Error(`No se pudo encolar la intención: ${error.message}`);

  await emitirEvento({
    tipo: "intencion_encolada",
    perfil: "cliente",
    designacion: designacion.designacion,
    pdiv: planta.pdiv,
    detalle: { id: data.id, cantidad, planta: planta.nombre },
  });
  revalidatePath("/portal");

  return { id: data.id, pdiv: planta.pdiv };
}

/** Cola de la sesión para la pantalla del cliente. */
export async function listarIntenciones(): Promise<Intencion[]> {
  const sesion = await leerSesion();
  return intencionesDesde(sesion.iniciadaEn);
}
