# Tarea 4 — `lib/estado-fabricas`: ventanas y reloj simulado

## Estado
completa

No cites el hash de tu propio commit: el archivo va dentro de ese commit y no
puedes conocerlo al escribirlo. Para ubicar el trabajo basta con
`git log --oneline -- lib/estado-fabricas`.

## Qué entrega esta tarea

- `lib/estado-fabricas/reloj.ts`: el reloj simulado del demo
  (`ahoraSimulada`, offset en minutos contra la hora real) y dos
  conversiones de huso (`minutosDelDia`, `fechaEnHuso`) con
  `America/Mexico_City` como huso de referencia — las ventanas del Plan 2
  están definidas en minutos hora de México.
- `lib/estado-fabricas/ventanas.ts`: el estado de cada planta en un
  instante dado (`online` / `ventana` / `reactivando`), con inicio de
  ventana variable pero determinista para la planta belga `P103`, override
  del presentador que siempre gana sobre el calendario, y cuenta regresiva
  de reapertura para el banner.
- `lib/estado-fabricas/index.ts`: reexporta ambos módulos.

Todo es lógica pura: ninguna función consulta la base ni depende del azar.
Consume únicamente el tipo `PlantaCompleta` de `lib/fuentes/plantas`
(Tarea 3); los datos llegan ya resueltos por el llamador.

## Decisiones tomadas y por qué

