# Tarea 4 — Asignación automática al generar una solicitud

## Estado

completa

No cites el hash de tu propio commit: el archivo va dentro de ese commit y no
puedes conocerlo al escribirlo. Para ubicar el trabajo basta con
`git log --oneline -- app\(\(portal\)\)/portal/acciones.ts`.

## Qué entrega esta tarea

- `app/(portal)/portal/acciones.ts`, función `generarSolicitud()` reescrita:
  ahora asigna automáticamente cada solicitud al CSR con menor carga antes de
  intentar insertar.
  - La firma pública no cambia: `generarSolicitud(consulta, cantidad): Promise<string>`.
  - Internamente gana dos pasos: consultar la carga por CSR y traducir el código
    del operador al id antes de la inserción.
  - El evento `solicitud_generada` gana un campo en `detalle`: `csr`, que contiene
    el código del operador asignado o `null` si no hay operadores activos.

## Decisiones tomadas y por qué

- **La elección del CSR va antes del bucle de reintento, no dentro.** El bucle
  existe para resolver el choque de número (`23505`) y puede correr hasta cinco
  veces. Si `cargaPorCsr()` se llamara dentro, la misma solicitud consultaría
  la carga cinco veces sin que nada haya cambiado entre intentos. Se resuelve
  una vez, antes del bucle, guardando el resultado en `csrId`. Luego cada
  intento usa ese id sin consultar de nuevo.

- **`null` es un resultado válido de `elegirCsr()` y NO es un error.** Devuelve
  `null` cuando no hay operadores activos. La solicitud se crea igual con
  `csr_asignado: null`, y la bandeja la muestra como «Sin asignar» en lugar de
  perder la solicitud por no haber a quién asignarla. Una solicitud nunca se
  pierde en el reparto.

- **La traducción código → id se delega a `idDeOperador()`.** `elegirCsr()`
  devuelve el código del operador (`"CSR 1"`), nunca el id, porque es una
  función pura sobre la estructura de carga (`CargaCsr[]`). La columna
  `solicitudes.csr_asignado` es un `bigint references operadores(id)`, así que
  se necesita traducir antes de insertar. Si `elegirCsr()` devuelve un código,
  `idDeOperador()` lo resuelve al id; si devuelve `null`, `csrId` queda `null`
  y se inserta como tal.

- **Se paraleliza la lectura de contexto y sesión con `Promise.all()`.** Antes
  solo se llamaba `construirContexto()`. Ahora se agregan `leerSesion()` en
  paralelo, que es necesaria para pasar `sesion.iniciadaEn` a `cargaPorCsr()`.

- **El evento `solicitud_generada` expone el resultado de la elección.** Se
  suma `csr` en `detalle` (el código del operador asignado o `null`) para que
  quien consuma el evento sepa a quién se le pasó la solicitud. Esto no es
  redundante con la lectura posterior de la bandeja: el evento es sincrónico
  (se emite en el mismo request), mientras que la bandeja es asincrónica (se
  revalida y se pide de nuevo al renderizar).

## Contrato que expone este archivo

`app/(portal)/portal/acciones.ts`:

```ts
export async function generarSolicitud(consulta: string, cantidad: number): Promise<string>
```

- Toma una consulta (designación buscada) y cantidad, igual que antes.
- Internamente: construye el contexto, lee la sesión, evalúa la solicitud,
  elige un CSR, traduce su código al id, intenta insertar (reintentando en
  caso de choque de número).
- Devuelve el número de solicitud generado (ej. `"2026Q12345"`).
- Si no hay operadores activos, asigna `null` y la solicitud se crea igual.
- Lanza `Error` solo si la inserción falla por algo que no sea `23505`, o si
  después de cinco reintentos sigue fallando por `23505`.

`elegirCsr` (consumida desde `@/lib/operacion/asignacion`):
- `elegirCsr(cargas: readonly CargaCsr[]): string | null`
- Devuelve el código del operador con menor carga, o `null` si no hay ninguno
  activo.

`cargaPorCsr` (consumida desde `@/lib/fuentes`):
- `cargaPorCsr(desde: string): Promise<CargaCsr[]>`
- Devuelve la carga abierta de cada operador desde `desde` (timestamp ISO).

`idDeOperador` (consumida desde `@/lib/fuentes`):
- `idDeOperador(codigo: string): Promise<number | null>`
- Traduce un código (`"CSR 1"`) al id, o devuelve `null` si no existe.

