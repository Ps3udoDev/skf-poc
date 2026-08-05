# Tarea 7 — /impacto: el panel operativo

## Estado

Completada, con una salvedad: el Paso 6 del brief (verificación visual en el navegador — abrir `/impacto`, provocar una asignación desde `/portal` sin recargar, adelantar el reloj en `/demo`) no se pudo ejecutar porque este entorno no tiene la extensión de Chrome conectada (`list_connected_browsers` devolvió vacío). En su lugar se levantó `pnpm dev` y se verificó con `curl` que `/impacto` responde 200, que su HTML contiene los rótulos exigidos y que la clase `desconexion` aparece exactamente donde debe. Ver «Verificación manual pendiente» para el guion exacto a ejecutar cuando haya navegador disponible.

## Qué entrega esta tarea

- `components/impacto/carga-csr.tsx`: `<CargaCsrPanel>`, el reparto por CSR como barras horizontales — activos primero, cada barra proporcional a `abiertas` sobre el máximo, los inactivos en gris con la etiqueta «no disponible», y el total sin asignar al pie.
- `components/impacto/cumplimiento-sla.tsx`: `<CumplimientoSlaPanel>`, la tasa de SLA en grande más las cuatro cifras de detalle (respondidas, dentro del SLA, sin responder, mediana en días hábiles) y el supuesto abierto sobre festivos.
- `components/impacto/ventanas-semana.tsx`: `<VentanasSemana>`, la tabla de 18 plantas × 7 días con una franja ámbar por celda mostrando el rango horario de la ventana de mantenimiento.
- `components/impacto/tablero.tsx`: ahora desestructura también `panel` de `useIndicadores()` y, cuando no es `null`, monta la sección «Operación» al final — `<CargaCsrPanel>` y `<CumplimientoSlaPanel>` en una grilla de dos columnas, `<VentanasSemana>` debajo a lo ancho completo.
- `app/impacto/page.tsx`: añade `refrescarPanelOperativo()` al `Promise.all` junto con `leerSesion()`, `todasLasPlantas()` e `indicadoresDeSesion()`, y pasa el resultado como `panelInicial` real a `<Tablero>` (antes era `null` a propósito, dejado así por la Tarea 6).

Con `panelInicial` real, `useIndicadores()` (Tarea 5) empieza a llamar también a `refrescarPanelOperativo()` en cada refresco por Realtime/sondeo — eso ya estaba implementado en el hook; esta tarea es la primera en pasarle un valor no nulo.

## Decisiones tomadas y por qué

### Por qué el único ámbar de toda la pantalla está en `<VentanasSemana>`

El ámbar (`desconexion` / `desconexion-suave`) es el color reservado en `app/globals.css` para hablar de desconexión de fábrica. De los tres bloques de esta tarea, solo la línea de tiempo de ventanas trata literalmente de eso: cada celda es un rango horario en el que una planta no es consultable. El reparto por CSR (`<CargaCsrPanel>`) usa `primario` para las barras activas y `borde` para las inactivas — una carga desigual entre operadores no es un problema de conexión, es de balance de trabajo, y no se le presta el color de alarma que no le corresponde. El cumplimiento del SLA (`<CumplimientoSlaPanel>`) usa `texto` en la cifra grande sin ningún color condicional: una tasa baja de SLA es una mala noticia operativa, pero tampoco es desconexión, así que no hereda el ámbar. Se verificó por `curl` sobre el HTML servido que las cadenas `text-desconexion`, `bg-desconexion-suave` y `border-desconexion` aparecen exactamente 126 veces cada una — una por celda de la tabla de ventanas (18 plantas × 7 días) — y cero veces fuera de esa tabla.

### Por qué no hay verde en esta pantalla