- **Directiva vigente al ejecutar esta tarea: no se escriben archivos de
  test.** Se omitieron los pasos 1, 2, 4, 5, 6 y 8 del brief
  (`reloj.test.ts`, `ventanas.test.ts` y el ciclo TDD "ver el fallo / ver
  pasar"). No existe `lib/estado-fabricas/reloj.test.ts` ni
  `lib/estado-fabricas/ventanas.test.ts`. En su lugar se verificó con un
  script temporal desechable (`scripts/comprobar-estado-fabricas.ts`,
  ejecutado con `pnpm exec tsx`, borrado antes de commitear) que replica
  las **21 comprobaciones de los dos archivos de test del brief** (los 7
  casos del reloj y los 14 de ventanas) y añade 5 comprobaciones de
  extremo a extremo contra la base cloud sembrada por el Plan 2 (ver
  "Cómo verificar"). Riesgo aceptado explícitamente por la directiva: esta
  capa queda sin cobertura automatizada propia; los 21 casos del brief
  están listos para portarse a Vitest tal cual cuando se retomen los
  tests.

- **El offset va en minutos contra la hora real, no como hora absoluta**
  (nota de diseño del brief, reproducida en el comentario de
  `ahoraSimulada` porque no se deduce leyendo el código): el presentador
  salta el reloj hacia adelante durante la escena 4. Con una hora
  absoluta el reloj simulado quedaría congelado en ese instante y la
  cuenta regresiva del banner dejaría de correr; con offset, el reloj
  sigue avanzando solo después de cada salto.

- **La variabilidad de `P103` se deriva de un hash de `pdiv|fecha`, no de
  `Math.random()`** (ídem): la ventana belga no empieza a la misma hora
  cada día, pero un valor aleatorio haría que se moviera entre dos
  renders de la misma pantalla y el banner mentiría a mitad de la
  escena. El hash es estable dentro de un día y distinto entre días, y el
  desplazamiento queda acotado a `±variabilidad/2` (±60 min para los 120
  min configurados en `P103`).

- **`hourCycle: "h23"` en `minutosDelDia`:** evita que la medianoche se
  formatee como `"24:00"` en algunas versiones de ICU, lo que daría el
  minuto 1440 en vez de 0 y rompería toda comparación de ventana.

- **Desviación menor respecto al brief, solo en el script desechable
  (no en el código entregado):** el ayudante `enMexico(fecha, hora,
  minuto)` de `ventanas.test.ts` en el brief construye la cadena UTC con
  `hora + 6`; para horas locales ≥ 18 (los casos de ventana nocturna,
  23:30) produce `"T29:30:00Z"`, una fecha inválida que lanzaría
  `RangeError: Invalid time value` en `Intl.DateTimeFormat`. En el script
  se calculó como `new Date(local.getTime() + 6 * 3_600_000)`, que admite
  el cruce de día. Si los tests del brief se portan más adelante, ese
  ayudante necesita el mismo arreglo. El código de `lib/estado-fabricas`
  es literal al brief, sin ninguna desviación.

## Contrato que exponen estos archivos

`lib/estado-fabricas/reloj.ts`:
```ts
const HUSO_MEXICO: "America/Mexico_City"
function ahoraSimulada(offsetMin: number, base?: Date): Date
function minutosDelDia(momento: Date, huso?: string): number
function fechaEnHuso(momento: Date, huso?: string): string
```
`base` por defecto es `new Date()`; los tests y la lógica de ventanas
siempre pasan `base`/`momento` explícitos para ser deterministas.
`minutosDelDia` devuelve minutos desde la medianoche local del huso (por
defecto México, 0–1439). `fechaEnHuso` devuelve `AAAA-MM-DD` local; es la
semilla determinista de la variabilidad.

`lib/estado-fabricas/ventanas.ts`:
```ts
type EstadoPlanta = "online" | "ventana" | "reactivando"
const MINUTOS_REACTIVANDO: 15
function inicioDeVentana(planta: PlantaCompleta, momento: Date): number
function estadoDePlanta(planta: PlantaCompleta, momento: Date, override?: EstadoPlanta): EstadoPlanta
function minutosParaReapertura(planta: PlantaCompleta, momento: Date): number | null
function estadoDeTodas(
  plantas: readonly PlantaCompleta[],
  momento: Date,
  overrides?: Record<string, EstadoPlanta>,
): Record<string, EstadoPlanta>
```
Semántica: `override` siempre gana sobre el calendario. `reactivando`
cubre los 15 minutos posteriores al cierre de la ventana. Las ventanas
pueden cruzar la medianoche (comparación modular sobre 1440).
`minutosParaReapertura` devuelve `null` fuera de ventana — es el dato de
la cuenta regresiva del banner. `estadoDeTodas` indexa por `pdiv` y los
overrides también se indexan por `pdiv`.

`lib/estado-fabricas/index.ts` reexporta ambos módulos completos
(`export *`).

## Qué falta / qué NO hace

- Sin tests automatizados propios — directiva del usuario, ver arriba.
- No lee `sesion_demo` ni el offset guardado: quien consume esta capa
  (panel del presentador, banners) pasa el `momento` ya calculado con
  `ahoraSimulada(offset, new Date())`. El origen del offset lo define la
  tarea de `lib/sesion-demo`.
- No persiste overrides: llegan como parámetro. Su almacenamiento es
  responsabilidad de la sesión del demo.
- `minutosParaReapertura` solo informa durante la ventana; no calcula
  "minutos para la próxima apertura" cuando la planta está en línea (el
  brief no lo pide).
- No valida que `planta.ventanaDuracionMin + MINUTOS_REACTIVANDO < 1440`
  ni otros invariantes de configuración: confía en los datos sembrados.

## Cómo verificar

```bash
./node_modules/.bin/tsc.cmd --noEmit
```
Sin salida — sin errores de tipos.

```bash
pnpm exec biome check lib/estado-fabricas
```
`Checked 3 files in 8ms. No fixes applied.` — los tres archivos de la
tarea limpios. (Un `pnpm lint` global puede reportar archivos de otras
tareas ejecutándose en paralelo sobre el mismo repo; eso es ajeno a esta
tarea. El aviso informativo de `biome.json` sobre `recommended` es
preexistente.)

```bash
pnpm test
```
`Test Files 16 passed (16)` · `Tests 187 passed (187)`. Mismo número que
antes de esta tarea — no se agregó ningún test nuevo (directiva vigente).

Script temporal `scripts/comprobar-estado-fabricas.ts` (creado, ejecutado
con `pnpm exec tsx scripts/comprobar-estado-fabricas.ts` contra la base
cloud real vía `.env.local`, y borrado antes de este commit). Salida
completa — las 21 comprobaciones del brief más 5 de extremo a extremo,
todas en verde:

```
== Reloj simulado ==
OK   - offset cero deja la hora intacta
OK   - offset de 90 min
OK   - offset negativo -30 min
OK   - 18:30 UTC = minuto 750 en México
OK   - medianoche local = minuto 0
OK   - respeta el huso (Bruselas)
OK   - fechaEnHuso devuelve el día local
== Estado de una planta ==
OK   - online antes de la ventana
OK   - ventana al minuto de inicio
OK   - ventana a la mitad
OK   - reactivando tras el cierre (14:45)
OK   - online tras la reactivación
OK   - ventana que cruza medianoche (23:30)
OK   - ventana que cruza medianoche (00:30)
OK   - ventana nocturna cerrada a las 05:00
== Override del presentador ==
OK   - override gana sobre el calendario
OK   - override devuelve a línea durante la ventana
== Variabilidad del inicio ==
OK   - sin variabilidad el inicio es fijo
OK   - con variabilidad el inicio es estable dentro del día
OK   - con variabilidad el inicio se mantiene en ±60 min
OK   - con variabilidad el inicio cambia entre días
== Cuenta regresiva ==
OK   - minutos para reapertura durante la ventana (13:30 → 70)
OK   - null fuera de ventana
== Estado de todas (sintético) ==
OK   - override por pdiv + calendario
== Contra la base cloud sembrada (Plan 2) ==
OK   - todasLasPlantas() devuelve 18 plantas
OK   - P103 existe y tiene variabilidad 120
OK   - inicio de P103 hoy dentro de su franja de variabilidad
OK   - estadoDeTodas cubre las 18 plantas
     Ahora simulada: 2026-08-04T20:51:17.292Z · minuto 891 hora de México
     Estados reales ahora: 10 online, 3 en ventana, 5 reactivando
OK   - override sobre datos reales
===========================
TODAS LAS COMPROBACIONES PASARON
```

(Los conteos online/ventana/reactivando dependen de la hora de ejecución;
lo que debe mantenerse es el OK de las cuatro comprobaciones
cuantitativas y el mensaje final.)
