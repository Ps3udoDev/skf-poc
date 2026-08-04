import { clienteLectura } from "@/lib/supabase/lectura";
import { lanzarSiError } from "./errores";

export interface SolicitudResumen {
  numero: string;
  designacionTexto: string;
  cantidad: number;
  clasificacionQms: string | null;
  puntoQms: string | null;
  creadaEn: string;
}

/** Solicitudes visibles en la bandeja mínima, limitadas a la sesión activa. */
export async function solicitudesDesde(iniciadaEn: string): Promise<SolicitudResumen[]> {
  const { data, error } = await clienteLectura()
    .from("solicitudes")
    .select("numero, designacion_texto, cantidad, clasificacion_qms, punto_qms, creada_en")
    .gte("creada_en", iniciadaEn)
    .order("creada_en", { ascending: false });
  lanzarSiError(error, "obtener las solicitudes de la sesión");
  return (data ?? []).map((fila) => ({
    numero: fila.numero,
    designacionTexto: fila.designacion_texto,
    cantidad: fila.cantidad,
    clasificacionQms: fila.clasificacion_qms,
    puntoQms: fila.punto_qms,
    creadaEn: fila.creada_en,
  }));
}
