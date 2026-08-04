# Tarea 5 — Estado de la sesión y propagación por Realtime

## Estado
completa

No cites el hash de tu propio commit: el archivo va dentro de ese commit y no
puedes conocerlo al escribirlo. Para ubicar el trabajo basta con
`git log --oneline -- lib/sesion-demo components/sesion components/marco/barra-superior.tsx "app/(portal)/portal/page.tsx"`.

## Qué entrega esta tarea

- `lib/sesion-demo/`: tipos de la sesión (`SesionDemo`, `EstadoCanal`), lectura
  de la fila única de `sesion_demo` con respaldo a valores por defecto, los
  nueve escenarios precargados del guion, la lógica pura del respaldo por
  sondeo, y las seis Server Actions que escriben con `service_role` y
  revalidan `/portal`, `/operador` y `/demo`.
- `components/sesion/`: `<ProveedorSesion>` (contexto de React con suscripción
  temprana a Realtime, sondeo de respaldo y reloj simulado que avanza solo),
  el hook `useSesion()`, y tres indicadores: `<IndicadorCanal>` (solo para
  `/demo`), `<IndicadorPlantas>` (píldora ámbar por planta en ventana, con
  cuenta regresiva) e `<IndicadorModo>` (modo activo).
- `components/marco/barra-superior.tsx` monta ahora `<IndicadorPlantas>` e
  `<IndicadorModo>` en el hueco que dejó la Tarea 1; sigue siendo un Server
  Component sin estado.
- `app/(portal)/portal/page.tsx` es ahora un Server Component
  `force-dynamic` que lee sesión y plantas en paralelo y envuelve todo en
  `<ProveedorSesion>`.

## Decisiones tomadas y por qué

- **Directiva vigente al ejecutar esta tarea: no se escriben archivos de
  test.** Se omitieron los pasos 2, 3 y 5 del brief (`sondeo.test.ts` y el
  ciclo TDD "ver el fallo / ver pasar"). No existe
  `lib/sesion-demo/sondeo.test.ts`. En su lugar se verificó con un script
  temporal desechable (`scripts/comprobar-sesion-demo.ts`, ejecutado con
  `pnpm exec tsx` contra la base cloud vía `.env.local`, borrado antes de
  terminar) que replica los 5 casos del test del brief y añade la lectura
  real de la sesión, los escenarios y la propagación Realtime de extremo a
  extremo (ver "Cómo verificar"). Riesgo aceptado explícitamente por la
  directiva: `debeSondear` queda sin cobertura automatizada; los 5 casos
  están listos para portarse a Vitest tal cual cuando se retomen los tests.

- **Un solo ajuste de tipos respecto al código literal del brief:**
  `lib/sesion-demo/acciones.ts`, ayudante `actualizar`. El brief tipa el
  parámetro como `Record<string, unknown>`, pero el `.update()` del cliente
  tipado lo rechaza (TS2345: el tipo `Update` de la tabla no admite un
  índice `string` abierto). Se tipó como
  `Database["public"]["Tables"]["sesion_demo"]["Update"]` (alias local
  `CambiosSesion`), que cubre exactamente los campos que escriben las seis
  acciones sin perder seguridad. Comportamiento idéntico.

- **Ajuste menor en `proveedor-sesion.tsx`:** el brief usa
  `React.ReactNode` sin importar `React`; con los tipos de React 19 eso no
  resuelve, así que se importó `type ReactNode` y se usa directamente.
  Nada más cambia.

- **`<IndicadorModo>` es un archivo nuevo que el brief no lista.** La tabla
  de estructura del plan fija la barra superior como "Perfil, modo activo,
  estado de plantas, distintivo" y el comentario que dejó la Tarea 1 en
  `barra-superior.tsx` pedía "el indicador de estado de plantas y el del
  modo activo", pero el paso 9 solo describe dos indicadores. Se creó
  `components/sesion/indicador-modo.tsx` (píldora neutra azul primario:
  "Modo: hoy" / "Modo: con la solución") para cubrir ese hueco. Ni ámbar
  (exclusivo de desconexión) ni verde (exclusivo de confirmación).

