# Plan 4B — Evidencia y entrega

> **Para agentes ejecutores:** SUB-SKILL REQUERIDA: usa `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans` para implementar tarea por tarea. Los pasos usan casillas (`- [ ]`) para seguimiento.

**Objetivo:** Cerrar el POC — `/impacto` con indicadores vivos y panel operativo, el chat del lado operador que faltaba para la escena 5, y la entrega (README, despliegue y ensayo cronometrado) — de modo que el guion de las ocho escenas se recorra completo sobre un despliegue real.

**Arquitectura:** 4B **solo lee**. No añade ninguna escritura de negocio y no toca los motores del Plan 3 ni los emisores de eventos del Plan 4A. Se conservan las cinco capas existentes: `lib/reglas-qms` y `lib/operacion` para lógica pura, `lib/fuentes` como única capa que consulta tablas, `lib/metricas` para agregación y Server Actions para todo lo que el navegador invoca. Los agregados nuevos viven fuera de `Indicadores`, que el contrato congela. La única migración es una línea de publicación de Realtime.

**Stack:** Next.js 16.2 App Router · React 19.2 · TypeScript · Tailwind CSS v4 · shadcn/ui · Recharts 3.10 · Supabase (cloud) · AI SDK v7 · Biome

**Documento que fija los contratos:** `docs/superpowers/specs/2026-08-04-plan-4b-evidencia-y-entrega-design.md`, que a su vez amplía `2026-08-04-contratos-fase-4.md` §7. Lo que ahí está escrito, este plan lo respeta; lo que no está escrito, lo decide este plan y lo deja anotado en el contexto de la tarea.

---

## Restricciones globales

Se heredan del Plan 3, del Plan 4A y del §3 del spec. Cada tarea las cumple sin excepción.

- **Todo en español:** archivos, carpetas, funciones, variables, tipos, comentarios y textos de pantalla. Única excepción: los componentes vendorizados en `components/ui/`.
- **Cero datos reales de SKF.** Operadores como `CSR 1`, `CSR 2`… nunca nombres de personas.
- **`lib/fuentes` es la única capa que consulta tablas.** Ningún componente ni Server Action abre una consulta por su cuenta.
- **4B no introduce ninguna escritura.** Si una tarea parece necesitar un `insert` o un `update`, está mal entendida: se detiene y se consulta.
- **`calcularIndicadores()` e `indicadoresDeSesion()` no se modifican.** Dos implementaciones de la misma métrica es cómo se llega a dos cifras distintas en dos pantallas durante la presentación.
- **Ámbar (`desconexion`) es exclusivo de desconexión; verde (`confirmacion`), exclusivo de confirmación;** rojo (`error`) solo error. Una tasa de SLA alta **no** es verde. Toda designación va en monoespaciada (clase `designacion`).
- **Toda cifra lleva su leyenda:** «sobre datos simulados» en lo de la sesión, «operación simulada acumulada» en el bloque de SLA, que no es de la sesión.
- **`MINUTOS_POR_SOLICITUD = 12` se declara en pantalla como supuesto,** leyendo la constante de `lib/metricas/calculo.ts`, nunca repitiendo el número a mano.
- **Ninguna estimación se presenta como confirmada.**
- **`emitirEvento()` no lanza jamás,** y 4B no añade emisores nuevos.
- **Nada de `Math.random()` en decisiones de presentación.** El orden de la carga por CSR es determinista a propósito: el ensayo se repite varias veces y tiene que verse igual.
- **Una sola migración, `000009`, y solo la línea de publicación** del §4 del spec. Las vigentes llegan hasta `000008` y no se editan; el hueco `000004` es deliberado. Cualquier otra necesidad de esquema detiene la tarea.
- **`/demo` no se proyecta nunca.** No se le añade nada pensado para proyectarse.
- **Biome.** Su reordenamiento de imports y sus ajustes de formato son esperados, no desviación. Corre `pnpm lint` antes de cada commit.

### Sin tests: cuál es el ciclo de verificación

**Este plan no genera tests, por directiva explícita del usuario**, igual que el Plan 4A. Es una desviación consciente del ciclo TDD habitual y queda registrada como deuda en el §13 del spec.

En su lugar, **cada tarea termina con este ciclo**, y ningún commit se hace sin completarlo:

1. `pnpm lint` — limpio, salvo el info preexistente de la deprecación de `biome.json`.
2. `pnpm build` — compila y pasa el type-check.
3. `pnpm test` — **198 tests en verde**. 4B no puede romper lo que ya pasaba. Si el número baja, la tarea está incompleta.
4. La verificación manual concreta que indica la tarea, con su resultado esperado.
5. Escribir el contexto y commitear.

Los módulos puros que este plan añade —`diasHabiles`, `franjasDeLaSemana`, `resumirOperacion`— son exactamente los que un test fijaría en dos minutos. Quedan enumerados en el §13 del spec para cuando se retome la cobertura.

### Contrato de contexto por tarea (obligatorio)

Cada tarea **debe** escribir `docs/superpowers/contexto/plan-4b/tarea-N-contexto.md` y **commitearlo junto con el código**. Va versionado a propósito: si la sesión se corta por límite de tokens, otro agente retoma desde ahí sin acceso a esta conversación.

Estructura mínima, en español:

```markdown
# Tarea N — <título>

## Estado
<completa | en curso | bloqueada>

## Qué entrega esta tarea
<dos o tres frases>

## Decisiones tomadas y por qué
<las que no son obvias leyendo el código>

## Contrato que exponen estos archivos
<funciones exportadas con sus firmas exactas, para quien las consuma después>

## Qué falta / qué NO hace
<explícito, para que nadie asuma de más>

## Cómo verificar
<comandos exactos y qué debe salir>

## Verificación manual pendiente
<si quedó alguna sin ejecutar, con el guion exacto>
```

No cites el hash de tu propio commit: el archivo va dentro de ese commit y no puedes conocerlo al escribirlo. Para ubicar el trabajo basta `git log --oneline -- <ruta>`.

---

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `lib/reglas-qms/sla.ts` | Días hábiles y umbral del SLA (puro) |
| `lib/reglas-qms/index.ts` | *(se amplía)* Re-exporta `./sla` |
| `lib/ai/herramientas.ts` | *(se amplía)* Importa `diasHabiles` en vez de su copia privada; sexta herramienta solo para el operador |
| `lib/fuentes/cotizaciones.ts` | *(se amplía)* Cumplimiento del SLA sobre el histórico, paginado y memoizado |
| `lib/estado-fabricas/semana.ts` | Franjas de ventana de los próximos siete días (puro) |
| `lib/estado-fabricas/index.ts` | *(se amplía)* Re-exporta `./semana` |
| `lib/metricas/operacion.ts` | Agregado operativo: carga, SLA y ventanas (puro) |
| `lib/metricas/acciones.ts` | Server Actions de refresco de indicadores y de panel |
| `components/metricas/uso-indicadores.ts` | Hook cliente: Realtime invalida, sondeo de respaldo |
| `components/impacto/tablero.tsx` | Contenedor cliente de `/impacto`; consume el hook |
| `components/impacto/tarjeta-metrica.tsx` | Tarjeta de cifra con su leyenda |
| `components/impacto/busquedas-por-hora.tsx` | Gráfica de barras (Recharts) |
| `components/impacto/carga-csr.tsx` | Reparto por CSR — el sustituto del Excel de las 11:30 |
| `components/impacto/cumplimiento-sla.tsx` | Tasa contra el SLA de cuatro días hábiles |
| `components/impacto/ventanas-semana.tsx` | Línea de tiempo semanal de ventanas |
| `app/impacto/page.tsx` | Ruta proyectable de solo lectura |
| `components/marco/barra-superior.tsx` | *(se amplía)* Tercera pestaña «Impacto» |
| `components/demo/estado-sesion.tsx` | *(se amplía)* Contadores vivos en vez de fotografía inicial |
| `lib/ai/instrucciones.ts` | *(se amplía)* El operador conoce la herramienta nueva |
| `lib/ai/respaldo.ts` | *(se amplía)* Respuesta pregrabada de la escena 5 del operador |
| `supabase/migrations/20260805000009_realtime_eventos.sql` | Publica `eventos_demo` en `supabase_realtime` |
| `README.md` | Reescrito en español |
| `docs/superpowers/presentacion/despliegue.md` | Variables y checklist de humo |
| `docs/superpowers/presentacion/guion-cronometrado.md` | Las ocho escenas con tiempos y acciones exactas |

---

## Tarea 1: SLA en días hábiles, extraído del chat

**Archivos:**
- Crear: `lib/reglas-qms/sla.ts`
- Modificar: `lib/reglas-qms/index.ts:7-12` (bloque de re-exportaciones)
- Modificar: `lib/ai/herramientas.ts:19-30` (borrar la función privada) y `:94-123` (usar las constantes)
- Crear: `docs/superpowers/contexto/plan-4b/tarea-1-contexto.md`

**Interfaces:**
- Consume: nada. Es un módulo puro sin dependencias del proyecto.
- Produce:
  - `const DIAS_SLA = 4`
  - `diasHabiles(desde: string | Date, hasta?: string | Date): number`
  - `dentroDelSla(solicitud: string | Date, respuesta: string | Date): boolean`

**Por qué es una extracción y no una función nueva.** `lib/ai/herramientas.ts:19` ya tiene un `diasHabiles()` privado que el chat usa para responder «¿en qué va mi cotización?». Si el dashboard escribiera el suyo, el chat y `/impacto` podrían dar dos respuestas distintas al mismo SLA delante del cliente. Se mueve el que ya existe, no se escribe otro.

- [ ] **Paso 1: Crear el módulo puro**

`lib/reglas-qms/sla.ts`:

