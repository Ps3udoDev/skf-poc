# Tarea 3 — `lib/fuentes`: la única capa que consulta tablas

## Estado
completa

No cites el hash de tu propio commit: el archivo va dentro de ese commit y no
puedes conocerlo al escribirlo. Para ubicar el trabajo basta con
`git log --oneline -- lib/fuentes lib/supabase/lectura.ts`.

## Qué entrega esta tarea

- `lib/supabase/lectura.ts`: `clienteLectura()`, un cliente Supabase con la
  clave anónima, sin cookies, memoizado a nivel de módulo. Sirve tanto en
  rutas y componentes de servidor como en scripts sueltos, a diferencia de
  `clienteServidor()` que depende de `cookies()` y solo existe dentro del
  ciclo de una petición.
- `lib/fuentes/`: ocho archivos (`designaciones.ts`, `inventario.ts`,
  `plantas.ts`, `homologos.ts`, `cotizaciones.ts`, `contexto.ts`,
  `errores.ts`, `index.ts`) que son el único punto de acceso a las tablas
  del catálogo. Ningún componente de la aplicación debe hacer `.from(...)`
  por su cuenta: todo pasa por aquí, para que sustituir estas funciones por
  la API real de WCL/SPQ+/PinQ en la Fase 3 sea cambiar una implementación
  y no reescribir la aplicación.
- `construirContexto`, que resuelve `ContextoSolicitud.reemplazo` antes de
  entregárselo a `evaluarSolicitud` — el invariante que esta tarea existe
  para cumplir (ver abajo).
- `lanzarSiError` (`lib/fuentes/errores.ts`), añadido en una revisión
  posterior de esta misma tarea: las doce consultas de la capa lanzan
  ahora si Supabase devuelve `error`, en vez de dejar que un fallo de
  infraestructura se disfrace de "no hay datos" — ver la sección de
  "Revisión" más abajo.

## Decisiones tomadas y por qué

- **Directiva vigente al ejecutar esta tarea: no se escriben archivos de
  test.** Se omitieron los pasos 2, 3, 5 (test unitario de `aDesignacion`,
  verlo fallar, verlo pasar) y el paso 8 (`fuentes.integracion.test.ts`)
  del brief. No existe `lib/fuentes/designaciones.test.ts` ni
  `lib/fuentes/fuentes.integracion.test.ts` en este commit. En su lugar se
  verificó con un script temporal desechable
  (`scripts/comprobar-fuentes.ts`, ejecutado con `tsx`, borrado antes de
  commitear) que ejercitó las trece funciones contra la base cloud
  sembrada por el Plan 2, incluido el invariante crítico del punto 5. Ver
  "Cómo verificar" para la salida completa. Esto deja la capa **sin
  cobertura automatizada propia**: riesgo aceptado explícitamente por la
  directiva, no descubierto ni reintroducido aquí. Cualquier regresión
  futura en el mapeo snake_case → camelCase o en la resolución del
  contexto no la va a atrapar `pnpm test`.

- **Un solo cast se desvía del código literal del brief.**
  `lib/fuentes/homologos.ts`, línea con `.map((h) => ...)`: el brief
  castea el resultado de la consulta directo a `Homologo[]`
  (`(data ?? []) as Homologo[]`), pero eso no compila —
  `Database["public"]["Tables"]["homologos"]["Row"]["diferencias"]` es
  `Json`, no `DiferenciaTecnica[]`, y TypeScript rechaza el cast directo
  entre tipos que "no se solapan lo suficiente" (TS2352). Se usó
  `as unknown as Homologo[]`, el mismo patrón de doble cast que el propio
  brief ya usa en `designaciones.ts` y `plantas.ts` para el mismo problema
  (PostgREST no tipa el resultado de un `.select()` con columnas
  explícitas tan finamente como el dominio). Ningún otro archivo se apartó
  del código del brief.

- **`obtenerPlanta` es un alias literal de `plantaCompleta`.** El brief lo
  escribe así (`return plantaCompleta(pdiv)`) en vez de seleccionar menos
  columnas: una sola consulta hace las dos cosas y `Planta` es un subtipo
  estructural de `PlantaCompleta`, así que no hace falta una segunda
  consulta más angosta. Se dejó tal cual — no es un caso para "optimizar"
  sin que el brief lo pida.

