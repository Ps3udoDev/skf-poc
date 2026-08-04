# Tarea 1 — Generador determinista y cargador masivo

## Estado
completa · commits c252f6f..<se completa tras el commit de esta ronda> (incluye la ronda de arreglo 1: `escapar()` con soporte jsonb, guarda de números no finitos, guardas de listas vacías en `elegir`/`elegirPonderado`)

## Qué entrega esta tarea
Dos cimientos que consumirán las nueve tareas siguientes del Plan 2: un PRNG determinista (`mulberry32`) en `scripts/seed/aleatorio.ts` para generar todo el catálogo sintético de forma reproducible, y un cargador masivo por `COPY` en `scripts/seed/cargador.ts` para insertar filas en la base de Supabase cloud a velocidad de miles de filas por segundo.

## Decisiones tomadas y por qué
- **`mulberry32` en vez de `Math.random()`:** es el único requisito no negociable del plan — reconstruir la base antes de una presentación debe dar bytes idénticos. `Math.random()` y `Date.now()` están prohibidos en todo el código de siembra.
- **Conexión por el pooler de sesión (`SUPABASE_DB_URL`, puerto 5432), no por la ruta directa:** no hay Docker; la base es Supabase cloud y `db.<ref>.supabase.co` es IPv6, no resuelve desde redes domésticas. `ssl: { rejectUnauthorized: false }` es necesario porque el certificado del pooler no es validable con la CA por defecto de Node.
- **`pg-copy-streams` importado con `await import(...)` dentro de `cargar()`, no como import estático:** evita cargarlo si `cargar()` nunca se invoca (p. ej. en tests que solo prueban `aleatorio.ts`), y es el patrón que ya usa el resto del repo para dependencias pesadas opcionales.
- **`escapar()` exportado (no solo interno):** convierte cada valor al formato de texto de `COPY` — tabulador, salto de línea, retorno de carro y backslash escapados; `null`/`undefined` → `\N`; `boolean` → `t`/`f`; `Date` → ISO 8601; objetos y arrays → `JSON.stringify(valor)` (ver más abajo). Se exportó para poder testear su comportamiento directamente sin tocar la red. Es la pieza que hace seguro pasar texto libre (p. ej. descripciones con saltos de línea) sin corromper el stream de `COPY`.
- **Ronda de arreglo 1 — `escapar()` no tenía rama para objetos/arrays:** caían en `String(valor)`, y `String([5])` da `"5"` — Postgres lo aceptaba sin error como el escalar `5` en una columna `jsonb`. Corrupción silenciosa, el peor modo de fallo: nadie se entera hasta que un dato equivocado aparece en la presentación. Se agregó una rama `typeof valor === "object"` (después de `null`/`undefined` y de `Date`, para no romper esos casos) que hace `JSON.stringify(valor)` y pasa el resultado por el mismo escapado de texto que el resto. Se eligió serializar, no lanzar, para que el resultado sea correcto tanto si quien llama a `cargar()` ya serializó el valor a mano (le pasa un string) como si le pasa el objeto/array crudo. Verificado con tests unitarios y, además, contra la base real: un array `[5]` insertado en una columna `jsonb` llega como array (`jsonb_typeof` = `"array"`), no como escalar.
- **Ronda de arreglo 1 — números no finitos:** `String(NaN)` es `"NaN"`, que Postgres acepta en una columna `numeric`. Un error de cálculo futuro (división por cero, etc.) se habría insertado como `NaN` en vez de fallar. `escapar()` ahora lanza `Error` si recibe un `number` para el que `Number.isFinite` es falso, nombrando el valor recibido en el mensaje.
- **Ronda de arreglo 1 — `elegir`/`elegirPonderado` con lista vacía:** antes devolvían `undefined` en silencio (`lista[entero(0, -1)]` es `undefined`), que se propaga lejos de la causa real. Ahora ambos lanzan `Error` nombrando la función que recibió la lista vacía.
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
- `elegir` y `elegirPonderado` no mutan la lista/opciones de entrada. **Lanzan `Error`** (nombrando la función en el mensaje) si reciben una lista/lista de opciones vacía — no devuelven `undefined` en silencio.
- `barajar` devuelve una **copia** barajada (Fisher-Yates); no muta `lista`. Acepta lista vacía sin lanzar (devuelve `[]`).
- `probabilidad(p)`: `p=1` siempre `true`, `p=0` siempre `false`.
- Cada llamada a cualquier método avanza el estado interno del generador. El orden de las llamadas determina la secuencia — si una tarea futura cambia el orden en que invoca a `a.entero(...)` / `a.elegir(...)` etc. respecto a una ejecución anterior, la salida determinista cambia aunque la semilla sea la misma. Mantener el orden de generación estable entre ejecuciones es responsabilidad de quien escribe cada generador de entidad.
- La semilla del catálogo completo debe salir de `DEMO_SEED` en `.env.local` (no hardcodear semillas salvo en tests).

