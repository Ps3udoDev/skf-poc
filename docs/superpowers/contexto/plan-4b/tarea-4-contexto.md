# Tarea 4 — Panel operativo puro y Server Actions de refresco

## Estado

Completada. Módulos implementados y verificados contra la base real.

## Qué entrega esta tarea

Dos archivos en `lib/metricas/`:

- `operacion.ts`: un módulo puro que agrega la carga de los CSR, el cumplimiento del SLA, las solicitudes sin asignar y las franjas de la semana en un único `PanelOperativo` listo para pintar en pantalla.
- `acciones.ts`: las Server Actions que resuelven esos datos leyendo de `lib/fuentes`, `lib/estado-fabricas` y `lib/sesion-demo`, y los componen con `resumirOperacion()`. También expone `refrescarIndicadores()`, la envoltura de `indicadoresDeSesion()` que el cliente usa para recalcular métricas sin reimplementar nada.

Con esto, las tareas 5, 6 y 7 (las pantallas) tienen un contrato estable de dónde tirar los datos del panel operativo y de los indicadores, sin tocar `lib/fuentes` ni la capa de cálculo puro.

## Decisiones tomadas y por qué

### El agregado va fuera de `Indicadores`

`calcularIndicadores()` está congelada por el contrato §7.1: nada del Plan 4B puede tocarla ni ampliar `Indicadores` para no arriesgar dos implementaciones de la misma métrica conviviendo en el código. El panel operativo (cargas de CSR, SLA, franjas de la semana) no es una métrica de eventos de sesión, es un agregado de estado operativo con una fuente de datos totalmente distinta (`operadores`, `solicitudes`, `cotizaciones`, `plantas`, no `eventos_demo`). Por eso vive en su propio tipo (`PanelOperativo`), su propia función pura (`resumirOperacion()`) y su propia acción (`refrescarPanelOperativo()`). Lo único que comparte con los indicadores es el canal de refresco: ambas son Server Actions sin parámetros que el cliente puede volver a invocar para refrescar su vista, y ambas viven en `lib/metricas` porque ahí es donde el POC agrupa "cosas que resumen estado para pantalla".

### El orden de `resumirOperacion()` es determinista

El comparador ordena primero por `activo` (activos antes que inactivos), luego por `abiertas` descendente (más cargado primero), y por último por `codigo` alfabético como desempate estable. Es la misma razón por la que `elegirCsr()` en `lib/operacion/asignacion.ts` usa un desempate lexicográfico en vez de `Math.random()`: el ensayo cronometrado de la presentación repite el mismo recorrido de escenas varias veces, y una tabla de operadores que se reordena sola entre una pasada y otra —por ejemplo porque dos operadores empatan en carga y el orden de iteración de la fuente no está garantizado— rompe la posibilidad de ensayar el guion con confianza. Ordenar de forma determinista en el módulo puro, en vez de confiar en el orden que devuelve `cargaPorCsr()`, hace que la garantía no dependa de cómo Postgres decida devolver las filas.

### `refrescarIndicadores()` es una envoltura, no una reimplementación

Se limita a `return indicadoresDeSesion()`. Existe como Server Action separada porque los componentes de cliente no pueden importar directamente una función async de un módulo sin `"use server"` para volver a pedir datos tras un evento; el archivo con la directiva es el único punto de entrada permitido desde el cliente. No se optimizó ni se cacheó nada distinto de lo que ya hace `indicadoresDeSesion()`.

## Contrato que exponen estos archivos

### `lib/metricas/operacion.ts`

```ts
export interface EntradaOperacion {
  cargas: readonly CargaCsr[];
  sinAsignar: number;
  sla: CumplimientoSla;
  franjas: readonly FranjaVentana[];
}

export interface PanelOperativo {
  cargas: CargaCsr[];        // activos primero; dentro de cada grupo, de más cargado a menos
  sinAsignar: number;
  sla: CumplimientoSla;
  franjas: FranjaVentana[];
  minutosVentanaSemana: number;  // suma de duracionMin de todas las franjas
}

export function resumirOperacion(entrada: EntradaOperacion): PanelOperativo;
```