- **`existenciasDe` no filtra `cantidad > 0` ni agrega almacenes
  ausentes.** Un producto sin existencias en `SL` simplemente no aparece
  en el arreglo — el motor de reglas (`stockTotal`, `lib/reglas-qms`) ya
  suma sobre lo que reciba, así que un almacén ausente equivale a
  cantidad cero para el árbol de decisión. Confirmado con el caso curado
  `DEMO-6205-2RSH/C3`, que solo tiene filas `PS` y `SL` (ver salida del
  script, punto 8).

## Revisión: los errores de Supabase ahora lanzan

**Hallazgo de la revisión de código (Importante):** las doce consultas de
esta capa desestructuraban `{ data }` y descartaban `error`. Consecuencia
concreta: `obtenerDesignacion` devolvía `null` tanto si la designación no
existía como si la conexión fallaba. Ese `null` se propagaba a
`construirContexto`, que armaba `{ designacion: null, ... }`, y
`evaluarSolicitud` devolvía `declinar_designacion_invalida` (punto 4.8) —
es decir, un fallo de red se habría presentado al cliente, en vivo, como
"su designación no existe, se declina la solicitud". El código venía
literal del brief (pasos 4, 6 y 7); el defecto estaba en el plan, no en la
ejecución original.

**Arreglo:** `lib/fuentes/errores.ts` añade
`lanzarSiError(error, operacion)`, que lanza
`` `No se pudo ${operacion}: ${error.message}` `` si `error` no es nulo. Se
invoca justo después de cada una de las doce consultas
(`clienteLectura().from(...)` o `.rpc(...)`) en `designaciones.ts` (4),
`inventario.ts` (1), `plantas.ts` (2), `homologos.ts` (1) y
`cotizaciones.ts` (4, contando las dos consultas de
`historicoDeFamilia`). `construirContexto` no necesitó cambios propios:
hereda el lanzamiento porque llama a `obtenerDesignacion`, `existenciasDe`
y `obtenerPlanta` (que delega en `plantaCompleta`).

**Por qué lanzar y no devolver un resultado de error tipado:** el brief y
el resto de la capa ya usan `null`/`[]` como resultado de dominio válido
(designación inexistente, sin existencias, sin homólogos). Envolver el
resultado en algo como `{ ok, data, error }` habría obligado a todos los
llamadores — incluidas las diez tareas siguientes — a manejar ese caso
explícitamente en cada sitio de uso. Lanzar dejar el camino feliz de la
API idéntico (mismas firmas, mismos tipos de retorno) y empuja el manejo
del error de infraestructura al límite natural de la aplicación (Server
Component / Server Action / route handler), que es donde ya se maneja
cualquier otra excepción no prevista. Es la misma decisión que ya toma
`lib/sesion-demo` en el plan (`if (error) throw new Error(...)`).

Un único cast previo (`as unknown as Homologo[]` en `homologosDe`) ya
había sido validado como correcto en la revisión y no se tocó de nuevo.

## Contrato que exponen estos archivos

Quince funciones exportadas (trece de dominio más `aDesignacion`/`aPlanta`,
los mapeadores de fila). Todas las tareas siguientes las consumen; ninguna
debe volver a consultar tablas por su cuenta.

**Contrato de errores, válido para las doce funciones que consultan
tablas o RPC (todas menos `aDesignacion`, `aPlanta` y `construirContexto`,
que no consultan directamente pero heredan el comportamiento de las que sí
lo hacen):** si Supabase devuelve un `error` no nulo, la función **lanza**
`Error` con mensaje `` `No se pudo <operación>: <error.message>` `` en vez
de devolver `null` o `[]`. Un `null`/`[]` de retorno normal significa
siempre "no hay datos", nunca "algo falló". Cualquier tarea que llame a
estas funciones desde un Server Component o Server Action debe esperar
que puedan lanzar y dejar que la excepción suba (React ya renderiza el
`error.tsx` más cercano) en vez de asumir que un `null` cubre todos los
casos de fallo.

`lib/supabase/lectura.ts`:
```ts
function clienteLectura(): SupabaseClient<Database>
```

