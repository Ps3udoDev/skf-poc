# Tarea 6 — Inventario por almacén

## Estado
completa

No cites el hash de tu propio commit: el archivo va dentro de ese commit y no
puedes conocerlo al escribirlo. Para ubicar el trabajo usa:
`git log --oneline -- scripts/seed/inventario.ts scripts/seed/inventario.test.ts`.

## Qué entrega esta tarea

Entrega un generador determinista de existencias por designación y almacén que representa la consulta escalonada del procedimiento QMS: `PS` como almacén primario, `SL` como secundario y `XX` como terciario. La distribución hace que los productos planeados vigentes tengan stock con frecuencia y los no planeados vigentes casi nunca, condición necesaria para que el demo pueda tanto continuar una cotización como declinarla por falta de existencias.

También entrega el orden de columnas y la serialización de cada registro de inventario para su carga posterior.

## Decisiones tomadas y por qué

- La probabilidad de que una designación genere inventario depende primero de su estado y clasificación: un obsoleto usa `0.15`, un `PLAN` vigente usa `0.92` y un `NP` vigente usa `0.12`. La condición de obsolescencia tiene precedencia sobre LCC, de modo que un producto no vigente conserva stock solo de forma ocasional.
- Toda designación seleccionada para inventario recibe una fila `PS`. Además, `SL` se agrega con probabilidad `0.45` y `XX` con probabilidad `0.20`, de forma independiente. Por construcción puede haber uno, dos o tres almacenes, pero nunca `SL` o `XX` sin `PS`.
- La jerarquía representa el orden operacional del QMS: `PS` es primario; `SL` y `XX` son alternativas secundarias sujetas a aprobación del Supplier. No se generan códigos de almacén fuera de esos tres.
- Para cada fila se sortea una cantidad base según LCC: entre 40 y 4.000 para `PLAN`, y entre 1 y 120 para `NP`. El factor del almacén es `1` para `PS`, `0.35` para `SL` y `0.12` para `XX`; luego se redondea y se protege con `Math.max(0, ...)`. Esto concentra la mayor cantidad agregada en el almacén primario.
- La cantidad base se sortea de nuevo para cada almacén de una designación; los factores no se aplican a una única base compartida entre sus filas. Debido al redondeo, una fila secundaria o terciaria puede tener cantidad cero, aunque nunca negativa.
- `pdiv_dueno` se copia directamente del `pdiv` de la designación. Así, cada fila referencia la planta propietaria ya asignada al catálogo y no vuelve a sortearla.
- La clave lógica, coherente con la PK compuesta de la tabla, es `(designacion, almacen)`. El generador recorre una sola vez cada designación y construye cada código de almacén como máximo una vez, por lo que no duplica esa pareja.
- Toda decisión aleatoria consume la instancia `Aleatorio` recibida. La función no muta el catálogo y, con el mismo catálogo, semilla y estado previo del PRNG, produce el mismo inventario.
- `COLUMNAS_INVENTARIO` y `filasInventario` usan el mismo orden de cuatro campos para que el cargador por `COPY` no dependa del orden interno de las propiedades.

## Contrato que exponen estos archivos

`scripts/seed/inventario.ts` exporta:

```ts
export interface FilaInventario {
  designacion: string;
  almacen: "PS" | "SL" | "XX";
  cantidad: number;
  pdiv_dueno: string;
}

export function generarInventario(
  a: Aleatorio,
  catalogo: readonly DesignacionCompleta[],
): FilaInventario[];

export const COLUMNAS_INVENTARIO = [
  "designacion",
  "almacen",
  "cantidad",
  "pdiv_dueno",
] as const;

export function filasInventario(
  inventario: readonly FilaInventario[],
): unknown[][];
```

`generarInventario` devuelve cero o más filas por designación: ninguna si no supera la probabilidad de stock, o una fila `PS` más las filas opcionales `SL` y `XX`. Todas las filas apuntan a una designación del catálogo y conservan su `pdiv` como `pdiv_dueno`.

`filasInventario` devuelve una fila de cuatro posiciones por elemento, exactamente en el orden declarado por `COLUMNAS_INVENTARIO`: designación, almacén, cantidad y PDIV dueño.

## Qué falta / qué NO hace

- No inserta datos en la base ni consulta existencias reales; genera filas sintéticas en memoria.
- No muta el catálogo ni valida claves foráneas contra una base conectada. La coherencia de designación y PDIV proviene de copiar ambos valores del catálogo recibido.
- No garantiza stock para cada designación. La ausencia total de filas representa que no hay inventario disponible.
- Una fila existente no implica necesariamente cantidad positiva: el redondeo de los factores `0.35` y `0.12` puede producir cero en `SL` o `XX`, especialmente para productos `NP` con bases pequeñas.
- No garantiza proporciones exactas en catálogos pequeños. `0.15`, `0.92`, `0.12`, `0.45` y `0.20` son probabilidades de generación, no cuotas exactas.
- No modela reservas, inventario en tránsito, fechas de corte, monedas, lotes ni movimientos. Solo representa saldo sintético por designación y almacén.
- No asigna almacenes alternativos de otras plantas: todas las filas conservan como `pdiv_dueno` el PDIV de la designación.
- No aplica la aprobación del Supplier; únicamente genera la disponibilidad escalonada que tareas y lógica posteriores podrán consultar.

## Cómo verificar

Ejecutar los tests específicos:

```powershell
pnpm.cmd test inventario
```

Resultado real: `Test Files 1 passed (1)` y `Tests 9 passed (9)`.

Ejecutar toda la suite:

```powershell
pnpm.cmd test
```

Resultado real: `Test Files 13 passed (13)` y `Tests 140 passed (140)`.

Verificar tipos:

```powershell
.\node_modules\.bin\tsc.cmd --noEmit
```

Resultado real: finaliza sin errores.

Verificar formato y lint:

```powershell
pnpm.cmd lint
```

Resultado real después de formatear `scripts/seed/inventario.ts` y `scripts/seed/inventario.test.ts`: código de salida 0 y 41 archivos revisados. Solo aparece el aviso informativo preexistente sobre `linter.recommended` deprecado en `biome.json`; no hay errores de esta tarea.
