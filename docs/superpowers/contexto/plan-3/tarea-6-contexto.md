# Tarea 6 — `lib/metricas`: emisión de eventos y contadores

## Estado
completa

No cites el hash de tu propio commit: el archivo va dentro de ese commit y no
puedes conocerlo al escribirlo. Para ubicar el trabajo basta con
`git log --oneline -- lib/metricas lib/validador/cascada.ts`.

## Qué entrega esta tarea

- `lib/metricas/emitir.ts`: `emitirEvento()`, escritura de `eventos_demo` con
  `clienteAdmin` (service role, solo servidor) que **nunca lanza** — un fallo
  al registrar una métrica no puede tumbar una búsqueda en mitad de la demo.
- `lib/metricas/calculo.ts`: `calcularIndicadores()`, cálculo puro de los
  contadores de la sesión a partir de un arreglo de eventos, con la constante
  `MINUTOS_POR_SOLICITUD = 12` (supuesto del POC, no una medición).
- `lib/metricas/indicadores.ts`: `indicadoresDeSesion()`, que lee con la clave
  anónima solo los eventos posteriores a `sesion_demo.iniciada_en` (reiniciar
  la sesión deja los contadores en cero sin borrar el histórico).
- **Integración pendiente que me correspondía:** el `TODO(tarea 6)` que la
  Tarea 8 dejó en `lib/validador/cascada.ts` quedó reemplazado por la llamada
  real a `emitirEvento({ tipo: "llamada_modelo", perfil: "cliente",
  designacion: limpia, detalle: { estrategia: "validador", elegido:
  eleccion.codigo } })`, tal como el brief de la Tarea 8 (paso 6) lo
  especificaba. Verificado de extremo a extremo contra la base cloud y el
  Gateway real (ver "Cómo verificar").

## Decisiones tomadas y por qué

- **Directiva vigente al ejecutar esta tarea: no se escriben archivos de
  test.** Se omitieron los pasos 1, 2 y 4 del brief (`calculo.test.ts` y el
  ciclo TDD "ver el fallo / ver pasar"). No existe
  `lib/metricas/calculo.test.ts`. En su lugar se verificó con dos scripts
  temporales desechables (ejecutados con
  `NODE_OPTIONS="--conditions=react-server" pnpm exec tsx` contra la base
  cloud vía `.env.local`, **borrados antes de terminar**): el primero replica
  los 8 casos del test del brief sobre `calcularIndicadores` y ejercita
  `emitirEvento`/`indicadoresDeSesion` de ida y vuelta contra `eventos_demo`;
  el segundo comprueba el enganche de la cascada en vivo. Ver "Cómo
  verificar". Riesgo aceptado explícitamente por la directiva: el cálculo de
  indicadores queda sin cobertura automatizada; los 8 casos están listos para
  portarse a Vitest tal cual cuando se retomen los tests.

- **Un solo ajuste de tipos respecto al código literal del brief:**
  `emitir.ts`, campo `detalle`. El brief inserta `detalle: entrada.detalle ??
  {}`, pero `detalle` es `Json` en los tipos generados y
  `Record<string, unknown>` no es asignable a `Json` (TS2322). Se casteó a
  `(entrada.detalle ?? {}) as Json` importando el tipo `Json` de
  `@/lib/supabase/tipos`. Es el mismo espíritu de los casts que el plan ya
  acepta en `lib/fuentes` para columnas `jsonb`. Comportamiento idéntico.

- **`indicadoresDeSesion` descarta el `error` de Supabase a propósito** (el
  brief desestructura solo `{ data }` y cae a `[]`). Es la decisión opuesta a
  la de `lib/fuentes` (que lanza), y es deliberada: un fallo de lectura de
  métricas degrada a contadores en cero en el dashboard en vez de tumbar la
  pantalla, en línea con la regla dura de que las métricas nunca rompen la
  demo. Queda documentado aquí porque contradice a propósito el contrato de
  errores de la capa de fuentes; si el Plan 4 quiere visibilidad de fallos en
  el dashboard, el cambio es local a `indicadores.ts`.