Sin I/O. Recibe todo resuelto, igual que `elegirCsr()` y `reconciliar()`.

### `lib/metricas/acciones.ts` (todo `"use server"`)

```ts
export async function refrescarIndicadores(): Promise<Indicadores>;
export async function refrescarPanelOperativo(): Promise<PanelOperativo>;
```

`refrescarPanelOperativo()` compone `cargaPorCsr(sesion.iniciadaEn)`, `cumplimientoSla()`, `todasLasPlantas()` y `solicitudesFiltradas({ desde: sesion.iniciadaEn, csr: null })` en paralelo con `Promise.all`, y pasa las plantas junto con `ahoraSimulada(sesion.relojOffsetMin)` a `franjasDeLaSemana()` para que la línea de tiempo proyectada siga el reloj simulado de la sesión (si el presentador lo adelanta, la semana avanza con él).

Estas son las firmas que las tareas 5, 6 y 7 deben importar tal cual desde `@/lib/metricas` (o directamente desde `./acciones` / `./operacion`) para construir las pantallas del panel operativo y el refresco de indicadores.

## Qué falta / qué NO hace

- No hay ninguna escritura: las dos acciones son de solo lectura, ninguna llama a `clienteAdmin()` ni hace `insert`/`update`.
- No se añadió `export * from "./operacion"` ni `export * from "./acciones"` a un barril de `lib/metricas` porque no existe tal barril; las tareas siguientes importan directamente de `@/lib/metricas/operacion` y `@/lib/metricas/acciones`, igual que hoy se importa `@/lib/metricas/indicadores` e `@/lib/metricas/calculo`.
- No se modificó `calcularIndicadores()` ni `indicadoresDeSesion()`.
- No se generaron tests (directiva explícita del Plan 4B).

## Cómo verificar

1. Script del Paso 3 del brief (adaptado para cargar `.env.local`, ver sección siguiente), contra la base real.
2. `pnpm lint` → limpio salvo el info preexistente sobre `linter.recommended` en `biome.json`. Nota: Biome reformatea el import combinado de `@/lib/fuentes` en `acciones.ts` a una sola línea; correr `pnpm lint:fix` antes de commitear si `pnpm lint` marca ese archivo.
3. `pnpm build` → compila y pasa el type-check.
4. `pnpm test` → 198 tests en verde.

### Resultado real de la verificación (2026-08-05)

`refrescarPanelOperativo()` contra la base real devolvió:

- 8 operadores en `cargas`: los 7 activos (`CSR 1` a `CSR 6` y `CSR 8`, todos con `abiertas: 0`, ordenados alfabéticamente por el desempate) aparecen antes que el único inactivo (`CSR 7`, también `abiertas: 0`). Confirma que el comparador activo/inactivo funciona incluso cuando el desempate por carga no discrimina.
- `sinAsignar: 0`.
- `sla`: `respondidas: 7921`, `dentroDelSla: 6981`, `tasa: 0.8813281151369776`, `pendientes: 0`, `medianaDiasHabiles: 2`. `respondidas` coincide con la cifra reportada en la Tarea 2 y es muchísimo mayor que 1000.
- `franjas: 126` con 18 plantas cargadas (`18 × 7 = 126`), confirmando la igualdad `franjas = plantas × 7`.
- `minutos` (minutosVentanaSemana): `16310`.

`pnpm lint` limpio (solo el info preexistente), `pnpm build` compiló y pasó el type-check, `pnpm test` reportó 198 tests en verde en 17 archivos.

## Verificación manual pendiente

Ninguna. La conexión a Supabase estuvo disponible durante toda la verificación y los números de arriba son reales, no estimados.

### Nota sobre `dotenv/config` y `.env.local`

Igual que documentaron las tareas 2 y 3: `import 'dotenv/config'` (el comando literal del Paso 3 del brief) carga `.env`, no `.env.local`, y este repo no tiene `.env`. Para conectar con las credenciales reales usé un script temporal (no versionado) con:

```ts
import { config } from "dotenv";
config({ path: ".env.local" });
import { refrescarPanelOperativo } from "./lib/metricas/acciones";
```

El script se borró después de capturar la salida; no queda en el árbol de trabajo.
