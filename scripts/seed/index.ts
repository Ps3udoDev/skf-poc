import { config } from "dotenv";
import { crearAleatorio } from "./aleatorio";
import { cargar, conectar } from "./cargador";
import { aplicarCasosCurados, aplicarHomologosCurados, CASOS_CURADOS } from "./casos-curados";
import {
  COLUMNAS_CLIENTES,
  COLUMNAS_OPERADORES,
  filasClientes,
  filasOperadores,
  generarClientes,
} from "./comercial";
import { COLUMNAS_COTIZACIONES, filasCotizaciones, generarCotizaciones } from "./cotizaciones";
import { COLUMNAS_DESIGNACIONES, filasDesignaciones, generarCatalogo } from "./designaciones";
import {
  COLUMNAS_HOMOLOGOS,
  filasHomologos,
  generarHomologos,
  resolverObsolescencia,
} from "./homologos";
import { COLUMNAS_INVENTARIO, filasInventario, generarInventario } from "./inventario";
import { COLUMNAS_PLANTAS, filasPlantas } from "./plantas";

config({ path: ".env.local", quiet: true });

const DESIGNACIONES = 30000;
const CLIENTES = 300;
const POR_DIA_HABIL = 65;

function leerSemilla(): number {
  const semilla = Number(process.env.DEMO_SEED ?? 20260803);
  if (!Number.isSafeInteger(semilla)) {
    throw new Error("DEMO_SEED debe ser un número entero seguro");
  }
  return semilla;
}

async function main() {
  const semilla = leerSemilla();
  console.log(`Sembrando con semilla ${semilla}...`);
  const a = crearAleatorio(semilla);

  console.log("  generando catálogo...");
  const catalogo = generarCatalogo(a, DESIGNACIONES);
  const inventario = generarInventario(a, catalogo);

  // Los casos curados entran ANTES de resolver la obsolescencia, para que
  // participen de las cadenas y de los homólogos.
  aplicarCasosCurados(catalogo, inventario);

  // resolverObsolescencia MUTA el catálogo: tiene que correr antes de serializar.
  resolverObsolescencia(a, catalogo);
  const homologos = generarHomologos(a, catalogo);
  aplicarHomologosCurados(homologos);
  const clientes = generarClientes(a, CLIENTES);

  console.log("  generando histórico...");
  const cotizaciones = generarCotizaciones(a, catalogo, inventario, CLIENTES, {
    desde: new Date("2026-02-02T00:00:00Z"),
    hasta: new Date("2026-08-01T00:00:00Z"),
    porDiaHabil: POR_DIA_HABIL,
  });

  // La FK autorreferente reemplazado_por se valida al terminar cada COPY. Los
  // vigentes deben cargarse antes que los obsoletos que los referencian.
  const catalogoParaCarga = [...catalogo].sort((a, b) => Number(b.vigente) - Number(a.vigente));

  const cliente = conectar();
  await cliente.connect();
  try {
    await cliente.query("begin");
    try {
      // RESTART IDENTITY mantiene estables los IDs de clientes y operadores
      // en ejecuciones consecutivas; CASCADE respeta las claves foráneas.
      console.log("  limpiando tablas...");
      await cliente.query(
        "truncate cotizaciones, solicitudes, intenciones_pedido, snapshot_inventario, " +
          "eventos_demo, inventario, homologos, designaciones, clientes, operadores, plantas " +
          "restart identity cascade",
      );

      const pasos: [string, readonly string[], unknown[][]][] = [
        ["plantas", COLUMNAS_PLANTAS, filasPlantas()],
        ["designaciones", COLUMNAS_DESIGNACIONES, filasDesignaciones(catalogoParaCarga)],
        ["homologos", COLUMNAS_HOMOLOGOS, filasHomologos(homologos)],
        ["inventario", COLUMNAS_INVENTARIO, filasInventario(inventario)],
        ["clientes", COLUMNAS_CLIENTES, filasClientes(clientes)],
        ["operadores", COLUMNAS_OPERADORES, filasOperadores()],
        ["cotizaciones", COLUMNAS_COTIZACIONES, filasCotizaciones(cotizaciones)],
      ];

      for (const [tabla, columnas, filas] of pasos) {
        const inicio = Date.now();
        const n = await cargar(cliente, tabla, columnas, filas);
        console.log(`  ${tabla}: ${n} filas en ${Date.now() - inicio} ms`);
      }

      await cliente.query("commit");
      console.log(`\nListo. ${CASOS_CURADOS.length} casos curados disponibles para el guion.`);
    } catch (error) {
      await cliente.query("rollback");
      throw error;
    }
  } finally {
    await cliente.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
