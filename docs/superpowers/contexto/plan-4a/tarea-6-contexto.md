# Tarea 6 — Filtros de la bandeja

## Estado

completa

No cites el hash de tu propio commit: el archivo va dentro de ese commit y no
puedes conocerlo al escribirlo. Para ubicar el trabajo basta con
`git log --oneline -- components/operador/filtros-bandeja.tsx`.

## Qué entrega esta tarea

- `components/operador/filtros-bandeja.tsx` (nuevo): barra de filtros de la
  bandeja (estado, clasificación QMS, CSR, botón Limpiar). Escribe los filtros
  en la URL con `router.replace`, no en `useState`.
- `components/operador/lista-solicitudes.tsx`: dos columnas nuevas, CSR y
  Estado, entre Antigüedad y Clasificación QMS.
- `app/(operador)/operador/page.tsx`: la página lee `searchParams`, valida los
  valores contra listas cerradas (`RUTAS_QMS`, los dos estados), construye el
  `FiltroBandeja` y carga `solicitudesFiltradas` y `cargaPorCsr` en paralelo
  con el resto de lecturas.

## Decisiones tomadas y por qué

- **Los filtros viven en la URL.** `/operador?estado=abierta&csr=sin-asignar`
  sobrevive a la recarga, al `revalidatePath` de las acciones y al botón de
  atrás; con estado local la bandeja se reiniciaría delante del cliente. (Es
  la decisión del plan, aplicada tal cual.)

- **Validación contra listas cerradas.** `searchParams` es texto del navegador
  que termina en un `.eq()`; lo que no coincide con `RUTAS_QMS` o con
  `abierta`/`atendida` se ignora en vez de producir un filtro silenciosamente
  vacío. El valor especial `csr=sin-asignar` se traduce a `csr: null` en el
  filtro (las no asignadas); cualquier otro código se pasa tal cual y
  `solicitudesFiltradas` devuelve `[]` si el operador no existe.

- **`FiltrosBandeja` borra el parámetro `solicitud` al cambiar un filtro.** La
  solicitud abierta en el panel (Tarea 7) puede quedar fuera del nuevo filtro;
  el plan ya deja previsto ese parámetro aunque todavía nada lo escribe.

- **Adaptación mínima al snippet del plan: orden del import de
  `@/lib/reglas-qms`.** El plan escribe `import { type RutaQMS, RUTAS_QMS }`,
  pero Biome (`assist/source/organizeImports`) exige `RUTAS_QMS` antes que el
  tipo: quedó `import { RUTAS_QMS, type RutaQMS }`. Sin otro cambio respecto
  al plan.

- **El resto de la página se conservó tal cual** (métricas, marco, chat); solo
  cambiaron imports, firma, bloque de carga y la inserción de
  `<FiltrosBandeja cargas={cargas} />` entre métricas y lista.

- **Sin tests nuevos** — directiva del usuario: no se crean archivos de test
  en este plan.

## Contrato que exponen estos archivos

```tsx
// components/operador/filtros-bandeja.tsx
export function FiltrosBandeja({ cargas }: { cargas: readonly CargaCsr[] }): JSX.Element
```

- Lee y escribe los parámetros `estado`, `clasificacion` y `csr` de la URL;
  `csr=sin-asignar` representa las solicitudes sin asignar. El botón Limpiar
  devuelve la URL a `/operador`.

```tsx
// components/operador/lista-solicitudes.tsx (sin cambio de firma en esta tarea)
export function ListaSolicitudes({ solicitudes }: { solicitudes: SolicitudResumen[] }): JSX.Element
```

- La tabla muestra ahora `csrAsignado` (monoespaciada, o «Sin asignar») y el
  estado derivado de `atendidaEn`/`resultado`: Abierta, Cotizada (verde) o
  Declinada (neutro, nunca rojo: declinar es un resultado legítimo del
  procedimiento).

```tsx
// app/(operador)/operador/page.tsx
export default async function PaginaOperador({ searchParams }: { searchParams: Parametros }): Promise<JSX.Element>
```

- Consume `solicitudesFiltradas`, `cargaPorCsr`, `FiltroBandeja`,
  `EstadoSolicitud` de `@/lib/fuentes` y `RUTAS_QMS`, `RutaQMS` de
  `@/lib/reglas-qms`.

## Qué falta / qué NO hace

- **La tabla aún no es interactiva**: no hay selección de fila ni panel de
  detalle. Eso es la Tarea 7, que convertirá `ListaSolicitudes` en componente
  de cliente y montará `<Bandeja>`.
- El parámetro `solicitud` de la URL todavía no lo escribe ni lo lee nadie;
  `FiltrosBandeja` solo lo borra al cambiar filtros, por adelantado.
- Sin verificación en navegador (ver abajo).

## Cómo verificar

```bash
pnpm test
```

Salida: `Test Files 17 passed (17)`, `Tests 198 passed (198)` — la suite
sigue igual; esta tarea no toca lógica cubierta por tests.

```bash
pnpm build
```

Compila y type-check sin errores; `/operador` sigue siendo ruta dinámica (`ƒ`).

```bash
pnpm lint
```

`Checked 137 files ... No fixes applied. Found 1 info.` (el info es la
deprecación preexistente de `biome.json`, ajena a esta tarea).

## Verificación manual pendiente

No se pudo correr `pnpm dev` + navegador en este entorno. Cuando se pueda, en
`/operador` con las solicitudes de la Tarea 4 en la base:

1. Las columnas CSR y Estado aparecen; el código del CSR se ve en monoespaciada.
2. Filtrar por *Abiertas* mantiene las tres; filtrar por un CSR concreto deja
   solo la suya.
3. *Sin asignar* deja la tabla vacía (todas se autoasignaron) y la URL muestra
   `?csr=sin-asignar`.
4. Recargar con el filtro puesto lo conserva.
5. *Limpiar* devuelve la URL a `/operador`.