```ts
/**
 * SLA de respuesta a cotizaciones.
 *
 * No es un punto del procedimiento QMS: es el KPI que SKF declara como propio
 * —«≤ 4 días hábiles promedio de respuesta», `docs/01_analisis_documentos.md`—
 * y en cuya unidad tiene que hablar el dashboard para que el cliente reconozca
 * la cifra como suya.
 *
 * Supuesto abierto con SKF: se excluyen sábados y domingos y NO se excluyen
 * festivos locales, porque el cliente todavía no confirmó cómo los trata. Toda
 * pantalla que muestre esta cifra lo declara.
 */
export const DIAS_SLA = 4;

/**
 * Días hábiles completos entre dos instantes.
 *
 * No cuenta el día de inicio: una cotización solicitada y respondida el mismo
 * día lleva cero días hábiles, no uno.
 */
export function diasHabiles(desde: string | Date, hasta: string | Date = new Date()): number {
  const cursor = new Date(desde);
  cursor.setHours(0, 0, 0, 0);
  const fin = new Date(hasta);
  fin.setHours(0, 0, 0, 0);
  let dias = 0;
  while (cursor < fin) {
    cursor.setDate(cursor.getDate() + 1);
    if (cursor.getDay() !== 0 && cursor.getDay() !== 6) dias++;
  }
  return dias;
}

export function dentroDelSla(solicitud: string | Date, respuesta: string | Date): boolean {
  return diasHabiles(solicitud, respuesta) <= DIAS_SLA;
}
```

- [ ] **Paso 2: Re-exportarlo desde el barril**

En `lib/reglas-qms/index.ts`, dentro del bloque de re-exportaciones, en orden alfabético entre `planeacion` y `tiempos`:

```ts
export * from "./planeacion";
export * from "./sla";
export * from "./tiempos";
```

- [ ] **Paso 3: Quitar la copia privada del chat**

En `lib/ai/herramientas.ts`, **borrar** por completo la función local de las líneas 19-30:

```ts
function diasHabiles(desde: string, hasta = new Date()): number {
  // ...
}
```

y añadir la importación junto a las demás de `@/lib/...`:

```ts
import { DIAS_SLA, diasHabiles } from "@/lib/reglas-qms";
```

- [ ] **Paso 4: Usar la constante en `consultarCotizacion`**

En el `execute` de `consultarCotizacion`, sustituir los dos literales `4` por la constante. El bloque queda:

```ts
        const comun = {
          encontrada: true,
          numero: cotizacion.numero,
          estado: cotizacion.fechaRespuesta ? "respondida" : "en_proceso",
          diasHabilesTranscurridos: transcurridos,
          slaDiasHabiles: DIAS_SLA,
          dentroDelSla: transcurridos <= DIAS_SLA,
        };
```

La `description` de la herramienta se deja como está: el texto que lee el modelo puede decir «4 días» en prosa.

- [ ] **Paso 5: Verificar**

```bash
pnpm lint
pnpm build
pnpm test
```

Esperado: lint limpio, build sin errores de tipos, **198 tests en verde**. El type-check es la verificación real de esta tarea: si la firma de la función movida no encajara con la llamada de `consultarCotizacion`, `pnpm build` falla.

- [ ] **Paso 6: Escribir el contexto y commitear**

```bash
git add lib/reglas-qms/sla.ts lib/reglas-qms/index.ts lib/ai/herramientas.ts docs/superpowers/contexto/plan-4b/tarea-1-contexto.md
git commit -m "SLA en dias habiles: un solo calculo para el chat y el dashboard"
```

---

## Tarea 2: Cumplimiento del SLA sobre el histórico

**Archivos:**
- Modificar: `lib/fuentes/cotizaciones.ts` (se amplía; lo existente no cambia)
- Crear: `docs/superpowers/contexto/plan-4b/tarea-2-contexto.md`

**Interfaces:**
- Consume: `DIAS_SLA`, `diasHabiles(desde, hasta)` de la Tarea 1.
- Produce:
  - `interface CumplimientoSla { respondidas: number; dentroDelSla: number; tasa: number; pendientes: number; medianaDiasHabiles: number }`
  - `cumplimientoSla(): Promise<CumplimientoSla>`

**Dos decisiones que hay que entender antes de escribir el código.**

*Mide el histórico completo, no la sesión.* La sesión no produce cotizaciones respondidas —`solicitudes` y `cotizaciones` son tablas distintas y el demo solo escribe en la primera—, así que un SLA filtrado por `sesion.iniciadaEn` sería siempre cero. En pantalla se rotula «operación simulada acumulada», distinto del resto de cifras.

*PostgREST corta en 1000 filas por defecto y el histórico ronda las 9000.* Una lectura sin paginar mediría en silencio solo la primera página y daría una tasa plausible pero falsa — el peor tipo de error para una cifra que se proyecta. Se pagina con `.range()` y se memoiza: nada del demo escribe en `cotizaciones`, así que el resultado es inmutable durante la presentación y el sondeo de respaldo no vuelve a paginar nueve mil filas cada dos segundos.

- [ ] **Paso 1: Añadir el tipo, la paginación y la memoización**

Al final de `lib/fuentes/cotizaciones.ts`, y añadiendo la importación de `@/lib/reglas-qms` arriba:

```ts
export interface CumplimientoSla {
  /** Cotizaciones con `fecha_respuesta`. Son las únicas medibles. */
  respondidas: number;
  dentroDelSla: number;
  /** 0..1. Cero cuando no hay respondidas: «NaN%» proyectado es peor que un 0. */
  tasa: number;
  pendientes: number;
  medianaDiasHabiles: number;
}

/**
 * PostgREST corta en 1000 filas por defecto y el histórico sintético ronda las
 * 9000. Sin paginar, esta función mediría solo la primera página y devolvería
 * una tasa creíble pero falsa.
 */
const FILAS_POR_PAGINA = 1000;
const PAGINAS_MAXIMAS = 20;

/**
 * Memoización por proceso. Nada del demo escribe en `cotizaciones`: el
 * histórico es inmutable durante la presentación, y el sondeo de respaldo de
 * `/impacto` corre cada dos segundos. `reiniciarSesion()` no lo invalida porque
 * no toca el histórico.
 */
let memoria: CumplimientoSla | null = null;

interface FilaSla {
  fecha_solicitud: string;
  fecha_respuesta: string | null;
}

export async function cumplimientoSla(): Promise<CumplimientoSla> {
  if (memoria) return memoria;

  const cliente = clienteLectura();
  const filas: FilaSla[] = [];
  for (let pagina = 0; pagina < PAGINAS_MAXIMAS; pagina++) {
    const inicio = pagina * FILAS_POR_PAGINA;
    const { data, error } = await cliente
      .from("cotizaciones")
      .select("fecha_solicitud, fecha_respuesta")
      .order("fecha_solicitud")
      .range(inicio, inicio + FILAS_POR_PAGINA - 1);
    lanzarSiError(error, "obtener el histórico de cumplimiento del SLA");
    const lote = (data ?? []) as unknown as FilaSla[];
    filas.push(...lote);
    if (lote.length < FILAS_POR_PAGINA) break;
  }

  const dias: number[] = [];
  let pendientes = 0;
  for (const fila of filas) {
    if (!fila.fecha_respuesta) {
      pendientes++;
      continue;
    }
    dias.push(diasHabiles(fila.fecha_solicitud, fila.fecha_respuesta));
  }

  const dentro = dias.filter((d) => d <= DIAS_SLA).length;
  const ordenados = [...dias].sort((a, b) => a - b);

  memoria = {
    respondidas: dias.length,
    dentroDelSla: dentro,
    tasa: dias.length === 0 ? 0 : dentro / dias.length,
    pendientes,
    medianaDiasHabiles: ordenados.length === 0 ? 0 : ordenados[Math.floor(ordenados.length / 2)],
  };
  return memoria;
}
```

- [ ] **Paso 2: Comprobar contra la base que la paginación agota la tabla**

Este es el paso que justifica la tarea: hay que ver con los ojos que el conteo coincide con la base, no con la primera página.

```bash
pnpm exec tsx -e "import 'dotenv/config'; import { cumplimientoSla } from './lib/fuentes/cotizaciones'; cumplimientoSla().then((r) => console.log(r));"
```

Esperado: `respondidas + pendientes` igual al total de filas de `cotizaciones`, que debe rondar las 9000 y **ser mayor que 1000**. Contrástalo en el SQL Editor de Supabase:

```sql
select count(*) as total,
       count(fecha_respuesta) as respondidas,
       count(*) - count(fecha_respuesta) as pendientes
from cotizaciones;
```

Si `respondidas` saliera exactamente 1000, la paginación no está funcionando y la tarea no está terminada.

- [ ] **Paso 3: Verificar y commitear**

```bash
pnpm lint
pnpm build
pnpm test
```

Esperado: lint limpio, build sin errores, 198 tests en verde.

```bash
git add lib/fuentes/cotizaciones.ts docs/superpowers/contexto/plan-4b/tarea-2-contexto.md
git commit -m "Cumplimiento del SLA sobre el historico, paginado y memoizado"
```

---

## Tarea 3: Franjas de ventana de la semana

**Archivos:**
- Crear: `lib/estado-fabricas/semana.ts`
- Modificar: `lib/estado-fabricas/index.ts` (añadir la re-exportación)
- Crear: `docs/superpowers/contexto/plan-4b/tarea-3-contexto.md`

**Interfaces:**
- Consume: `inicioDeVentana(planta, momento)` de `./ventanas`; `PlantaCompleta` de `@/lib/fuentes/plantas`.
- Produce:
  - `interface FranjaVentana { pdiv: string; diaOffset: number; dia: number; inicioMin: number; duracionMin: number }`
  - `franjasDeLaSemana(plantas: readonly PlantaCompleta[], desde: Date): FranjaVentana[]`

