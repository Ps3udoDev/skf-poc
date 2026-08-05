# Tarea 12 — Encolar una intención durante la ventana

## Estado

completa

No cites el hash de tu propio commit: el archivo va dentro de ese commit y no
puedes conocerlo al escribirlo. Para ubicar el trabajo basta con
`git log --oneline -- "app/(portal)/portal/acciones.ts"`.

## Qué entrega esta tarea

- `app/(portal)/portal/acciones.ts`: nuevas acciones `encolarIntencion` y
  `listarIntenciones`; imports ampliados con `intencionesDesde` y el tipo
  `Intencion` desde `@/lib/fuentes`.
- `components/portal/detalle-designacion.tsx`: nueva prop `plantaEnVentana` y
  el bloque ámbar de encolado junto al TE estimado.
- `components/portal/tarjeta-sugerencia.tsx`: pasa `plantaEnVentana` hacia
  `DetalleDesignacion`.
- `components/portal/cola-intenciones.tsx` (nuevo): la cola del cliente con
  refresco por cambio de sesión.
- `app/(portal)/portal/page.tsx`: monta `<ColaIntenciones />` después de
  `<Buscador />`.

## Decisiones tomadas y por qué

- **El dato `resultado.plantasEnVentana` ya existía.** `conEstimaciones` en
  `acciones.ts` ya lo calcula por candidato con `plantaCompleta` +
  `estadoDePlanta` + `ahoraSimulada(sesion.relojOffsetMin)` +
  `sesion.plantasOverride`, y `resultado-busqueda.tsx` ya lo pasa a
  `TarjetaSugerencia` (que ya recibía la prop `plantaEnVentana` desde la Tarea
  10). No hubo que añadir el cálculo: solo faltaba propagar la prop un nivel
  más abajo, hasta `DetalleDesignacion`.

- **El bloque de encolado va envuelto en un `<div>` junto al ternario del
  TE.** El plan decía «dentro de la columna de la estimación, envuelve ambos
  en un fragmento», pero en el archivo real el ternario `{estimacion ? … : …}`
  **es** la segunda columna del grid, sin contenedor. Añadir el bloque ámbar
  como tercer hijo suelto del grid habría creado una celda desbordada en
  `lg:grid-cols-[…]`, así que ternario y bloque van dentro de un `<div>` que
  forma la segunda columna. Es la misma intención del plan con la estructura
  real del archivo.

- **Supresión de Biome en `ColaIntenciones`.** El snippet del plan usa
  `useEffect(…, [refrescar, sesion])` con `sesion` como señal de refresco (no
  se lee dentro del efecto), y `lint/correctness/useExhaustiveDependencies` lo
  marca como dependencia superflua. Se añadió
  `// biome-ignore lint/correctness/useExhaustiveDependencies: …` con la
  justificación, en vez de reestructurar el efecto contra lo que pide el plan.

- **`encolarIntencion` rechaza fuera de ventana con el estado real** (reloj
  simulado + override del presentador), no con una validación defensiva: es la
  regla que da sentido a la escena 4. El estado `encolada` va en ámbar
  (`desconexion`) porque la cola existe por la desconexión; `confirmada` en
  verde; `ajustada` y `escalada` en neutro.

- **Sin desviaciones del resto de snippets.** Las dos acciones, el bloque de
  encolado, `cola-intenciones.tsx` y el montaje en `page.tsx` se escribieron
  tal cual los dicta el plan; Biome solo reordenó imports y reindentó.

- **Sin tests nuevos** — directiva del usuario: no se crean archivos de test
  en este plan.

## Contrato que exponen estos archivos

```ts
// app/(portal)/portal/acciones.ts
export async function encolarIntencion(
  codigo: string,
  cantidad: number,
): Promise<{ id: number; pdiv: string }>;
// Lanza si la designación no existe, si la planta no existe o si la planta
// NO está en `ventana`. Inserta en `intenciones_pedido` con `clienteAdmin`,
// emite `intencion_encolada` (perfil cliente) y revalida `/portal`.

export async function listarIntenciones(): Promise<Intencion[]>;
// Cola de la sesión: `intencionesDesde(sesion.iniciadaEn)`.
```

```tsx
// components/portal/detalle-designacion.tsx (firma ampliada)
export function DetalleDesignacion({
  sugerencia: Sugerencia;
  estimacion: Estimacion | null;
  cantidad: number;
  plantaEnVentana: { pdiv: string; planta: string } | null; // NUEVA
}): JSX.Element;
```

```tsx
// components/portal/cola-intenciones.tsx
export function ColaIntenciones(): JSX.Element | null; // null si la cola está vacía
```

- `TarjetaSugerencia` ya tenía `plantaEnVentana`; ahora la propaga a
  `DetalleDesignacion`. `resultado-busqueda.tsx` no se tocó.
- Consume `obtenerDesignacion`, `plantaCompleta`, `intencionesDesde`,
  `estadoDePlanta`, `ahoraSimulada`, `leerSesion`, `clienteAdmin`,
  `emitirEvento` — todos preexistentes.

## Qué falta / qué NO hace

- **No reconcilia la cola**: la intención queda en `encolada` hasta que
  `cerrarVentanaEnCurso` la resuelva (Tarea 13).
- **No hay canal Realtime sobre `intenciones_pedido`**: el refresco llega por
  el cambio de sesión (override de plantas), que es suficiente para la escena.

## Cómo verificar

```bash
pnpm test
```

Salida: `Test Files 17 passed (17)`, `Tests 198 passed (198)` — la suite
completa sigue en verde.

```bash
pnpm build
```

Compila y type-check sin errores (`✓ Compiled successfully`).

```bash
pnpm lint
```

`Checked 144 files ... Found 1 info.` (el info es la deprecación preexistente
de `biome.json`, ajena a esta tarea).

## Verificación manual pendiente

No se pudo ejecutar la verificación con navegador (entorno sin sesión
interactiva). Cuando se retome, el guion del plan (paso 5 de la Tarea 12) es:

1. En `/demo`, forzar `P103` a *ventana*.
2. En `/portal`, modo *con la solución*, buscar `DEMO-VENTANA` y pedir
   cantidad: la tarjeta muestra el aviso ámbar y el botón *Encolar intención
   de pedido*.
3. Al pulsarlo, mensaje de intención registrada y fila **En cola** en ámbar en
   la cola de abajo.
4. Devolver `P103` a *online*: el botón desaparece; encolar con la planta viva
   devuelve el error de «no está en ventana».
5. SQL: `select tipo, designacion, pdiv from eventos_demo where tipo =
   'intencion_encolada' order by ocurrido_en desc limit 3;` devuelve el
   evento.