`lib/fuentes/designaciones.ts`:
```ts
function aDesignacion(fila: FilaDesignacion): Designacion
function obtenerDesignacion(codigo: string): Promise<Designacion | null>
function obtenerVarias(codigos: string[]): Promise<Designacion[]>
function completacionesDe(prefijo: string, limite?: number): Promise<string[]>
function similaresA(consulta: string, limite?: number): Promise<{ designacion: string; puntaje: number }[]>
```
`obtenerVarias` preserva el orden de `codigos` (no el orden de la base) y
omite silenciosamente los códigos no encontrados. `completacionesDe` y
`similaresA` envuelven las RPC `buscar_por_prefijo` / `buscar_similares` de
la Tarea 2; `limite` por defecto es 5 en ambas. Las cuatro funciones que
consultan (`obtenerDesignacion`, `obtenerVarias`, `completacionesDe`,
`similaresA`) lanzan si Supabase devuelve error — ver "Revisión" arriba.

`lib/fuentes/errores.ts`:
```ts
function lanzarSiError(error: PostgrestError | null, operacion: string): void
```
Ayudante interno (no reexportado por `index.ts`): lanza
`` `No se pudo ${operacion}: ${error.message}` `` si `error` no es nulo.
Se invoca inmediatamente después de cada consulta en las doce llamadas de
esta capa.

`lib/fuentes/inventario.ts`:
```ts
function existenciasDe(codigo: string): Promise<Existencia[]>
```
Orden fijo PS → SL → XX (el orden del QMS), sin importar el orden de la
base. Almacenes sin fila para esa designación simplemente no aparecen.
Lanza si Supabase devuelve error.

`lib/fuentes/plantas.ts`:
```ts
interface PlantaCompleta extends Planta {
  pais: string; huso: string;
  ventanaInicioMin: number; ventanaDuracionMin: number; ventanaVariabilidadMin: number;
  desempenoTe: number;
}
function aPlanta(fila: FilaPlanta): PlantaCompleta
function plantaCompleta(pdiv: string): Promise<PlantaCompleta | null>
function obtenerPlanta(pdiv: string): Promise<Planta | null>
function todasLasPlantas(): Promise<PlantaCompleta[]>
```
`obtenerPlanta` es la misma consulta que `plantaCompleta`, tipada al
subconjunto que consume el motor de reglas. `todasLasPlantas` ordena por
`pdiv`. `plantaCompleta` y `todasLasPlantas` lanzan si Supabase devuelve
error; `obtenerPlanta` lo hereda porque delega en `plantaCompleta`.

`lib/fuentes/homologos.ts`:
```ts
interface DiferenciaTecnica { atributo: string; valor_origen: string; valor_equivalente: string; }
interface Homologo { origen: string; equivalente: string; motivo: string; diferencias: DiferenciaTecnica[]; }
function homologosDe(codigo: string): Promise<Homologo[]>
```
Simétrico: si `codigo` es el `equivalente` de la fila en la base, la
relación se invierte (origen ↔ equivalente, y cada `DiferenciaTecnica`
también invierte `valor_origen` ↔ `valor_equivalente`) para que el
llamador siempre reciba `origen === codigo`. Lanza si Supabase devuelve
error.

`lib/fuentes/cotizaciones.ts`:
```ts
interface Cotizacion {
  numero: string; designacion: string; cantidad: number;
  fechaSolicitud: string; fechaRespuesta: string | null;
  resultado: "cotizada" | "declinada"; motivoDeclinado: string | null;
  teSemanas: number | null; precio: number | null;
}
function historicoDe(codigo: string): Promise<number[]>
function historicoDeFamilia(familia: string): Promise<number[]>
function obtenerCotizacion(numero: string): Promise<Cotizacion | null>
```
`historicoDe`/`historicoDeFamilia` devuelven solo `te_semanas` de
cotizaciones con `resultado = "cotizada"` y `te_semanas` no nulo.
`historicoDeFamilia` hace dos consultas (códigos de la familia, luego
cotizaciones de esos códigos) porque `cotizaciones.designacion` es texto
libre sin clave foránea al catálogo — el histórico puede incluir
designaciones inválidas (punto 4.8), y una sola consulta con `join`
implícito las perdería. Las tres funciones lanzan si Supabase devuelve
error en cualquiera de sus consultas (`historicoDeFamilia` puede lanzar
por la consulta de códigos o por la de cotizaciones, con un mensaje
distinto para cada una).