- **Biome reformateó `emitir.ts`** (la cadena `.from().insert()` va en varias
  líneas). Ajuste de formato esperado según las restricciones globales, no
  desviación.

- **La tabla `eventos_demo` no tenía ninguna fila al ejecutar la tarea** — la
  asignación pedía verificarlo: conteo exacto 0 antes de las pruebas,
  confirmado contra la base cloud. Las filas de prueba de los scripts (8 + 1)
  se borraron al final de cada corrida y la tabla quedó de nuevo en 0; la
  fila de `sesion_demo` no se tocó y sigue en `modo = 'hoy'` (verificado
  antes y después).

## Contrato que exponen estos archivos

`lib/metricas/calculo.ts` (puro, sin dependencias de red):
```ts
type TipoEvento = Database["public"]["Enums"]["tipo_evento"]
interface EventoDemo {
  tipo: TipoEvento;
  perfil: string | null;
  designacion: string | null;
  pdiv: string | null;
  detalle: Record<string, unknown>;
  ocurridoEn?: string;   // ISO; solo lo usa la agrupación por hora
}
const MINUTOS_POR_SOLICITUD: 12
interface Indicadores {
  solicitudesEvitadas: number;
  solicitudesGeneradas: number;
  minutosOperadorLiberados: number;   // evitadas × MINUTOS_POR_SOLICITUD
  confirmacionesHomologo: number;
  avisosAnticipados: number;          // aviso_moq + aviso_pack_quantity
  tasaResueltasSinSolicitud: number;  // evitadas / (evitadas + generadas); 0 si 0/0
  busquedasPorHora: Record<string, number>;  // hora en huso de México, "0"–"23"
  llamadasModelo: number;
}
function calcularIndicadores(eventos: readonly EventoDemo[]): Indicadores
```

**Los doce valores de `TipoEvento`** (enum `tipo_evento` de la migración
`000006`; las tareas 11, 12 y 13 deben emitirlos tal cual — añadir uno exige
otra migración):
`busqueda` · `sugerencia_aceptada` · `solicitud_evitada` ·
`solicitud_generada` · `confirmacion_homologo` · `aviso_moq` ·
`aviso_pack_quantity` · `ventana_inicio` · `ventana_fin` ·
`intencion_encolada` · `reconciliacion` · `llamada_modelo`.

`lib/metricas/emitir.ts` (módulo `server-only`; importarlo desde un Client
Component rompe la compilación, a propósito):
```ts
interface EntradaEvento {
  tipo: TipoEvento;
  perfil?: "cliente" | "operador";
  designacion?: string | null;  // texto libre: el punto 4.8 exige registrar
                                // designaciones que NO existen en el catálogo
  pdiv?: string | null;
  detalle?: Record<string, unknown>;
}
function emitirEvento(entrada: EntradaEvento): Promise<void>
```
**NUNCA lanza**: si la base rechaza la fila o la conexión falla, registra el
error con `console.error("[metricas] …")` y resuelve. El evento se pierde, la
pantalla sigue viva.

`lib/metricas/indicadores.ts`:
```ts
function indicadoresDeSesion(): Promise<Indicadores>
```
Lee con la clave anónima (RLS permite `select` a `anon` sobre
`eventos_demo`). Solo cuenta eventos con `ocurrido_en >=
sesion_demo.iniciada_en`. Si la lectura falla, devuelve contadores en cero
(ver "Decisiones").

`lib/validador/cascada.ts` (firma sin cambios, comportamiento añadido): cuando
la estrategia 6 (LLM) resuelve, emite `llamada_modelo` con
`detalle = { estrategia: "validador", elegido: <código elegido> }` antes de
devolver el resultado. Como `emitirEvento` nunca lanza, la cascada no puede
romperse por un fallo de métricas.

## Qué falta / qué NO hace

- Sin tests automatizados propios — directiva del usuario, ver "Decisiones".
- **Ninguna pantalla emite todavía los demás eventos**: solo `llamada_modelo`
  se emite desde la cascada. Los eventos `busqueda`, `sugerencia_aceptada`,
  `solicitud_evitada`, etc. los emiten las tareas 11, 12 y 13 (pantallas y
  panel `/demo`) usando los tipos de arriba; el dashboard que los renderiza es
  del Plan 4.
