# Tarea 10 — Fuente de intenciones de pedido

## Estado

completa

No cites el hash de tu propio commit: el archivo va dentro de ese commit y no
puedes conocerlo al escribirlo. Para ubicar el trabajo basta con
`git log --oneline -- lib/fuentes/intenciones.ts`.

## Qué entrega esta tarea

- `lib/fuentes/intenciones.ts` (nuevo): fuente de **solo lectura** de la cola
  `intenciones_pedido`. Exporta `ESTADOS_INTENCION`, el tipo `EstadoIntencion`,
  la interfaz `Intencion` y las funciones `intencionesDe(pdiv, estado?)` e
  `intencionesDesde(iniciadaEn)`.
- `lib/fuentes/index.ts`: añade `export * from "./intenciones";` en orden
  alfabético, después de `./homologos`.

## Decisiones tomadas y por qué

- **Solo lectura, a propósito.** Encolar y reconciliar son escrituras y viven
  en las Server Actions de las tareas 12 y 13. Esta fuente existe para que ni
  la pantalla del cliente ni la reconciliación consulten la tabla por su
  cuenta. (Decisión del plan, aplicada tal cual.)

- **El tipo se ancla al enum SQL con `satisfies`.** `ESTADOS_INTENCION` se
  declara como unión literal pero con
  `satisfies readonly Database["public"]["Enums"]["estado_intencion"][]`: si
  alguien altera el enum `estado_intencion` en la base y regenera
  `lib/supabase/tipos.ts`, la línea deja de compilar en vez de fallar en
  tiempo de ejecución con un valor que la tabla ya no acepta. Es el mismo
  recurso que usa `RUTAS_QMS`.

- **Traducción snake_case → camelCase en un solo punto.** La constante
  `COLUMNAS` fija la selección y `aIntencion()` mapea la fila (`encolada_en` →
  `encoladaEn`, `resuelta_en` → `resueltaEn`): el resto del código solo ve el
  tipo `Intencion` en español camelCase, como las demás fuentes.

- **Sin desviaciones del snippet del plan.** El archivo se escribió tal cual
  lo dicta el plan; Biome no exigió reformateo adicional.

- **Sin tests nuevos** — directiva del usuario: no se crean archivos de test
  en este plan. Se saltó el paso 3 del plan
  (`intenciones.integracion.test.ts`); su cobertura queda como verificación
  manual pendiente.

## Contrato que exponen estos archivos

```ts
// lib/fuentes/intenciones.ts
export const ESTADOS_INTENCION: readonly [
  "encolada", "confirmada", "ajustada", "escalada",
];
export type EstadoIntencion = (typeof ESTADOS_INTENCION)[number];

export interface Intencion {
  id: number;
  designacion: string;
  cantidad: number;
  pdiv: string;
  encoladaEn: string;
  estado: EstadoIntencion;
  resueltaEn: string | null;
  nota: string | null;
}

// Intenciones de una planta, opcionalmente filtradas por estado,
// ordenadas por encolada_en ascendente.
export function intencionesDe(
  pdiv: string,
  estado?: EstadoIntencion,
): Promise<Intencion[]>;

// Cola completa de la sesión (encolada_en >= iniciadaEn), para la
// pantalla del cliente.
export function intencionesDesde(iniciadaEn: string): Promise<Intencion[]>;
```

- Ambas funciones lanzan vía `lanzarSiError` si PostgREST devuelve error; con
  cola vacía devuelven `[]`.
- Reexportado todo desde `lib/fuentes/index.ts`.

## Qué falta / qué NO hace

- **No escribe**: ni encolar (Tarea 12) ni marcar resueltas tras la
  reconciliación (Tarea 13) existen todavía; esta fuente solo lee.
- **Sin test de integración propio** (directiva del usuario): los tres
  escenarios del paso 3 del plan (cola vacía, filtro por estado, estados
  dentro del enum) quedan como verificación manual pendiente contra la base.

## Cómo verificar

```bash
pnpm test
```

Salida: `Test Files 17 passed (17)`, `Tests 198 passed (198)` — la suite
sigue en verde; la fuente nueva aún no tiene consumidores.

```bash
pnpm build
```

Compila y type-check sin errores (el `satisfies` contra el enum valida en
compilación).

```bash
pnpm lint
```

`Checked 140 files ... No fixes applied. Found 1 info.` (el info es la
deprecación preexistente de `biome.json`, ajena a esta tarea).

```bash
pnpm test:integracion
```

Pasó (`1 passed`, 2 tests del test de admin preexistente; no hay test de
integración nuevo por la directiva de no crear tests).

## Verificación manual pendiente

Cuando haya base y seed disponibles, en el editor SQL o desde una pantalla:

1. `intencionesDe("P103")` con la cola vacía devuelve `[]` sin error.
2. `intencionesDe("P103", "encolada")` solo devuelve filas en estado
   `encolada`.
3. `intencionesDesde(inicioDeSesion)` devuelve toda la cola de la sesión y
   cada `estado` pertenece a `ESTADOS_INTENCION`.
