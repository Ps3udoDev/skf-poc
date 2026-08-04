import type { Aleatorio } from "./aleatorio";

export type Segmento = "rodamiento" | "power_transmission";

export interface Familia {
  nombre: string;
  segmento: Segmento;
  /** Prefijos de serie. Cadena vacía significa que la serie va sin prefijo. */
  prefijos: readonly string[];
  /** Series numéricas que anteceden al código de diámetro. */
  series: readonly string[];
  /** Sufijos técnicos posibles. Cadena vacía = designación base sin sufijo. */
  sufijos: readonly string[];
  /** Peso relativo en el catálogo. */
  peso: number;
  descripcionBase: string;
}

/**
 * Codificación pública del diámetro interior de un rodamiento.
 * 00 = 10 mm, 01 = 12 mm, 02 = 15 mm, 03 = 17 mm; de 04 en adelante, × 5 mm.
 */
export function diametroInterior(codigo: string): number {
  const especiales: Record<string, number> = { "00": 10, "01": 12, "02": 15, "03": 17 };
  return especiales[codigo] ?? Number(codigo) * 5;
}

/**
 * Cantidad de códigos de diámetro posibles: "00" a "99" (dos dígitos), lo que
 * cubre desde 10 mm hasta 495 mm de diámetro interior — rango real de la
 * nomenclatura pública de rodamientos, incluyendo rodamientos grandes.
 */
export const CANTIDAD_CODIGOS_DIAMETRO = 100;

export const FAMILIAS: readonly Familia[] = [
  {
    nombre: "Rodamiento rígido de bolas",
    segmento: "rodamiento",
    prefijos: [""],
    series: ["60", "62", "63", "64", "160", "618", "619", "622", "623"],
    sufijos: [
      "",
      "-2Z",
      "-2RS1",
      "-2RSH",
      "-RS1",
      "-Z",
      "/C3",
      "/C4",
      "-2Z/C3",
      "-2RS1/C3",
      "-2RSH/C3",
      "/W64",
    ],
    peso: 32,
    descripcionBase: "Rodamiento rígido de bolas, una hilera",
  },
  {
    nombre: "Rodamiento de rodillos cónicos",
    segmento: "rodamiento",
    prefijos: [""],
    series: ["302", "303", "320", "322", "323", "329", "330", "331", "332"],
    sufijos: ["", "/Q", "/DF", "/DB", "/C3"],
    peso: 14,
    descripcionBase: "Rodamiento de rodillos cónicos, una hilera",
  },
  {
    nombre: "Rodamiento de rodillos a rótula",
    segmento: "rodamiento",
    prefijos: [""],
    series: ["222", "223", "230", "231", "232", "240", "241"],
    sufijos: ["", " E", " CC/W33", " CCK/W33", " E/C3", " EK"],
    peso: 12,
    descripcionBase: "Rodamiento de rodillos a rótula, dos hileras",
  },
  {
    nombre: "Rodamiento de rodillos cilíndricos",
    segmento: "rodamiento",
    prefijos: ["NU", "NJ", "NUP", "N", "NCF"],
    series: ["2", "3", "4", "10", "22", "23"],
    sufijos: ["", " ECP", " ECJ", " ECML", "/C3"],
    peso: 12,
    descripcionBase: "Rodamiento de rodillos cilíndricos",
  },
  {
    nombre: "Rodamiento de bolas a rótula",
    segmento: "rodamiento",
    prefijos: [""],
    series: ["12", "13", "22", "23"],
    sufijos: ["", " K", " ETN9", " K/C3"],
    peso: 6,
    descripcionBase: "Rodamiento de bolas a rótula, dos hileras",
  },
  {
    nombre: "Rodamiento de agujas",
    segmento: "rodamiento",
    prefijos: ["HK", "BK", "NA", "NKI", "NK"],
    series: ["", "48", "49", "69"],
    sufijos: ["", " TN", "/C3"],
    peso: 6,
    descripcionBase: "Rodamiento de agujas",
  },
  {
    nombre: "Unidad de rodamiento",
    segmento: "rodamiento",
    prefijos: ["YAR", "YET", "YEL", "SY", "SYJ", "FY", "FYJ"],
    series: [""],
    sufijos: ["", "-2F", " TF", " M", " WF", "-2RF/HV"],
    peso: 8,
    descripcionBase: "Unidad de rodamiento con soporte",
  },
  {
    nombre: "Sello radial",
    segmento: "rodamiento",
    prefijos: ["HMSA10", "HMS5", "CR"],
    series: [""],
    sufijos: ["", " RG", " V", " R"],
    peso: 3,
    descripcionBase: "Sello radial de eje",
  },
  {
    nombre: "Transmisión de potencia",
    segmento: "power_transmission",
    prefijos: ["PHE", "PHG", "PHC"],
    series: ["XPZ", "SPA", "SPB", "CH", "TB"],
    sufijos: ["", "-A", "-B", "-SD"],
    peso: 9,
    descripcionBase: "Componente de transmisión de potencia",
  },
] as const;

export interface DesignacionBase {
  designacion: string;
  descripcion: string;
  familia: string;
  segmento: Segmento;
}

/**
 * Tamaño del espacio combinatorio teórico: cuántas designaciones únicas
 * distintas puede producir, como máximo, el catálogo de `FAMILIAS` dado.
 *
 * Se calcula desde los datos de `FAMILIAS` (sin generar nada), para que un
 * recorte futuro de series o sufijos se detecte de inmediato en los tests,
 * en vez de fallar a mitad de una siembra real.
 */
export function espacioCombinatorio(familias: readonly Familia[] = FAMILIAS): number {
  return familias.reduce(
    (total, f) =>
      total + f.prefijos.length * f.series.length * f.sufijos.length * CANTIDAD_CODIGOS_DIAMETRO,
    0,
  );
}

/**
 * Genera el catálogo combinatoriamente.
 *
 * La clave está en que los sufijos sigan patrones reales: de ahí nacen los
 * errores de captura verosímiles del guion (un cliente que copia `6205-2RSH`
 * desde Word y pierde el `/C3` final). Un catálogo de códigos aleatorios no
 * produciría ese efecto.
 */
export function generarDesignaciones(a: Aleatorio, cantidad: number): DesignacionBase[] {
  const pesos = FAMILIAS.map((f) => [f, f.peso] as const);
  const vistas = new Set<string>();
  const salida: DesignacionBase[] = [];
  let intentos = 0;

  while (salida.length < cantidad && intentos < cantidad * 200) {
    intentos++;
    const familia = a.elegirPonderado(pesos);
    const prefijo = a.elegir(familia.prefijos);
    const serie = a.elegir(familia.series);
    const codigoDiametro = String(a.entero(0, CANTIDAD_CODIGOS_DIAMETRO - 1)).padStart(2, "0");
    const sufijo = a.elegir(familia.sufijos);

    const separador = prefijo && !serie ? " " : "";
    const designacion = `${prefijo}${separador}${serie}${codigoDiametro}${sufijo}`.trim();
    if (vistas.has(designacion)) continue;
    vistas.add(designacion);

    const mm = diametroInterior(codigoDiametro);
    salida.push({
      designacion,
      descripcion: `${familia.descripcionBase}, diámetro interior ${mm} mm`,
      familia: familia.nombre,
      segmento: familia.segmento,
    });
  }

  if (salida.length < cantidad) {
    throw new Error(
      `Solo se generaron ${salida.length} designaciones únicas de ${cantidad} pedidas. ` +
        "Amplía las series o los sufijos de FAMILIAS.",
    );
  }
  return salida;
}
