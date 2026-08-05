# Tarea 5 — Migración de Realtime, hook de indicadores vivos y contadores de `/demo`

## Estado

Completada, con una salvedad: el paso 4 del brief (verificación visual en dos ventanas de navegador, `/demo` y `/portal` lado a lado) no se pudo ejecutar porque este entorno no tiene la extensión de Chrome conectada. En su lugar se hizo una verificación equivalente al mecanismo (ver «Verificación manual pendiente»).

## Qué entrega esta tarea

- `supabase/migrations/20260805000009_realtime_eventos.sql`: una sola sentencia aditiva, `alter publication supabase_realtime add table eventos_demo;`. Aplicada contra la base real con `pnpm exec supabase db push --yes`.
- `components/metricas/uso-indicadores.ts`: el hook `useIndicadores()`, que suscribe un canal de Realtime sobre `eventos_demo` y, al recibir un INSERT, vuelve a pedir `refrescarIndicadores()` (y opcionalmente `refrescarPanelOperativo()`) al servidor. Respaldado por el mismo sondeo que usa `<ProveedorSesion>`.
- `components/demo/estado-sesion.tsx`: `<EstadoSesion>` ahora usa `useIndicadores(iniciales)` en vez de pintar directamente la prop `indicadores`. Cierra la deuda del Plan 3: los cuatro contadores de `/demo` («Solicitudes recibidas», «Solicitudes evitadas», «Minutos liberados», «Llamadas al modelo») dejan de ser una fotografía fija del momento en que se cargó la página.

## Decisiones tomadas y por qué

### Por qué hacía falta la migración

`eventos_demo` no estaba en la publicación `supabase_realtime`: la única tabla publicada desde `20260803000001_extensiones_y_sesion_demo.sql` era `sesion_demo`. Sin publicarla, cualquier canal de Realtime abierto sobre `eventos_demo` se suscribe correctamente (`SUBSCRIBED`) pero nunca recibe payloads — Postgres nunca emite el cambio hacia el WAL de replicación que Realtime consume. El contrato de la fase 4 (§4) dejó la puerta abierta a exactamente este caso con el hueco de numeración hasta `000009`. La política de lectura pública que Realtime necesita para poder reenviar el payload a `anon` ya existía desde `000006`, así que la migración no necesitó tocar políticas ni RLS: es aditiva y de una sola línea.

Se verificó el efecto de la migración con un script temporal (ver «Cómo verificar») que se conectó como `anon` (mismas credenciales que usa `clienteNavegador()`), insertó una fila real en `eventos_demo` con `pg`, y confirmó que el canal la recibió en 538 ms. El script y la fila de prueba se borraron después; no quedan en el árbol de trabajo ni en la base.

### Por qué un hook y no un segundo `<ProveedorSesion>`

Solo dos pantallas van a consumir esto (`/demo` en esta tarea, `/impacto` en una tarea posterior), y ninguna otra parte de la aplicación necesita saber cuántas solicitudes se han evitado. Envolver toda la aplicación en un contexto nuevo por dos consumidores habría sido construir de más: un hook con su propio `useEffect` de suscripción resuelve lo mismo sin forzar a cada árbol de componentes a pasar por un `<Contexto.Provider>` que no necesita. El patrón interno (suscripción temprana al montar, `EstadoCanal`, respaldo por `debeSondear()`/`MS_INTERVALO_SONDEO`) es deliberadamente el mismo que usa `<ProveedorSesion>` — no se inventó un segundo mecanismo de sincronización, solo se aplicó el existente sobre otra tabla y sobre Server Actions en vez de una consulta directa a `sesion_demo`.

### Para qué está el margen de agrupación (`MS_AGRUPACION`)

Una sola búsqueda en `/portal` puede emitir varios eventos casi simultáneos (`busqueda`, y potencialmente `aviso_moq` o `aviso_pack_quantity` en el mismo instante). Sin agrupar, cada INSERT dispararía su propio `refrescarIndicadores()` contra el servidor, multiplicando peticiones idénticas en el mismo instante contra la escena 2 del guion. El `agrupador` usa un `setTimeout` de 400 ms que se arma una sola vez: mientras está pendiente, nuevos INSERT no reinician el temporizador ni añaden otro, así que una ráfaga de eventos cercanos en el tiempo termina en un único recálculo.

### Por qué el hook no consulta tablas directamente

Por restricción del plan, `lib/fuentes` es la única capa que consulta tablas. El hook llama a `refrescarIndicadores()` y `refrescarPanelOperativo()` (Server Actions de la Tarea 4), nunca a `clienteNavegador().from(...)`. La única llamada directa a Supabase desde el cliente es la suscripción al canal de Realtime en sí (`.channel(...).on("postgres_changes", ...)`), que no es una consulta de datos sino la apertura del canal — el mismo patrón que ya usa `<ProveedorSesion>`.

### Por qué `refrescar()` nunca se propaga como error

Igual que `emitirEvento()` no lanza nunca del lado servidor, el hook adopta el mismo principio del lado cliente: si `refrescarIndicadores()` o `refrescarPanelOperativo()` fallan (red, sesión expirada, lo que sea), el `.catch(() => {})` los ignora y el estado de React se queda con la última cifra buena. Una pantalla proyectada delante del cliente no puede congelarse ni mostrar un error por un fallo de métrica.

## Contrato que exponen estos archivos

### `components/metricas/uso-indicadores.ts`