La regla del plan es que verde (`confirmacion`) se reserva para confirmaciones de homólogo reales, que no existen en el panel operativo. Una tasa de SLA alta no es una confirmación: es una medición agregada del histórico, y por eso `<CumplimientoSlaPanel>` la pinta con `texto` neutro, sin importar si la tasa medida es buena o mala. Igual con la carga por CSR: un reparto equilibrado tampoco es una confirmación, así que las barras activas usan `primario`, no verde. Se comprobó por `curl` que ninguna cadena `confirmacion` aparece en el HTML de `/impacto` en esta tarea (ya lo había verificado la Tarea 6 para el resto de la pantalla).

### Por qué el SLA lleva una leyenda distinta al resto de la pantalla

Todas las demás leyendas de `/impacto` (tarjetas de la Tarea 6, reparto por CSR de esta tarea) dicen «sobre datos simulados», porque describen la sesión activa: arrancan en cero y crecen con lo que el presentador hace delante del cliente. El SLA es distinto: `cumplimientoSla()` (`lib/fuentes/cotizaciones.ts`) lee el histórico completo de `cotizaciones` — 7921 respondidas medidas en este entorno — y lo memoiza por proceso; no se reinicia con `reiniciarSesion()` ni depende de nada que ocurra en la demo. Por eso su leyenda es «Operación simulada acumulada, no la sesión»: deja explícito que esa cifra no es un contador de la sesión en curso, es una medición retrospectiva sobre datos simulados que existían antes de que la sesión empezara. Confundir ambas leyendas haría creer al cliente que el 88% de cumplimiento (6981/7921 medido) es algo que la demo generó en los últimos minutos, cuando en realidad es una propiedad del histórico simulado completo.

### Por qué `DIAS_SLA` no se escribe a mano

`<CumplimientoSlaPanel>` importa `DIAS_SLA` desde `@/lib/reglas-qms` (la Tarea 1 la define y la exporta vía el barril `./sla`) y la interpola en «Respuestas dentro de {DIAS_SLA} días hábiles.». Si el procedimiento QMS cambia el umbral del SLA, el texto de esta pantalla cambia solo con la constante, sin que nadie tenga que acordarse de buscar un «4» hardcodeado en un componente de presentación.

### Por qué el supuesto de días hábiles se declara en pantalla

`diasHabiles()` (que usa `cumplimientoSla()` para calcular la mediana y la tasa) excluye sábados y domingos pero no festivos mexicanos — es una limitación real del cálculo, no un detalle de implementación a esconder. `<CumplimientoSlaPanel>` lo declara literalmente al pie: «Supuesto abierto con SKF: se excluyen sábados y domingos; los festivos locales todavía no, porque falta confirmar cómo los trata el cliente.» Delante del cliente, es preferible declarar el supuesto que dejar que alguien lo descubra comparando fechas.

### Por qué la tabla de ventanas se desplaza horizontalmente en vez de encogerse

Con 18 plantas hay 18 filas y 7 columnas de horario más la columna de planta: `min-w-[640px]` fuerza un ancho mínimo a la tabla y `overflow-x-auto` en el contenedor la deja desplazarse en vez de comprimir las celdas hasta hacerlas ilegibles en pantallas más angostas que las de la escena 6.

## Contrato que exponen estos archivos

### `<CargaCsrPanel>` (`components/impacto/carga-csr.tsx`)

```tsx
function CargaCsrPanel({
  cargas,
  sinAsignar,
}: {
  cargas: readonly CargaCsr[];
  sinAsignar: number;
}): JSX.Element
```

Presentación pura. No ordena `cargas`: asume que ya vienen ordenadas (activos primero, luego por `abiertas` descendente, empate por `codigo`) porque ese orden ya lo produce `resumirOperacion()` en `lib/metricas/operacion.ts` (Tarea 4). El ancho de cada barra es `abiertas / max(1, máximo de abiertas)`, así que con todas las cargas en cero ninguna barra queda a `NaN%`.

### `<CumplimientoSlaPanel>` (`components/impacto/cumplimiento-sla.tsx`)

```tsx
function CumplimientoSlaPanel({ sla }: { sla: CumplimientoSla }): JSX.Element
```