- **`BarraSuperior` sigue siendo Server Component; los indicadores se
  montan como Client Components hijos.** El paso 10 pedía elegir lo que
  dejara la barra más simple: como la página ya envuelve todo en
  `<ProveedorSesion>`, el contexto llega a los Client Components que cuelgan
  de los children sin convertir la barra en cliente. Consecuencia
  **importante para las tareas siguientes**: cualquier pantalla que monte
  `<BarraSuperior>` debe estar dentro de `<ProveedorSesion>`, o `useSesion()`
  lanzará en tiempo de ejecución. La barra ya no se puede usar suelta.

- **Una píldora ámbar por planta en ventana**, no una sola con "+N más":
  en el demo hay a lo sumo una o dos plantas forzadas a la vez y es el dato
  exacto que el presentador necesita leer de un vistazo. Solo se listan
  plantas en estado `ventana` (el breve dice "cuenta las plantas en
  ventana"); `reactivando` no genera píldora.

- **El paso 11 del brief (verificación en vivo con `pnpm dev` y dos
  pestañas) no se ejecutó tal cual**: la directiva del orquestador prohíbe
  correr `pnpm dev`/`pnpm build` en esta ola (hay otro agente sobre el mismo
  repo). Se sustituyó por una comprobación de propagación Realtime de
  extremo a extremo desde el script desechable: misma suscripción que el
  proveedor (canal `sesion-demo`, filtro `UPDATE` sobre `public.sesion_demo`
  con la clave anónima), escritura con `pg` vía `SUPABASE_DB_URL` solo tras
  confirmar `SUBSCRIBED`, y medición de latencia. **Resultado: el arranque
  en frío del Plan 1 sigue presente** — la primera suscripción tras
  inactividad confirmó `SUBSCRIBED` en ~650 ms pero no propagó ningún evento
  en 25 s; el reintento inmediato propagó el `UPDATE` en **633 ms** tras la
  escritura. Es exactamente el patrón que esta tarea existe para
  neutralizar (suscripción al montar la pantalla, no al primer cambio, y
  sondeo de respaldo). La verificación visual de la píldora ámbar en el
  navegador queda pendiente para la primera puesta en marcha con `pnpm dev`.

- **El script no pudo usar `clienteAdmin`**: `lib/supabase/admin.ts`
  importa `server-only`, que lanza fuera de un entorno React Server
  Components. Las escrituras del script fueron por `pg` (como
  `scripts/verificar-conexion.ts`). Esto no afecta al código entregado: las
  Server Actions solo corren dentro de Next.js.

## Contrato que exponen estos archivos

`lib/sesion-demo/tipos.ts`:
```ts
interface SesionDemo {
  modo: "hoy" | "solucion";
  plantasOverride: Record<string, EstadoPlanta>;
  relojOffsetMin: number;
  escenarioActivo: string | null;
  iniciadaEn: string;
}
type EstadoCanal = "conectando" | "suscrito" | "error" | "cerrado";
```

`lib/sesion-demo/leer.ts`:
```ts
const SESION_POR_DEFECTO: SesionDemo  // modo "hoy", sin overrides, offset 0
function leerSesion(): Promise<SesionDemo>
```
Si la fila `id = 1` no existe devuelve `SESION_POR_DEFECTO` (falla hacia el
modo "hoy", el estado narrativo inicial). Lee con la clave anónima.

`lib/sesion-demo/sondeo.ts`:
```ts
const MS_ESPERA_CANAL: 4_000
const MS_INTERVALO_SONDEO: 2_000
function debeSondear(estado: EstadoCanal, msDesdeApertura: number): boolean
```
`false` si está suscrito; `true` inmediato en `error`/`cerrado`; en
`conectando`, `true` solo pasado el margen.

`lib/sesion-demo/escenarios.ts`:
```ts
interface Escenario {
  clave: string; nombre: string; escena: string;
  consulta: string; cantidadSugerida: number;
  modo: "hoy" | "solucion" | null;
  overrides: Record<string, EstadoPlanta> | null;
  nota: string;
}
const ESCENARIOS: readonly Escenario[]  // 9 escenarios, uno por escena
function escenarioPorClave(clave: string): Escenario | undefined
```
`modo: null` = conservar el modo actual; `overrides: null` = conservar los
overrides actuales (ningún escenario usa `null` hoy, pero la acción lo
respeta).

`lib/sesion-demo/acciones.ts` (todas `"use server"`, escriben con
`service_role` y revalidan `/portal`, `/operador` y `/demo`):
```ts
function cambiarModo(modo: "hoy" | "solucion"): Promise<void>
function fijarEstadoPlanta(pdiv: string, estado: EstadoPlanta | null): Promise<void>
function avanzarReloj(minutos: number): Promise<void>        // offset acumulativo
function reiniciarReloj(): Promise<void>
function cerrarVentanaEnCurso(pdiv: string): Promise<void>   // fuerza "online"
function activarEscenario(clave: string): Promise<void>      // lanza si la clave no existe
function reiniciarSesion(): Promise<void>                    // borra solicitudes, mueve iniciada_en
```
`fijarEstadoPlanta(pdiv, null)` quita el override (la planta vuelve al
calendario). `reiniciarSesion` borra TODAS las filas de `solicitudes` y
deja la sesión en modo "hoy" sin overrides ni offset; NO toca
`eventos_demo` ni el histórico de cotizaciones (los contadores leen solo
eventos posteriores a `iniciada_en`).

`components/sesion/proveedor-sesion.tsx`:
```tsx
function ProveedorSesion(props: {
  sesionInicial: SesionDemo;
  plantas: readonly PlantaCompleta[];
  children: ReactNode;
}): JSX.Element
function useSesion(): {
  sesion: SesionDemo;
  estadoCanal: EstadoCanal;
  plantas: readonly PlantaCompleta[];
  estados: Record<string, EstadoPlanta>;  // calendario + overrides, a la hora simulada
  ahora: Date;                            // hora simulada (offset aplicado)
}
```
Abre el canal `sesion-demo` AL MONTAR (no al primer cambio), solo actualiza
estado tras eventos `UPDATE`, marca el canal `suscrito`/`error`/`cerrado`
según el callback de `subscribe`, y sondea `sesion_demo` cada 2 s cuando
`debeSondear` lo indica. El reloj de pantalla hace tic cada 15 s.
`useSesion` lanza fuera del proveedor.

`components/sesion/indicador-canal.tsx` — `<IndicadorCanal />`, sin props.
Solo para `/demo`: verde si suscrito, gris si conectando, rojo con el texto
del respaldo por sondeo en `error`/`cerrado`.

`components/sesion/indicador-plantas.tsx` — `<IndicadorPlantas />`, sin
props. Píldora neutra "Todas las plantas en línea" o una píldora ámbar por
planta en ventana ("<nombre> desconectada · reconecta en N min", con
`minutosParaReapertura`).

`components/sesion/indicador-modo.tsx` — `<IndicadorModo />`, sin props.
Píldora azul primario con "Modo: hoy" / "Modo: con la solución".

## Qué falta / qué NO hace

- Sin tests automatizados propios — directiva del usuario, ver arriba.
- **El panel `/demo` que dispara estas acciones llega en la Tarea 12:**
  aquí solo existen las acciones y la propagación; nada en pantalla llama
  todavía a `cambiarModo`/`activarEscenario`/etc. `<IndicadorCanal>` tampoco
  está montado en ninguna pantalla (su sitio es `/demo`).
- La verificación visual en navegador (dos pestañas, píldora ámbar
  apareciendo sin recargar) queda pendiente de la primera ejecución con
  `pnpm dev` — el orquestador prohibió levantar el servidor en esta ola.
  La propagación sí quedó verificada de extremo a extremo por script (ver
  abajo), incluida la medición del arranque en frío.
- `/operador` todavía no monta `<ProveedorSesion>` ni `<BarraSuperior>`:
  la página de operador es de una tarea posterior; cuando la monte, debe
  envolver la barra en el proveedor o `useSesion()` lanzará.
- El sondeo de respaldo no tiene límite de tiempo ni backoff: mientras el
  canal no confirme, relee cada 2 s. Decisión consciente del brief (POC).
- `ProveedorSesion` no reintenta la suscripción tras `CHANNEL_ERROR`: el
  respaldo es el sondeo, no la reconexión.
- No se tocó ninguna migración ni se re-añadieron índices.

## Cómo verificar

```bash
./node_modules/.bin/tsc.cmd --noEmit
```
Sin salida — sin errores de tipos.

```bash
pnpm exec biome check lib/sesion-demo components/sesion components/marco "app/(portal)"
```
`Checked 12 files ... No fixes applied.` — los archivos de esta tarea
limpios. (Un `pnpm lint` global puede fallar por
`scripts/comprobar-respaldo-llm.mts`, script desechable de otra tarea de la
misma ola que aún no se ha borrado; es ajeno a esta tarea. El aviso
informativo de `biome.json` sobre `recommended` es preexistente.)

```bash
pnpm test
```
`Test Files 16 passed (16)` · `Tests 187 passed (187)`. Mismo número que
antes de esta tarea — no se agregó ningún test nuevo (directiva vigente).

Script temporal `scripts/comprobar-sesion-demo.ts` (creado, ejecutado con
`pnpm exec tsx scripts/comprobar-sesion-demo.ts` contra la base cloud real
vía `.env.local`, y borrado antes de terminar). Salida de la segunda
corrida — la primera exhibió el arranque en frío:

```
== Respaldo por sondeo (los 5 casos del test del brief) ==
OK   - no sondea mientras el canal está suscrito
OK   - no sondea durante el margen inicial (el canal puede tardar)
OK   - sondea si el canal sigue conectando pasado el margen (arranque en frío del Plan 1)
OK   - sondea de inmediato si el canal da error
OK   - sondea de inmediato si el canal se cerró

== leerSesion contra la base cloud ==
OK   - modo válido (hoy)
OK   - relojOffsetMin numérico (0)
OK   - plantasOverride es objeto ({})
OK   - iniciadaEn parseable (2026-08-04T03:17:21.926208+00:00)

== Escenarios ==
OK   - 9 escenarios precargados (9)
OK   - escenario 'ventana' fuerza P103 a ventana en modo hoy
OK   - clave desconocida devuelve undefined

== Propagación Realtime de extremo a extremo ==
     canal: SUBSCRIBED (+637 ms)
OK   - evento UPDATE propagado en 633 ms tras la escritura
OK   - leerSesion refleja el modo escrito (solucion)
     canal: CLOSED (+1426 ms)
OK   - fila de sesion_demo restaurada a su estado original

===========================
TODAS LAS COMPROBACIONES PASARON
```

**Dato del arranque en frío (lo pide el paso 11):** la primera corrida del
script —primera suscripción del día— confirmó `SUBSCRIBED` en ~650 ms pero
no propagó el `UPDATE` en 25 s; la segunda corrida inmediata propagó en
633 ms. El arranque en frío del Plan 1 sigue presente en el servicio, así
que las cuatro medidas de esta tarea (suscripción temprana, indicador de
canal, sondeo de respaldo, escribir solo tras `SUBSCRIBED`) son necesarias,
no precautorias. La fila de `sesion_demo` quedó restaurada a
`modo = 'hoy'` tras la comprobación (verificado con una consulta directa).