```ts
export function useIndicadores(
  inicial: Indicadores,
  panelInicial?: PanelOperativo | null, // por defecto null
): {
  indicadores: Indicadores;
  panel: PanelOperativo | null;
  estadoCanal: EstadoCanal;
};
```

- Con `panelInicial` omitido o `null`: el hook solo mantiene `indicadores` vivo (es lo que usa `/demo` en esta tarea).
- Con `panelInicial` distinto de `null`: el hook además refresca `panel` en cada invalidación (lo que va a necesitar la pantalla del panel operativo de una tarea posterior).
- `estadoCanal` expone el mismo tipo `EstadoCanal` (`"conectando" | "suscrito" | "error" | "cerrado"`) que ya usa `<IndicadorCanal>`, para que las tareas 6 y 7 puedan reutilizar ese mismo componente de indicador visual sin adaptarlo.

Las tareas 6 y 7 deben importar este hook tal cual desde `@/components/metricas/uso-indicadores`; no hay barril nuevo.

## Qué falta / qué NO hace

- No se modificaron `calcularIndicadores()` ni `indicadoresDeSesion()`.
- No hay ninguna escritura de negocio nueva: el hook es de solo lectura contra las Server Actions existentes.
- No se creó un segundo proveedor de contexto ni se tocó `<ProveedorSesion>`.
- No se generaron tests (directiva explícita del Plan 4B).
- No se editó ninguna migración anterior a `000009`; el hueco `000004` sigue sin usarse.
- El panel operativo (`panel`) no tiene todavía ningún consumidor en este repo: lo prepara esta tarea para que la pantalla de la Tarea 6/7 lo use pasando `panelInicial`.

## Cómo verificar

1. `pnpm exec supabase db push --dry-run --yes` mostró que solo se aplicaría `20260805000009_realtime_eventos.sql`. `pnpm exec supabase db push --yes` la aplicó sin error.
2. Verificación de la publicación con un script temporal (`dotenv/config` no carga `.env.local`, así que se usó `config({ path: ".env.local" })`, igual que documentaron las tareas 2, 3 y 4) que ejecutó:
   ```sql
   select tablename from pg_publication_tables where pubname = 'supabase_realtime';
   ```
   Resultado real: `[{ tablename: 'eventos_demo' }, { tablename: 'sesion_demo' }]`. Las dos tablas esperadas aparecen.
3. Smoke test de extremo a extremo del mecanismo de Realtime (sustituye al paso 4 del brief, ver «Verificación manual pendiente» para lo que sí falta): un script temporal abrió un canal con las credenciales `anon` (las mismas que usa `clienteNavegador()`), se suscribió a INSERT sobre `eventos_demo`, y luego un cliente `pg` aparte insertó una fila de prueba (`designacion: 'VERIFICACION-TEMP'`). El canal recibió el payload en **538 ms**. Tanto el script como la fila insertada se borraron inmediatamente después (`delete from eventos_demo where designacion = 'VERIFICACION-TEMP'`); no queda rastro en la base ni en el árbol de trabajo.
4. `pnpm lint` → limpio, solo el info preexistente sobre `linter.recommended` en `biome.json`. Nota: Biome reformateó la llamada `.on(...)` de `uso-indicadores.ts` a una sola línea; se corrió `pnpm lint:fix` antes de la verificación final.
5. `pnpm build` → compiló y pasó el type-check sin errores.
6. `pnpm test` → 198 tests en verde, 17 archivos.

## Verificación manual pendiente

El paso 4 del brief —abrir `/demo` y `/portal` en dos ventanas del navegador, buscar `DEMO-6205-2RSH/C3` con cantidad 200 en `/portal`, y comprobar que en `/demo` el contador de «Solicitudes evitadas» o «Llamadas al modelo» cambia en menos de dos segundos sin recargar— **no se ejecutó**: este entorno no tiene la extensión de Chrome conectada (`tabs_context_mcp` devolvió "Browser extension is not connected").

Lo que sí se verificó por otra vía (ver punto 3 de «Cómo verificar») es la parte que más riesgo tenía: que la publicación de Realtime efectivamente entrega INSERT de `eventos_demo` a un cliente con la clave `anon`, en 538 ms. Eso cubre el Paso 1 del brief con evidencia real, no estimada. Lo que queda pendiente de comprobar visualmente es la integración completa del hook con la pantalla — que `<EstadoSesion>` re-renderiza, que `<IndicadorCanal>` (si se añade a `/demo`, cosa que esta tarea no hace) muestra "suscrito", y que el conteo agrupado (`MS_AGRUPACION`) no introduce un retraso perceptible en el guion real de la escena 2.

Para completar esta verificación cuando haya navegador disponible:

```bash
pnpm dev
```

1. Abrir `/demo` en una ventana y `/portal` en otra, lado a lado.
2. En `/portal`, buscar `DEMO-6205-2RSH/C3` con cantidad 200.
3. Mirar `/demo` sin recargar.

Esperado: «Solicitudes evitadas» o «Llamadas al modelo» cambia en menos de dos segundos. Si el indicador de canal estuviera en error y la cifra igual se moviera, sería el sondeo (`MS_INTERVALO_SONDEO`, cada 2 s) haciendo el trabajo en vez del canal — en ese caso habría que revisar de nuevo la publicación del Paso 1, aunque la evidencia de este documento indica que no debería ocurrir.
