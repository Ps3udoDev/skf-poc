# Tarea 7 — Panel de detalle, asignación y resolución

## Estado

completa

No cites el hash de tu propio commit: el archivo va dentro de ese commit y no
puedes conocerlo al escribirlo. Para ubicar el trabajo basta con
`git log --oneline -- components/operador/bandeja.tsx`.

## Qué entrega esta tarea

- `components/operador/lista-solicitudes.tsx`: pasa a componente de cliente
  (`"use client"`) con props nuevas `seleccionada` y `onSeleccionar`; la fila
  es clickeable, con resaltado `bg-primario-suave` en la seleccionada.
- `components/operador/bandeja.tsx` (nuevo): envoltorio de cliente delgado
  dueño del estado de selección; compone la tabla y el panel en una rejilla de
  dos columnas en `xl`.
- `components/operador/panel-detalle.tsx` (nuevo): panel lateral que compone el
  detalle llamando a la Server Action `detalleDeSolicitud` desde el navegador y
  ejecuta `asignarSolicitud` / `resolverSolicitud` con `useTransition`.
- `app/(operador)/operador/page.tsx`: monta `<Bandeja solicitudes cargas />`
  en vez de `<ListaSolicitudes>`; la página sigue siendo componente de servidor
  que hace todas las lecturas.

## Decisiones tomadas y por qué

- **La tabla es componente de cliente, la página no.** Seleccionar una fila es
  interacción y el detalle se compone con una Server Action desde el navegador
  (§6.9 del spec). El estado de selección vive en `<Bandeja>`, un envoltorio
  delgado: la tabla no gana lógica de datos y la página conserva las lecturas
  en servidor. (Decisión del plan, aplicada tal cual.)

- **El motivo de declinación es un selector cerrado, no texto libre.** El enum
  `motivo_declinado` tiene cinco valores y la base los exige; un campo libre
  produciría un error de restricción delante del cliente. La opción vacía
  («Motivo según la clasificación QMS») deja que `resolverSolicitud` derive el
  motivo de la ruta; si la ruta no declina, la acción falla con mensaje claro y
  el panel lo muestra sin escribir nada.

- **Guard contra respuestas fuera de orden.** El `useEffect` que carga el
  detalle marca `vigente = false` al desmontar/cambiar de fila: si el CSR cambia
  de selección antes de que responda la acción, el panel no muestra el detalle
  de la fila anterior.

- **Tras cada acción se recarga el detalle y se hace `router.refresh()`.** La
  Server Action ya hace `revalidatePath("/operador")`; el refresh actualiza la
  tabla (columna CSR / estado) sin recarga manual y el detalle releído refleja
  el nuevo estado en el panel.

- **Adaptación mínima al snippet del plan: formato.** Biome reformató la
  llamada `asignarSolicitud(...)` del selector de CSR a varias líneas
  (`biome check --write`); sin cambio de lógica. Sin otras desviaciones del
  plan.

- **Sin tests nuevos** — directiva del usuario: no se crean archivos de test
  en este plan.

## Contrato que exponen estos archivos

```tsx
// components/operador/bandeja.tsx
export function Bandeja({
  solicitudes,
  cargas,
}: {
  solicitudes: SolicitudResumen[];
  cargas: readonly CargaCsr[];
}): JSX.Element
```

- Dueña del estado de selección; pulsar la fila seleccionada la deselecciona.

```tsx
// components/operador/lista-solicitudes.tsx (cliente)
export function ListaSolicitudes({
  solicitudes,
  seleccionada,
  onSeleccionar,
}: {
  solicitudes: SolicitudResumen[];
  seleccionada: string | null;
  onSeleccionar: (numero: string) => void;
}): JSX.Element
```

```tsx
// components/operador/panel-detalle.tsx (cliente)
export function PanelDetalle({
  numero,
  cargas,
  onCerrar,
}: {
  numero: string;
  cargas: readonly CargaCsr[];
  onCerrar: () => void;
}): JSX.Element
```

- Consume `detalleDeSolicitud`, `asignarSolicitud`, `resolverSolicitud` y el
  tipo `DetalleSolicitud` de `@/app/(operador)/acciones`, y `<EstimacionTE>`
  de `@/components/estimador/estimacion-te`.
- Muestra regla QMS y avisos, existencias, homólogos y estimación (o los
  avisos de «designación inexistente» / «sin base histórica»), el selector de
  CSR y los controles de resolución; una solicitud ya atendida muestra
  resultado, motivo y hora en vez de los botones.

## Qué falta / qué NO hace

- **Sin verificación en navegador** (ver abajo): el recorrido completo de
  selección, asignación y resolución queda pendiente de prueba manual.
- El panel no escribe el parámetro `solicitud` en la URL — la selección vive
  solo en memoria de `<Bandeja>`; `FiltrosBandeja` ya lo borra por adelantado
  si apareciera.
- Sin confirmación guiada de homólogos (eso es la Tarea 8 en adelante).

## Cómo verificar

```bash
pnpm test
```

Salida: `Test Files 17 passed (17)`, `Tests 198 passed (198)` — la suite
sigue en verde; esta tarea es UI y no toca lógica cubierta por tests.

```bash
pnpm build
```

Compila y type-check sin errores; `/operador` sigue siendo ruta dinámica (`ƒ`).

```bash
pnpm lint
```

`Checked 139 files ... No fixes applied. Found 1 info.` (el info es la
deprecación preexistente de `biome.json`, ajena a esta tarea).

## Verificación manual pendiente

No se pudo correr `pnpm dev` + navegador en este entorno. Cuando se pueda, en
`/operador`:

1. Al pulsar una fila se abre el panel con la regla QMS, el punto, las
   existencias y la estimación (o el aviso de que no hay base histórica).
2. Cambiar el CSR en el selector actualiza la columna de la tabla sin recargar
   a mano.
3. *Marcar como cotizada* pasa la fila a estado *Cotizada* y el panel muestra
   la hora de atención.
4. En una solicitud clasificada como `declinar_designacion_invalida`,
   *Declinar* sin elegir motivo funciona y guarda `designacion_invalida`: el
   motivo se derivó de la ruta.
5. En una solicitud cuya ruta no declina (por ejemplo `ingresar_pinq`),
   *Declinar* sin motivo muestra el mensaje de error y no escribe nada.
6. Filtrar por *Atendidas* muestra las recién resueltas.
