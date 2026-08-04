import { faker } from "@faker-js/faker";
import type { Aleatorio } from "./aleatorio";

export interface Operador {
  codigo: string;
  activo: boolean;
}

/**
 * Operadores de Customer Service.
 *
 * RESTRICCIÓN DE PRODUCTO: son códigos, nunca nombres de personas. Que
 * aparezca el nombre de alguien real en una bandeja simulada puede leerse
 * como señalamiento.
 */
export const OPERADORES: readonly Operador[] = [
  { codigo: "CSR 1", activo: true },
  { codigo: "CSR 2", activo: true },
  { codigo: "CSR 3", activo: true },
  { codigo: "CSR 4", activo: true },
  { codigo: "CSR 5", activo: true },
  { codigo: "CSR 6", activo: true },
  { codigo: "CSR 7", activo: false },
  { codigo: "CSR 8", activo: true },
] as const;

export interface Cliente {
  nombre: string;
  tipo: "AFT" | "OEM" | "USUARIO_FINAL";
  descuento: number;
  usa_wcl: boolean;
}

const GIROS = [
  "Industrial",
  "Manufacturas",
  "Aceros",
  "Maquinaria",
  "Refacciones",
  "Rodamientos",
  "Transmisiones",
  "Equipos",
  "Servicios Mecánicos",
  "Componentes",
] as const;

const FORMAS = ["S.A. de C.V.", "S. de R.L.", "S.A.P.I. de C.V."] as const;

/**
 * Clientes ficticios. Faker se siembra desde el mismo PRNG recibido para que
 * la generación completa responda a DEMO_SEED y siga siendo reproducible.
 */
export function generarClientes(a: Aleatorio, cantidad: number): Cliente[] {
  faker.seed(a.entero(0, 0x7fffffff));
  const nombres = new Set<string>();
  const salida: Cliente[] = [];
  let intentos = 0;

  while (salida.length < cantidad && intentos < cantidad * 100) {
    intentos++;
    const nombre = `${faker.company.name()} ${a.elegir(GIROS)} ${a.elegir(FORMAS)}`;
    if (nombres.has(nombre)) continue;
    nombres.add(nombre);

    const tipo = a.elegirPonderado<Cliente["tipo"]>([
      ["AFT", 65],
      ["OEM", 20],
      ["USUARIO_FINAL", 15],
    ]);

    salida.push({
      nombre,
      tipo,
      // Los OEM negocian precio neto; los AFT trabajan sobre lista con descuento.
      descuento: tipo === "OEM" ? a.decimal(0.25, 0.55, 3) : a.decimal(0.05, 0.35, 3),
      // El procedimiento contempla que algunos OEM no usan WCL.
      usa_wcl: tipo === "OEM" ? a.probabilidad(0.55) : a.probabilidad(0.97),
    });
  }

  if (salida.length < cantidad) {
    throw new Error(`Solo se generaron ${salida.length} clientes únicos de ${cantidad}.`);
  }
  return salida;
}

export const COLUMNAS_CLIENTES = ["nombre", "tipo", "descuento", "usa_wcl"] as const;
export const COLUMNAS_OPERADORES = ["codigo", "activo"] as const;

export function filasClientes(clientes: readonly Cliente[]): unknown[][] {
  return clientes.map((c) => [c.nombre, c.tipo, c.descuento, c.usa_wcl]);
}

export function filasOperadores(): unknown[][] {
  return OPERADORES.map((o) => [o.codigo, o.activo]);
}
