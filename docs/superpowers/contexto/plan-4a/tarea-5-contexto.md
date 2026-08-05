# Tarea 5 — Server Actions del operador

## Estado

completa

No cites el hash de tu propio commit: el archivo va dentro de ese commit y no
puedes conocerlo al escribirlo. Para ubicar el trabajo basta con
`git log --oneline -- app\(\(operador\)\)/acciones.ts`.

## Qué entrega esta tarea

- `app/(operador)/acciones.ts`, tres funciones Server Actions:
  - `detalleDeSolicitud(numero)`: compone el detalle completo de una solicitud
    llamando a los motores (contexto, evaluación, homólogos, estimación).
  - `asignarSolicitud(numero, csr)`: asigna una solicitud a un CSR (o la devuelve
    al montón si `csr` es `null`).
  - `resolverSolicitud(numero, resultado, motivo?)`: marca una solicitud como
    resuelta (cotizada o declinada), con validación de motivos según la ruta QMS.

## Decisiones tomadas y por qué

- **La composición del detalle ocurre en la Server Action, no en la fuente.** El
  módulo `lib/fuentes` devuelve la fila (lectura pura de tabla); los motores
  (`construirContexto`, `evaluarSolicitud`, `homologosDe`, `estimarTE`) viven
  en sus propios módulos. Componer aquí respeta la separación de capas: la lectura
  de tabla no decide ni interpreta.

- **La designación puede no existir en el catálogo, y eso no es error.** El cliente
  escribe `designacionTexto` sin validación. `construirContexto` intenta matchearlo
  con la BD; si no existe, `contexto.designacion` es `null`. En ese caso, no hay
  homólogos ni estimación (se resuelven con `Promise.resolve([])` y `null`). El
  detalle se completa igual — el CSR verá un formulario sin datos técnicos.

- **Paralelización de homólogos y estimación.** Ambas consultas son independientes
  y se hacen con `Promise.all()` para optimizar latencia. Si no hay código (desig
  no existe), se evita la consulta — una BD sin homólogos devolvería un error.

- **Asignación usa `idDeOperador()` para traducir código a id.** La columna
  `solicitudes.csr_asignado` es un `bigint references operadores(id)`. El CSR se
  identifica con su código (ej. `"CSR 1"`), que se traduce a id antes de insertar.
  Si el código no existe, lanza error inmediatamente, antes de intentar la consulta.

- **Resolución con motivos sigue reglas de la BD.** La restricción
  `solicitudes_declinada_tiene_motivo` exige: si `resultado = "declinada"`, debe
  haber `motivo_declinado`. `resolverSolicitud` valida en aplicación:
  - Si resultado es `"cotizada"`, rechaza cualquier `motivo` (contrato SQL).
  - Si resultado es `"declinada"` sin motivo, intenta derivarlo de la clasificación
    QMS con `motivoDeclinado(ruta)`. Este mapeo existe en
    `lib/reglas-qms/motivos.ts` y no se duplica.
  - Si la ruta no declina y no se pasó motivo, falla con error claro antes de
    escribir (mejor que un error de restricción de BD durante demo).

- **La hora de auditoría (`atendida_en`) es real, no simulada.** Se usa
  `new Date().toISOString()` directamente. El reloj simulado en tests gobierna
  las ventanas de fábrica (lógica de negocio), pero la auditoría de quién atendió
  qué y cuándo es un hecho real que debe quedar del lado del servidor, con la
  hora del presentador.

- **Revalidación de `/operador` tras cada cambio.** Se revalida con `revalidatePath`
  para forzar que la bandeja se refesque sin necesidad de un refresh manual.

## Contrato que expone este archivo

`app/(operador)/acciones.ts`:

```ts
export interface DetalleSolicitud {
  fila: SolicitudResumen;
  contexto: ContextoSolicitud;
  evaluacion: EvaluacionQMS;
  homologos: Homologo[];
  estimacion: Estimacion | null;
}

export async function detalleDeSolicitud(numero: string): Promise<DetalleSolicitud | null>
export async function asignarSolicitud(numero: string, csr: string | null): Promise<void>
export async function resolverSolicitud(
  numero: string,
  resultado: "cotizada" | "declinada",
  motivo?: MotivoDeclinado,
): Promise<void>
```

- `detalleDeSolicitud(numero)`: devuelve el detalle completo o `null` si la
  solicitud no existe. Llama en paralelo a homólogos y estimación tras evaluar
  la designación.

- `asignarSolicitud(numero, csr)`: asigna la solicitud al CSR cuyo código es `csr`.
  Si `csr` es `null`, la devuelve al montón. Lanza error si el código no existe.

- `resolverSolicitud(numero, resultado, motivo?)`: marca la solicitud como
  resuelta. Valida la combinación resultado-motivo según reglas SQL y QMS.
  Lanza error si la validación falla o si la actualización en BD falla.

## Qué falta / qué NO hace

- **Sin pantalla aún.** Estas Server Actions no tienen interfaz gráfica que las
  llame. Se conectarán en las tareas 6 y 7, que implementarán las vistas
  respectivas del bandejero y el formulario de resolución.

- Sin tests de integración propios — directiva del usuario, igual que en tareas
  anteriores. La lógica de composición y validación se cubrió indirectamente
  con `pnpm test` (los motores ya tienen cobertura).

- No hay cambios en el modelo de datos ni en las funciones base de las fuentes
  — todo se apoya en lo ya implementado.

## Cómo verificar

```bash
npx tsc --noEmit
```

Salida: vacía (sin errores). TypeScript acepta:
- Las importaciones de tipos de la BD (`SolicitudResumen`, `ContextoSolicitud`, etc.)
- La interfaz `DetalleSolicitud` (se borra en compilación)
- Los tipos de retorno de funciones `async`

```bash
pnpm test
```

Salida literal:

```
 Test Files  17 passed (17)
      Tests  198 passed (198)
   Start at  20:56:17
   Duration  1.72s (transform 1.62s, setup 0ms, import 3.68s, tests 3.82s, environment 3ms)
```

Mismo número de archivos que antes (no se agregó ninguno).

```bash
pnpm build
```

Salida literal (recortada):

```
▲ Next.js 16.2.12 (Turbopack)
✓ Compiled successfully in 5.5s
  Running TypeScript ...
  Finished TypeScript in 5.7s ...
  Collecting page data using 13 workers ...
✓ Generating static pages using 13 workers (5/5) in 656ms

Route (app)
┌ ○ /
├ ○ /_not-found
├ ƒ /api/chat
├ ƒ /api/mock/inventario
├ ƒ /api/mock/pinq
├ ƒ /api/mock/spq
├ ƒ /api/mock/wcl
├ ƒ /demo
├ ƒ /operador
└ ƒ /portal
```

`/operador` sigue siendo una ruta dinámica (`ƒ`), sin problemas de compilación.

```bash
pnpm lint
```

Salida literal (recortada):

```
$ biome check .
Checked 136 files in 77ms. No fixes applied.
Found 1 info.
```

`No fixes applied` confirma que el archivo nuevo (`acciones.ts`) está
correctamente formateado.

## Verificación manual pendiente

Las funciones no tienen interfaz gráfica aún. Para verificar funcionamiento:

1. Ejecutar `pnpm dev`
2. Con herramientas tipo curl o Postman (o browser console), hacer un request
   a `/operador` que ejecute una de las acciones
3. Verificar en Supabase que los cambios se escribieron correctamente

Las tareas 6 y 7 conectarán estas acciones a las vistas del operador.