**Dos cosas que no hay que hacer.** *No convertir husos:* `ventanaInicioMin` ya está expresado en minutos del día en huso de México — `estadoDePlanta` lo compara directamente contra `minutosDelDia(momento)`, que usa `HUSO_MEXICO`. Convertirlo aquí movería la línea de tiempo respecto del banner de la escena 4. *No reimplementar la variabilidad:* la planta belga desplaza su ventana según la fecha y el PDIV, y `inicioDeVentana()` ya resuelve ese desplazamiento de forma determinista. Se le pasa cada día y se toma lo que devuelve.

- [ ] **Paso 1: Escribir el módulo**

`lib/estado-fabricas/semana.ts`:

```ts
import type { PlantaCompleta } from "@/lib/fuentes/plantas";
import { inicioDeVentana } from "./ventanas";

export interface FranjaVentana {
  pdiv: string;
  /** 0 = el día de `desde`. Es el orden real de la semana proyectada. */
  diaOffset: number;
  /** `Date.getDay()` del día representado: 0 = domingo. Solo para etiquetar. */
  dia: number;
  /** Minutos del día en huso de México, igual que `ventanaInicioMin`. */
  inicioMin: number;
  duracionMin: number;
}

const DIAS_SEMANA = 7;

/**
 * Ventanas de mantenimiento de los próximos siete días.
 *
 * Se calcula día a día en vez de repetir el mismo horario siete veces porque
 * la planta con `ventanaVariabilidadMin > 0` empieza a distinta hora cada día,
 * y esa irregularidad es justamente lo que hace creíble la línea de tiempo.
 */
export function franjasDeLaSemana(
  plantas: readonly PlantaCompleta[],
  desde: Date,
): FranjaVentana[] {
  const franjas: FranjaVentana[] = [];
  for (const planta of plantas) {
    for (let diaOffset = 0; diaOffset < DIAS_SEMANA; diaOffset++) {
      const dia = new Date(desde);
      dia.setDate(dia.getDate() + diaOffset);
      franjas.push({
        pdiv: planta.pdiv,
        diaOffset,
        dia: dia.getDay(),
        inicioMin: inicioDeVentana(planta, dia),
        duracionMin: planta.ventanaDuracionMin,
      });
    }
  }
  return franjas;
}
```

El orden de salida es por planta y, dentro de cada planta, por día: es el orden en el que la pantalla dibuja las filas, así que la UI no reordena nada.

- [ ] **Paso 2: Re-exportarlo**

En `lib/estado-fabricas/index.ts`:

```ts
export * from "./reloj";
export * from "./semana";
export * from "./ventanas";
```

- [ ] **Paso 3: Comprobar que la planta variable no repite horario**

```bash
pnpm exec tsx -e "import 'dotenv/config'; import { todasLasPlantas } from './lib/fuentes'; import { franjasDeLaSemana } from './lib/estado-fabricas/semana'; todasLasPlantas().then((p) => { const f = franjasDeLaSemana(p, new Date()); console.log(f.length); const variable = p.find((x) => x.ventanaVariabilidadMin > 0); console.log(variable?.pdiv, f.filter((x) => x.pdiv === variable?.pdiv).map((x) => x.inicioMin)); });"
```

Esperado: el total es `plantas × 7`. La planta con variabilidad muestra **inicios distintos entre días**; una planta sin variabilidad muestra el mismo valor siete veces. Si la planta variable repitiera el mismo minuto siete veces, se está pasando la misma fecha a `inicioDeVentana()` y el bucle está mal.

- [ ] **Paso 4: Verificar y commitear**

```bash
pnpm lint
pnpm build
pnpm test
```

Esperado: lint limpio, build sin errores, 198 tests en verde.

```bash
git add lib/estado-fabricas/semana.ts lib/estado-fabricas/index.ts docs/superpowers/contexto/plan-4b/tarea-3-contexto.md
git commit -m "Franjas de ventana de los proximos siete dias"
```

---

## Tarea 4: Panel operativo puro y Server Actions de refresco

**Archivos:**
- Crear: `lib/metricas/operacion.ts`, `lib/metricas/acciones.ts`
- Crear: `docs/superpowers/contexto/plan-4b/tarea-4-contexto.md`

**Interfaces:**
- Consume: `CargaCsr` de `@/lib/operacion/asignacion`; `CumplimientoSla` y `cumplimientoSla()` de la Tarea 2; `FranjaVentana` y `franjasDeLaSemana()` de la Tarea 3; `cargaPorCsr`, `solicitudesFiltradas`, `todasLasPlantas` de `@/lib/fuentes`; `indicadoresDeSesion()` y `leerSesion()`.
- Produce:
  - `interface EntradaOperacion { cargas: readonly CargaCsr[]; sinAsignar: number; sla: CumplimientoSla; franjas: readonly FranjaVentana[] }`
  - `interface PanelOperativo { cargas: CargaCsr[]; sinAsignar: number; sla: CumplimientoSla; franjas: FranjaVentana[]; minutosVentanaSemana: number }`
  - `resumirOperacion(entrada: EntradaOperacion): PanelOperativo`
  - `refrescarIndicadores(): Promise<Indicadores>`
  - `refrescarPanelOperativo(): Promise<PanelOperativo>`

**Por qué el agregado va fuera de `Indicadores`.** Ampliar `Indicadores` obligaría a tocar `calcularIndicadores()`, que el contrato §7.1 congela. El panel operativo tiene su propio tipo, su propia acción y su propio módulo puro; comparte con los indicadores el canal de refresco y nada más.

- [ ] **Paso 1: Escribir el módulo puro**

`lib/metricas/operacion.ts`:

```ts
import type { FranjaVentana } from "@/lib/estado-fabricas/semana";
import type { CumplimientoSla } from "@/lib/fuentes/cotizaciones";
import type { CargaCsr } from "@/lib/operacion/asignacion";

export interface EntradaOperacion {
  cargas: readonly CargaCsr[];
  sinAsignar: number;
  sla: CumplimientoSla;
  franjas: readonly FranjaVentana[];
}

export interface PanelOperativo {
  /** Activos primero; dentro de cada grupo, de más cargado a menos. */
  cargas: CargaCsr[];
  sinAsignar: number;
  sla: CumplimientoSla;
  franjas: FranjaVentana[];
  minutosVentanaSemana: number;
}

/**
 * Agregado operativo del dashboard. Sin acceso a red ni a base: recibe todo
 * resuelto, igual que `elegirCsr()` y `reconciliar()`.
 *
 * El orden es determinista por la misma razón que lo es el desempate de la
 * asignación: el ensayo cronometrado repite el mismo recorrido varias veces y
 * un reparto que se reordena solo entre pasadas no se puede ensayar.
 */
export function resumirOperacion(entrada: EntradaOperacion): PanelOperativo {
  const cargas = [...entrada.cargas].sort((a, b) => {
    if (a.activo !== b.activo) return a.activo ? -1 : 1;
    if (a.abiertas !== b.abiertas) return b.abiertas - a.abiertas;
    return a.codigo.localeCompare(b.codigo);
  });

  return {
    cargas,
    sinAsignar: entrada.sinAsignar,
    sla: entrada.sla,
    franjas: [...entrada.franjas],
    minutosVentanaSemana: entrada.franjas.reduce((total, f) => total + f.duracionMin, 0),
  };
}
```

- [ ] **Paso 2: Escribir las Server Actions**

`lib/metricas/acciones.ts`:

```ts
"use server";

import { ahoraSimulada } from "@/lib/estado-fabricas";
import { franjasDeLaSemana } from "@/lib/estado-fabricas/semana";
import {
  cargaPorCsr,
  cumplimientoSla,
  solicitudesFiltradas,
  todasLasPlantas,
} from "@/lib/fuentes";
import { leerSesion } from "@/lib/sesion-demo/leer";
import type { Indicadores } from "./calculo";
import { indicadoresDeSesion } from "./indicadores";
import { type PanelOperativo, resumirOperacion } from "./operacion";

/**
 * Recálculo de indicadores para el cliente.
 *
 * Es una envoltura a propósito: el cliente nunca reimplementa
 * `calcularIndicadores()`, porque dos implementaciones de la misma métrica es
 * cómo se llega a dos cifras distintas en dos pantallas durante la
 * presentación.
 */
export async function refrescarIndicadores(): Promise<Indicadores> {
  return indicadoresDeSesion();
}

export async function refrescarPanelOperativo(): Promise<PanelOperativo> {
  const sesion = await leerSesion();
  const [cargas, sla, plantas, sinAsignar] = await Promise.all([
    cargaPorCsr(sesion.iniciadaEn),
    cumplimientoSla(),
    todasLasPlantas(),
    solicitudesFiltradas({ desde: sesion.iniciadaEn, csr: null }),
  ]);

  return resumirOperacion({
    cargas,
    sinAsignar: sinAsignar.length,
    sla,
    // La línea de tiempo sigue el reloj simulado: si el presentador adelanta la
    // hora en la escena 4, la semana proyectada avanza con él.
    franjas: franjasDeLaSemana(plantas, ahoraSimulada(sesion.relojOffsetMin)),
  });
}
```

- [ ] **Paso 3: Comprobar el agregado contra la base**

```bash
pnpm exec tsx -e "import 'dotenv/config'; import { refrescarPanelOperativo } from './lib/metricas/acciones'; refrescarPanelOperativo().then((p) => console.log(JSON.stringify({ cargas: p.cargas, sinAsignar: p.sinAsignar, sla: p.sla, franjas: p.franjas.length, minutos: p.minutosVentanaSemana }, null, 2)));"
```