Presentación pura. Formatea con dos `Intl.NumberFormat("es-MX", ...)` a nivel de módulo (uno para porcentaje, uno para enteros con separador de miles) para que «7,921» y «88%» salgan con el formato local sin recalcular el formateador en cada render.

### `<VentanasSemana>` (`components/impacto/ventanas-semana.tsx`)

```tsx
function VentanasSemana({
  franjas,
  minutosSemana,
}: {
  franjas: readonly FranjaVentana[];
  minutosSemana: number;
}): JSX.Element
```

Presentación pura. Deriva la lista de plantas de `franjas` con `[...new Set(franjas.map((f) => f.pdiv))]`, preservando el orden de primera aparición (el de `todasLasPlantas()`). Las columnas de la cabecera se toman de las franjas de la primera planta (`plantas[0]`), asumiendo — como documenta `franjasDeLaSemana()` en la Tarea 3 — que todas las plantas comparten los mismos siete `diaOffset`/`dia`. `hora()` normaliza minutos fuera de `[0, 1440)` con módulo doble, así que una ventana que cruza medianoche (`inicioMin + duracionMin > 1440`) se muestra igual sin desbordar a "25:xx".

### `<Tablero>` (`components/impacto/tablero.tsx`), cambios de esta tarea

- `const { indicadores, panel } = useIndicadores(indicadoresIniciales, panelInicial);` — ahora sí desestructura `panel` (la Tarea 6 lo dejaba sin usar a propósito).
- Sección `titulo-operacion` al final del JSX, solo si `panel !== null`. No se creó un estado de "cargando panel": mientras `panelInicial` sea `null` (no ocurre ya en `/impacto` desde esta tarea, pero sigue ocurriendo en cualquier otro lugar que reuse `<Tablero>` sin pasar panel), la sección completa no se monta.
- **No pinta ningún indicador de estado de canal.** La Tarea 6 ya había retirado `<IndicadorCanal />` de este componente tras una revisión que encontró que contradecía la regla de color de la pantalla proyectada; esta tarea no lo reintroduce bajo ninguna forma, ni un indicador de salud de conexión distinto.

### `app/impacto/page.tsx`, cambios de esta tarea

- Importa `refrescarPanelOperativo` de `@/lib/metricas/acciones` y lo añade al `Promise.all` junto a las tres llamadas que ya tenía.
- Pasa `panelInicial={panel}` (antes `null`) a `<Tablero>`.
- Sigue siendo la única función de esta ruta que toca `lib/fuentes`/`lib/metricas`: `<Tablero>` y sus hijos nuevos reciben datos ya resueltos, ninguno consulta tablas.

## Qué falta / qué NO hace

- No se modificaron `calcularIndicadores()` ni `indicadoresDeSesion()`.
- No se generaron tests (directiva explícita del Plan 4B para toda la Tarea 7 en adelante).
- No se editó ninguna migración.
- No se introdujo ninguna escritura: `refrescarPanelOperativo()` y todo lo que consume son de solo lectura.
- No se reintrodujo `<IndicadorCanal />` ni ningún indicador de salud de conexión en `/impacto`.
- El código de los tres componentes nuevos y las dos modificaciones es literal al brief: nombres, textos de pantalla, clases de Tailwind y el comentario sobre el ámbar se copiaron tal cual. No hubo necesidad de desviarse del código del brief para que `pnpm build` o `pnpm lint` pasaran, a diferencia de la Tarea 6.

## Cómo verificar

