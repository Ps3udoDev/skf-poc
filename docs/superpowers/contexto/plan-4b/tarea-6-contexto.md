# Tarea 6 — /impacto: las métricas de la sesión

## Estado

Completada, con dos salvedades:

1. El Paso 6 del brief (verificación visual en el navegador, con el flujo `/portal` → aceptar un candidato → mirar `/impacto` sin recargar) no se pudo ejecutar porque este entorno no tiene la extensión de Chrome conectada (`list_connected_browsers` devolvió vacío). En su lugar se levantó `pnpm dev` y se verificó con `curl` que `/impacto` responde 200 y que su HTML contiene los rótulos esperados (ver «Cómo verificar» y «Verificación manual pendiente»).
2. **Enmienda posterior a la implementación inicial:** el Paso 4 del brief mandaba montar `<IndicadorCanal />` en `<Tablero>`. La revisión de código detectó que ese componente contradice dos cosas explícitas — la regla de color del propio brief («verde significa confirmación y solo lo lleva el bloque de confirmaciones de homólogo») y el docstring de `<IndicadorCanal>`, que dice ser «SOLO para el panel `/demo` del presentador: las pantallas que ve el cliente no muestran jamás la fontanería del demo» —. Se elevó al usuario, que resolvió: gana la regla de color. Se quitó `<IndicadorCanal />` de `/impacto`; ver «Por qué se quitó `<IndicadorCanal />` del tablero» más abajo. Esto es una **desviación deliberada del Paso 4 del brief**, no un olvido.

## Qué entrega esta tarea

- `app/impacto/page.tsx`: la ruta `/impacto`, Server Component que lee `leerSesion()`, `todasLasPlantas()` e `indicadoresDeSesion()` en paralelo y monta `<Tablero>` dentro de `<ProveedorSesion>`, con `panelInicial={null}`.
- `components/impacto/tablero.tsx`: `<Tablero>`, el Client Component que llama a `useIndicadores()` (Tarea 5) y pinta las siete tarjetas de métrica y la gráfica de búsquedas por hora. No pinta ningún indicador de estado de canal (ver «Por qué se quitó `<IndicadorCanal />` del tablero»).
- `components/impacto/tarjeta-metrica.tsx`: `<TarjetaMetrica>`, la tarjeta genérica con etiqueta, valor grande, nota opcional y leyenda («sobre datos simulados» por defecto).
- `components/impacto/busquedas-por-hora.tsx`: `<BusquedasPorHora>`, la gráfica de barras de Recharts con las 24 horas siempre presentes (rellenando con 0 las que no tienen datos).
- `components/marco/barra-superior.tsx`: se amplió el tipo de `perfil` a `"cliente" | "operador" | "impacto"` y se añadió el tercer enlace de la pestaña, «Impacto», después de «Servicio al Cliente». `/demo` sigue sin enlace.

## Decisiones tomadas y por qué

### Por qué esta pantalla no consulta tablas directamente

`app/impacto/page.tsx` solo llama a `leerSesion()`, `todasLasPlantas()` (de `lib/fuentes`) e `indicadoresDeSesion()` (de `lib/metricas`), que ya eran las funciones autorizadas a tocar la base. Ni `<Tablero>` ni sus hijos hacen ninguna consulta: `<Tablero>` recibe `indicadoresIniciales` como prop y delega en `useIndicadores()` (Tarea 5) para mantenerlos vivos vía Realtime/sondeo. Se respeta la restricción de que `lib/fuentes` es la única capa que consulta tablas.

### Por qué `panelInicial={null}` en esta tarea

`<Tablero>` ya recibe la prop `panelInicial: PanelOperativo | null` en su firma, pero la página la pasa como `null` deliberadamente. Con `null`, `useIndicadores()` (ver su propio contrato en la Tarea 5) no llama a `refrescarPanelOperativo()`: el hook solo mantiene vivos los indicadores. Esto deja la pantalla funcional sin depender del panel operativo, que es contenido de la Tarea 7. `<Tablero>` no tiene todavía ningún código que consuma `panel` — ese hueco es exactamente lo que la Tarea 7 rellena.

### Por qué ningún color ámbar aparece en esta pantalla