Esperado: los ocho operadores con su carga, los **activos primero**, `franjas` igual a `plantas × 7`, y `sla.respondidas` mayor que 1000. Si algún operador inactivo apareciera antes que uno activo, el comparador está mal.

- [ ] **Paso 4: Verificar y commitear**

```bash
pnpm lint
pnpm build
pnpm test
```

Esperado: lint limpio, build sin errores, 198 tests en verde.

```bash
git add lib/metricas/operacion.ts lib/metricas/acciones.ts docs/superpowers/contexto/plan-4b/tarea-4-contexto.md
git commit -m "Panel operativo: agregado puro y acciones de refresco"
```

---

## Tarea 5: Migración de Realtime, hook de indicadores vivos y contadores de `/demo`

**Archivos:**
- Crear: `supabase/migrations/20260805000009_realtime_eventos.sql`
- Crear: `components/metricas/uso-indicadores.ts`
- Modificar: `components/demo/estado-sesion.tsx:18-19` y `:56-59`
- Crear: `docs/superpowers/contexto/plan-4b/tarea-5-contexto.md`

**Interfaces:**
- Consume: `refrescarIndicadores()` y `refrescarPanelOperativo()` de la Tarea 4; `debeSondear`, `MS_INTERVALO_SONDEO` de `@/lib/sesion-demo/sondeo`; `clienteNavegador()`.
- Produce:
  - `useIndicadores(inicial: Indicadores, panelInicial?: PanelOperativo | null): { indicadores: Indicadores; panel: PanelOperativo | null; estadoCanal: EstadoCanal }`

**Por qué hace falta la migración.** `eventos_demo` no pertenece a la publicación `supabase_realtime`: la única tabla publicada es `sesion_demo` (`20260803000001_extensiones_y_sesion_demo.sql:82`). Sin publicarla, el canal no recibe nada y `/impacto` quedaría dependiendo solo del sondeo. Es el caso que el contrato §4 previó al dejar abierta la puerta a `000009`. La sentencia es aditiva, no toca ninguna tabla, y la política de lectura pública que Realtime necesita para entregar a `anon` ya existe desde `000006`.

**Por qué un hook y no un segundo proveedor global.** Lo consumen dos pantallas y ninguna otra. De paso cierra la deuda del Plan 3 — «los contadores de `/demo` son fotografía inicial»— sin envolver la aplicación entera en otro contexto.

- [ ] **Paso 1: Escribir y aplicar la migración**

`supabase/migrations/20260805000009_realtime_eventos.sql`:

```sql
-- ── Realtime sobre eventos_demo ──────────────────────────────────────────────
-- Unica migracion del Plan 4B, y no es de datos: publica una tabla que ya
-- existe. El contrato de la fase 4 (§4) preveia este caso.
--
-- El dashboard de impacto se actualiza con el patron que fija el contrato §7.1:
-- el canal solo INVALIDA y la pantalla recalcula en el servidor. Sobre una
-- tabla que no publica cambios ese patron no puede funcionar, y la escena 6
-- mostraria hasta dos segundos de retraso frente al hecho que la produce.
--
-- La politica de lectura publica que Realtime necesita para entregar a `anon`
-- ya existe desde 000006. Aqui no se crea, altera ni borra ninguna tabla.

alter publication supabase_realtime add table eventos_demo;
```

Aplicar:

```bash
pnpm db:push
```

Esperado: aplica solo `000009`. Comprobar en el SQL Editor de Supabase:

```sql
select tablename from pg_publication_tables where pubname = 'supabase_realtime';
```

Esperado: aparecen `sesion_demo` **y** `eventos_demo`.

- [ ] **Paso 2: Escribir el hook**

`components/metricas/uso-indicadores.ts`:

```ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { refrescarIndicadores, refrescarPanelOperativo } from "@/lib/metricas/acciones";
import type { Indicadores } from "@/lib/metricas/calculo";
import type { PanelOperativo } from "@/lib/metricas/operacion";
import { debeSondear, MS_INTERVALO_SONDEO } from "@/lib/sesion-demo/sondeo";
import type { EstadoCanal } from "@/lib/sesion-demo/tipos";
import { clienteNavegador } from "@/lib/supabase/navegador";

/**
 * Margen de agrupación de INSERT.
 *
 * Una sola búsqueda puede emitir `busqueda`, `aviso_moq` y
 * `aviso_pack_quantity` casi a la vez: sin este margen, la escena 2 dispara
 * tres recálculos idénticos seguidos contra el servidor.
 */
const MS_AGRUPACION = 400;

/**
 * Indicadores que se actualizan solos.
 *
 * El canal de Realtime sobre `eventos_demo` **solo invalida**: al recibir un
 * INSERT, el hook vuelve a pedir el cálculo al servidor. No transporta el
 * evento ni lo suma en el cliente.
 *
 * Pasa `panelInicial` para que además refresque el panel operativo; con `null`
 * solo mantiene los indicadores, que es lo que necesita `/demo`.
 */
export function useIndicadores(
  inicial: Indicadores,
  panelInicial: PanelOperativo | null = null,
): { indicadores: Indicadores; panel: PanelOperativo | null; estadoCanal: EstadoCanal } {
  const [indicadores, setIndicadores] = useState(inicial);
  const [panel, setPanel] = useState<PanelOperativo | null>(panelInicial);
  const [estadoCanal, setEstadoCanal] = useState<EstadoCanal>("conectando");
  const abiertoEn = useRef(Date.now());
  const agrupador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const conPanel = panelInicial !== null;

  const refrescar = useCallback(() => {
    // Un fallo de métrica no puede tumbar la pantalla proyectada: se queda con
    // la última cifra buena, igual que hace <ColaIntenciones>.
    refrescarIndicadores()
      .then(setIndicadores)
      .catch(() => {});
    if (!conPanel) return;
    refrescarPanelOperativo()
      .then(setPanel)
      .catch(() => {});
  }, [conPanel]);

  const agrupar = useCallback(() => {
    if (agrupador.current) return;
    agrupador.current = setTimeout(() => {
      agrupador.current = null;
      refrescar();
    }, MS_AGRUPACION);
  }, [refrescar]);

  // Suscripción TEMPRANA, igual que <ProveedorSesion>: el arranque en frío de
  // Realtime que el Plan 1 midió por encima de 15 s tras inactividad tiene que
  // ocurrir mientras el presentador habla, no cuando proyecta la pantalla.
  useEffect(() => {
    const supabase = clienteNavegador();
    const canal = supabase
      .channel("eventos-demo")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "eventos_demo" },
        agrupar,
      )
      .subscribe((estado) => {
        if (estado === "SUBSCRIBED") setEstadoCanal("suscrito");
        else if (estado === "CHANNEL_ERROR" || estado === "TIMED_OUT") setEstadoCanal("error");
        else if (estado === "CLOSED") setEstadoCanal("cerrado");
      });

    return () => {
      if (agrupador.current) clearTimeout(agrupador.current);
      void supabase.removeChannel(canal);
    };
  }, [agrupar]);

  // Respaldo por sondeo, con las mismas constantes que la sesión. No se abre un
  // mecanismo de sincronización nuevo ni se duplican esos valores.
  useEffect(() => {
    const temporizador = setInterval(() => {
      if (!debeSondear(estadoCanal, Date.now() - abiertoEn.current)) return;
      refrescar();
    }, MS_INTERVALO_SONDEO);
    return () => clearInterval(temporizador);
  }, [estadoCanal, refrescar]);

  return { indicadores, panel, estadoCanal };
}
```

- [ ] **Paso 3: Poner los contadores de `/demo` a refrescarse solos**

En `components/demo/estado-sesion.tsx`, añadir la importación y sustituir el uso directo de la prop. La prop **se conserva** —`/demo` la sigue pasando como valor inicial del servidor—, solo cambia de nombre en el destructurado:

```ts
import { useIndicadores } from "@/components/metricas/uso-indicadores";
```

```tsx
export function EstadoSesion({ indicadores: iniciales }: { indicadores: Indicadores }) {
  const { sesion, plantas, estados, ahora } = useSesion();
  // Cierra la deuda del Plan 3: hasta ahora estas cuatro cifras eran la
  // fotografía del momento en que se cargó la página.
  const { indicadores } = useIndicadores(iniciales);
```

El resto del componente no cambia: las cuatro llamadas a `<Dato>` de las líneas 56-59 ya leen de `indicadores`.

- [ ] **Paso 4: Verificar en el navegador que el contador se mueve solo**

```bash
pnpm dev
```

1. Abre `/demo` en una ventana y `/portal` en otra, lado a lado.
2. En `/portal`, busca `DEMO-6205-2RSH/C3` con cantidad 200.
3. Mira `/demo` **sin recargar**.

Esperado: «Solicitudes evitadas» o «Llamadas al modelo» cambia en menos de dos segundos. El indicador de canal de `/demo` debe estar en suscrito; si está en error y la cifra igual se mueve, el sondeo está haciendo el trabajo y hay que revisar el Paso 1 antes de continuar.

- [ ] **Paso 5: Verificar y commitear**

```bash
pnpm lint
pnpm build
pnpm test
```

Esperado: lint limpio, build sin errores, 198 tests en verde.

```bash
git add supabase/migrations/20260805000009_realtime_eventos.sql components/metricas/uso-indicadores.ts components/demo/estado-sesion.tsx docs/superpowers/contexto/plan-4b/tarea-5-contexto.md
git commit -m "Indicadores vivos: el canal invalida y la pantalla recalcula"
```

---

## Tarea 6: `/impacto` — las métricas de la sesión