`lib/fuentes/contexto.ts`:
```ts
function construirContexto(codigo: string, cantidad: number): Promise<ContextoSolicitud>
```
**El invariante crítico.** Si `obtenerDesignacion(codigo)` no encuentra
nada, devuelve `{ designacion: null, cantidad, existencias: [], planta: null, reemplazo: null }`
de inmediato (cubre el punto 4.8 sin más consultas). Si la encuentra, carga
en paralelo (`Promise.all`) sus existencias, su planta y — solo si
`designacion.reemplazadoPor` no es nulo — la designación de reemplazo. Es
el único lugar de todo el proyecto donde `reemplazo` se resuelve; pasar
`reemplazo: null` con `reemplazadoPor` no nulo hace que `evaluarSolicitud`
decline por el punto 4.7 un caso que el procedimiento manda cotizar por el
4.6. `construirContexto` no consulta directamente, así que no llama a
`lanzarSiError`, pero hereda el lanzamiento de `obtenerDesignacion`,
`existenciasDe` y `obtenerPlanta`.

`lib/fuentes/index.ts` reexporta los seis módulos de dominio (todo menos
`lib/supabase/lectura.ts`, que se importa aparte porque vive fuera de
`lib/fuentes`, y `lib/fuentes/errores.ts`, que es un ayudante interno sin
uso previsto fuera de esta capa).

## Qué falta / qué NO hace

- Sin tests automatizados propios (unitarios ni de integración) —
  directiva del usuario para esta tarea, ver arriba.
- `lib/fuentes/index.ts` no reexporta `clienteLectura`: el brief la deja
  en `lib/supabase/lectura.ts` a propósito y ninguna tarea siguiente
  debería necesitar el cliente crudo, solo las funciones de dominio.
- No se agregó caché ni deduplicación de peticiones (p. ej. React `cache()`
  o `unstable_cache`): el brief no lo pide y estas funciones se llaman
  desde Server Components / Server Actions donde Next ya puede memoizar
  por petición si hace falta más adelante.
- No se tocó ninguna tabla de escritura ni Server Action: esta capa es de
  solo lectura con la clave anónima, tal como exige la restricción global.
- No se agregaron reintentos, caché ni degradación elegante ante un error
  de Supabase: la revisión pidió explícitamente que el error dejara de ser
  invisible, no que se amortiguara. Lanzar es todo lo que hace `lanzarSiError`.
- `obtenerCotizacion` sigue usando `as Record<string, unknown>` con casts
  campo por campo en vez de una `FilaCotizacion` como el resto de la capa
  — viene literal del brief y quedó registrado como hallazgo menor
  diferido por el revisor, sin arreglar a propósito.
- La comprobación 9 del script (`homologosDe`) solo ejercitó el camino
  "identidad" (cuando `codigo` es el `origen` de la fila); el camino de
  inversión no se ejecutó porque los dos homólogos sembrados de
  `DEMO-OBS-CON` lo tienen como `origen`. Hallazgo menor diferido por el
  revisor.

## Cómo verificar

```bash
./node_modules/.bin/tsc.cmd --noEmit
```
Sin salida — sin errores de tipos (tras el ajuste de cast en
`homologos.ts` descrito arriba).

```bash
pnpm lint
```
`Checked 73 files in 52ms. No fixes applied. Found 1 info.` — mismo aviso
informativo preexistente de `biome.json` (campo `recommended` deprecado)
que ya reportaron las tareas 1 y 2. `biome check --write .` sí reformateó
`lib/fuentes/plantas.ts` (una consulta encadenada que Biome prefiere en
una sola línea); el resultado quedó igual en comportamiento al código del
brief.

```bash
pnpm test
```
`Test Files 16 passed (16)` · `Tests 187 passed (187)`. Mismo número que
antes de esta tarea — no se agregó ningún test nuevo (directiva vigente).

