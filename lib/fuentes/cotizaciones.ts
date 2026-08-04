import { clienteLectura } from "@/lib/supabase/lectura";

export interface Cotizacion {
  numero: string;
  designacion: string;
  cantidad: number;
  fechaSolicitud: string;
  fechaRespuesta: string | null;
  resultado: "cotizada" | "declinada";
  motivoDeclinado: string | null;
  teSemanas: number | null;
  precio: number | null;
}

/** Semanas de TE del histórico de una designación. Base del estimador. */
export async function historicoDe(codigo: string): Promise<number[]> {
  const { data } = await clienteLectura()
    .from("cotizaciones")
    .select("te_semanas")
    .eq("designacion", codigo)
    .eq("resultado", "cotizada")
    .not("te_semanas", "is", null);
  return ((data ?? []) as { te_semanas: number }[]).map((f) => Number(f.te_semanas));
}

/**
 * Histórico de toda la familia, para cuando una designación tiene pocos casos.
 * Se hace en dos consultas porque `cotizaciones.designacion` es texto libre y no
 * tiene clave foránea al catálogo: el histórico incluye designaciones inválidas,
 * que es justamente el caso del punto 4.8.
 */
export async function historicoDeFamilia(familia: string): Promise<number[]> {
  const cliente = clienteLectura();
  const { data: codigos } = await cliente
    .from("designaciones")
    .select("designacion")
    .eq("familia", familia)
    .limit(400);
  const lista = ((codigos ?? []) as { designacion: string }[]).map((f) => f.designacion);
  if (lista.length === 0) return [];

  const { data } = await cliente
    .from("cotizaciones")
    .select("te_semanas")
    .in("designacion", lista)
    .eq("resultado", "cotizada")
    .not("te_semanas", "is", null);
  return ((data ?? []) as { te_semanas: number }[]).map((f) => Number(f.te_semanas));
}

export async function obtenerCotizacion(numero: string): Promise<Cotizacion | null> {
  const { data } = await clienteLectura()
    .from("cotizaciones")
    .select(
      "numero, designacion, cantidad, fecha_solicitud, fecha_respuesta, resultado, motivo_declinado, te_semanas, precio",
    )
    .eq("numero", numero)
    .maybeSingle();
  if (!data) return null;
  const f = data as Record<string, unknown>;
  return {
    numero: f.numero as string,
    designacion: f.designacion as string,
    cantidad: f.cantidad as number,
    fechaSolicitud: f.fecha_solicitud as string,
    fechaRespuesta: (f.fecha_respuesta as string | null) ?? null,
    resultado: f.resultado as Cotizacion["resultado"],
    motivoDeclinado: (f.motivo_declinado as string | null) ?? null,
    teSemanas: f.te_semanas === null ? null : Number(f.te_semanas),
    precio: f.precio === null ? null : Number(f.precio),
  };
}
