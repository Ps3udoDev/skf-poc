# Tarea 7 — Clientes y operadores

## Estado
completa

No cites el hash de tu propio commit: el archivo va dentro de ese commit y no
puedes conocerlo al escribirlo. Para ubicar el trabajo usa:
`git log --oneline -- scripts/seed/comercial.ts scripts/seed/comercial.test.ts`.

## Qué entrega esta tarea

Entrega un catálogo fijo de ocho operadores de Customer Service identificados únicamente mediante códigos `CSR`, y un generador determinista de clientes ficticios con razón social industrial, tipo comercial, descuento y uso de WCL. Ningún operador usa nombres de personas.

También entrega los órdenes de columnas y serializadores de clientes y operadores para su carga posterior.

## Decisiones tomadas y por qué

- Los operadores son exactamente `CSR 1` a `CSR 8`, con códigos únicos. Siete están activos y `CSR 7` está inactivo, lo que permite representar el estado sin atribuir actividad o desempeño a ninguna persona real.
- Los nombres de clientes combinan un nombre de compañía generado por Faker con uno de diez giros industriales genéricos y una de tres formas societarias. Un `Set` evita duplicados dentro de una misma llamada.
- Los tipos de cliente se sortean con pesos 65% `AFT`, 20% `OEM` y 15% `USUARIO_FINAL`.
- Los OEM reciben descuentos entre `0.25` y `0.55`; AFT y usuarios finales, entre `0.05` y `0.35`. Todos se generan con tres decimales y quedan dentro del rango `[0, 1]` exigido por la base.
- Los OEM usan WCL con probabilidad `0.55`, porque el procedimiento contempla OEM que no lo utilizan. Los demás tipos usan WCL con probabilidad `0.97`, de modo que los AFT lo usan en su gran mayoría.
- La implementación ajusta el snippet fijo del plan: en vez de `faker.seed(20260803)`, cada llamada ejecuta `faker.seed(a.entero(0, 0x7fffffff))`. Así la secuencia de Faker deriva del mismo `Aleatorio` alimentado por `DEMO_SEED`; cambiar la semilla global cambia también los nombres de cliente y una misma semilla reproduce el resultado.
- Faker mantiene estado global en el módulo importado. `generarClientes` lo **resembrará en cada llamada**, consumiendo primero un entero de la instancia `Aleatorio`. Esto aísla el resultado de llamadas previas a Faker, pero también modifica el estado global que observaría cualquier otro código que use esa misma instancia de Faker después.
- El determinismo depende del estado de entrada completo: dos instancias nuevas de `Aleatorio` con la misma semilla producen los mismos clientes; reutilizar una instancia ya avanzada puede producir otra semilla de Faker y otro resultado. También debe conservarse el orden de llamadas del orquestador.
- La generación está acotada a `cantidad * 100` intentos. Si las colisiones impiden alcanzar la cantidad solicitada, lanza un error explícito en vez de entrar en un bucle indefinido.
- `COLUMNAS_CLIENTES`, `COLUMNAS_OPERADORES`, `filasClientes` y `filasOperadores` fijan el orden de serialización para el cargador por `COPY`.
- El paso 4 del plan afirma que deben pasar 11 tests, pero el bloque de tests del propio plan y el archivo implementado contienen realmente **10 tests**: 3 de operadores y 7 de clientes. La verificación correcta es 10.

## Contrato que exponen estos archivos

`scripts/seed/comercial.ts` exporta:

```ts
export interface Operador {
  codigo: string;
  activo: boolean;
}

export const OPERADORES: readonly Operador[];

export interface Cliente {
  nombre: string;
  tipo: "AFT" | "OEM" | "USUARIO_FINAL";
  descuento: number;
  usa_wcl: boolean;
}

export function generarClientes(
  a: Aleatorio,
  cantidad: number,
): Cliente[];

export const COLUMNAS_CLIENTES = [
  "nombre",
  "tipo",
  "descuento",
  "usa_wcl",
] as const;

export const COLUMNAS_OPERADORES = [
  "codigo",
  "activo",
] as const;

export function filasClientes(
  clientes: readonly Cliente[],
): unknown[][];

export function filasOperadores(): unknown[][];
```

`generarClientes` devuelve la cantidad solicitada con nombres únicos dentro de esa llamada o lanza `Error` si no puede alcanzarla en el límite de intentos. La función resembra Faker y avanza tanto el PRNG de Faker como la instancia `Aleatorio` recibida.

`filasClientes` devuelve una fila de cuatro posiciones por cliente en el orden de `COLUMNAS_CLIENTES`. `filasOperadores` no recibe parámetros y serializa todos los elementos de `OPERADORES` en dos posiciones, código y estado activo, siguiendo `COLUMNAS_OPERADORES`.

## Qué falta / qué NO hace

- No inserta clientes ni operadores en la base; solo genera y serializa datos en memoria.
- No genera nombres de operadores ni identidades de personas. Esta omisión es deliberada y forma parte de la restricción de producto.
- No garantiza porcentajes exactos de tipos o uso de WCL para cantidades pequeñas. Los valores 65/20/15, 0.55 y 0.97 son pesos y probabilidades.
- No garantiza unicidad de nombres entre llamadas distintas; cada invocación crea su propio `Set`. Si se combinan varios lotes, el consumidor debe deduplicarlos o generarlos en una sola llamada.
- No valida que `cantidad` sea un entero positivo. Para cero devuelve un arreglo vacío; valores negativos tampoco generan elementos. El uso previsto por el plan siempre proporciona una cantidad positiva.
- La estabilidad byte a byte presupone la misma versión bloqueada de `@faker-js/faker`. Una actualización de Faker puede cambiar sus conjuntos de datos o algoritmos aunque la semilla sea la misma.
- Como Faker tiene estado global, otro consumidor de la misma instancia puede ver alterada su secuencia después de `generarClientes`. Esta tarea no crea una instancia aislada de Faker.
- No genera contactos, correos, direcciones, identificadores fiscales, condiciones de pago ni historial comercial.
- No expone `GIROS` ni `FORMAS`; son detalles internos para construir razones sociales ficticias.

## Cómo verificar

Ejecutar los tests específicos:

```powershell
pnpm.cmd test comercial
```

Resultado real: `Test Files 1 passed (1)` y `Tests 10 passed (10)`. El plan dice 11 por error; su propio bloque y el archivo implementado contienen 10 tests.

Ejecutar toda la suite:

```powershell
pnpm.cmd test
```

Resultado real: `Test Files 14 passed (14)` y `Tests 150 passed (150)`.

Verificar tipos:

```powershell
.\node_modules\.bin\tsc.cmd --noEmit
```

Resultado real: finaliza sin errores.

Verificar formato y lint:

```powershell
pnpm.cmd lint
```

Resultado real: código de salida 0 y 43 archivos revisados. Solo aparece el aviso informativo preexistente sobre `linter.recommended` deprecado en `biome.json`; no hay errores de esta tarea.