Ninguno de los componentes de esta tarea (`<TarjetaMetrica>`, `<BusquedasPorHora>`, `<Tablero>`) referencia el token `desconexion` ni ningún color crudo de Tailwind: los fondos, bordes y textos usan `primario`, `primario-suave`, `texto`, `texto-tenue`, `borde`, `fondo` y `fondo-sutil`, confirmados contra `app/globals.css`. Se verificó con `grep` sobre el HTML servido que la cadena `desconexion` no aparece en absoluto en `/impacto`.

### Por qué «Resueltas sin solicitud» usa el color primario y no verde

`tasaResueltasSinSolicitud` es una tasa alta de resolución sin intervención humana — una buena noticia operativa, pero no es una confirmación de homólogo. Ninguna tarjeta de métrica usa verde (`confirmacion`): las tarjetas usan `destacada` (borde y fondo `primario`/`primario-suave`) solo en «Solicitudes evitadas», siguiendo el código exacto del brief; el resto usa el estilo neutro (`border-borde bg-fondo`). Con `<IndicadorCanal />` fuera del tablero (ver siguiente sección), `/impacto` no tiene **ninguna** aparición del token `confirmacion` en absoluto: el verde queda completamente reservado a donde sí significa una confirmación de homólogo real, que en esta pantalla ni siquiera es un color — es la cifra neutra de la tarjeta «Errores de homólogo prevenidos».

### Por qué se quitó `<IndicadorCanal />` del tablero (desviación deliberada del Paso 4 del brief)

La implementación inicial de esta tarea siguió el Paso 4 del brief literalmente y montó `<IndicadorCanal />` dentro de `<Tablero>`, en un `<div className="flex justify-end">` que solo existía para colocarlo. La revisión de código encontró una contradicción real, no cosmética: `<IndicadorCanal>` (`components/sesion/indicador-canal.tsx`) pinta verde (`confirmacion`/`bg-confirmacion-suave`) cuando el canal Realtime está `suscrito` — un estado de fontanería de conexión, no una confirmación de homólogo — y en el peor caso pinta un badge rojo de «Canal con error: activo el respaldo por sondeo» delante del cliente. Esto choca con dos cosas explícitas del propio plan: (1) la regla de color del brief («verde significa confirmación y solo lo lleva el bloque de confirmaciones de homólogo»), y (2) el docstring del propio componente, que declara ser «SOLO para el panel `/demo` del presentador: las pantallas que ve el cliente no muestran jamás la fontanería del demo».

El hallazgo se elevó al usuario porque contradecía el texto literal del plan (que sí mandaba montarlo). El usuario decidió: gana la regla de color. Se quitó `<IndicadorCanal />` de `components/impacto/tablero.tsx`, junto con el `<div className="flex justify-end">` que solo existía para contenerlo, y no se sustituyó por ningún otro indicador de salud de conexión: la señal de estado del canal vive en `/demo` (que no se proyecta), y si el canal Realtime cae, el respaldo por sondeo de `useIndicadores()` (`MS_INTERVALO_SONDEO`, cada 2 s, ver Tarea 5) sigue refrescando las cifras igual — el usuario proyectado nunca necesita saber por qué mecanismo se actualizó.

`components/sesion/indicador-canal.tsx` y su uso en `/demo` **no se tocaron**: siguen exactamente como los dejó el Plan 3/Tarea 5.

### Por qué los 12 minutos no se repiten a mano

La tarjeta «Minutos de operador liberados» interpola `MINUTOS_POR_SOLICITUD` (importada de `@/lib/metricas/calculo`) dentro del texto de la nota: `` `Supuesto del POC: ${MINUTOS_POR_SOLICITUD} minutos por solicitud evitada...` ``. Si la constante cambia en el futuro, el texto en pantalla cambia con ella sin tocar este archivo.

### Por qué la gráfica siempre dibuja las 24 horas

`serie()` en `busquedas-por-hora.tsx` genera un arreglo de longitud fija 24 (`Array.from({ length: 24 }, ...)`) y rellena con `0` las horas sin datos en `indicadores.busquedasPorHora`. Antes de que ocurra cualquier evento en la sesión, la gráfica muestra 24 barras en cero — no un estado vacío decorativo ni una gráfica con una o dos barras sueltas que no se lee.

### Error de tipos de Recharts frente al código literal del brief