**Archivos:**
- Crear: `app/impacto/page.tsx`, `components/impacto/tablero.tsx`, `components/impacto/tarjeta-metrica.tsx`, `components/impacto/busquedas-por-hora.tsx`
- Modificar: `components/marco/barra-superior.tsx:6` y `:13-26`
- Crear: `docs/superpowers/contexto/plan-4b/tarea-6-contexto.md`

**Interfaces:**
- Consume: `useIndicadores()` de la Tarea 5; `indicadoresDeSesion()`, `MINUTOS_POR_SOLICITUD`, `leerSesion()`, `todasLasPlantas()`.
- Produce:
  - `<TarjetaMetrica etiqueta valor leyenda destacada? />`
  - `<BusquedasPorHora datos={Record<string, number>} />`
  - `<Tablero indicadoresIniciales panelInicial />` — la Tarea 7 le añade el panel operativo; esta tarea lo deja recibiendo `null`.

**Es la pantalla que se proyecta.** Las reglas de color no son decorativas aquí: ámbar significa desconexión y en esta tarea no aparece ninguna vez; verde significa confirmación y solo lo lleva el bloque de confirmaciones de homólogo. Una tasa alta de resolución sin solicitud es una buena noticia, pero no es una confirmación: va en el color primario.

- [ ] **Paso 1: Añadir la tercera pestaña a la barra superior**

En `components/marco/barra-superior.tsx`, ampliar el tipo del perfil y añadir el enlace:

```tsx
export function BarraSuperior({ perfil }: { perfil: "cliente" | "operador" | "impacto" }) {
```

y dentro del `<nav>`, después del enlace de Servicio al Cliente:

```tsx
          <Link
            href="/impacto"
            className={`rounded px-3 py-1 text-sm ${perfil === "impacto" ? "bg-fondo font-medium text-texto shadow-sm" : "text-texto-tenue"}`}
          >
            Impacto
          </Link>
```

`/demo` sigue sin enlace: es el panel del presentador y no se proyecta.

- [ ] **Paso 2: Escribir la tarjeta de métrica**

`components/impacto/tarjeta-metrica.tsx`:

```tsx
export function TarjetaMetrica({
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
}) {
  return (
    <div
      className={`rounded-xl border p-5 ${
        destacada ? "border-primario bg-primario-suave" : "border-borde bg-fondo"
      }`}
    >
      <p className="text-sm font-medium text-texto-tenue">{etiqueta}</p>
      <p className="mt-2 text-4xl font-semibold tracking-tight text-texto">{valor}</p>
      {nota && <p className="mt-2 text-xs leading-5 text-texto-tenue">{nota}</p>}
      <p className="mt-2 text-[11px] uppercase tracking-wide text-texto-tenue">{leyenda}</p>
    </div>
  );
}
```

- [ ] **Paso 3: Escribir la gráfica de búsquedas por hora**

`components/impacto/busquedas-por-hora.tsx`:

```tsx
"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/** Las 24 horas siempre presentes: una gráfica con dos barras no se lee. */
function serie(datos: Record<string, number>) {
  return Array.from({ length: 24 }, (_, hora) => ({
    hora: `${String(hora).padStart(2, "0")}:00`,
    busquedas: datos[String(hora)] ?? 0,
  }));
}

export function BusquedasPorHora({ datos }: { datos: Record<string, number> }) {
  return (
    <section className="rounded-xl border border-borde bg-fondo p-5" aria-labelledby="titulo-busquedas">
      <h2 id="titulo-busquedas" className="text-lg font-semibold text-texto">
        Búsquedas por hora
      </h2>
      <p className="mt-1 text-sm text-texto-tenue">
        Distribución horaria de la sesión, sobre datos simulados. Hora de la Ciudad de México.
      </p>
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={serie(datos)} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--borde)" vertical={false} />
            <XAxis
              dataKey="hora"
              interval={2}
              tick={{ fontSize: 11, fill: "var(--texto-tenue)" }}
              stroke="var(--borde)"
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: "var(--texto-tenue)" }}
              stroke="var(--borde)"
            />
            <Tooltip
              cursor={{ fill: "var(--fondo-sutil)" }}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid var(--borde)",
                fontSize: 12,
              }}
              formatter={(valor: number) => [String(valor), "Búsquedas"]}
            />
            <Bar dataKey="busquedas" fill="var(--primario)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
```

- [ ] **Paso 4: Escribir el tablero**

`components/impacto/tablero.tsx`:

```tsx
"use client";

import { BusquedasPorHora } from "@/components/impacto/busquedas-por-hora";
import { TarjetaMetrica } from "@/components/impacto/tarjeta-metrica";
import { useIndicadores } from "@/components/metricas/uso-indicadores";
import { IndicadorCanal } from "@/components/sesion/indicador-canal";
import { type Indicadores, MINUTOS_POR_SOLICITUD } from "@/lib/metricas/calculo";
import type { PanelOperativo } from "@/lib/metricas/operacion";

const PORCENTAJE = new Intl.NumberFormat("es-MX", { style: "percent", maximumFractionDigits: 0 });

export function Tablero({
  indicadoresIniciales,
  panelInicial,
}: {
  indicadoresIniciales: Indicadores;
  panelInicial: PanelOperativo | null;
}) {
  const { indicadores } = useIndicadores(indicadoresIniciales, panelInicial);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <IndicadorCanal />
      </div>

      <section aria-labelledby="titulo-metricas">
        <h2 id="titulo-metricas" className="text-lg font-semibold text-texto">
          Impacto de la sesión
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <TarjetaMetrica
            etiqueta="Solicitudes evitadas"
            valor={String(indicadores.solicitudesEvitadas)}
            nota="Consultas resueltas en el portal que no llegaron a Servicio al Cliente."
            destacada
          />
          <TarjetaMetrica
            etiqueta="Minutos de operador liberados"
            valor={String(indicadores.minutosOperadorLiberados)}
            nota={`Supuesto del POC: ${MINUTOS_POR_SOLICITUD} minutos por solicitud evitada. No es una medición; confirmarlo es objetivo de la Fase 1.`}
          />
          <TarjetaMetrica
            etiqueta="Errores de homólogo prevenidos"
            valor={String(indicadores.confirmacionesHomologo)}
            nota="Confirmaciones guiadas completadas paso por paso (punto 4.6)."
          />
          <TarjetaMetrica
            etiqueta="Avisos anticipados"
            valor={String(indicadores.avisosAnticipados)}
            nota="MOQ y pack quantity advertidos antes de enviar (puntos 4.4 y 4.5a)."
          />
          <TarjetaMetrica
            etiqueta="Solicitudes generadas"
            valor={String(indicadores.solicitudesGeneradas)}
            nota="Las que sí requirieron intervención humana."
          />
          <TarjetaMetrica
            etiqueta="Resueltas sin solicitud"
            valor={PORCENTAJE.format(indicadores.tasaResueltasSinSolicitud)}
            nota="Evitadas sobre el total de consultas que terminaron en una decisión."
          />
          <TarjetaMetrica
            etiqueta="Llamadas al modelo"
            valor={String(indicadores.llamadasModelo)}
            nota="Consultas atendidas por el asistente en los dos perfiles."
          />
        </div>
      </section>

      <BusquedasPorHora datos={indicadores.busquedasPorHora} />
    </div>
  );
}
```

- [ ] **Paso 5: Escribir la página**

`app/impacto/page.tsx`:

```tsx
import { Tablero } from "@/components/impacto/tablero";
import { BarraSuperior } from "@/components/marco/barra-superior";
import { ProveedorSesion } from "@/components/sesion/proveedor-sesion";
import { todasLasPlantas } from "@/lib/fuentes";
import { indicadoresDeSesion } from "@/lib/metricas/indicadores";
import { leerSesion } from "@/lib/sesion-demo/leer";

export const dynamic = "force-dynamic";

export default async function PaginaImpacto() {
  const [sesion, plantas, indicadores] = await Promise.all([
    leerSesion(),
    todasLasPlantas(),
    indicadoresDeSesion(),
  ]);

  return (
    <ProveedorSesion sesionInicial={sesion} plantas={plantas}>
      <div className="min-h-screen bg-fondo-sutil">
        <BarraSuperior perfil="impacto" />
        <main className="mx-auto w-full max-w-7xl px-6 py-8">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primario">
              Tablero de impacto
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-texto">
              Qué produjo esta sesión
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-texto-tenue">
              Cifras calculadas sobre datos simulados. El propósito de la Fase 1 es sustituirlas por
              las reales; este tablero es donde vivirán.
            </p>
          </div>
          <Tablero indicadoresIniciales={indicadores} panelInicial={null} />
        </main>
      </div>
    </ProveedorSesion>
  );
}
```

`panelInicial={null}` es deliberado en esta tarea: la Tarea 7 lo sustituye. Con `null`, el hook no llama a `refrescarPanelOperativo()` y la pantalla ya funciona.

- [ ] **Paso 6: Verificar en el navegador**

```bash
pnpm dev
```

1. Abre `/impacto` **antes** de hacer nada más. Esperado: todo en cero, sin estado vacío decorativo — tiene que verse que aún no ha pasado nada.
2. Comprueba que la pestaña «Impacto» aparece en la barra y que `/demo` sigue sin enlace.
3. En otra ventana, `/portal`: busca `DEMO-6205-2RSH/C` (truncada) y acepta un candidato.
4. Mira `/impacto` **sin recargar**. Esperado: «Solicitudes evitadas» sube y la barra de la hora actual crece en la gráfica.
5. Revisa a ojo: **ningún ámbar en la pantalla**, la tarjeta de minutos dice «Supuesto del POC: 12 minutos…», y cada tarjeta lleva «sobre datos simulados».

- [ ] **Paso 7: Verificar y commitear**