1. `pnpm lint` → limpio: `Checked 157 files in 83ms. No fixes applied. Found 1 info.` (el único info preexistente sobre `linter.recommended`/`preset` en `biome.json`, ya presente antes de esta tarea).
2. `pnpm build` → compiló y pasó el type-check (`Compiled successfully`, `Finished TypeScript`). La tabla de rutas sigue incluyendo `ƒ /impacto`.
3. `pnpm test` → `Test Files 17 passed (17)`, `Tests 198 passed (198)`.
4. Verificación de servidor sin navegador (sustituye parcialmente al Paso 6, ver «Verificación manual pendiente» para lo que falta): con `pnpm dev` levantado, `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/impacto` devolvió `200`. Sobre el HTML descargado se comprobó con `grep`:
   - Los tres títulos de sección presentes una vez cada uno: «Reparto por CSR», «Cumplimiento del SLA», «Ventanas de desconexión de la semana».
   - 18 filas de planta en la tabla de ventanas (`designacion py-2 text-texto` aparece 18 veces).
   - Las clases `text-desconexion`, `bg-desconexion-suave` y `border-desconexion` aparecen **126 veces cada una** (18 plantas × 7 días) y no aparecen en ningún otro lugar del documento — confirma que el único ámbar de la pantalla es la tabla de ventanas.
   - Cero apariciones de `confirmacion` (verde) en todo el documento.
   - Cero apariciones de texto o clases de `<IndicadorCanal>` (`Reconectando`, `Sin conexión`, `conectado al canal`).
   - Cifras del SLA renderizadas: `Respondidas` 7,921; `Dentro del SLA` 6,981; `Sin responder` 0; `Mediana` 2 días hábiles — consistente con lo que el brief anticipaba (7921 respondidas, 0 pendientes).
   - `Sin asignar: 0` en el reparto por CSR.
   - Leyenda «Operación simulada acumulada, no la sesión» presente, distinta de «sobre datos simulados».
   - El texto «Respuestas dentro de 4 días hábiles.» se renderiza con el `4` correcto (interpolado desde `DIAS_SLA`, con marcadores de comentario `<!-- -->` de React alrededor del valor dinámico, que es el comportamiento normal de hidratación de Next.js/React y no un defecto).
   - Las horas de la semana se renderizan como «271,8 horas de fábrica no consultable…», con coma decimal (formato es-MX manual del componente, no `Intl`).

## Verificación manual pendiente

El Paso 6 del brief no se ejecutó: este entorno no tiene la extensión de Chrome conectada (`list_connected_browsers` devolvió vacío). Guion exacto a seguir cuando haya navegador disponible:

```bash
pnpm dev
```

1. Abrir `/impacto`. Esperado: los ocho CSR con su barra, los activos arriba; la tasa de SLA con su mediana y sus miles bien formateados («7,921», no «7921»); la tabla de ventanas con una franja ámbar por planta y día (18 filas × 7 columnas).
2. Localizar la planta con `ventanaVariabilidadMin > 0` (variabilidad) en la tabla: sus horas deben verse **distintas** entre columnas/días; el resto de plantas debe repetir la misma hora los siete días.
3. En `/portal`, provocar una solicitud que se asigne a un CSR (buscar algo que genere una solicitud real, no una resuelta por el asistente) y volver a `/impacto` **sin recargar**. Esperado: la barra de ese CSR crece en menos de dos segundos (vía el sondeo de respaldo de `useIndicadores()`, o antes si el canal Realtime está suscrito).
4. En `/demo`, adelantar el reloj simulado varias horas (`relojOffsetMin`). Volver a `/impacto` y recargar. Esperado: la semana proyectada en `<VentanasSemana>` avanzó junto con el reloj — los `diaOffset`/`dia` de las franjas corresponden a los siete días siguientes a la nueva hora simulada, no a los de antes de adelantar el reloj.
5. Revisar a ojo, con la pantalla completa a la vista: el único ámbar es la tabla de ventanas; no hay verde en ningún bloque de esta pantalla (ni SLA, ni carga por CSR, ni las tarjetas de la Tarea 6).

Lo que ya se verificó por otra vía (ver «Cómo verificar», punto 4) es la parte estática: que la ruta responde 200, que los rótulos y leyendas exigidos están en el HTML servido con los datos reales del entorno, y que el ámbar aparece exactamente 126 veces y solo en la tabla de ventanas. Lo que queda pendiente es el comportamiento dinámico (actualización sin recargar tras una asignación real, avance de la semana proyectada al mover el reloj) y la apreciación visual final en el layout real.
