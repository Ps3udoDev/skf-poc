import "server-only";
import { clienteAdmin } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/tipos";
import type { TipoEvento } from "./calculo";

export interface EntradaEvento {
  tipo: TipoEvento;
  perfil?: "cliente" | "operador";
  /** Texto libre a propósito: el punto 4.8 exige registrar designaciones que no existen. */
  designacion?: string | null;
  pdiv?: string | null;
  detalle?: Record<string, unknown>;
}

/**
 * Registra un evento de la sesión.
 *
 * NUNCA lanza. Un fallo al escribir una métrica no puede tumbar una búsqueda en
 * mitad de la demostración: el evento se pierde, la pantalla sigue viva.
 */
export async function emitirEvento(entrada: EntradaEvento): Promise<void> {
  try {
    const { error } = await clienteAdmin()
      .from("eventos_demo")
      .insert({
        tipo: entrada.tipo,
        perfil: entrada.perfil ?? null,
        designacion: entrada.designacion ?? null,
        pdiv: entrada.pdiv ?? null,
        detalle: (entrada.detalle ?? {}) as Json,
      });
    if (error) console.error("[metricas] no se pudo registrar el evento:", error.message);
  } catch (fallo) {
    console.error("[metricas] excepción al registrar el evento:", fallo);
  }
}