```bash
pnpm lint
pnpm build
pnpm test
```

Esperado: lint limpio, build sin errores, 198 tests en verde.

```bash
git add app/impacto components/impacto components/marco/barra-superior.tsx docs/superpowers/contexto/plan-4b/tarea-6-contexto.md
git commit -m "Impacto: metricas de la sesion que se actualizan solas"
```

---

## Tarea 7: `/impacto` — el panel operativo

**Archivos:**
- Crear: `components/impacto/carga-csr.tsx`, `components/impacto/cumplimiento-sla.tsx`, `components/impacto/ventanas-semana.tsx`
- Modificar: `components/impacto/tablero.tsx` (montar los tres) y `app/impacto/page.tsx` (pasar el panel inicial)
- Crear: `docs/superpowers/contexto/plan-4b/tarea-7-contexto.md`

**Interfaces:**
- Consume: `PanelOperativo`, `refrescarPanelOperativo()` de la Tarea 4; `FranjaVentana` de la Tarea 3; `DIAS_SLA` de la Tarea 1.
- Produce:
  - `<CargaCsrPanel cargas sinAsignar />`
  - `<CumplimientoSlaPanel sla />`
  - `<VentanasSemana franjas minutosSemana />`

**El único ámbar de la pantalla está aquí,** en la línea de tiempo de ventanas, porque es lo único que trata de desconexión. El SLA no usa ámbar aunque la tasa sea mala, y la carga por CSR no usa verde aunque esté equilibrada.

- [ ] **Paso 1: Escribir el reparto por CSR**

`components/impacto/carga-csr.tsx`:

```tsx
import type { CargaCsr } from "@/lib/operacion/asignacion";

export function CargaCsrPanel({
  cargas,
  sinAsignar,
}: {
  cargas: readonly CargaCsr[];
  sinAsignar: number;
}) {
  const maximo = Math.max(1, ...cargas.map((c) => c.abiertas));
  return (
    <section className="rounded-xl border border-borde bg-fondo p-5" aria-labelledby="titulo-carga">
      <h2 id="titulo-carga" className="text-lg font-semibold text-texto">
        Reparto por CSR
      </h2>
      <p className="mt-1 text-sm text-texto-tenue">
        Asignación automática y balanceada, disponible desde la primera solicitud. Sustituye el
        reparto manual de las 11:30. Sobre datos simulados.
      </p>
      <ul className="mt-4 space-y-2">
        {cargas.map((carga) => (
          <li key={carga.codigo} className="flex items-center gap-3">
            <span className="designacion w-20 shrink-0 text-sm text-texto">{carga.codigo}</span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-fondo-sutil">
              <div
                className={`h-full rounded-full ${carga.activo ? "bg-primario" : "bg-borde"}`}
                style={{ width: `${(carga.abiertas / maximo) * 100}%` }}
              />
            </div>
            <span className="w-8 shrink-0 text-right text-sm font-medium text-texto">
              {carga.abiertas}
            </span>
            {!carga.activo && (
              <span className="shrink-0 text-xs text-texto-tenue">no disponible</span>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-texto-tenue">
        Sin asignar: <span className="font-medium text-texto">{sinAsignar}</span>
        {sinAsignar > 0 && " — no había ningún CSR disponible al recibirlas."}
      </p>
    </section>
  );
}
```

- [ ] **Paso 2: Escribir el cumplimiento del SLA**

`components/impacto/cumplimiento-sla.tsx`:

```tsx
import type { CumplimientoSla } from "@/lib/fuentes/cotizaciones";
import { DIAS_SLA } from "@/lib/reglas-qms";

const PORCENTAJE = new Intl.NumberFormat("es-MX", { style: "percent", maximumFractionDigits: 0 });
const ENTERO = new Intl.NumberFormat("es-MX");

export function CumplimientoSlaPanel({ sla }: { sla: CumplimientoSla }) {
  return (
    <section className="rounded-xl border border-borde bg-fondo p-5" aria-labelledby="titulo-sla">
      <h2 id="titulo-sla" className="text-lg font-semibold text-texto">
        Cumplimiento del SLA
      </h2>
      <p className="mt-1 text-sm text-texto-tenue">
        Respuestas dentro de {DIAS_SLA} días hábiles. Operación simulada acumulada, no la sesión.
      </p>
      <p className="mt-4 text-4xl font-semibold tracking-tight text-texto">
        {PORCENTAJE.format(sla.tasa)}
      </p>
      <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <div className="flex justify-between">
          <dt className="text-texto-tenue">Respondidas</dt>
          <dd className="font-medium text-texto">{ENTERO.format(sla.respondidas)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-texto-tenue">Dentro del SLA</dt>
          <dd className="font-medium text-texto">{ENTERO.format(sla.dentroDelSla)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-texto-tenue">Sin responder</dt>
          <dd className="font-medium text-texto">{ENTERO.format(sla.pendientes)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-texto-tenue">Mediana</dt>
          <dd className="font-medium text-texto">{sla.medianaDiasHabiles} días hábiles</dd>
        </div>
      </dl>
      <p className="mt-4 text-xs leading-5 text-texto-tenue">
        Supuesto abierto con SKF: se excluyen sábados y domingos; los festivos locales todavía no,
        porque falta confirmar cómo los trata el cliente.
      </p>
    </section>
  );
}
```

- [ ] **Paso 3: Escribir la línea de tiempo semanal**

`components/impacto/ventanas-semana.tsx`:

```tsx
import type { FranjaVentana } from "@/lib/estado-fabricas/semana";

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MINUTOS_DIA = 1440;

function hora(minutos: number): string {
  const normalizado = ((minutos % MINUTOS_DIA) + MINUTOS_DIA) % MINUTOS_DIA;
  const h = Math.floor(normalizado / 60);
  const m = normalizado % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function VentanasSemana({
  franjas,
  minutosSemana,
}: {
  franjas: readonly FranjaVentana[];
  minutosSemana: number;
}) {
  const plantas = [...new Set(franjas.map((f) => f.pdiv))];
  const horas = (minutosSemana / 60).toFixed(1).replace(".", ",");

  return (
    <section
      className="rounded-xl border border-borde bg-fondo p-5"
      aria-labelledby="titulo-ventanas"
    >
      <h2 id="titulo-ventanas" className="text-lg font-semibold text-texto">
        Ventanas de desconexión de la semana
      </h2>
      <p className="mt-1 text-sm text-texto-tenue">
        {horas} horas de fábrica no consultable en los próximos siete días, sobre datos simulados.
        Hora de la Ciudad de México.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr>
              <th className="w-20 py-2 text-left text-xs font-medium text-texto-tenue">Planta</th>
              {franjas
                .filter((f) => f.pdiv === plantas[0])
                .map((f) => (
                  <th
                    key={f.diaOffset}
                    className="py-2 text-left text-xs font-medium text-texto-tenue"
                  >
                    {DIAS[f.dia]}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {plantas.map((pdiv) => (
              <tr key={pdiv} className="border-t border-borde">
                <td className="designacion py-2 text-texto">{pdiv}</td>
                {franjas
                  .filter((f) => f.pdiv === pdiv)
                  .map((f) => (
                    <td key={f.diaOffset} className="py-2 pr-3">
                      {/* Ámbar: es lo único de esta pantalla que trata de desconexión. */}
                      <span className="designacion inline-flex rounded border border-desconexion bg-desconexion-suave px-1.5 py-0.5 text-xs text-desconexion">
                        {hora(f.inicioMin)}–{hora(f.inicioMin + f.duracionMin)}
                      </span>
                    </td>
                  ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
```

- [ ] **Paso 4: Montarlos en el tablero**

En `components/impacto/tablero.tsx`, tomar `panel` del hook y añadir la sección al final, después de `<BusquedasPorHora>`:

```tsx
  const { indicadores, panel } = useIndicadores(indicadoresIniciales, panelInicial);
```

```tsx
      {panel && (
        <section aria-labelledby="titulo-operacion" className="space-y-6">
          <h2 id="titulo-operacion" className="text-lg font-semibold text-texto">
            Operación
          </h2>
          <div className="grid gap-6 xl:grid-cols-2">
            <CargaCsrPanel cargas={panel.cargas} sinAsignar={panel.sinAsignar} />
            <CumplimientoSlaPanel sla={panel.sla} />
          </div>
          <VentanasSemana franjas={panel.franjas} minutosSemana={panel.minutosVentanaSemana} />
        </section>
      )}
```

con sus tres importaciones:

```tsx
import { CargaCsrPanel } from "@/components/impacto/carga-csr";
import { CumplimientoSlaPanel } from "@/components/impacto/cumplimiento-sla";
import { VentanasSemana } from "@/components/impacto/ventanas-semana";
```

- [ ] **Paso 5: Pasar el panel inicial desde la página**

En `app/impacto/page.tsx`, añadir la acción al `Promise.all` y pasar el resultado:

```tsx
import { refrescarPanelOperativo } from "@/lib/metricas/acciones";
```

```tsx
  const [sesion, plantas, indicadores, panel] = await Promise.all([
    leerSesion(),
    todasLasPlantas(),
    indicadoresDeSesion(),
    refrescarPanelOperativo(),
  ]);
```

```tsx
          <Tablero indicadoresIniciales={indicadores} panelInicial={panel} />
```

- [ ] **Paso 6: Verificar en el navegador**

```bash
pnpm dev
```