`scripts/seed/cargador.ts`:

```ts
export function conectar(): Client; // Client de "pg"

export function escapar(valor: unknown): string; // formato de texto de COPY

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
- **`cargar()` acepta objetos y arrays de JS directamente para columnas `jsonb`** (`homologos.diferencias`, `eventos_demo.detalle`, `sesion_demo.plantas_override`) — `escapar()` los serializa con `JSON.stringify` internamente. Quien llama **no** necesita serializar a mano; si ya lo hizo y pasa un string, ese string se trata como texto normal (se escapa pero no se re-serializa), así que también funciona.
- **`escapar()` lanza `Error`** si recibe un `number` no finito (`NaN`, `Infinity`, `-Infinity`), nombrando el valor en el mensaje — evita que un error de cálculo aguas arriba se cuele como dato válido en una columna `numeric`.
- `escapar()` está exportado principalmente para testearlo de forma aislada; `cargar()` sigue siendo el punto de entrada normal para insertar filas.

## Qué falta / qué NO hace
- No hay generadores de entidades del dominio (rodamientos, clientes, cotizaciones, etc.) — eso es trabajo de las tareas 2 en adelante.
- No hay orquestador de siembra (`scripts/seed/index.ts`) ni script de verificación post-siembra (`scripts/seed/verificar.ts`), aunque `package.json` ya tiene los comandos `seed` y `seed:verificar` apuntando a esos archivos (no existen todavía; tareas futuras los crean).
- `cargar()` no hace `TRUNCATE` ni limpia la tabla antes de insertar — eso es responsabilidad de quien orqueste la siembra completa (probablemente la tarea que integra todo).
- `cargar()` no maneja reintentos ni transacciones explícitas entre lotes; un fallo a mitad de una tabla grande deja filas parciales insertadas. **Confirmado empíricamente en la revisión de la ronda de arreglo 1:** forzando un error en el segundo de dos lotes, las filas del primer lote quedan committeadas en la base — no hay rollback automático de lotes previos. Es comportamiento heredado del diseño del brief (cada lote es un `COPY` independiente), no un defecto introducido en esta tarea, pero quien escriba el orquestador de siembra tiene que saberlo: si necesita atomicidad entre tablas o entre lotes, tiene que envolver las llamadas a `cargar()` en su propia transacción o hacer `TRUNCATE`+reintento completo ante cualquier fallo.
- No se agregó ningún test de integración (`*.integracion.test.ts`) para `cargador.ts`. La verificación contra la base real se hizo manualmente (Paso 7 del brief) con un script temporal, no queda cobertura automatizada de red para este archivo. Si una tarea futura quiere esa cobertura, tendría que añadirla explícitamente.
- El PRNG es de 32 bits (`mulberry32`), no criptográfico — explícitamente fuera de alcance para cualquier uso que no sea generar este catálogo de demostración.

## Cómo verificar

```bash
pnpm test
```
Esperado: toda la suite hermética pasa (incluye `aleatorio.test.ts` y `cargador.test.ts`, este último cubre `escapar()`: JSON para objetos/arrays, error en números no finitos, y los casos ya existentes de `null`/`Date`/`boolean`/texto con caracteres especiales).

```bash
pnpm lint
```
Esperado: sin errores (Biome puede reordenar imports/formato; no es desviación).

```bash
pnpm exec tsc --noEmit
```
Esperado: sin errores.

Para volver a probar el cargador contra la base real (no forma parte de `pnpm test`): escribir un script temporal fuera del repo o en `.superpowers/sdd/.../` (gitignored) que importe `conectar` y `cargar` de `scripts/seed/cargador.ts`, cree una tabla de prueba, inserte filas con valores límite (tabulador, `null`, y — desde la ronda de arreglo 1 — un array/objeto para una columna `jsonb`), las lea de vuelta y compare, y finalmente elimine la tabla. Así se verificó en esta tarea:
- Paso 7 original: `cargar()` devolvió `3` para 3 filas insertadas y los valores leídos coincidieron exactamente, incluidos el texto con tabulador y el valor nulo.
- Ronda de arreglo 1: una columna `jsonb` recibió un array `[5]` vía `cargar()`; `jsonb_typeof(datos)` en la base confirmó `"array"` (no `"number"` ni ningún otro escalar), y un objeto anidado (`{a, b, anidado: [1,2,3]}`) llegó intacto.
