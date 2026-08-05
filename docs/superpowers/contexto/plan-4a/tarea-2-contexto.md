# Tarea 2 — Fuente de operadores

## Estado

completa

No cites el hash de tu propio commit: el archivo va dentro de ese commit y no
puedes conocerlo al escribirlo. Para ubicar el trabajo basta con
`git log --oneline -- lib/fuentes/operadores.ts`.

## Qué entrega esta tarea

- `lib/fuentes/operadores.ts`: capa de lectura de operadores desde Supabase.
  - `cargaPorCsr(desde: string): Promise<CargaCsr[]>` — devuelve solicitudes
    abiertas por operador desde un punto en el tiempo (timestamp ISO).
  - `idDeOperador(codigo: string): Promise<number | null>` — traduce código
    de operador (ej. "CSR 1") a id de base de datos.
  - Re-exporta tipo `CargaCsr` desde `lib/operacion/asignacion`.

## Decisiones tomadas y por qué

- **Dos funciones en vez de una.** `solicitudes.csr_asignado` es un `bigint`
  que referencia `operadores(id)`, pero el contrato del sistema (§6.1) expone
  el **código** (ej. "CSR 1"), nunca el id interno. El id es detalle de
  esquema. Toda lectura traduce id → código con un `join` en SQL; toda
  escritura necesita el camino inverso (código → id). `idDeOperador()` es ese
  camino inverso: sin ella, cualquier escritura que asigne por código tendría
  que reimplementar la traducción. Mantener traducción centralizada en esta
  capa reduce duplicación.

- **`cargaPorCsr()` no omite operadores sin solicitudes.** Un operador que
  tenga carga = 0 debe aparecer en el resultado, porque es justamente el
  candidato para recibir la siguiente solicitud. Si se omitiera, `elegirCsr()`
  nunca lo vería y el reparto se concentraría en quién ya tiene trabajo. Esta
  decisión es del dominio de negocio (la regla de balanceo de carga), no de la
  base de datos.

- **Conteo en memoria, no en SQL.** Son 8 operadores y típicamente decenas de
  solicitudes por sesión. Un `group by` con `count()` en SQL añadiría una
  vista o una RPC nueva. Con los números reales, iterar en memoria es más
  legible y no tiene costo: `abiertasPorId` es un Map de 8 entradas como
  máximo.

- **Patrón de fuentes:** siguiendo `lib/fuentes/plantas.ts` e
  `lib/fuentes/inventario.ts`:
  - `clienteLectura()` para la conexión.
  - `lanzarSiError(error, "descripción")` para diferenciar "sin datos" de
    "fallo de infraestructura".
  - Comentarios en español documentan el "por qué" del código.

- **Directiva vigente al ejecutar esta tarea: no se escriben tests de
  integración.** Se omitieron los pasos 3 (test de integración) y 4 (ejecutar
  `pnpm test:integracion`). El brief incluía tests listos para Vitest; no se
  creó `lib/fuentes/operadores.integracion.test.ts`. La verificación se hizo
  sobre la suite existente (`pnpm test`) y `pnpm lint`.

## Contrato que exponen estos archivos

`lib/fuentes/operadores.ts`:

```ts
export type { CargaCsr };  // re-exportado desde lib/operacion/asignacion

export async function cargaPorCsr(desde: string): Promise<CargaCsr[]>
export async function idDeOperador(codigo: string): Promise<number | null>
```

`cargaPorCsr(desde: string)`:
- `desde`: timestamp ISO (`new Date().toISOString()`).
- Devuelve: array de todos los operadores (activos e inactivos) con su carga
  abierta desde ese punto en el tiempo.
- Formato: `{ codigo: string, abiertas: number, activo: boolean }`.
- Si un operador no tiene solicitudes, aparece con `abiertas: 0`.
- Ordenado por código (lexicográfico, A-Z).
- Lanza si fallo de infraestructura (red, base suspendida).
- Devuelve `[]` (no lanza) si no hay operadores (error de datos, pero
  controlable).

`idDeOperador(codigo: string)`:
- `codigo`: ej. "CSR 1", "CSR 2".
- Devuelve: id del operador, o `null` si el código no existe.
- Quien llama decide si `null` es un error (validación de entrada) o un
  resultado vacío (filtro de bandeja).
- Lanza si fallo de infraestructura.

## Qué falta / qué NO hace

- Sin tests de integración propios — directiva del usuario. Los 4 casos del
  brief están listos para Vitest si la directiva cambia.
- **Consumidor llega en tareas posteriores (Tarea 3, 4B, etc.):**
  - Tarea 3 llamará `cargaPorCsr()` para construir la bandeja.
  - Tarea 4B (asignación) llamará `idDeOperador()` para convertir código a id
    antes de escribir en `solicitudes.csr_asignado`.
- No hay paginación — se asume que una sesión típica tiene < 100 solicitudes
  y 8 operadores. Si algún día crece (ej. multi-tenant), esta capa se
  parametriza para `limit` y `offset`.
- No hay cachés: cada llamada golpea Supabase. La cache vendría a nivel de
  sesión o de contexto React si es necesario.

## Cómo verificar

```bash
pnpm test
```

Test Files 16 passed (16) · Tests 187 passed (187). Mismo número que antes de
esta tarea.

```bash
pnpm lint
```

`Checked 18 files ... No fixes applied.` — archivo nuevo más las exportaciones
en índice, sin errores.

```bash
npx tsc --noEmit
```

Sin errores de tipo. Los tipos generados de Supabase aceptan las consultas
(`select("id, codigo, activo")`, `gte()`, `is()`, `maybeSingle()`, etc.).
