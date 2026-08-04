# Tarea 4 — Clasificación QMS del catálogo

## Estado
completa

No cites el hash de tu propio commit: el archivo va dentro de ese commit y no
puedes conocerlo al escribirlo. Para ubicar el trabajo usa:
`git log --oneline -- scripts/seed/designaciones.ts scripts/seed/designaciones.test.ts`.

## Qué entrega esta tarea

Entrega la clasificación QMS determinista del catálogo generado por la tarea 3. Cada designación recibe PCC, LCC, FPC, planta, MOQ, cantidad de empaque, precio de lista, vigencia y marca de nueva creación con las distribuciones definidas en el plan, además de una serialización en el orden de columnas requerido para la carga masiva.

La implementación conserva `segmento`, `familia`, `designacion` y `descripcion` de `DesignacionBase`, y garantiza en memoria las restricciones que después exigirá la tabla `designaciones`.

## Decisiones tomadas y por qué

- La clasificación inicial se sortea como 60% `PLAN`, 35% `NP` y 5% `OBSOLETO`. Los obsoletos conservan un LCC válido (`PLAN` con peso 40 o `NP` con peso 60), pero reciben siempre `pcc: "O"` y `vigente: false`.
- Para cumplir la bicondicional del `CHECK obsoleto_no_vigente`, toda designación no obsoleta queda vigente y ninguna designación obsoleta queda vigente. Los `PLAN` vigentes reciben PCC `C`; los `NP` vigentes reciben PCC `N` con peso 70 o `P` con peso 30.
- FPC se genera con pesos 75% para `"1"` y 25% para `"2"`. Todo FPC 1 obtiene precio; solo 20% de FPC 2 obtiene precio, por lo que aproximadamente 80% queda sin Precio de Lista. Los precios presentes se generan entre 35 y 18.500 con dos decimales.
- MOQ depende del LCC: `PLAN` favorece fuertemente 1, mientras `NP` reparte más peso entre 1, 10, 25, 50 y 100. `pack_quantity` usa los valores 1, 5, 10, 20 y 50, todos compatibles con las restricciones positivas de la base.
- La planta se elige únicamente de `PLANTAS`. Las plantas europeas (`P1xx`) tienen peso 6, las asiáticas (`P2xx`) peso 3 y las americanas (`P3xx`) peso 2, de modo que Europa concentra el catálogo sin introducir códigos ajenos al catálogo de plantas.
- `es_nueva_creacion` usa una probabilidad de 2%. Todo el muestreo consume la instancia `Aleatorio` recibida; no se usa `Math.random()` ni tiempo del sistema, por lo que la misma semilla y cantidad producen el mismo catálogo.
- `reemplazado_por` y `reemplazo_indicado_fabrica` se inicializan deliberadamente en `null`. Construir referencias válidas requiere ver el catálogo completo y corresponde a la tarea 5, dedicada a homólogos y cadenas de obsolescencia.
- `COLUMNAS_DESIGNACIONES` y `filasDesignaciones` comparten exactamente el mismo orden de 15 campos. Esto permite entregar las filas al cargador por `COPY` sin depender del orden de propiedades de los objetos.
- El paso 4 del plan afirma que deben pasar 12 tests, pero el archivo planificado e implementado contiene realmente **13 tests**: 4 de distribuciones, 4 de restricciones de base, 2 de precio según FPC, 1 de obsolescencia diferida y 2 de determinismo/serialización. La verificación real correcta es 13 tests.

## Contrato que exponen estos archivos

`scripts/seed/designaciones.ts` exporta:

```ts
export interface DesignacionCompleta extends DesignacionBase {
  pcc: "C" | "P" | "N" | "O";
  lcc: "PLAN" | "NP";
  fpc: "1" | "2";
  pdiv: string;
  moq: number;
  pack_quantity: number;
  precio_lista: number | null;
  vigente: boolean;
  reemplazado_por: string | null;
  reemplazo_indicado_fabrica: string | null;
  es_nueva_creacion: boolean;
}

export function generarCatalogo(
  a: Aleatorio,
  cantidad: number,
): DesignacionCompleta[];

export const COLUMNAS_DESIGNACIONES = [
  "designacion",
  "descripcion",
  "familia",
  "pcc",
  "lcc",
  "fpc",
  "pdiv",
  "moq",
  "pack_quantity",
  "precio_lista",
  "vigente",
  "reemplazado_por",
  "reemplazo_indicado_fabrica",
  "es_nueva_creacion",
  "segmento",
] as const;

export function filasDesignaciones(
  catalogo: readonly DesignacionCompleta[],
): unknown[][];
```

`DesignacionCompleta` hereda además estos campos de `DesignacionBase`: `designacion: string`, `descripcion: string`, `familia: string` y `segmento: "rodamiento" | "power_transmission"`.

`generarCatalogo` devuelve exactamente la cantidad solicitada siempre que `generarDesignaciones` pueda producirla. `filasDesignaciones` devuelve una fila de 15 posiciones por elemento y respeta exactamente el orden declarado por `COLUMNAS_DESIGNACIONES`.

## Qué falta / qué NO hace

- No inserta datos en la base; solo genera y serializa el catálogo en memoria.
- No construye homólogos ni cadenas de reemplazo. `reemplazado_por` y `reemplazo_indicado_fabrica` permanecen nulos a propósito y serán resueltos por la **tarea 5** con acceso al catálogo completo.
- No garantiza todavía que cada obsoleto termine con un reemplazo ni que las cadenas sean acíclicas; esas invariantes también pertenecen a la tarea 5.
- No genera inventario, clientes, operadores, cotizaciones ni casos curados; corresponden a tareas posteriores del plan.
- No valida claves foráneas contra una base conectada. La coherencia de `pdiv` se resuelve usando exclusivamente el catálogo `PLANTAS` en memoria y se cubre con tests unitarios.
- No expone `PESOS_PLANTA`; es un detalle interno de la distribución y no forma parte del contrato público.

## Cómo verificar

Ejecutar los tests específicos:

```powershell
pnpm.cmd test designaciones
```

Resultado real: `Test Files 1 passed (1)` y `Tests 13 passed (13)`. El plan dice 12 por error; el archivo contiene 13 tests.

Ejecutar toda la suite:

```powershell
pnpm.cmd test
```

Resultado real: `Test Files 11 passed (11)` y `Tests 122 passed (122)`.

Verificar tipos:

```powershell
.\node_modules\.bin\tsc.cmd --noEmit
```

Resultado real: finaliza sin salida y sin error.

Verificar formato y lint:

```powershell
pnpm.cmd lint
```

Resultado real: código de salida 0 y 37 archivos revisados. Solo aparece el aviso informativo preexistente sobre `linter.recommended` deprecado en `biome.json`; no hay errores de esta tarea.
