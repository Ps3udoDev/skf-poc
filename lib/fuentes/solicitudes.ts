import type { MotivoDeclinado, RutaQMS } from "@/lib/reglas-qms";
import { clienteLectura } from "@/lib/supabase/lectura";
import { lanzarSiError } from "./errores";
import { idDeOperador } from "./operadores";

export interface SolicitudResumen {
  numero: string;
  designacionTexto: string;
  cantidad: number;
  clasificacionQms: string | null;
  puntoQms: string | null;
  creadaEn: string;
  /** Código de operador ('CSR 1'), nunca el id: el id es detalle de esquema. */
  csrAsignado: string | null;
  atendidaEn: string | null;
  resultado: "cotizada" | "declinada" | null;
  motivoDeclinado: MotivoDeclinado | null;
}

export type EstadoSolicitud = "abierta" | "atendida";

export interface FiltroBandeja {
  /** ISO. Siempre `sesion.iniciadaEn`: la bandeja nunca sale de la sesión. */
  desde: string;
  estado?: EstadoSolicitud;
  clasificacion?: RutaQMS;
  /** `null` filtra las no asignadas; `undefined` no filtra por CSR. */
  csr?: string | null;
}

const COLUMNAS = `
  numero, designacion_texto, cantidad, clasificacion_qms, punto_qms, creada_en,
  atendida_en, resultado, motivo_declinado, csr:operadores ( codigo )
`;

interface FilaSolicitud {
  numero: string;
  designacion_texto: string;
  cantidad: number;
  clasificacion_qms: string | null;
  punto_qms: string | null;
  creada_en: string;
  atendida_en: string | null;
  resultado: "cotizada" | "declinada" | null;
  motivo_declinado: MotivoDeclinado | null;
  /** Embed de muchos-a-uno: objeto o null, nunca arreglo. */
  csr: { codigo: string } | null;
}

function aResumen(fila: FilaSolicitud): SolicitudResumen {
  return {
    numero: fila.numero,
    designacionTexto: fila.designacion_texto,
    cantidad: fila.cantidad,
    clasificacionQms: fila.clasificacion_qms,
    puntoQms: fila.punto_qms,
    creadaEn: fila.creada_en,
    csrAsignado: fila.csr?.codigo ?? null,
    atendidaEn: fila.atendida_en,
    resultado: fila.resultado,
    motivoDeclinado: fila.motivo_declinado,
  };
}

/** Solicitudes de la sesión, sin filtrar. La usa la bandeja y la usará el chat. */
export async function solicitudesDesde(iniciadaEn: string): Promise<SolicitudResumen[]> {
  return solicitudesFiltradas({ desde: iniciadaEn });
}

export async function solicitudesFiltradas(filtro: FiltroBandeja): Promise<SolicitudResumen[]> {
  let consulta = clienteLectura()
    .from("solicitudes")
    .select(COLUMNAS)
    .gte("creada_en", filtro.desde);

  if (filtro.estado === "abierta") consulta = consulta.is("atendida_en", null);
  if (filtro.estado === "atendida") consulta = consulta.not("atendida_en", "is", null);
  if (filtro.clasificacion) consulta = consulta.eq("clasificacion_qms", filtro.clasificacion);

  if (filtro.csr === null) {
    consulta = consulta.is("csr_asignado", null);
  } else if (filtro.csr !== undefined) {
    const id = await idDeOperador(filtro.csr);
    // Filtrar por un operador que no existe da cero resultados, no todos.
    if (id === null) return [];
    consulta = consulta.eq("csr_asignado", id);
  }

  const { data, error } = await consulta.order("creada_en", { ascending: false });
  lanzarSiError(error, "obtener las solicitudes de la sesión");
  return ((data ?? []) as unknown as FilaSolicitud[]).map(aResumen);
}

export async function filaDeSolicitud(numero: string): Promise<SolicitudResumen | null> {
  const { data, error } = await clienteLectura()
    .from("solicitudes")
    .select(COLUMNAS)
    .eq("numero", numero)
    .maybeSingle();
  lanzarSiError(error, `obtener la solicitud ${numero}`);
  return data ? aResumen(data as unknown as FilaSolicitud) : null;
}