El código del brief para `<Tooltip formatter={...}>` anota el parámetro como `(valor: number) => [...]`. Contra `recharts@3.10.1` (la versión instalada), el tipo `Formatter` espera `(value: ValueType | undefined, ...)`, y `number` no es asignable a `ValueType | undefined` en sentido contravariante — `pnpm build` fallaba el type-check con ese anotado explícito. Se quitó únicamente la anotación de tipo del parámetro (`(valor) => [String(valor), "Búsquedas"]`), dejando que TypeScript infiera el tipo desde la posición contextual del prop `formatter`. El comportamiento en tiempo de ejecución es idéntico al del brief; es el único carácter que se desvía del código literal, y fue necesario para que `pnpm build` compilara.

## Contrato que exponen estos archivos

### `<TarjetaMetrica>` (`components/impacto/tarjeta-metrica.tsx`)

```tsx
function TarjetaMetrica({
  etiqueta,
  valor,
  leyenda = "sobre datos simulados",
  nota,
  destacada = false,
}: {
  etiqueta: string;
  valor: string;
  leyenda?: string;
  nota?: string;
  destacada?: boolean;
}): JSX.Element
```

Componente de presentación puro (no `"use client"`, no hooks). `valor` es siempre `string`: el llamador decide el formato (número plano con `String(...)`, o porcentaje con `Intl.NumberFormat`).

### `<BusquedasPorHora>` (`components/impacto/busquedas-por-hora.tsx`)

```tsx
"use client";
function BusquedasPorHora({ datos }: { datos: Record<string, number> }): JSX.Element
```

`datos` es `Indicadores["busquedasPorHora"]` tal cual la produce `calcularIndicadores()`: claves son horas del día en Ciudad de México como string (`"0"`..`"23"`), valores son conteos. El componente no filtra ni ordena: rellena las 24 horas él mismo.

### `<Tablero>` (`components/impacto/tablero.tsx`)

```tsx
"use client";
function Tablero({
  indicadoresIniciales,
  panelInicial,
}: {
  indicadoresIniciales: Indicadores;
  panelInicial: PanelOperativo | null;
}): JSX.Element
```

- No pinta ningún indicador de estado de canal: `<IndicadorCanal>` se quitó deliberadamente (ver «Por qué se quitó `<IndicadorCanal />` del tablero»). `<Tablero>` ya no depende de `useSesion()`/`<ProveedorSesion>` directamente, aunque `app/impacto/page.tsx` lo sigue montando dentro de `<ProveedorSesion>` porque `<BarraSuperior>` sí lo necesita (`IndicadorPlantas`, `IndicadorModo`, `DistintivoDemo`).
- Internamente llama a `useIndicadores(indicadoresIniciales, panelInicial)` y solo desestructura `{ indicadores }` — **no** desestructura `panel` todavía.
- **Punto de extensión para la Tarea 7:** el panel operativo se monta dentro de este mismo componente. La Tarea 7 debe:
  1. Desestructurar también `panel` de `useIndicadores(...)`.
  2. Añadir la sección/componente del panel operativo en el JSX de `<Tablero>` (por ejemplo, entre la sección `titulo-metricas` y `<BusquedasPorHora>`, o donde el diseño de la Tarea 7 lo indique).
  3. No tocar la firma de `<Tablero>`: `panelInicial` ya está declarado y ya se pasa al hook: `app/impacto/page.tsx` seguirá pasando el valor real de `panelInicial` una vez la Tarea 7 lo calcule server-side (hoy pasa `null` a propósito).

## Qué falta / qué NO hace

- **`panelInicial={null}` es deliberado.** `app/impacto/page.tsx` pasa `null` a propósito en esta tarea; la Tarea 7 lo sustituye por el `PanelOperativo` real (probablemente calculado con `resumirOperacion()` de `lib/metricas/operacion.ts`, siguiendo el patrón de `EntradaOperacion`). Mientras `panelInicial` sea `null`, `useIndicadores()` no llama a `refrescarPanelOperativo()` y `panel` se queda en `null` para siempre en esta pantalla.
- `<Tablero>` no renderiza absolutamente nada relacionado con el panel operativo (cargas por CSR, SLA, franjas de ventana): eso es contenido íntegro de la Tarea 7.
- No se modificaron `calcularIndicadores()` ni `indicadoresDeSesion()`.
- No se generaron tests (directiva explícita del Plan 4B).
- No se editó ninguna migración.
- No se introdujo ninguna escritura: toda la pantalla es de solo lectura (Server Actions de lectura vía `useIndicadores()`, más las tres funciones de `page.tsx`).
- El código se desvía del brief en dos puntos, ambos documentados en «Decisiones tomadas»: (1) la anotación de tipo quitada en `formatter={(valor) => ...}` de `<BusquedasPorHora>`, necesaria para que `pnpm build` compilara; (2) la eliminación de `<IndicadorCanal />` del Paso 4, una desviación deliberada resuelta por el usuario tras un hallazgo de revisión, no un olvido. Todo lo demás —nombres, textos, clases de Tailwind, comentarios— es literal.

