# Tarea 3 — Bandeja filtrada en la fuente de solicitudes

## Estado

completa

No cites el hash de tu propio commit: el archivo va dentro de ese commit y no
puedes conocerlo al escribirlo. Para ubicar el trabajo basta con
`git log --oneline -- lib/fuentes/solicitudes.ts`.

## Qué entrega esta tarea

- `lib/fuentes/solicitudes.ts` reescrito por completo: capa de lectura de
  solicitudes desde Supabase, ahora con filtros para la bandeja del operador.
  - `SolicitudResumen` gana cuatro campos: `csrAsignado: string | null`,
    `atendidaEn: string | null`, `resultado: "cotizada" | "declinada" | null`,
    `motivoDeclinado: MotivoDeclinado | null`. Ningún campo existente se quitó.
  - `type EstadoSolicitud = "abierta" | "atendida"`.
  - `interface FiltroBandeja { desde: string; estado?: EstadoSolicitud;
    clasificacion?: RutaQMS; csr?: string | null }`.
  - `solicitudesFiltradas(filtro: FiltroBandeja): Promise<SolicitudResumen[]>`
    — nueva función central de la capa.
  - `filaDeSolicitud(numero: string): Promise<SolicitudResumen | null>` —
    nueva, una sola solicitud por número.
  - `solicitudesDesde(iniciadaEn: string): Promise<SolicitudResumen[]>` —
    conserva su firma pública; ahora delega en `solicitudesFiltradas({ desde:
    iniciadaEn })`.

## Decisiones tomadas y por qué

- **`csr: null` vs. `csr: undefined` en `FiltroBandeja`.** Son dos
  significados distintos y no intercambiables: `null` filtra "solo las
  solicitudes sin asignar" (el filtro que el CSR usa para repartirse el
  trabajo cuando entra a la bandeja), mientras que `undefined` significa "no
  filtres por CSR en absoluto" (mostrar todo, asignado o no). El código
  distingue los tres casos explícitamente:
  ```ts
  if (filtro.csr === null) {
    consulta = consulta.is("csr_asignado", null);
  } else if (filtro.csr !== undefined) {
    // filtro.csr es un código de operador concreto
  }
  ```
  Comparar con `if (filtro.csr)` habría colapsado `null` y `undefined` en la
  misma rama (ambos son falsy), haciendo desaparecer el filtro de "Sin
  asignar" — justo el que hace útil la bandeja para repartir trabajo.

- **`solicitudesDesde` delega en `solicitudesFiltradas` en vez de mantener su
  propia consulta.** Antes de esta tarea, `solicitudesDesde` era la única
  función de la capa y tenía su propio `select`/`gte`/`order`. Ahora que
  `solicitudesFiltradas` implementa esa misma consulta como caso general (sin
  más filtro que `desde`), mantener una segunda consulta en
  `solicitudesDesde` sería duplicar las columnas (`COLUMNAS`), el mapeo
  (`aResumen`) y el manejo de error (`lanzarSiError`) en dos sitios que
  tendrían que evolucionar juntos. Delegar (`solicitudesFiltradas({ desde:
  iniciadaEn })`) hace que `solicitudesDesde` sea, literalmente, "todas las
  solicitudes de la sesión sin más filtro" — su firma pública no cambia, y
  `/operador` (que hoy la consume) sigue funcionando sin tocarse.

- **El embed `csr:operadores ( codigo )` se aplana dentro de este archivo.**
  `solicitudes.csr_asignado` es un `bigint references operadores(id)`, pero el
  contrato de la capa (igual que en la Tarea 2) expone el **código** del
  operador, nunca el id. PostgREST resuelve la relación muchos-a-uno como
  columna `csr` con forma `{ codigo: string } | null` — un objeto o `null`,
  nunca un arreglo, porque `csr_asignado` referencia como mucho una fila de
  `operadores`. `aResumen()` aplana ese objeto a `csrAsignado: fila.csr?.codigo
  ?? null`; nadie fuera de `solicitudes.ts` vuelve a ver la forma anidada.

- **Filtrar por un código de CSR inexistente devuelve `[]`, no lanza ni
  ignora el filtro.** `solicitudesFiltradas` resuelve `filtro.csr` (un
  código) a un id con `idDeOperador()` (Tarea 2). Si ese código no existe,
  `idDeOperador` devuelve `null` (no lanza) y `solicitudesFiltradas` corta ahí
  con `return []` antes de tocar la consulta principal. La alternativa —
  dejar que `.eq("csr_asignado", null)` corriera igual— habría producido el
  mismo resultado (`csr_asignado` nunca es `null` cuando `id` no existe salvo
  coincidencia accidental) pero de forma menos explícita; cortar temprano deja
  la intención clara: "un CSR que no existe no tiene solicitudes", no "todas
  las solicitudes".

- **Reutiliza el patrón de `lib/fuentes/plantas.ts`.** Constante `COLUMNAS`
  con el `select` en snake_case, `interface Fila*` con las columnas crudas,
  una función mapeadora (`aResumen`) que traduce a camelCase y aplana el
  embed, y `as unknown as Fila*` en el resultado de Supabase — porque el tipo
  generado de la relación embebida (`csr: { codigo: string }[] | { codigo:
  string } | null` según cómo Supabase infiera la cardinalidad) no siempre
  coincide 1:1 con la forma real que devuelve PostgREST para una FK
  muchos-a-uno, y forzar el tipo aquí evita que ese detalle de los tipos
  generados se filtre a quien consume `SolicitudResumen`.

