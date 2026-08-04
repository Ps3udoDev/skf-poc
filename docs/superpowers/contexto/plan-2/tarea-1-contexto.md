# Tarea 1 — Generador determinista y cargador masivo

## Estado
completa · commits <se completa tras el commit>

## Qué entrega esta tarea
Dos cimientos que consumirán las nueve tareas siguientes del Plan 2: un PRNG determinista (`mulberry32`) en `scripts/seed/aleatorio.ts` para generar todo el catálogo sintético de forma reproducible, y un cargador masivo por `COPY` en `scripts/seed/cargador.ts` para insertar filas en la base de Supabase cloud a velocidad de miles de filas por segundo.

## Decisiones tomadas y por qué
- **`mulberry32` en vez de `Math.random()`:** es el único requisito no negociable del plan — reconstruir la base antes de una presentación debe dar bytes idénticos. `Math.random()` y `Date.now()` están prohibidos en todo el código de siembra.
- **Conexión por el pooler de sesión (`SUPABASE_DB_URL`, puerto 5432), no por la ruta directa:** no hay Docker; la base es Supabase cloud y `db.<ref>.supabase.co` es IPv6, no resuelve desde redes domésticas. `ssl: { rejectUnauthorized: false }` es necesario porque el certificado del pooler no es validable con la CA por defecto de Node.
- **`pg-copy-streams` importado con `await import(...)` dentro de `cargar()`, no como import estático:** evita cargarlo si `cargar()` nunca se invoca (p. ej. en tests que solo prueban `aleatorio.ts`), y es el patrón que ya usa el resto del repo para dependencias pesadas opcionales.
- **`escapar()` interno (no exportado):** convierte cada valor al formato de texto de `COPY` — tabulador, salto de línea, retorno de carro y backslash escapados; `null`/`undefined` → `\N`; `boolean` → `t`/`f`; `Date` → ISO 8601. Es la pieza que hace seguro pasar texto libre (p. ej. descripciones con saltos de línea) sin corromper el stream de `COPY`.
- **`cargar()` por lotes (`tamanoLote = 5000` por defecto):** un solo `COPY` de decenas de miles de filas en memoria es viable aquí, pero lotear deja margen para trabajar con generadores/arrays más grandes en tareas futuras sin cambiar la firma.
- **El test de `elegirPonderado` es probabilístico (10 000 muestras, tolerancia 77–83% sobre 80% esperado):** con la semilla fija del test es determinista en la práctica, pero el margen existe porque el muestreo es estadístico, no una igualdad exacta.
- **Verificación contra la base real (Paso 7) se hizo con un script temporal fuera de la suite**, en `.superpowers/sdd/2026-08-04-plan-2-datos-sinteticos/` (carpeta en `.gitignore`), y se borró tras confirmar el resultado. No quedó como archivo del repo ni como test — los tests de red van en `*.integracion.test.ts` y esta tarea no crea ninguno porque el brief no lo pidió.

## Contrato que exponen estos archivos

`scripts/seed/aleatorio.ts`:

```ts
export interface Aleatorio {
  entero(min: number, max: number): number;
  decimal(min: number, max: number, decimales: number): number;
  elegir<T>(lista: readonly T[]): T;
  elegirPonderado<T>(opciones: readonly (readonly [T, number])[]): T;
  probabilidad(p: number): boolean;
  barajar<T>(lista: readonly T[]): T[];
}

export function crearAleatorio(semilla: number): Aleatorio;
```

Notas de uso para quien consuma esto:
- `entero(min, max)` es inclusivo en ambos extremos.
- `decimal(min, max, decimales)` redondea con `toFixed`, no trunca.
- `elegir` y `elegirPonderado` no mutan la lista/opciones de entrada.
- `barajar` devuelve una **copia** barajada (Fisher-Yates); no muta `lista`.
- `probabilidad(p)`: `p=1` siempre `true`, `p=0` siempre `false`.
- Cada llamada a cualquier método avanza el estado interno del generador. El orden de las llamadas determina la secuencia — si una tarea futura cambia el orden en que invoca a `a.entero(...)` / `a.elegir(...)` etc. respecto a una ejecución anterior, la salida determinista cambia aunque la semilla sea la misma. Mantener el orden de generación estable entre ejecuciones es responsabilidad de quien escribe cada generador de entidad.
- La semilla del catálogo completo debe salir de `DEMO_SEED` en `.env.local` (no hardcodear semillas salvo en tests).