1. Abre `/impacto`. Esperado: los ocho CSR con su barra, los activos arriba; la tasa de SLA con su mediana y sus miles bien formateados; la tabla de ventanas con una franja ámbar por planta y día.
2. La planta con variabilidad muestra **horas distintas** entre días; las demás repiten la misma.
3. En `/portal`, provoca una solicitud que se asigne a un CSR y vuelve a `/impacto` **sin recargar**. Esperado: la barra de ese CSR crece en menos de dos segundos.
4. En `/demo`, adelanta el reloj varias horas. Vuelve a `/impacto` y recarga. Esperado: la semana proyectada avanzó con el reloj simulado.
5. Revisa a ojo: **el único ámbar de la pantalla es la tabla de ventanas**; no hay verde en el SLA ni en la carga.

- [ ] **Paso 7: Verificar y commitear**

```bash
pnpm lint
pnpm build
pnpm test
```

Esperado: lint limpio, build sin errores, 198 tests en verde.

```bash
git add components/impacto app/impacto docs/superpowers/contexto/plan-4b/tarea-7-contexto.md
git commit -m "Impacto: reparto por CSR, cumplimiento del SLA y ventanas de la semana"
```

---

## Tarea 8: El chat del lado operador

**Archivos:**
- Modificar: `lib/ai/herramientas.ts` (sexta herramienta, dentro de `HERRAMIENTAS`)
- Modificar: `lib/ai/instrucciones.ts:17-19`
- Modificar: `lib/ai/respaldo.ts:25-31`
- Crear: `docs/superpowers/contexto/plan-4b/tarea-8-contexto.md`

**Interfaces:**
- Consume: `solicitudesFiltradas()`, `RUTAS_QMS`, `leerSesion()`.
- Produce: la herramienta `listarSolicitudes`, disponible **solo** con `perfil === "operador"`.

**Cierra la segunda mitad de la escena 5.** `HERRAMIENTAS(perfil)` ya recibe el perfil y hoy solo lo usa para recortar campos de `consultarCotizacion`; esta es la primera herramienta que existe para un perfil y no para el otro.

**Dos límites que no se cruzan.** *No escribe nada:* el contrato §8 prohíbe escrituras comerciales desde el chat; asignar y resolver siguen siendo acciones de pantalla con confirmación explícita. *No reevalúa el procedimiento:* devuelve la `clasificacionQms` y el `puntoQms` que 4A ya calculó y guardó. Si el chat volviera a evaluar, la bandeja y el chat podrían clasificar la misma solicitud de dos formas distintas delante del cliente.

- [ ] **Paso 1: Añadir la herramienta**

En `lib/ai/herramientas.ts`, ampliar las importaciones de `@/lib/fuentes` con `solicitudesFiltradas` y añadir `import { RUTAS_QMS } from "@/lib/reglas-qms";` junto a la de la Tarea 1. Dentro del objeto que devuelve `HERRAMIENTAS`, después de `consultarProcedimiento`:

```ts
    // Solo el operador. El cliente no puede ver la bandeja de Servicio al
    // Cliente, y una herramienta que existe es una herramienta que el modelo
    // acaba llamando.
    ...(perfil === "operador"
      ? {
          listarSolicitudes: tool({
            description:
              "Lista las solicitudes de la sesión con su clasificación QMS ya resuelta y el punto que la justifica. Úsala para responder qué solicitudes pueden declinarse o quién las tiene asignadas. No modifica nada.",
            inputSchema: z.object({
              estado: z.enum(["abierta", "atendida"]).optional(),
              clasificacion: z.enum(RUTAS_QMS).optional(),
              csr: z.string().optional(),
            }),
            execute: async ({ estado, clasificacion, csr }) => {
              const sesion = await leerSesion();
              const solicitudes = await solicitudesFiltradas({
                desde: sesion.iniciadaEn,
                estado,
                clasificacion,
                csr,
              });
              return {
                total: solicitudes.length,
                // La clasificación viene de lo que evaluarSolicitud() guardó al
                // crear la solicitud. Aquí no se reevalúa el procedimiento.
                solicitudes: solicitudes.map((s) => ({
                  numero: s.numero,
                  designacion: s.designacionTexto,
                  cantidad: s.cantidad,
                  clasificacionQms: s.clasificacionQms,
                  puntoQms: s.puntoQms,
                  csrAsignado: s.csrAsignado,
                  estado: s.atendidaEn ? "atendida" : "abierta",
                  resultado: s.resultado,
                })),
              };
            },
          }),
        }
      : {}),
```

`z.enum(RUTAS_QMS)` reutiliza la lista del procedimiento en vez de repetir las diez rutas: si mañana se añade una, el chat la acepta sin tocar este archivo.

- [ ] **Paso 2: Decirle al operador que la tiene**

En `lib/ai/instrucciones.ts`, ampliar `INSTRUCCIONES_OPERADOR`:

```ts
export const INSTRUCCIONES_OPERADOR = `${REGLAS_COMUNES}
Actúas como copiloto de Servicio al Cliente. Puedes explicar la clasificación QMS, consultar cotizaciones y orientar sobre la bandeja.
Ayuda a identificar solicitudes que el procedimiento permite declinar, pero cita siempre el punto que justifica la decisión.
Para cualquier pregunta sobre la bandeja usa listarSolicitudes y responde solo con lo que devuelva: no inventes números de solicitud ni asignaciones.
La clasificación QMS que devuelve esa herramienta ya está resuelta; no la recalcules ni la contradigas.
No puedes asignar ni resolver solicitudes: indica al operador que lo haga desde el panel de detalle de la bandeja.`;
```

- [ ] **Paso 3: Cubrir la escena en el respaldo pregrabado**

En `lib/ai/respaldo.ts` ya existe la rama de «solicitudes planeadas con stock». Se amplía para que también dispare con la formulación del guion y deje claro de dónde saldría la lista:

```ts
  if (
    (texto.includes("solicitudes") || texto.includes("productos")) &&
    (texto.includes("planead") || texto.includes("declinar")) &&
    (texto.includes("stock") || texto.includes("disponib") || texto.includes("hoy"))
  ) {
    return "Según el punto 4.1, las solicitudes de productos planeados (LCC=PLAN) con stock suficiente ya visible en WCL pueden declinarse e informándoselo al cliente. Con conexión, esa lista sale de la bandeja de la sesión con su clasificación QMS ya resuelta; el respaldo sin conexión no inventa solicitudes.";
  }
```

Un respaldo que cubre siete de las ocho escenas no es un respaldo: es una escena que se cae en sala si falla la red.

- [ ] **Paso 4: Verificar la escena 5 completa en el navegador**

```bash
pnpm dev
```

1. En `/portal`, genera dos o tres solicitudes con designaciones distintas —una inválida, una con MOQ incumplido— para que la bandeja tenga material.
2. Abre `/operador` y despliega el chat.
3. Pregunta: **«¿qué solicitudes de hoy son de productos planeados con stock suficiente?»**. Esperado: responde con números de solicitud reales de la bandeja, cita el punto 4.1 y no inventa ninguno.
4. Pregunta: **«¿quién tiene asignada la solicitud <número>?»**. Esperado: el código del CSR, nunca un nombre de persona.
5. Pídele que asigne o resuelva una solicitud. Esperado: se niega y remite al panel de detalle.
6. Abre `/portal` y hazle la misma pregunta del punto 3 al chat del cliente. Esperado: **no** lista solicitudes — la herramienta no existe en ese perfil.
7. Para en el terminal, pon `CHAT_RESPALDO=true` en `.env.local`, levanta otra vez y repite el punto 3. Esperado: sale la respuesta pregrabada. **Devuelve la variable a `false` al terminar.**

- [ ] **Paso 5: Verificar y commitear**

```bash
pnpm lint
pnpm build
pnpm test
```

Esperado: lint limpio, build sin errores, 198 tests en verde.

```bash
git add lib/ai/herramientas.ts lib/ai/instrucciones.ts lib/ai/respaldo.ts docs/superpowers/contexto/plan-4b/tarea-8-contexto.md
git commit -m "Chat del operador: la bandeja de la sesion como herramienta"
```

---

## Tarea 9: README y checklist de despliegue

**Archivos:**
- Reescribir: `README.md`
- Crear: `docs/superpowers/presentacion/despliegue.md`
- Crear: `docs/superpowers/contexto/plan-4b/tarea-9-contexto.md`

**Interfaces:**
- Consume: `.env.example`, los scripts de `package.json`.
- Produce: documentación. Nada de código.

**El despliegue lo ejecuta el usuario.** La CLI de Vercel no está instalada y la cuenta es suya. Esta tarea deja todo listo y verificable; no intenta desplegar ni instalar nada.

- [ ] **Paso 1: Reescribir el README**

`README.md` sigue siendo el boilerplate en inglés de `create-next-app` — deuda declarada desde el Plan 3. Se sustituye por completo, en español, con estas secciones y nada más:

- **Qué es**: POC de presentación para SKF México. Simulación con datos sintéticos y las reglas del procedimiento QMS real. **No** está conectado a WCL, SPQ+ ni PinQ, y no es un MVP.
- **Requisitos**: Node 20+, pnpm, un proyecto de Supabase y una clave de Vercel AI Gateway.
- **Puesta en marcha**: `pnpm install`, copiar `.env.example` a `.env.local` y rellenarlo, `pnpm db:push`, `pnpm seed`, `pnpm dev`.
- **Comandos**: la tabla de scripts de `package.json` con una línea por script explicando para qué sirve.
- **Las cuatro pantallas**: `/portal` (cliente), `/operador` (Servicio al Cliente), `/impacto` (tablero proyectable) y `/demo` (panel del presentador, **que no se proyecta**).
- **Antes de una presentación**: enlace a `docs/superpowers/presentacion/guion-cronometrado.md` y a `despliegue.md`.
- **Estructura**: una línea por carpeta de primer nivel de `lib/` explicando su responsabilidad.

Sin insignias, sin enlaces a la documentación de Next.js, sin secciones de despliegue genéricas de Vercel.

