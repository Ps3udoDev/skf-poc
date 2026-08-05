"use server";

import { revalidatePath } from "next/cache";
import { ahoraSimulada, type EstadoPlanta, estadoDePlanta } from "@/lib/estado-fabricas";
import { existenciasDe, intencionesDe, obtenerDesignacion, plantaCompleta } from "@/lib/fuentes";
import { emitirEvento } from "@/lib/metricas/emitir";
import { reconciliar } from "@/lib/operacion/reconciliacion";
import { clienteAdmin } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/tipos";
import { escenarioPorClave, offsetParaAlinearVentana } from "./escenarios";
import { leerSesion } from "./leer";

// El brief tipaba esto como Record<string, unknown>, pero el .update() del
// cliente tipado no lo acepta; el tipo Update de la tabla cubre los mismos
// campos sin perder seguridad.
type CambiosSesion = Database["public"]["Tables"]["sesion_demo"]["Update"];

async function actualizar(cambios: CambiosSesion): Promise<void> {
  const { error } = await clienteAdmin().from("sesion_demo").update(cambios).eq("id", 1);
  if (error) throw new Error(`No se pudo actualizar la sesión del demo: ${error.message}`);
  revalidatePath("/portal");
  revalidatePath("/operador");
  revalidatePath("/demo");
}

export async function cambiarModo(modo: "hoy" | "solucion"): Promise<void> {
  await actualizar({ modo });
}

/** `null` devuelve la planta al calendario en vez de forzarle un estado. */
export async function fijarEstadoPlanta(pdiv: string, estado: EstadoPlanta | null): Promise<void> {
  const sesion = await leerSesion();
  const planta = await plantaCompleta(pdiv);
  const momento = ahoraSimulada(sesion.relojOffsetMin);
  const anterior = planta ? estadoDePlanta(planta, momento, sesion.plantasOverride[pdiv]) : null;

  const overrides = { ...sesion.plantasOverride };
  if (estado === null) delete overrides[pdiv];
  else overrides[pdiv] = estado;
  await actualizar({ plantas_override: overrides });

  if (!planta) return;
  // El evento se emite DESPUÉS de escribir: la pantalla del presentador no
  // espera a la métrica, y `emitirEvento` no lanza jamás.
  const nuevo = estadoDePlanta(planta, momento, overrides[pdiv]);
  if (anterior !== "ventana" && nuevo === "ventana") {
    await emitirEvento({ tipo: "ventana_inicio", pdiv, detalle: { planta: planta.nombre } });
  }
  if (anterior === "ventana" && nuevo !== "ventana") {
    await emitirEvento({ tipo: "ventana_fin", pdiv, detalle: { planta: planta.nombre } });
  }
}

/** El offset es acumulativo: cada salto se suma al anterior. */
export async function avanzarReloj(minutos: number): Promise<void> {
  const sesion = await leerSesion();
  await actualizar({ reloj_offset_min: sesion.relojOffsetMin + minutos });
}

export async function reiniciarReloj(): Promise<void> {
  await actualizar({ reloj_offset_min: 0 });
}

/**
 * Resuelve toda intención `encolada` de una planta.
 *
 * No se exporta: un archivo `"use server"` solo puede exportar funciones
 * asíncronas que sean acciones, y esto es un paso interno de
 * `cerrarVentanaEnCurso`. En serie a propósito, para que el orden de los
 * eventos coincida con el de la cola en pantalla.
 */
async function reconciliarIntenciones(pdiv: string): Promise<void> {
  const pendientes = await intencionesDe(pdiv, "encolada");
  if (pendientes.length === 0) return;
  const admin = clienteAdmin();

  for (const intencion of pendientes) {
    const [designacion, existencias] = await Promise.all([
      obtenerDesignacion(intencion.designacion),
      existenciasDe(intencion.designacion),
    ]);
    // La clave foránea lo impide, pero si faltara el catálogo no se puede
    // decidir nada honesto: se deja encolada en vez de inventar un resultado.
    if (!designacion) continue;

    const resultado = reconciliar({
      intencion,
      existencias,
      moq: designacion.moq,
      packQuantity: designacion.packQuantity,
    });

    const { error } = await admin
      .from("intenciones_pedido")
      .update({
        estado: resultado.estado,
        resuelta_en: new Date().toISOString(),
        nota: resultado.nota,
      })
      .eq("id", intencion.id);
    if (error) {
      throw new Error(`No se pudo reconciliar la intención ${intencion.id}: ${error.message}`);
    }

    await emitirEvento({
      tipo: "reconciliacion",
      perfil: "cliente",
      designacion: intencion.designacion,
      pdiv,
      detalle: {
        estado: resultado.estado,
        cantidadFinal: resultado.cantidadFinal,
        punto: resultado.punto,
      },
    });
  }
}

/**
 * Cierra la ventana en curso de una planta.
 *
 * Quitar el override no basta si la planta está además dentro de su ventana de
 * calendario: hay que forzarla a 'online'. El presentador usa esto al final de
 * la escena 4, cuando la cola se envía en lote.
 *
 * ORDEN DELIBERADO: primero se reconcilia la cola, después se libera la planta.
 * Al revés, la pantalla del cliente se refrescaría con la planta viva y la cola
 * todavía sin resolver.
 */
export async function cerrarVentanaEnCurso(pdiv: string): Promise<void> {
  await reconciliarIntenciones(pdiv);
  await fijarEstadoPlanta(pdiv, "online");
}

export async function activarEscenario(clave: string): Promise<void> {
  const escenario = escenarioPorClave(clave);
  if (!escenario) throw new Error(`Escenario desconocido: ${clave}`);
  const sesion = await leerSesion();
  let relojOffsetMin = sesion.relojOffsetMin;
  if (escenario.alinearVentanaPdiv) {
    const planta = await plantaCompleta(escenario.alinearVentanaPdiv);
    if (planta) {
      relojOffsetMin = offsetParaAlinearVentana(planta);
    }
  }
  await actualizar({
    escenario_activo: clave,
    modo: escenario.modo ?? sesion.modo,
    plantas_override: escenario.overrides ?? sesion.plantasOverride,
    reloj_offset_min: relojOffsetMin,
  });
}

/**
 * Reinicia la sesión.
 *
 * Mueve `iniciada_en` a ahora y borra las solicitudes generadas en la sesión.
 * NO toca `eventos_demo` ni el histórico: los contadores leen solo eventos
 * posteriores a `iniciada_en`, así que reiniciar deja los contadores en cero
 * sin destruir el histórico sintético que alimenta al estimador.
 */
export async function reiniciarSesion(): Promise<void> {
  const admin = clienteAdmin();
  const { error } = await admin.from("solicitudes").delete().gt("id", 0);
  if (error) throw new Error(`No se pudieron borrar las solicitudes: ${error.message}`);
  await actualizar({
    iniciada_en: new Date().toISOString(),
    modo: "hoy",
    plantas_override: {},
    reloj_offset_min: 0,
    escenario_activo: null,
  });
}
