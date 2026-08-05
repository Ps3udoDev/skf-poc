import { DIAS_SLA, diasHabiles } from "@/lib/reglas-qms";
import { clienteLectura } from "@/lib/supabase/lectura";
import { lanzarSiError } from "./errores";

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
  const { data, error } = await clienteLectura()
    .from("cotizaciones")
    .select("te_semanas")
    .eq("designacion", codigo)
    .eq("resultado", "cotizada")
    .not("te_semanas", "is", null);
  lanzarSiError(error, `obtener el histórico de ${codigo}`);
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
  const { data: codigos, error: errorCodigos } = await cliente
    .from("designaciones")
    .select("designacion")
    .eq("familia", familia)
    .limit(400);
  lanzarSiError(errorCodigos, `obtener las designaciones de la familia ${familia}`);
  const lista = ((codigos ?? []) as { designacion: string }[]).map((f) => f.designacion);
  if (lista.length === 0) return [];

  const { data, error } = await cliente
    .from("cotizaciones")
    .select("te_semanas")
    .in("designacion", lista)
    .eq("resultado", "cotizada")
    .not("te_semanas", "is", null);
  lanzarSiError(error, `obtener el histórico de la familia ${familia}`);
  return ((data ?? []) as { te_semanas: number }[]).map((f) => Number(f.te_semanas));
}

export async function obtenerCotizacion(numero: string): Promise<Cotizacion | null> {
  const { data, error } = await clienteLectura()
    .from("cotizaciones")
    .select(
      "numero, designacion, cantidad, fecha_solicitud, fecha_respuesta, resultado, motivo_declinado, te_semanas, precio",
    )
    .eq("numero", numero)
    .maybeSingle();
  lanzarSiError(error, `obtener la cotización ${numero}`);
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

export interface CumplimientoSla {
  /** Cotizaciones con `fecha_respuesta`. Son las únicas medibles. */
  respondidas: number;
  dentroDelSla: number;
  /** 0..1. Cero cuando no hay respondidas: «NaN%» proyectado es peor que un 0. */
  tasa: number;
  pendientes: number;
  medianaDiasHabiles: number;
}

/**
 * PostgREST corta en 1000 filas por defecto y el histórico sintético ronda las
 * 9000. Sin paginar, esta función mediría solo la primera página y devolvería
 * una tasa creíble pero falsa.
 */
const FILAS_POR_PAGINA = 1000;
const PAGINAS_MAXIMAS = 20;

/**
 * Memoización por proceso. Nada del demo escribe en `cotizaciones`: el
 * histórico es inmutable durante la presentación, y el sondeo de respaldo de
 * `/impacto` corre cada dos segundos. `reiniciarSesion()` no lo invalida porque
 * no toca el histórico.
 */
let memoria: CumplimientoSla | null = null;

interface FilaSla {
  fecha_solicitud: string;
  fecha_respuesta: string | null;
}

export async function cumplimientoSla(): Promise<CumplimientoSla> {
  if (memoria) return memoria;

  const cliente = clienteLectura();
  const filas: FilaSla[] = [];
  let agotada = false;
  for (let pagina = 0; pagina < PAGINAS_MAXIMAS; pagina++) {
    const inicio = pagina * FILAS_POR_PAGINA;
    const { data, error } = await cliente
      .from("cotizaciones")
      .select("fecha_solicitud, fecha_respuesta")
      .order("fecha_solicitud")
      .range(inicio, inicio + FILAS_POR_PAGINA - 1);
    lanzarSiError(error, "obtener el histórico de cumplimiento del SLA");
    const lote = (data ?? []) as unknown as FilaSla[];
    filas.push(...lote);
    if (lote.length < FILAS_POR_PAGINA) {
      agotada = true;
      break;
    }
  }
  if (!agotada) {
    throw new Error(
      `El histórico de cotizaciones superó el tope de ${PAGINAS_MAXIMAS} páginas ` +
        `(${PAGINAS_MAXIMAS * FILAS_POR_PAGINA} filas) sin agotarse: la cifra de cumplimiento del SLA sería parcial y no se calcula.`,
    );
  }

  const dias: number[] = [];
  let pendientes = 0;
  for (const fila of filas) {
    if (!fila.fecha_respuesta) {
      pendientes++;
      continue;
    }
    dias.push(diasHabiles(fila.fecha_solicitud, fila.fecha_respuesta));
  }

  const dentro = dias.filter((d) => d <= DIAS_SLA).length;
  const ordenados = [...dias].sort((a, b) => a - b);

  memoria = {
    respondidas: dias.length,
    dentroDelSla: dentro,
    tasa: dias.length === 0 ? 0 : dentro / dias.length,
    pendientes,
    medianaDiasHabiles: ordenados.length === 0 ? 0 : ordenados[Math.floor(ordenados.length / 2)],
  };
  return memoria;
}
