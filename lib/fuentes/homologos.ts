import { clienteLectura } from "@/lib/supabase/lectura";

export interface DiferenciaTecnica {
  atributo: string;
  valor_origen: string;
  valor_equivalente: string;
}

export interface Homologo {
  origen: string;
  equivalente: string;
  motivo: string;
  diferencias: DiferenciaTecnica[];
}

/**
 * Equivalencias de una designación en ambos sentidos: la relación es simétrica
 * en la realidad aunque la tabla la guarde dirigida.
 */
export async function homologosDe(codigo: string): Promise<Homologo[]> {
  const { data } = await clienteLectura()
    .from("homologos")
    .select("origen, equivalente, motivo, diferencias")
    .or(`origen.eq.${codigo},equivalente.eq.${codigo}`);
  return ((data ?? []) as unknown as Homologo[]).map((h) =>
    h.origen === codigo
      ? h
      : {
          origen: codigo,
          equivalente: h.origen,
          motivo: h.motivo,
          diferencias: h.diferencias.map((d) => ({
            atributo: d.atributo,
            valor_origen: d.valor_equivalente,
            valor_equivalente: d.valor_origen,
          })),
        },
  );
}
