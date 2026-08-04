import { config } from "dotenv";
import { conectar } from "./cargador";
import { CASOS_CURADOS, HOMOLOGOS_CURADOS } from "./casos-curados";

config({ path: ".env.local", quiet: true });

const ok = (mensaje: string) => console.log(`  \x1b[32m✓\x1b[0m ${mensaje}`);
const falla = (mensaje: string) => console.log(`  \x1b[31m✗\x1b[0m ${mensaje}`);

async function main() {
  const cliente = conectar();
  await cliente.connect();
  let errores = 0;
  const comprobar = (condicion: boolean, mensaje: string) => {
    if (condicion) ok(mensaje);
    else {
      falla(mensaje);
      errores++;
    }
  };

  try {
    console.log("\n\x1b[1mVolúmenes\x1b[0m");
    for (const [tabla, minimo] of [
      ["plantas", 18],
      ["designaciones", 30000],
      ["homologos", 1000],
      ["inventario", 15000],
      ["clientes", 300],
      ["operadores", 8],
      ["cotizaciones", 7000],
    ] as const) {
      const n = Number((await cliente.query(`select count(*)::int n from ${tabla}`)).rows[0].n);
      comprobar(n >= minimo, `${tabla}: ${n} filas (mínimo ${minimo})`);
    }

    console.log("\n\x1b[1mCasos curados del guion\x1b[0m");
    for (const caso of CASOS_CURADOS) {
      const resultado = await cliente.query("select 1 from designaciones where designacion = $1", [
        caso.designacion.designacion,
      ]);
      comprobar(resultado.rowCount === 1, `${caso.clave} · ${caso.designacion.designacion}`);
    }

    for (const homologo of HOMOLOGOS_CURADOS) {
      const resultado = await cliente.query(
        "select diferencias from homologos where origen = $1 and equivalente = $2",
        [homologo.origen, homologo.equivalente],
      );
      comprobar(
        resultado.rowCount === 1 && resultado.rows[0].diferencias.length >= 2,
        `homólogo curado ${homologo.origen} → ${homologo.equivalente} con diferencias`,
      );
    }

    console.log("\n\x1b[1mBúsqueda difusa\x1b[0m");
    const inicio = Date.now();
    const similares = await cliente.query(
      "select designacion from designaciones where designacion % $1 order by similarity(designacion, $1) desc limit 5",
      ["DEMO-6205-2RSH"],
    );
    const ms = Date.now() - inicio;
    comprobar(ms < 1000, `trigramas responde en ${ms} ms (límite 1000)`);
    comprobar((similares.rowCount ?? 0) > 0, `devuelve ${similares.rowCount ?? 0} sugerencias`);

    const completaciones = await cliente.query(
      "select count(*)::int n from designaciones where designacion like $1",
      ["DEMO-6205-2RSH%"],
    );
    comprobar(
      Number(completaciones.rows[0].n) === 3,
      "el prefijo incompleto tiene 3 completaciones",
    );

    console.log("\n\x1b[1mPatrones del dashboard\x1b[0m");
    const pico = await cliente.query(`
      select count(*) filter (
               where extract(hour from fecha_solicitud) * 60
                   + extract(minute from fecha_solicitud) between 750 and 899
             )::int en_pico,
             count(*)::int total
      from cotizaciones`);
    const proporcion = pico.rows[0].en_pico / pico.rows[0].total;
    comprobar(
      proporcion > 0.38,
      `pico en la franja de desconexión: ${(proporcion * 100).toFixed(1)}%`,
    );

    const motivos = await cliente.query(
      "select count(distinct motivo_declinado)::int n from cotizaciones where motivo_declinado is not null",
    );
    comprobar(Number(motivos.rows[0].n) === 5, "los 5 motivos de declinado están presentes");

    const sla = await cliente.query(`
      select avg(extract(epoch from (fecha_respuesta - fecha_solicitud)) / 86400) dias
      from cotizaciones where fecha_respuesta is not null`);
    const dias = Number(sla.rows[0].dias);
    comprobar(dias > 2 && dias < 6, `promedio de respuesta: ${dias.toFixed(2)} días`);

    console.log("\n\x1b[1mCoherencia\x1b[0m");
    const huerfanas = await cliente.query(`
      select count(*)::int n from cotizaciones c
      where c.resultado = 'cotizada' and (c.te_semanas is null or c.precio is null)`);
    comprobar(Number(huerfanas.rows[0].n) === 0, "ninguna cotizada sin TE ni precio");

    const operadoresInactivos = await cliente.query(`
      select count(*)::int n
      from cotizaciones c
      join operadores o on o.id = c.operador_id
      where not o.activo`);
    comprobar(
      Number(operadoresInactivos.rows[0].n) === 0,
      "ninguna cotización asignada a CSR inactivo",
    );

    const fabrica = await cliente.query(`
      select count(*)::int n from designaciones d
      where d.reemplazo_indicado_fabrica is not null
        and exists (select 1 from designaciones x where x.designacion = d.reemplazo_indicado_fabrica)`);
    comprobar(
      Number(fabrica.rows[0].n) === 0,
      "ningún reemplazo indicado por fábrica existe en el catálogo (es su definición)",
    );

    const tresSalidas = await cliente.query(`
      select count(*) filter (where reemplazado_por is not null)::int en_sistema,
             count(*) filter (
               where reemplazado_por is null and reemplazo_indicado_fabrica is not null
             )::int por_fabrica,
             count(*) filter (
               where reemplazado_por is null and reemplazo_indicado_fabrica is null
             )::int sin_reemplazo
      from designaciones where vigente = false`);
    const tres = tresSalidas.rows[0];
    comprobar(
      tres.en_sistema > 0 && tres.por_fabrica > 0 && tres.sin_reemplazo > 0,
      `las tres salidas del punto 4.6/4.7 están representadas: ${tres.en_sistema} / ${tres.por_fabrica} / ${tres.sin_reemplazo}`,
    );
  } finally {
    await cliente.end();
  }

  console.log(
    errores === 0
      ? "\n\x1b[32mDatos verificados.\x1b[0m\n"
      : `\n\x1b[31m${errores} comprobación(es) fallida(s).\x1b[0m\n`,
  );
  process.exit(errores === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
