"use server";

import { revalidatePath } from "next/cache";
import type { EstadoPlanta } from "@/lib/estado-fabricas";
import { plantaCompleta } from "@/lib/fuentes";
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
  const overrides = { ...sesion.plantasOverride };
  if (estado === null) delete overrides[pdiv];
  else overrides[pdiv] = estado;
  await actualizar({ plantas_override: overrides });
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
 * Cierra la ventana en curso de una planta.
 *
 * Quitar el override no basta si la planta está además dentro de su ventana de
 * calendario: hay que forzarla a 'online'. El presentador usa esto al final de
 * la escena 4, cuando la cola se envía en lote.
 */
export async function cerrarVentanaEnCurso(pdiv: string): Promise<void> {
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