- **Directiva vigente al ejecutar esta tarea: no se escriben tests de
  integración.** Se omitió el paso 2 del brief completo: no se creó
  `lib/fuentes/solicitudes.integracion.test.ts`, y del paso 3 no se corrió
  `pnpm test:integracion`. El brief traía cinco casos listos para Vitest
  (código de CSR expuesto nunca como id, filtro `abierta` sin atendidas,
  filtro `atendida` con resultado, `csr: null` solo no asignadas, CSR
  inexistente da `[]`) por si la directiva cambia. La verificación se hizo
  sobre la suite existente (`pnpm test`), `npx tsc --noEmit`, `pnpm build` y
  `pnpm lint`.

## Contrato que exponen estos archivos

`lib/fuentes/solicitudes.ts`:

```ts
export interface SolicitudResumen {
  numero: string;
  designacionTexto: string;
  cantidad: number;
  clasificacionQms: string | null;
  puntoQms: string | null;
  creadaEn: string;
  csrAsignado: string | null;
  atendidaEn: string | null;
  resultado: "cotizada" | "declinada" | null;
  motivoDeclinado: MotivoDeclinado | null;
}

export type EstadoSolicitud = "abierta" | "atendida";

export interface FiltroBandeja {
  desde: string;
  estado?: EstadoSolicitud;
  clasificacion?: RutaQMS;
  csr?: string | null;
}

export async function solicitudesDesde(iniciadaEn: string): Promise<SolicitudResumen[]>
export async function solicitudesFiltradas(filtro: FiltroBandeja): Promise<SolicitudResumen[]>
export async function filaDeSolicitud(numero: string): Promise<SolicitudResumen | null>
```

`solicitudesFiltradas(filtro: FiltroBandeja)`:
- `desde`: timestamp ISO, obligatorio. En producción siempre
  `sesion.iniciadaEn`: la bandeja nunca sale de la sesión activa.
- `estado`: `"abierta"` filtra `atendida_en IS NULL`; `"atendida"` filtra
  `atendida_en IS NOT NULL`; omitido no filtra por estado.
- `clasificacion`: filtra por `clasificacion_qms`; omitido no filtra.
- `csr`: `undefined` no filtra por CSR; `null` filtra solo las no asignadas
  (`csr_asignado IS NULL`); un código (`"CSR 1"`) filtra por ese operador, o
  devuelve `[]` si el código no existe.
- Orden: `creada_en` descendente (más recientes primero).
- Lanza si fallo de infraestructura (red, base suspendida).

`filaDeSolicitud(numero: string)`:
- Devuelve la solicitud con ese número, o `null` si no existe.
- Lanza si fallo de infraestructura.

`solicitudesDesde(iniciadaEn: string)`:
- Sin cambios de firma respecto a la Tarea anterior a esta. Azúcar sobre
  `solicitudesFiltradas({ desde: iniciadaEn })`: todas las solicitudes de la
  sesión, sin más filtro.

## Qué falta / qué NO hace

- Sin tests de integración propios — directiva del usuario, igual que en la
  Tarea 2. Los cinco casos del brief están listos para Vitest si la directiva
  cambia.
- **Consumidores de `solicitudesFiltradas` y `filaDeSolicitud` llegan en
  tareas posteriores** (la bandeja del operador con controles de filtro, el
  chat del operador). Esta tarea solo amplía la fuente; no toca
  `app/(operador)/operador/page.tsx` ni `components/operador/lista-solicitudes.tsx`.
- No hay paginación — mismo supuesto que el resto de la capa: sesión típica
  con pocas decenas de solicitudes.
- No hay cachés: cada llamada golpea Supabase.

## Cómo verificar

```bash
npx tsc --noEmit
```

Salida: vacía (sin errores). El `select` con el embed
`csr:operadores ( codigo )` y el `as unknown as FilaSolicitud[]` que lo
acompaña compilan tal como están escritos en el brief; los tipos generados de
Supabase no rechazan la consulta.

```bash
pnpm test
```

Salida literal:

```
 Test Files  17 passed (17)
      Tests  198 passed (198)
```

Mismo número de archivos de test que antes de esta tarea (no se agregó
ninguno): la suite existente sigue en verde sin cambios propios.

```bash
pnpm build
```

Salida literal (recortada):

```
▲ Next.js 16.2.12 (Turbopack)
✓ Compiled successfully in 8.1s
  Running TypeScript ...
  Finished TypeScript in 6.0s ...
✓ Generating static pages using 13 workers (5/5) in 597ms
```

`/operador` sigue apareciendo en la tabla de rutas del build
(`ƒ /operador`), confirmando que `app/(operador)/operador/page.tsx` — que
consume `solicitudesDesde` — sigue compilando sin haberse tocado.

```bash
pnpm lint
```

Salida literal:

```
Checked 135 files in 64ms. No fixes applied.
Found 1 info.
```

El único "info" es una advertencia de Biome sobre el campo `recommended`
deprecado en `biome.json` (preexistente, no relacionada con esta tarea).
`No fixes applied` confirma que el archivo reescrito ya seguía el
formato/estilo esperado.