Script temporal `scripts/comprobar-fuentes.ts` (creado, ejecutado con
`pnpm exec tsx scripts/comprobar-fuentes.ts` contra la base cloud real vía
`.env.local`, y borrado antes de este commit). Las diez comprobaciones
pedidas por el controlador, todas en verde:

```
1. obtenerDesignacion('DEMO-6205-2RSH/C3') => designacion con packQuantity=1,
   precioLista=250 (ambos numéricos). OK.
2. obtenerDesignacion('NO-EXISTE-XYZ-999') => null. OK.
3. completacionesDe('DEMO-6205-2RSH', 5) =>
   ['DEMO-6205-2RSH/C3', 'DEMO-6205-2RSH/C4', 'DEMO-6205-2RSH/W64'].
   Incluye el código exacto, 3 resultados. OK.
4. similaresA('DEMO-6205-2RSH/C3', 5) => 5 candidatos, puntaje 1 → 0.6,
   estrictamente descendente. OK.
5. construirContexto('DEMO-OBS-CON', 10):
   designacion.reemplazadoPor = "DEMO-6205-2RSH/C3"
   ctx.reemplazo.designacion  = "DEMO-6205-2RSH/C3"  → coinciden. OK.
   evaluarSolicitud(ctx) => ruta "cotizar_con_reemplazo", declinada=false. OK.
6. construirContexto('DEMO-OBS-SIN', 10) + evaluarSolicitud =>
   ruta "declinar_obsoleto_sin_reemplazo". OK.
7. construirContexto('NO-EXISTE-XYZ-999', 5) + evaluarSolicitud =>
   ruta "declinar_designacion_invalida". OK.
8. existenciasDe('DEMO-6205-2RSH/C3') =>
   [{almacen:'PS',cantidad:1200},{almacen:'SL',cantidad:300}] — orden PS,SL. OK.
9. homologosDe('DEMO-OBS-CON') => 2 relaciones, la primera con 3
   diferencias técnicas (Jaula, Sellado, Velocidad límite). OK.
10. todasLasPlantas() => 18 plantas, todas con desempenoTe > 0
    (primera: P101, desempenoTe=1). OK.

===========================
TODAS LAS COMPROBACIONES PASARON
```

No fue necesario `pnpm seed`: los casos curados del Plan 2
(`DEMO-6205-2RSH/C3`, `DEMO-OBS-CON`, `DEMO-OBS-SIN`) ya estaban presentes.

### Re-verificación tras el arreglo de manejo de errores

Las diez comprobaciones de arriba se volvieron a correr después de añadir
`lanzarSiError` a las doce consultas: mismo resultado, las diez en verde
(el camino feliz no cambia — `lanzarSiError` no hace nada cuando
`error === null`).

Comprobación nueva, en un script aparte
(`scripts/comprobar-fuentes-error-forzado.ts`, creado y borrado junto con
`comprobar-fuentes.ts`): se ejecutó en un **proceso nuevo** (necesario
porque `clienteLectura()` memoiza el cliente en el primer uso) que carga
`.env.local` y luego pisa `NEXT_PUBLIC_SUPABASE_ANON_KEY` con un valor
inválido *antes* de la primera llamada, y entonces invoca la función real
`obtenerDesignacion('DEMO-6205-2RSH/C3')`:

```
Llamando a obtenerDesignacion('DEMO-6205-2RSH/C3') con clave anónima inválida...
Lanzó: No se pudo obtener la designación DEMO-6205-2RSH/C3: Invalid API key
OK   - el mensaje nombra la operación ('obtener la designación DEMO-6205-2RSH/C3')
OK   - lanzó una excepción en vez de devolver null
```

Confirma extremo a extremo, con la función exportada real (no una prueba
sintética de `lanzarSiError` aislada), que un error de infraestructura
ahora es visible y nombra la operación — ya no puede confundirse con
"designación inexistente".

`pnpm test`, `pnpm lint` y `tsc --noEmit` se volvieron a correr tras el
arreglo con el mismo resultado que arriba (187/187, sin avisos nuevos, sin
errores de tipos). El detalle exacto está en
`.superpowers/sdd/2026-08-04-plan-3-motores-y-pantallas/tarea-3-report.md`.
