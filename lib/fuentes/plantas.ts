import type { Planta } from "@/lib/reglas-qms";
import { clienteLectura } from "@/lib/supabase/lectura";

/** Planta con lo que el motor de reglas ignora pero el estado de fábricas necesita. */
export interface PlantaCompleta extends Planta {
  pais: string;
  huso: string;
  ventanaInicioMin: number;
  ventanaDuracionMin: number;
  ventanaVariabilidadMin: number;
  desempenoTe: number;
}

const COLUMNAS_PLANTA = `
  pdiv, nombre, pais, huso, tiene_conexion, tiene_ruta_embarque,
  ventana_inicio_min, ventana_duracion_min, ventana_variabilidad_min, desempeno_te
`;

interface FilaPlanta {
  pdiv: string;
  nombre: string;
  pais: string;
  huso: string;
  tiene_conexion: boolean;
  tiene_ruta_embarque: boolean;
  ventana_inicio_min: number;
  ventana_duracion_min: number;
  ventana_variabilidad_min: number;
  desempeno_te: number;
}

export function aPlanta(fila: FilaPlanta): PlantaCompleta {
  return {
    pdiv: fila.pdiv,
    nombre: fila.nombre,
    pais: fila.pais,
    huso: fila.huso,
    tieneConexion: fila.tiene_conexion,
    tieneRutaEmbarque: fila.tiene_ruta_embarque,
    ventanaInicioMin: fila.ventana_inicio_min,
    ventanaDuracionMin: fila.ventana_duracion_min,
    ventanaVariabilidadMin: fila.ventana_variabilidad_min,
    desempenoTe: Number(fila.desempeno_te),
  };
}

export async function plantaCompleta(pdiv: string): Promise<PlantaCompleta | null> {
  const { data } = await clienteLectura()
    .from("plantas")
    .select(COLUMNAS_PLANTA)
    .eq("pdiv", pdiv)
    .maybeSingle();
  return data ? aPlanta(data as unknown as FilaPlanta) : null;
}

export async function obtenerPlanta(pdiv: string): Promise<Planta | null> {
  return plantaCompleta(pdiv);
}

export async function todasLasPlantas(): Promise<PlantaCompleta[]> {
  const { data } = await clienteLectura().from("plantas").select(COLUMNAS_PLANTA).order("pdiv");
  return ((data ?? []) as unknown as FilaPlanta[]).map(aPlanta);
}