- `indicadoresDeSesion` no pagina: lee todos los eventos de la sesión de una
  vez. A la escala del demo (decenas de eventos) sobra.
- `busquedasPorHora` agrupa por hora local de México (`minutosDelDia` sin
  huso explícito); si el demo se presentara desde otro huso, la gráfica sigue
  anclada al huso de las plantas.
- No se tocó ninguna migración ni se re-añadieron índices.

## Cómo verificar

```bash
./node_modules/.bin/tsc.cmd --noEmit
```
Sin salida — sin errores de tipos (tras el cast de `detalle` descrito arriba).

```bash
pnpm lint
```
`Checked 103 files ... No fixes applied. Found 1 info.` — solo el aviso
informativo preexistente de `biome.json` (campo `recommended` deprecado).

```bash
pnpm test
```
`Test Files 16 passed (16)` · `Tests 187 passed (187)`. Mismo número que
antes de esta tarea — no se agregó ningún test nuevo (directiva vigente).

Verificación funcional: dos scripts temporales (creados, ejecutados con
`NODE_OPTIONS="--conditions=react-server" pnpm exec tsx` contra la base cloud
real vía `.env.local`, y **borrados antes de terminar**).

`scripts/comprobar-metricas.mts` — los 8 casos del test del brief sobre el
cálculo puro, más el ciclo completo contra `eventos_demo`:

```
== calcularIndicadores (puro) ==
OK   - sesión sin eventos deja todos los contadores en cero
OK   - cuenta por separado evitadas y generadas
OK   - convierte evitadas en minutos de operador liberados (24 = 2 × 12)
OK   - suma avisos de MOQ y pack quantity en un solo contador
OK   - cuenta las confirmaciones de homólogo
OK   - tasa de resolución = evitadas / total
OK   - la tasa es 0, no NaN, sin evitadas ni generadas
OK   - agrupa búsquedas por hora en huso de México ({"12":2,"14":1})

== eventos_demo contra la base cloud ==
     filas previas en eventos_demo: 0
OK   - la tabla eventos_demo es accesible con la clave anónima
OK   - la fila de sesion_demo arranca en modo 'hoy'
[metricas] no se pudo registrar el evento: invalid input value for enum tipo_evento: "tipo_inventado"
OK   - emitirEvento NUNCA lanza (tipo inválido rechazado por la base)
OK   - las 8 filas de prueba quedaron escritas (8/8)
     indicadores: {"solicitudesEvitadas":2,"solicitudesGeneradas":1,
       "minutosOperadorLiberados":24,"confirmacionesHomologo":1,
       "avisosAnticipados":1,"tasaResueltasSinSolicitud":0.666…,
       "busquedasPorHora":{"15":2},"llamadasModelo":1}
OK   - cuenta las evitadas / generadas / avisos / confirmaciones / llamadas al modelo
OK   - minutos liberados = evitadas × MINUTOS_POR_SOLICITUD
OK   - agrupa las búsquedas por hora
OK   - borrado de las filas de prueba sin error
OK   - la tabla vuelve a su conteo original (0 → 0)
OK   - sesion_demo sigue en modo 'hoy' (no se tocó)
TODAS LAS COMPROBACIONES PASARON
```

`scripts/comprobar-enganche-cascada.mts` — la integración con la Tarea 8 en
vivo (consulta `"6 2 0 5 2 R S H 3 C"`, la que la Tarea 8 confirmó que activa
la estrategia 6; llama al Gateway real):

```
     resultado: tipo=similar estrategia=llm candidatos=1
OK   - la estrategia 6 resuelve como similar/llm
OK   - se emitió el evento llamada_modelo
     evento: {"id":10,"tipo":"llamada_modelo","perfil":"cliente",
       "designacion":"6 2 0 5 2 R S H 3 C",
       "detalle":{"elegido":"6205-2RSH/C3","estrategia":"validador"}}
OK   - perfil cliente y designación con la captura cruda
OK   - detalle registra la estrategia y el elegido
OK   - la tabla vuelve a su conteo original (0 → 0)
TODAS LAS COMPROBACIONES PASARON
```