`scripts/seed/cargador.ts`:

```ts
export function conectar(): Client; // Client de "pg"

export async function cargar(
  cliente: Client,
  tabla: string,
  columnas: readonly string[],
  filas: readonly unknown[][],
  tamanoLote?: number, // por defecto 5000
): Promise<number>; // filas insertadas
```

Notas de uso:
- `conectar()` lee `SUPABASE_DB_URL` de `.env.local` (ya cargado internamente vía `dotenv`; no hace falta llamar `config()` de nuevo). Lanza si la variable falta. **No** llama a `.connect()` — quien consume esto debe hacerlo (`await cliente.connect()`) y cerrarlo (`await cliente.end()`).
- `cargar()` no crea la tabla ni valida el esquema: la tabla y sus columnas deben existir de antemano (las 12 tablas del POC ya están migradas).
- `filas[i].length` debe coincidir con `columnas.length`; no hay validación explícita — un desajuste produce un error de Postgres al hacer `COPY`, no un error de TypeScript.
- El orden de `columnas` determina el orden esperado de cada `filas[i][j]`.
- Devuelve el conteo total de filas insertadas (suma de todos los lotes), o `0` si `filas` está vacío (no abre conexión de `COPY` en ese caso).
- Los valores `null`/`undefined` se insertan como `NULL` real en la base (no como el string `"null"`).

## Qué falta / qué NO hace
- No hay generadores de entidades del dominio (rodamientos, clientes, cotizaciones, etc.) — eso es trabajo de las tareas 2 en adelante.
- No hay orquestador de siembra (`scripts/seed/index.ts`) ni script de verificación post-siembra (`scripts/seed/verificar.ts`), aunque `package.json` ya tiene los comandos `seed` y `seed:verificar` apuntando a esos archivos (no existen todavía; tareas futuras los crean).
- `cargar()` no hace `TRUNCATE` ni limpia la tabla antes de insertar — eso es responsabilidad de quien orqueste la siembra completa (probablemente la tarea que integra todo).
- `cargar()` no maneja reintentos ni transacciones explícitas entre lotes; un fallo a mitad de una tabla grande deja filas parciales insertadas.
- No se agregó ningún test de integración (`*.integracion.test.ts`) para `cargador.ts`. La verificación contra la base real se hizo manualmente (Paso 7 del brief) con un script temporal, no queda cobertura automatizada de red para este archivo. Si una tarea futura quiere esa cobertura, tendría que añadirla explícitamente.
- El PRNG es de 32 bits (`mulberry32`), no criptográfico — explícitamente fuera de alcance para cualquier uso que no sea generar este catálogo de demostración.

## Cómo verificar

```bash
pnpm test aleatorio
```
Esperado: `Test Files 1 passed (1)` · `Tests 8 passed (8)`.

```bash
pnpm lint
```
Esperado: sin errores (Biome puede reordenar imports/formato; no es desviación).

Para volver a probar el cargador contra la base real (no forma parte de `pnpm test`): escribir un script temporal fuera del repo o en `.superpowers/sdd/.../` (gitignored) que importe `conectar` y `cargar` de `scripts/seed/cargador.ts`, cree una tabla de prueba, inserte filas con valores límite (tabulador, `null`), las lea de vuelta y compare, y finalmente elimine la tabla. Así se verificó en esta tarea: `cargar()` devolvió `3` para 3 filas insertadas y los valores leídos coincidieron exactamente, incluidos el texto con tabulador y el valor nulo.