## Cómo verificar

1. `pnpm lint` → limpio, solo el info preexistente sobre `linter.recommended` en `biome.json`. Nota: Biome reformateó el `<section>` de `busquedas-por-hora.tsx` a multilínea; se corrió `biome check --write .` antes de la verificación final.
2. `pnpm build` → compiló y pasó el type-check. La tabla de rutas de la salida incluye `ƒ /impacto` junto a `/demo`, `/operador` y `/portal`.
3. `pnpm test` → 198 tests en verde, 17 archivos.
4. Verificación de servidor sin navegador (sustituye parcialmente al Paso 6 del brief, ver «Verificación manual pendiente» para lo que falta): con un servidor `next dev` ya corriendo en `http://localhost:3000` (levantado en una sesión anterior de este mismo entorno), `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/impacto` devolvió `200`. Se descargó el HTML completo y se comprobó con `grep` que contiene, entre otros: `>Impacto<` (el enlace de la barra), `Impacto de la sesión`, `Solicitudes evitadas`, `Minutos de operador liberados`, `Supuesto del POC`, `Errores de homólogo prevenidos`, `Avisos anticipados`, `Solicitudes generadas`, `Resueltas sin solicitud`, `Llamadas al modelo`, `Búsquedas por hora`, y diez apariciones de `sobre datos simulados` (una por tarjeta más la de la gráfica; el HTML servido duplica ese texto porque Next.js embebe además el payload de React Server Components en la misma respuesta). Se confirmó que la cadena `desconexion` **no aparece ni una sola vez** en el HTML servido. Se confirmó que `href="/demo"` no aparece en ningún enlace de la barra (solo `/portal`, `/operador` e `/impacto`).

## Verificación manual pendiente

El Paso 6 del brief —abrir `/impacto` antes de cualquier evento y comprobar a ojo que todo está en cero sin estado vacío decorativo; confirmar la pestaña «Impacto» en la barra y que `/demo` sigue sin enlace; en otra ventana buscar `DEMO-6205-2RSH/C` (truncada) en `/portal` y aceptar un candidato; volver a `/impacto` sin recargar y comprobar que «Solicitudes evitadas» sube y la barra de la hora actual crece en la gráfica; revisar a ojo que ningún ámbar aparece en la pantalla— **no se ejecutó**: este entorno no tiene la extensión de Chrome conectada (`list_connected_browsers` devolvió vacío).

Lo que sí se verificó por otra vía (ver punto 4 de «Cómo verificar») es la parte estática: que la ruta responde 200, que todos los rótulos y leyendas exigidos por el brief están presentes en el HTML servido, y que ningún rastro del token `desconexion` aparece en la pantalla. Lo que queda pendiente de comprobar visualmente es el comportamiento dinámico: que el hook `useIndicadores()` efectivamente re-renderiza `<Tablero>` con la cifra nueva tras aceptar un candidato en `/portal`, que la gráfica de búsquedas por hora crece en la barra correcta, y la apreciación visual final de que "ningún ámbar" es cierto también en el layout real (no solo en el código fuente).

Para completar esta verificación cuando haya navegador disponible:

```bash
pnpm dev
```

1. Abrir `/impacto` **antes** de hacer nada más. Esperado: todo en cero, sin estado vacío decorativo — tiene que verse que aún no ha pasado nada.
2. Comprobar que la pestaña «Impacto» aparece en la barra y que `/demo` sigue sin enlace.
3. En otra ventana, `/portal`: buscar `DEMO-6205-2RSH/C` (truncada) y aceptar un candidato.
4. Mirar `/impacto` **sin recargar**. Esperado: «Solicitudes evitadas» sube y la barra de la hora actual crece en la gráfica.
5. Revisar a ojo: ningún ámbar en la pantalla, la tarjeta de minutos dice «Supuesto del POC: 12 minutos…», y cada tarjeta lleva «sobre datos simulados».