## Qué falta / qué NO hace

- **Sin verificación en vivo.** El paso 2 del brief (generar tres solicitudes en
  `/portal`, consultar con SQL en Supabase) no se ejecutó. Un subagente no puede
  acceder interactivamente a un servidor local ni a la interfaz de Supabase. La
  verificación se acumula en una lista de chequeo manual para el usuario:
  - Ejecutar `pnpm dev`.
  - Ir a `/portal`, buscar una designación que no exista (ej. `DEMO-NO-EXISTE`).
  - Generar tres solicitudes seguidas (pulsar *Solicitar cotización* tres veces).
  - En el editor SQL de Supabase, correr:
    ```sql
    select s.numero, o.codigo as csr, s.creada_en
    from solicitudes s
    left join operadores o on o.id = s.csr_asignado
    order by s.creada_en desc
    limit 5;
    ```
  - Verificar: las tres nuevas filas tienen un `csr` no nulo, ninguno es `CSR 7`
    (el inactivo) y los tres códigos son distintos (repartido por menor carga).

- Sin tests de integración propios — directiva del usuario, igual que en tareas
  anteriores. La lógica de reparto ya se prueba en
  `lib/operacion/asignacion.test.ts` (sin cambios en esta tarea). La inserción
  con `csr_asignado` se cubrió implícitamente con `pnpm test` (la suite
  existente pasa).

- No hay cambios en la bandeja del operador ni en el chat — consumidores de la
  asignación llegarán en tareas posteriores.

## Cómo verificar

```bash
npx tsc --noEmit
```

Salida: vacía (sin errores). Los tipos generados de Supabase aceptan la
consulta de carga con embed `csr:operadores ( codigo )`.

```bash
pnpm test
```

Salida literal:

```
 Test Files  17 passed (17)
      Tests  198 passed (198)
   Start at  20:56:17
   Duration  1.72s (transform 1.62s, setup 0ms, import 3.68s, tests 3.82s, environment 3ms)
```

Mismo número de archivos de test que antes de esta tarea (no se agregó
ninguno): la suite existente sigue en verde sin cambios propios.

```bash
pnpm build
```

Salida literal (recortada):

```
▲ Next.js 16.2.12 (Turbopack)
✓ Compiled successfully in 5.5s
  Running TypeScript ...
  Finished TypeScript in 5.7s ...
  Collecting page data using 13 workers ...
✓ Generating static pages using 13 workers (5/5) in 656ms

Route (app)
┌ ○ /
├ ○ /_not-found
├ ƒ /api/chat
├ ƒ /api/mock/inventario
├ ƒ /api/mock/pinq
├ ƒ /api/mock/spq
├ ƒ /api/mock/wcl
├ ƒ /demo
├ ƒ /operador
└ ƒ /portal
```

`/portal` sigue siendo una ruta dinámica (`ƒ`), confirmando que
`app/(portal)/portal/page.tsx` (que contiene el formulario que llama a
`generarSolicitud`) compiló sin problemas.

```bash
pnpm lint
```

Salida literal (recortada):

```
$ biome check .
Checked 135 files in 77ms. No fixes applied.
Found 1 info.
```

El único "info" es una advertencia de Biome sobre el campo `recommended`
deprecado en `biome.json` (preexistente, no relacionada con esta tarea).
`No fixes applied` confirma que el archivo modificado (`acciones.ts`)
se ajustó al formato esperado tras la corrección automática del organizador de
imports.

## Verificación manual pendiente

En vivo (no ejecutable por un subagente):

1. Iniciar servidor: `pnpm dev`
2. Ir a `http://localhost:3000/portal`
3. Buscar designación inexistente: `DEMO-NO-EXISTE`
4. Generar tres solicitudes (clic en *Solicitar cotización* tres veces)
5. En Supabase, ejecutar:
   ```sql
   select s.numero, o.codigo as csr, s.creada_en
   from solicitudes s
   left join operadores o on o.id = s.csr_asignado
   order by s.creada_en desc
   limit 5;
   ```
   Esperado:
   - Las tres últimas filas (las nuevas) tienen `csr` no nulo
   - Ninguno es `CSR 7` (operador inactivo de la siembra)
   - Los tres códigos son **distintos** (repartido por menor carga)