- [ ] **Paso 2: Escribir el documento de despliegue**

`docs/superpowers/presentacion/despliegue.md`, con:

**Variables de entorno**, una tabla con las nueve de `.env.example`, cada una con su origen y su ámbito:

| Variable | Dónde se obtiene | Ámbito |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → Data API | Navegador y servidor |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → API Keys | Navegador y servidor |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API Keys → revelar `service_role` | **Solo servidor** |
| `AI_GATEWAY_API_KEY` | Vercel → AI Gateway → API Keys | Solo servidor |
| `CHAT_MODEL` | Valor fijo: `anthropic/claude-sonnet-5` | Solo servidor |
| `DEMO_SEED` | Valor fijo: `20260803` | Solo servidor |
| `CHAT_RESPALDO` | `false` en producción; se pone en `true` como interruptor de sala | Solo servidor |
| `CHAT_LIMITE_MENSAJES` | Valor fijo: `60` | Solo servidor |

Las cuatro de la CLI de Supabase (`SUPABASE_PROJECT_REF`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_DB_URL`) **no se suben a Vercel**: son de la máquina de desarrollo, para migrar y sembrar.

Con una advertencia en su propio bloque: **`SUPABASE_SERVICE_ROLE_KEY` nunca lleva el prefijo `NEXT_PUBLIC_`.** Esa clave salta RLS; expuesta al navegador, cualquiera con el inspector abierto puede escribir en la base durante la presentación.

**Pasos de despliegue**, con los comandos exactos que el usuario ejecuta:

```bash
npm i -g vercel
vercel login
vercel link
vercel env add <cada variable> production
vercel --prod
```

**Checklist de humo post-deploy**, en la URL de producción, con una casilla por punto:

- [ ] `/portal` busca `DEMO-6205-2RSH/C` y ofrece candidatos.
- [ ] `/operador` filtra por estado y abre el panel de detalle.
- [ ] `/demo` cambia el modo y el estado de una planta, y `/portal` lo refleja sin recargar.
- [ ] `/impacto` sube un contador al provocar un evento, sin recargar.
- [ ] El chat responde en `/portal` y en `/operador`.
- [ ] El distintivo de datos simulados aparece en las tres pantallas públicas.

**Interruptor de sala:** cómo poner `CHAT_RESPALDO=true` en Vercel y volver a desplegar si el Gateway falla durante la presentación.

- [ ] **Paso 3: Verificar que las instrucciones funcionan desde cero**

Lee el README que acabas de escribir como si no conocieras el proyecto y comprueba que cada comando existe en `package.json` y que cada variable existe en `.env.example`. Un README que menciona un script inexistente es peor que no tenerlo.

```bash
pnpm lint
pnpm build
```

Esperado: lint limpio, build sin errores. `pnpm test` no aplica aquí porque esta tarea no toca código, pero córrelo igual antes de commitear: 198 en verde.

- [ ] **Paso 4: Commitear**

```bash
git add README.md docs/superpowers/presentacion/despliegue.md docs/superpowers/contexto/plan-4b/tarea-9-contexto.md
git commit -m "README en espanol y checklist de despliegue"
```

- [ ] **Paso 5: Avisar al usuario**

Esta tarea termina con una petición explícita, no con el despliegue hecho: el usuario ejecuta `vercel` con su cuenta y comparte la URL, y el checklist de humo se verifica contra ella en la Tarea 10.

---

## Tarea 10: Ensayo cronometrado y verificaciones heredadas

**Archivos:**
- Crear: `docs/superpowers/presentacion/guion-cronometrado.md`
- Modificar: `docs/superpowers/presentacion/guia-demo-plan-3.md` (enlazar el guion nuevo, si procede)
- Crear: `docs/superpowers/specs/2026-08-05-estado-tras-plan-4b.md`
- Crear: `docs/superpowers/contexto/plan-4b/tarea-10-contexto.md`

**Interfaces:**
- Consume: todo lo anterior.
- Produce: el guion cronometrado, la evidencia de las verificaciones y el documento de cierre del POC.

**Es la tarea que decide si el POC está listo.** Las verificaciones manuales que 4A dejó pendientes no están hechas: están escritas. Aquí se ejecutan.

- [ ] **Paso 1: Escribir el guion cronometrado**

`docs/superpowers/presentacion/guion-cronometrado.md`, una sección por escena del §3 de `docs/02_alcance_y_guion_demo.md`, cada una con:

- **Tiempo objetivo** (escena 0: 30 s · 1: 1 min · 2: 1,5 min · 3: 1 min · 4: 3 min · 5: 2 min · 6: 2 min · 7: 1 min).
- **Pestaña de partida** y a cuál se cambia.
- **Acciones exactas**: qué se teclea (`DEMO-6205-2RSH/C`, cantidad 200), qué interruptor se toca, en qué orden.
- **Frase de acompañamiento**, tomada del guion original.
- **Qué mirar en pantalla** para saber que la escena salió.
- **Qué hacer si falla**: para la escena 5, el interruptor `CHAT_RESPALDO`; para las demás, la ruta alterna.

Con dos avisos destacados, que son obligación del presentador y no del software:

- La cola de pedidos es la sección 3.3 de la propuesta y **siempre** se presenta como sujeta a validación técnica en la Fase 1.
- Los 12 minutos por solicitud evitada son un supuesto, no una medición.

- [ ] **Paso 2: Ejecutar las verificaciones manuales que 4A dejó pendientes**

Los guiones exactos están en la sección «Verificación manual pendiente» de `docs/superpowers/contexto/plan-4a/tarea-{6,7,9,12,13,14}-contexto.md`. Ejecútalas una por una y anota el resultado real —no el esperado— en el contexto de esta tarea.

Incluye el conteo SQL de los doce tipos de evento:

```sql
select tipo, count(*)
from eventos_demo
where ocurrido_en >= (select iniciada_en from sesion_demo where id = 1)
group by tipo
order by tipo;
```

Esperado tras un recorrido completo: los doce tipos con al menos un registro. Si falta alguno, la escena que lo produce no se ejecutó o su emisor no está funcionando; hay que decir cuál en el documento de cierre.

Y la no duplicación de avisos de la bandeja:

```sql
select tipo, detalle->>'numero' as numero, count(*)
from eventos_demo
where perfil = 'operador' and tipo in ('aviso_moq', 'aviso_pack_quantity')
group by 1, 2 having count(*) > 1;
```

Esperado: **cero filas**. En el portal cada búsqueda sí es un aviso cierto y se emite siempre; la deduplicación es solo de la bandeja.

- [ ] **Paso 3: Ejecutar las dos mediciones de deuda del Plan 3**

*Ensayo visual con dos ventanas.* Abre `/portal` y `/demo` lado a lado, cambia el modo y el estado de una planta desde `/demo` y cronometra cuánto tarda `/portal` en reflejarlo. Anota el número.

*Arranque en frío de Realtime.* Deja la aplicación cerrada veinte minutos, ábrela y cronometra desde la carga hasta que el indicador de canal marca suscrito. Anota el número. Es el dato que dice si la suscripción temprana basta o si el presentador tiene que abrir la pantalla antes de empezar a hablar.

- [ ] **Paso 4: Recorrer las ocho escenas sobre el despliegue**

Con la URL de producción que el usuario compartió tras la Tarea 9, recorre el guion completo cronometrando cada escena, y marca el checklist de humo de `despliegue.md`. Anota las escenas que se pasaron de su tiempo objetivo.

- [ ] **Paso 5: Escribir el documento de cierre**

`docs/superpowers/specs/2026-08-05-estado-tras-plan-4b.md`, con la misma estructura que `estado-tras-plan-4a.md`: qué quedó entregado, restricciones vigentes, deuda consciente —encabezada por la ausencia total de tests en la Fase 4—, resultados reales de las mediciones de los pasos 3 y 4, y los supuestos que siguen abiertos con SKF.

Este documento es el que se lee antes de la Fase 1. Si algo no funcionó, va escrito aquí, no omitido.

- [ ] **Paso 6: Verificar y commitear**

```bash
pnpm lint
pnpm build
pnpm test
```

Esperado: lint limpio, build sin errores, 198 tests en verde.

```bash
git add docs/superpowers/presentacion docs/superpowers/specs/2026-08-05-estado-tras-plan-4b.md docs/superpowers/contexto/plan-4b/tarea-10-contexto.md
git commit -m "Guion cronometrado, verificaciones ejecutadas y cierre del POC"
```

- [ ] **Paso 7: Cerrar la rama**

Usa `superpowers:finishing-a-development-branch` para decidir la integración a `main`.

---

## Cobertura del spec

| Sección del spec | Tarea |
|---|---|
| §4 — Migración `000009` de Realtime | 5 |
| §5.1 — `refrescarIndicadores()` | 4 |
| §5.2 — Hook `useIndicadores` y contadores de `/demo` | 5 |
| §6.1 — `lib/reglas-qms/sla.ts` | 1 |
| §6.2 — `cumplimientoSla()` paginado y memoizado | 2 |
| §6.3 — `franjasDeLaSemana()` | 3 |
| §6.4 — `resumirOperacion()` | 4 |
| §6.5 — `refrescarPanelOperativo()` | 4 |
| §7 — `/impacto` y su pestaña | 6 y 7 |
| §8.1 — Herramienta `listarSolicitudes` | 8 |
| §8.2 — Respaldo pregrabado | 8 |
| §8.3 — `INSTRUCCIONES_OPERADOR` | 8 |
| §9.1 — README | 9 |
| §9.2 — Despliegue | 9, y ejecución del usuario |
| §9.3 — Ensayo y video | 10, y grabación del usuario |
| §10 — Verificación | 1–10, y ejecución concentrada en 10 |
