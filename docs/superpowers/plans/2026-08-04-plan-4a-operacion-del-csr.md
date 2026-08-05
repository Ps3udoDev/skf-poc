# Plan 4A — Operación del CSR

> **Para agentes ejecutores:** SUB-SKILL REQUERIDA: usa `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans` para implementar tarea por tarea. Los pasos usan casillas (`- [ ]`) para seguimiento.

**Objetivo:** Cerrar todo lo que escribe en la base y aplica reglas del procedimiento — bandeja completa con filtros y detalle, asignación automática y manual de CSR, confirmación guiada de homólogos, cola de intenciones durante una ventana de planta y reconciliación al reabrirla — de modo que las escenas 3 y 4 del guion cierren y los doce tipos de `tipo_evento` empiecen a emitirse.

**Arquitectura:** Se conservan las cuatro capas del Plan 3 y se añade una quinta, `lib/operacion`, con la lógica de negocio **pura** que 4A introduce (elección de CSR y reconciliación de la cola): recibe datos ya resueltos, no toca la red y se prueba con arreglos en memoria. `lib/fuentes` sigue siendo la única capa que lee tablas y gana tres lecturas nuevas (`operadores`, `intenciones`, `eventos`); toda escritura nueva va por Server Actions con `service_role`. Ninguna pantalla se duplica por modo y ninguna migración se abre.

**Stack:** Next.js 16.2 App Router · React 19.2 · TypeScript · Tailwind CSS v4 · shadcn/ui · Supabase (cloud) · Vitest · Biome

**Documento que fija los contratos:** `docs/superpowers/specs/2026-08-04-contratos-fase-4.md`. Lo que ahí está escrito, este plan lo respeta; lo que no está escrito, lo decide este plan y lo deja anotado en el contexto de la tarea.

---

## Restricciones globales

Se heredan del Plan 3 y de las invariantes del §3 del spec de contratos. Cada tarea las cumple sin excepción.

- **Todo en español:** archivos, carpetas, funciones, variables, tipos, comentarios y textos de pantalla. Única excepción: los componentes vendorizados en `components/ui/`.
- **Cero datos reales de SKF.** Operadores como `CSR 1`, `CSR 2`… nunca nombres de personas.
- **`lib/fuentes` es la única capa que lee tablas.** Ningún componente ni Server Action consulta Supabase por su cuenta.
- **Toda escritura del navegador pasa por Server Actions con `service_role`.** El navegador solo lee con la clave anónima.
- **Ámbar es exclusivo de desconexión; verde, exclusivo de confirmación;** rojo solo error. Toda designación va en monoespaciada (clase `designacion`).
- **Ninguna estimación se presenta como confirmada:** rango, número de casos y compromiso de confirmación son obligatorios en cualquier pantalla nueva.
- **El validador y el chat solo eligen designaciones que existen en el catálogo.**
- **El modo es estado de `sesion_demo`,** nunca una ruta duplicada.
- **`emitirEvento()` no lanza jamás.** Un fallo de métrica no puede tumbar una pantalla.
- **Los mocks llevan latencia; buscador y validador no.**
- **La Fase 4 no abre migración.** Las vigentes llegan hasta `000008` y no se editan; el hueco `000004` es deliberado. Si aparece una necesidad real de esquema, se detiene la tarea y se justifica antes de abrir `000009`.
- **Distintivo permanente** de *Entorno de demostración · datos simulados* y la coletilla «sobre datos simulados» en toda cifra.
- **Vitest usa `pool: "threads"`.** `pnpm test` es hermético e incluye solo `lib/**/*.test.ts` y `scripts/**/*.test.ts`. Lo que toca la red vive en `*.integracion.test.ts` bajo `lib/` y corre con `pnpm test:integracion`.
- **Biome.** Su reordenamiento de imports y sus ajustes de formato son esperados, no desviación. Corre `pnpm lint` antes de cada commit.
- **Nada de `Math.random()` en decisiones de negocio.** El desempate de asignación y la reconciliación son deterministas a propósito: un ensayo irrepetible no sirve para ensayar.

### Contrato de contexto por tarea (obligatorio)

Cada tarea **debe** escribir `docs/superpowers/contexto/plan-4a/tarea-N-contexto.md` y **commitearlo junto con el código**. Va versionado a propósito: si la sesión se corta por límite de tokens, otro agente retoma desde ahí sin acceso a esta conversación.

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
```

No cites el hash de tu propio commit: el archivo va dentro de ese commit y no puedes conocerlo al escribirlo. Para ubicar el trabajo basta `git log --oneline -- <ruta>`.

---

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `lib/operacion/asignacion.ts` | Elección determinista de CSR (puro) |
| `lib/operacion/reconciliacion.ts` | Qué pasa con cada intención al reabrir la planta (puro) |
| `lib/validador/confirmacion.ts` | Diferencias técnicas → pasos que el cliente reconoce (puro) |
| `lib/fuentes/operadores.ts` | Carga por CSR e id de un código |
| `lib/fuentes/intenciones.ts` | Lectura de la cola de intenciones |
| `lib/fuentes/eventos.ts` | Consulta puntual de eventos ya emitidos (deduplicación de avisos) |
| `lib/fuentes/solicitudes.ts` | *(se amplía)* Bandeja filtrada, fila individual y campos de operación |
| `app/(operador)/acciones.ts` | Asignar, resolver y componer el detalle de una solicitud |
| `app/(portal)/portal/acciones.ts` | *(se amplía)* Encolar intención, confirmar homólogo, listar cola |
| `lib/sesion-demo/acciones.ts` | *(se amplía)* Reconciliación al cerrar ventana y eventos de ventana |
| `components/operador/filtros-bandeja.tsx` | Filtros de estado, clasificación QMS y CSR sobre la URL |
| `components/operador/bandeja.tsx` | Estado de selección entre la tabla y el panel |
| `components/operador/lista-solicitudes.tsx` | *(se amplía)* Columnas de CSR y estado; fila seleccionable |
| `components/operador/panel-detalle.tsx` | Detalle completo, asignación y resolución |
| `components/portal/confirmacion-homologo.tsx` | Confirmación guiada paso por paso |
| `components/portal/cola-intenciones.tsx` | Cola del cliente y resultado de la reconciliación |
| `components/portal/detalle-designacion.tsx` | *(se amplía)* Encolar durante ventana y abrir equivalencias |

---

## Tarea 1: Elección determinista de CSR

**Archivos:**
- Crear: `lib/operacion/asignacion.ts`, `lib/operacion/asignacion.test.ts`
- Crear: `docs/superpowers/contexto/plan-4a/tarea-1-contexto.md`

**Interfaces:**
- Consume: nada. Es el primer módulo de `lib/operacion` y no importa nada del proyecto.
- Produce:
  - `interface CargaCsr { codigo: string; abiertas: number; activo: boolean }`
  - `elegirCsr(cargas: readonly CargaCsr[]): string | null`

**Por qué el desempate es lexicográfico y no aleatorio.** El ensayo cronometrado de 4B repite el mismo recorrido varias veces. Si dos CSR empatados se resolvieran con `Math.random()`, la bandeja mostraría un reparto distinto en cada pasada y nadie podría afirmar que el comportamiento es el esperado. `CargaCsr` se define **aquí** y `lib/fuentes/operadores.ts` importa el tipo: la dependencia va de fuentes hacia operación, nunca al revés, para que este módulo siga siendo comprobable sin tocar Supabase.

- [ ] **Paso 1: Escribir el test que falla**

`lib/operacion/asignacion.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { type CargaCsr, elegirCsr } from "./asignacion";

const carga = (codigo: string, abiertas: number, activo = true): CargaCsr => ({
  codigo,
  abiertas,
  activo,
});

describe("elegirCsr", () => {
  it("elige al operador activo con menos solicitudes abiertas", () => {
    expect(elegirCsr([carga("CSR 1", 3), carga("CSR 2", 1), carga("CSR 3", 2)])).toBe("CSR 2");
  });

  it("ignora a los inactivos aunque estén completamente libres", () => {
    expect(elegirCsr([carga("CSR 7", 0, false), carga("CSR 1", 4)])).toBe("CSR 1");
  });

  it("desempata por código lexicográfico y no por el orden del arreglo", () => {
    const cargas = [carga("CSR 5", 2), carga("CSR 2", 2), carga("CSR 8", 2)];
    expect(elegirCsr(cargas)).toBe("CSR 2");
    expect(elegirCsr([...cargas].reverse())).toBe("CSR 2");
  });

  it("devuelve null cuando ningún operador está activo", () => {
    expect(elegirCsr([carga("CSR 7", 0, false), carga("CSR 9", 1, false)])).toBeNull();
  });

  it("devuelve null con la lista vacía", () => {
    expect(elegirCsr([])).toBeNull();
  });

  it("no muta el arreglo recibido", () => {
    const cargas = [carga("CSR 3", 1), carga("CSR 1", 0)];
    const copia = cargas.map((c) => ({ ...c }));
    elegirCsr(cargas);
    expect(cargas).toEqual(copia);
  });
});
```

- [ ] **Paso 2: Ejecutar y ver el fallo**

```bash
pnpm vitest run lib/operacion/asignacion.test.ts
```

Esperado: FALLA con «Failed to resolve import "./asignacion"».

- [ ] **Paso 3: Implementar el módulo**

`lib/operacion/asignacion.ts`:

```ts
/**
 * Reparto de solicitudes entre los CSR.
 *
 * Función pura: recibe la carga ya contada y no sabe de dónde salió. Así el
 * reparto se prueba con arreglos en memoria y `lib/fuentes` puede cambiar la
 * consulta sin tocar la regla.
 */
export interface CargaCsr {
  codigo: string;
  /** Solicitudes de la sesión que ese operador tiene sin atender. */
  abiertas: number;
  activo: boolean;
}

/**
 * Operador que debe recibir la siguiente solicitud, o `null` si no hay ninguno
 * activo.
 *
 * `null` NO es un error: la solicitud se crea igual y la bandeja la muestra
 * como «Sin asignar». Una solicitud nunca se pierde por no haber a quién
 * asignarla.
 *
 * El desempate es lexicográfico y por tanto determinista. Un `Math.random()`
 * aquí haría que el ensayo cronometrado del Plan 4B no fuera repetible. Con
 * códigos de dos dígitos el orden lexicográfico pondría "CSR 10" antes que
 * "CSR 2"; es aceptable porque la regla solo necesita ser estable, no
 * numéricamente ordenada.
 */
export function elegirCsr(cargas: readonly CargaCsr[]): string | null {
  const activos = cargas.filter((carga) => carga.activo);
  if (activos.length === 0) return null;

  return activos.reduce((mejor, actual) => {
    if (actual.abiertas !== mejor.abiertas) return actual.abiertas < mejor.abiertas ? actual : mejor;
    return actual.codigo < mejor.codigo ? actual : mejor;
  }).codigo;
}
```

- [ ] **Paso 4: Ejecutar y ver que pasa**

```bash
pnpm vitest run lib/operacion/asignacion.test.ts
```

Esperado: 6 tests en verde.

- [ ] **Paso 5: Escribir el contexto y commitear**

En «Decisiones tomadas y por qué» deja escrito el motivo del desempate lexicográfico y el motivo de que `CargaCsr` viva en `lib/operacion` y no en `lib/fuentes`. Ambos se ven arbitrarios leyendo solo el código.

```bash
pnpm lint
git add lib/operacion docs/superpowers/contexto
git commit -m "Asignacion de CSR: eleccion determinista por menor carga"
```

---

## Tarea 2: Fuente de operadores

**Archivos:**
- Crear: `lib/fuentes/operadores.ts`, `lib/fuentes/operadores.integracion.test.ts`
- Modificar: `lib/fuentes/index.ts`
- Crear: `docs/superpowers/contexto/plan-4a/tarea-2-contexto.md`

**Interfaces:**
- Consume: `CargaCsr` de `lib/operacion/asignacion`, `clienteLectura`, `lanzarSiError`.
- Produce:
  - `cargaPorCsr(desde: string): Promise<CargaCsr[]>`
  - `idDeOperador(codigo: string): Promise<number | null>`
  - Re-exporta el tipo `CargaCsr` desde `lib/fuentes`.

**Por qué hacen falta dos funciones y no una.** `solicitudes.csr_asignado` es un `bigint` que referencia `operadores(id)`, pero el contrato del §6.1 expone el **código** (`CSR 1`), nunca el id: el id es detalle de esquema. Toda lectura traduce id → código con un `join`, y toda escritura necesita el camino inverso. `idDeOperador` es ese camino inverso; sin ella, la asignación tendría que reimplementar la traducción en cada Server Action.

- [ ] **Paso 1: Escribir la fuente**

`lib/fuentes/operadores.ts`:

```ts
import type { CargaCsr } from "@/lib/operacion/asignacion";
import { clienteLectura } from "@/lib/supabase/lectura";
import { lanzarSiError } from "./errores";

export type { CargaCsr };

/**
 * Carga abierta de cada operador desde el inicio de la sesión.
 *
 * Devuelve TODOS los operadores, activos e inactivos. Un operador sin
 * solicitudes aparece con `abiertas: 0` en vez de omitirse, porque es
 * justamente el que debe recibir la siguiente: si se omitiera, `elegirCsr()`
 * nunca lo vería y el reparto se concentraría en quien ya tiene trabajo.
 *
 * El conteo se hace en memoria y no con un `group by` en SQL: son ocho
 * operadores y unas decenas de solicitudes por sesión, y así la capa de
 * fuentes no necesita una vista ni una RPC nueva.
 */
export async function cargaPorCsr(desde: string): Promise<CargaCsr[]> {
  const lectura = clienteLectura();
  const [operadores, solicitudes] = await Promise.all([
    lectura.from("operadores").select("id, codigo, activo").order("codigo"),
    lectura
      .from("solicitudes")
      .select("csr_asignado")
      .gte("creada_en", desde)
      .is("atendida_en", null),
  ]);
  lanzarSiError(operadores.error, "obtener los operadores");
  lanzarSiError(solicitudes.error, "obtener la carga de los operadores");

  const abiertasPorId = new Map<number, number>();
  for (const fila of solicitudes.data ?? []) {
    if (fila.csr_asignado === null) continue;
    abiertasPorId.set(fila.csr_asignado, (abiertasPorId.get(fila.csr_asignado) ?? 0) + 1);
  }

  return (operadores.data ?? []).map((operador) => ({
    codigo: operador.codigo,
    abiertas: abiertasPorId.get(operador.id) ?? 0,
    activo: operador.activo,
  }));
}

/**
 * Id de un operador a partir de su código.
 *
 * `null` cuando el código no existe: quien escribe decide si eso es un error
 * (asignación manual a un código inventado) o un filtro vacío (bandeja).
 */
export async function idDeOperador(codigo: string): Promise<number | null> {
  const { data, error } = await clienteLectura()
    .from("operadores")
    .select("id")
    .eq("codigo", codigo)
    .maybeSingle();
  lanzarSiError(error, `obtener el operador ${codigo}`);
  return data?.id ?? null;
}
```

- [ ] **Paso 2: Exportarla desde el índice de fuentes**

En `lib/fuentes/index.ts`, añade la línea conservando el orden alfabético que Biome espera:

```ts
export * from "./contexto";
export * from "./cotizaciones";
export * from "./designaciones";
export * from "./homologos";
export * from "./inventario";
export * from "./operadores";
export * from "./plantas";
export * from "./solicitudes";
```

- [ ] **Paso 3: Escribir el test de integración**

`lib/fuentes/operadores.integracion.test.ts`:

```ts
/**
 * Test de INTEGRACIÓN: golpea el proyecto real de Supabase por la red.
 * Fuera de `pnpm test` a propósito. Se corre con `pnpm test:integracion`.
 */
import { config } from "dotenv";
import { beforeAll, describe, expect, it } from "vitest";
import { cargaPorCsr, idDeOperador } from "./operadores";

beforeAll(() => config({ path: ".env.local", quiet: true }));

describe("cargaPorCsr", () => {
  it("devuelve todos los operadores sembrados, activos e inactivos", async () => {
    const cargas = await cargaPorCsr(new Date().toISOString());
    expect(cargas.length).toBeGreaterThanOrEqual(8);
    expect(cargas.some((carga) => !carga.activo)).toBe(true);
    for (const carga of cargas) expect(carga.codigo).toMatch(/^CSR \d+$/);
  });

  it("no omite a un operador sin solicitudes: aparece con abiertas en 0", async () => {
    // Contando desde este instante, nadie puede tener solicitudes abiertas.
    const cargas = await cargaPorCsr(new Date().toISOString());
    expect(cargas.every((carga) => carga.abiertas === 0)).toBe(true);
  });
});

describe("idDeOperador", () => {
  it("resuelve el id de un código existente", async () => {
    expect(typeof (await idDeOperador("CSR 1"))).toBe("number");
  });

  it("devuelve null para un código que no existe", async () => {
    expect(await idDeOperador("CSR 999")).toBeNull();
  });
});
```

- [ ] **Paso 4: Ejecutar las dos suites**

```bash
pnpm test
pnpm test:integracion
```

Esperado: la hermética sigue en verde y la de integración pasa los cuatro tests nuevos. Si `pnpm test:integracion` falla por red o por proyecto suspendido, anótalo en el contexto y no lo tomes como fallo del código.

- [ ] **Paso 5: Escribir el contexto y commitear**

```bash
pnpm lint
git add lib/fuentes docs/superpowers/contexto
git commit -m "Fuente de operadores: carga abierta por CSR e id por codigo"
```

---

## Tarea 3: Bandeja filtrada en la fuente de solicitudes

**Archivos:**
- Modificar: `lib/fuentes/solicitudes.ts`
- Crear: `lib/fuentes/solicitudes.integracion.test.ts`
- Crear: `docs/superpowers/contexto/plan-4a/tarea-3-contexto.md`

**Interfaces:**
- Consume: `idDeOperador` de `./operadores`, `MotivoDeclinado` y `RutaQMS` de `@/lib/reglas-qms`.
- Produce:
  - `SolicitudResumen` con cuatro campos nuevos: `csrAsignado: string | null`, `atendidaEn: string | null`, `resultado: "cotizada" | "declinada" | null`, `motivoDeclinado: MotivoDeclinado | null`
  - `type EstadoSolicitud = "abierta" | "atendida"`
  - `interface FiltroBandeja { desde: string; estado?: EstadoSolicitud; clasificacion?: RutaQMS; csr?: string | null }`
  - `solicitudesFiltradas(filtro: FiltroBandeja): Promise<SolicitudResumen[]>`
  - `filaDeSolicitud(numero: string): Promise<SolicitudResumen | null>`
  - `solicitudesDesde(iniciadaEn)` **conserva su firma**: la usa `/operador` hoy.

**Los dos detalles que se rompen si se hacen a ojo.** El primero: `csr:operadores ( codigo )` es un *embed* de muchos-a-uno, así que PostgREST devuelve un objeto o `null`, no un arreglo; el mapeador lo aplana a `codigo` y nadie fuera de este archivo vuelve a ver la forma anidada. El segundo: en `FiltroBandeja`, `csr: null` significa «solo las no asignadas» y `csr: undefined` significa «no filtres por CSR». Comparar con `if (filtro.csr)` colapsa los dos casos y hace desaparecer el filtro de «Sin asignar», que es exactamente el que el CSR usa para repartirse el trabajo.

- [ ] **Paso 1: Reescribir la fuente**

`lib/fuentes/solicitudes.ts` completo:

```ts
import type { MotivoDeclinado, RutaQMS } from "@/lib/reglas-qms";
import { clienteLectura } from "@/lib/supabase/lectura";
import { lanzarSiError } from "./errores";
import { idDeOperador } from "./operadores";

export interface SolicitudResumen {
  numero: string;
  designacionTexto: string;
  cantidad: number;
  clasificacionQms: string | null;
  puntoQms: string | null;
  creadaEn: string;
  /** Código de operador ('CSR 1'), nunca el id: el id es detalle de esquema. */
  csrAsignado: string | null;
  atendidaEn: string | null;
  resultado: "cotizada" | "declinada" | null;
  motivoDeclinado: MotivoDeclinado | null;
}

export type EstadoSolicitud = "abierta" | "atendida";

export interface FiltroBandeja {
  /** ISO. Siempre `sesion.iniciadaEn`: la bandeja nunca sale de la sesión. */
  desde: string;
  estado?: EstadoSolicitud;
  clasificacion?: RutaQMS;
  /** `null` filtra las no asignadas; `undefined` no filtra por CSR. */
  csr?: string | null;
}

const COLUMNAS = `
  numero, designacion_texto, cantidad, clasificacion_qms, punto_qms, creada_en,
  atendida_en, resultado, motivo_declinado, csr:operadores ( codigo )
`;

interface FilaSolicitud {
  numero: string;
  designacion_texto: string;
  cantidad: number;
  clasificacion_qms: string | null;
  punto_qms: string | null;
  creada_en: string;
  atendida_en: string | null;
  resultado: "cotizada" | "declinada" | null;
  motivo_declinado: MotivoDeclinado | null;
  /** Embed de muchos-a-uno: objeto o null, nunca arreglo. */
  csr: { codigo: string } | null;
}

function aResumen(fila: FilaSolicitud): SolicitudResumen {
  return {
    numero: fila.numero,
    designacionTexto: fila.designacion_texto,
    cantidad: fila.cantidad,
    clasificacionQms: fila.clasificacion_qms,
    puntoQms: fila.punto_qms,
    creadaEn: fila.creada_en,
    csrAsignado: fila.csr?.codigo ?? null,
    atendidaEn: fila.atendida_en,
    resultado: fila.resultado,
    motivoDeclinado: fila.motivo_declinado,
  };
}

/** Solicitudes de la sesión, sin filtrar. La usa la bandeja y la usará el chat. */
export async function solicitudesDesde(iniciadaEn: string): Promise<SolicitudResumen[]> {
  return solicitudesFiltradas({ desde: iniciadaEn });
}

export async function solicitudesFiltradas(filtro: FiltroBandeja): Promise<SolicitudResumen[]> {
  let consulta = clienteLectura()
    .from("solicitudes")
    .select(COLUMNAS)
    .gte("creada_en", filtro.desde);

  if (filtro.estado === "abierta") consulta = consulta.is("atendida_en", null);
  if (filtro.estado === "atendida") consulta = consulta.not("atendida_en", "is", null);
  if (filtro.clasificacion) consulta = consulta.eq("clasificacion_qms", filtro.clasificacion);

  if (filtro.csr === null) {
    consulta = consulta.is("csr_asignado", null);
  } else if (filtro.csr !== undefined) {
    const id = await idDeOperador(filtro.csr);
    // Filtrar por un operador que no existe da cero resultados, no todos.
    if (id === null) return [];
    consulta = consulta.eq("csr_asignado", id);
  }

  const { data, error } = await consulta.order("creada_en", { ascending: false });
  lanzarSiError(error, "obtener las solicitudes de la sesión");
  return ((data ?? []) as unknown as FilaSolicitud[]).map(aResumen);
}

export async function filaDeSolicitud(numero: string): Promise<SolicitudResumen | null> {
  const { data, error } = await clienteLectura()
    .from("solicitudes")
    .select(COLUMNAS)
    .eq("numero", numero)
    .maybeSingle();
  lanzarSiError(error, `obtener la solicitud ${numero}`);
  return data ? aResumen(data as unknown as FilaSolicitud) : null;
}
```

- [ ] **Paso 2: Escribir el test de integración**

`lib/fuentes/solicitudes.integracion.test.ts`:

```ts
/** Test de INTEGRACIÓN. Se corre con `pnpm test:integracion`. */
import { config } from "dotenv";
import { beforeAll, describe, expect, it } from "vitest";
import { filaDeSolicitud, solicitudesFiltradas } from "./solicitudes";

beforeAll(() => config({ path: ".env.local", quiet: true }));

const DESDE_SIEMPRE = new Date(0).toISOString();

describe("solicitudesFiltradas", () => {
  it("expone el código del CSR, nunca el id", async () => {
    const filas = await solicitudesFiltradas({ desde: DESDE_SIEMPRE });
    for (const fila of filas) {
      if (fila.csrAsignado !== null) expect(fila.csrAsignado).toMatch(/^CSR \d+$/);
    }
  });

  it("el filtro 'abierta' no devuelve ninguna solicitud atendida", async () => {
    const filas = await solicitudesFiltradas({ desde: DESDE_SIEMPRE, estado: "abierta" });
    expect(filas.every((fila) => fila.atendidaEn === null)).toBe(true);
  });

  it("el filtro 'atendida' solo devuelve solicitudes con resultado", async () => {
    const filas = await solicitudesFiltradas({ desde: DESDE_SIEMPRE, estado: "atendida" });
    expect(filas.every((fila) => fila.atendidaEn !== null && fila.resultado !== null)).toBe(true);
  });

  it("csr: null devuelve solo las no asignadas", async () => {
    const filas = await solicitudesFiltradas({ desde: DESDE_SIEMPRE, csr: null });
    expect(filas.every((fila) => fila.csrAsignado === null)).toBe(true);
  });

  it("un código de CSR inexistente devuelve la lista vacía, no todas", async () => {
    expect(await solicitudesFiltradas({ desde: DESDE_SIEMPRE, csr: "CSR 999" })).toEqual([]);
  });
});

describe("filaDeSolicitud", () => {
  it("devuelve null cuando el número no existe", async () => {
    expect(await filaDeSolicitud("1999Q00000")).toBeNull();
  });
});
```

- [ ] **Paso 3: Ejecutar las dos suites y comprobar que la pantalla actual sigue compilando**

```bash
pnpm test
pnpm test:integracion
pnpm build
```

Esperado: verde en las tres. `app/(operador)/operador/page.tsx` no cambia: `SolicitudResumen` ganó campos, no perdió ninguno.

- [ ] **Paso 4: Escribir el contexto y commitear**

Deja escrito en «Decisiones tomadas y por qué» la distinción entre `csr: null` y `csr: undefined`, y por qué `solicitudesDesde` ahora delega en `solicitudesFiltradas` en vez de mantener su propia consulta.

```bash
pnpm lint
git add lib/fuentes docs/superpowers/contexto
git commit -m "Bandeja: filtros por estado, clasificacion QMS y CSR en la fuente"
```

---

## Tarea 4: Asignación automática al generar una solicitud

**Archivos:**
- Modificar: `app/(portal)/portal/acciones.ts`
- Crear: `docs/superpowers/contexto/plan-4a/tarea-4-contexto.md`

**Interfaces:**
- Consume: `elegirCsr` de `lib/operacion/asignacion`, `cargaPorCsr` e `idDeOperador` de `lib/fuentes`, `leerSesion`.
- Produce: `generarSolicitud(consulta, cantidad): Promise<string>` **con la misma firma pública**. Gana un paso interno: escribe `csr_asignado`.

**Por qué la elección va antes del bucle de reintento.** El bucle existe para el choque de número (`23505`) y puede correr hasta cinco veces. Si `cargaPorCsr()` se llamara dentro, la misma solicitud consultaría la carga cinco veces sin que nada haya cambiado. Se resuelve una vez, antes.

- [ ] **Paso 1: Modificar `generarSolicitud`**

En `app/(portal)/portal/acciones.ts`, sustituye el cuerpo de `generarSolicitud` hasta el `insert`:

```ts
export async function generarSolicitud(consulta: string, cantidad: number): Promise<string> {
  const [contexto, sesion] = await Promise.all([
    construirContexto(consulta.trim(), cantidad),
    leerSesion(),
  ]);
  const evaluacion = evaluarSolicitud(contexto);

  // Reparto automático. `null` es un resultado válido: sin operadores activos
  // la solicitud se crea igual y la bandeja la muestra como «Sin asignar».
  const csr = elegirCsr(await cargaPorCsr(sesion.iniciadaEn));
  const csrId = csr === null ? null : await idDeOperador(csr);

  let numero = "";
  let ultimoError = "";

  for (let intento = 0; intento < 5; intento++) {
    numero = numeroDeSolicitud();
    const { error } = await clienteAdmin().from("solicitudes").insert({
      numero,
      designacion_texto: consulta,
      cantidad,
      clasificacion_qms: evaluacion.ruta,
      punto_qms: evaluacion.punto,
      csr_asignado: csrId,
    });
    if (!error) {
      ultimoError = "";
      break;
    }
    ultimoError = error.message;
    if (error.code !== "23505") break;
  }
  if (ultimoError) throw new Error(`No se pudo generar la solicitud: ${ultimoError}`);

  await emitirEvento({
    tipo: "solicitud_generada",
    perfil: "cliente",
    designacion: consulta,
    pdiv: contexto.designacion?.pdiv ?? null,
    detalle: { numero, ruta: evaluacion.ruta, punto: evaluacion.punto, csr },
  });
  revalidatePath("/operador");
  return numero;
}
```

Añade los imports que faltan: `elegirCsr` desde `@/lib/operacion/asignacion` y `cargaPorCsr`, `idDeOperador` desde `@/lib/fuentes` (junto a `construirContexto`). `leerSesion` ya está importado en el archivo.

- [ ] **Paso 2: Verificar el reparto en vivo**

```bash
pnpm dev
```

En `/portal`, genera **tres** solicitudes seguidas (busca una designación que no exista, por ejemplo `DEMO-NO-EXISTE`, y pulsa *Solicitar cotización* tres veces). Después, en el editor SQL de Supabase:

```sql
select s.numero, o.codigo as csr, s.creada_en
from solicitudes s
left join operadores o on o.id = s.csr_asignado
order by s.creada_en desc
limit 5;
```

Esperado: las tres filas traen un `csr` no nulo, ninguna es `CSR 7` (el operador inactivo de la siembra) y las tres van a **códigos distintos** — al repartir por menor carga, la segunda no puede caer en quien acaba de recibir la primera.

- [ ] **Paso 3: Ejecutar la suite y compilar**

```bash
pnpm test
pnpm build
```

- [ ] **Paso 4: Escribir el contexto y commitear**

```bash
pnpm lint
git add "app/(portal)" docs/superpowers/contexto
git commit -m "Generar solicitud: asignacion automatica al CSR con menor carga"
```

---

## Tarea 5: Server Actions del operador

**Archivos:**
- Crear: `app/(operador)/acciones.ts`
- Crear: `docs/superpowers/contexto/plan-4a/tarea-5-contexto.md`

**Interfaces:**
- Consume: `filaDeSolicitud`, `construirContexto`, `homologosDe`, `idDeOperador` de `lib/fuentes`; `evaluarSolicitud` y `motivoDeclinado` de `lib/reglas-qms`; `estimarTE`; `clienteAdmin`.
- Produce:
  - `interface DetalleSolicitud { fila: SolicitudResumen; contexto: ContextoSolicitud; evaluacion: EvaluacionQMS; homologos: Homologo[]; estimacion: Estimacion | null }`
  - `detalleDeSolicitud(numero: string): Promise<DetalleSolicitud | null>`
  - `asignarSolicitud(numero: string, csr: string | null): Promise<void>`
  - `resolverSolicitud(numero: string, resultado: "cotizada" | "declinada", motivo?: MotivoDeclinado): Promise<void>`

**Dónde se compone el detalle y por qué.** La fuente devuelve la **fila**, no el detalle compuesto: si `lib/fuentes` llamara a los motores, la capa que solo lee tablas empezaría a decidir. La composición ocurre aquí, en la Server Action, llamando a los motores que ya existen. Nada de esto se reimplementa.

**La regla que la base también exige.** `resolverSolicitud` rechaza `motivo` cuando el resultado es `cotizada`. Cuando es `declinada` sin motivo, lo deriva de la clasificación con `motivoDeclinado(ruta)` — el mapeo entre `RutaQMS` y el enum SQL ya vive en `lib/reglas-qms/motivos.ts` y no se duplica. Si la ruta no declina y tampoco se pasó motivo, la acción falla antes de escribir: la restricción `solicitudes_declinada_tiene_motivo` lo rechazaría de todos modos, y un error de base en pantalla durante la demostración es peor que un mensaje claro.

**La hora de auditoría es real, no simulada.** `atendida_en` se escribe con `new Date()`. El reloj simulado gobierna las ventanas de fábrica; la auditoría de quién atendió qué y cuándo, no.

- [ ] **Paso 1: Escribir las tres acciones**

`app/(operador)/acciones.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import type { Estimacion } from "@/lib/estimador/calculo";
import { estimarTE } from "@/lib/estimador/estimador";
import {
  construirContexto,
  filaDeSolicitud,
  type Homologo,
  homologosDe,
  idDeOperador,
  type SolicitudResumen,
} from "@/lib/fuentes";
import {
  type ContextoSolicitud,
  type EvaluacionQMS,
  evaluarSolicitud,
  type MotivoDeclinado,
  motivoDeclinado,
  type RutaQMS,
} from "@/lib/reglas-qms";
import { clienteAdmin } from "@/lib/supabase/admin";

export interface DetalleSolicitud {
  fila: SolicitudResumen;
  contexto: ContextoSolicitud;
  evaluacion: EvaluacionQMS;
  homologos: Homologo[];
  estimacion: Estimacion | null;
}

/**
 * Detalle completo de una solicitud de la bandeja.
 *
 * Se compone aquí y no en `lib/fuentes`: la fuente devuelve la fila y los
 * motores hacen el resto. `designacionTexto` es lo que el cliente escribió sin
 * corregir, así que puede no existir en el catálogo — ese es exactamente el
 * caso del punto 4.8, y por eso `contexto.designacion` puede ser `null` sin
 * que nada falle.
 */
export async function detalleDeSolicitud(numero: string): Promise<DetalleSolicitud | null> {
  const fila = await filaDeSolicitud(numero);
  if (fila === null) return null;

  const contexto = await construirContexto(fila.designacionTexto.trim(), fila.cantidad);
  const evaluacion = evaluarSolicitud(contexto);
  const codigo = contexto.designacion?.designacion ?? null;

  const [homologos, estimacion] = await Promise.all([
    codigo === null ? Promise.resolve<Homologo[]>([]) : homologosDe(codigo),
    codigo === null ? Promise.resolve<Estimacion | null>(null) : estimarTE(codigo, fila.cantidad),
  ]);

  return { fila, contexto, evaluacion, homologos, estimacion };
}

/** `csr: null` devuelve la solicitud al montón sin asignar. */
export async function asignarSolicitud(numero: string, csr: string | null): Promise<void> {
  let id: number | null = null;
  if (csr !== null) {
    id = await idDeOperador(csr);
    if (id === null) throw new Error(`No existe el operador ${csr}.`);
  }

  const { error } = await clienteAdmin()
    .from("solicitudes")
    .update({ csr_asignado: id })
    .eq("numero", numero);
  if (error) throw new Error(`No se pudo asignar la solicitud ${numero}: ${error.message}`);
  revalidatePath("/operador");
}

export async function resolverSolicitud(
  numero: string,
  resultado: "cotizada" | "declinada",
  motivo?: MotivoDeclinado,
): Promise<void> {
  if (resultado === "cotizada" && motivo !== undefined) {
    throw new Error("Una solicitud cotizada no lleva motivo de declinación.");
  }

  let motivoFinal: MotivoDeclinado | null = null;
  if (resultado === "declinada") {
    motivoFinal = motivo ?? null;
    if (motivoFinal === null) {
      const fila = await filaDeSolicitud(numero);
      if (fila === null) throw new Error(`No existe la solicitud ${numero}.`);
      motivoFinal =
        fila.clasificacionQms === null ? null : motivoDeclinado(fila.clasificacionQms as RutaQMS);
    }
    if (motivoFinal === null) {
      throw new Error(
        "No se puede declinar sin motivo: la clasificación QMS de esta solicitud no corresponde " +
          "a una ruta que declina. Elige el motivo explícitamente.",
      );
    }
  }

  const { error } = await clienteAdmin()
    .from("solicitudes")
    .update({
      // Hora real, no simulada: el reloj del presentador gobierna las ventanas
      // de fábrica, no la auditoría de la solicitud.
      atendida_en: new Date().toISOString(),
      resultado,
      motivo_declinado: motivoFinal,
    })
    .eq("numero", numero);
  if (error) throw new Error(`No se pudo resolver la solicitud ${numero}: ${error.message}`);
  revalidatePath("/operador");
}
```

- [ ] **Paso 2: Compilar**

```bash
pnpm build
```

Esperado: verde. Un archivo `"use server"` solo puede exportar funciones asíncronas; `DetalleSolicitud` es una interfaz y se borra en compilación, igual que `ResultadoBusquedaPortal` en el portal.

- [ ] **Paso 3: Escribir el contexto y commitear**

Deja escrito en «Qué falta / qué NO hace» que estas acciones todavía no tienen pantalla: las conectan las tareas 6 y 7.

```bash
pnpm lint
git add "app/(operador)" docs/superpowers/contexto
git commit -m "Acciones del operador: detalle compuesto, asignacion y resolucion"
```

---

## Tarea 6: Filtros de la bandeja

**Archivos:**
- Modificar: `app/(operador)/operador/page.tsx`
- Crear: `components/operador/filtros-bandeja.tsx`
- Modificar: `components/operador/lista-solicitudes.tsx`
- Crear: `docs/superpowers/contexto/plan-4a/tarea-6-contexto.md`

**Interfaces:**
- Consume: `solicitudesFiltradas`, `cargaPorCsr`, `FiltroBandeja`, `RUTAS_QMS`.
- Produce:
  - `<FiltrosBandeja cargas={CargaCsr[]} />` — escribe los filtros en la URL
  - `<ListaSolicitudes solicitudes />` con dos columnas nuevas: CSR y estado

**Por qué los filtros viven en la URL y no en `useState`.** El presentador cambia de pantalla y vuelve; con estado local, la bandeja se reinicia y hay que volver a filtrar delante del cliente. En la URL, `/operador?estado=abierta&csr=sin-asignar` sobrevive a la recarga, al `revalidatePath` de las acciones y al botón de atrás.

**Por qué se validan los valores contra listas cerradas.** `searchParams` es texto que viene del navegador y termina en un `.eq()`. Aceptar cualquier cadena no abre un agujero —PostgREST parametriza— pero sí produce filtros silenciosamente vacíos que parecen un fallo de datos. Se valida contra `RUTAS_QMS` y contra los dos estados; lo que no coincide se ignora.

- [ ] **Paso 1: Escribir el componente de filtros**

`components/operador/filtros-bandeja.tsx`:

```tsx
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import type { CargaCsr } from "@/lib/fuentes";
import { RUTAS_QMS } from "@/lib/reglas-qms";

const ETIQUETAS_RUTA: Record<string, string> = {
  declinar_designacion_invalida: "Declinar · designación inválida",
  declinar_planta_sin_ruta: "Declinar · planta sin ruta",
  declinar_obsoleto_sin_reemplazo: "Declinar · obsoleto sin reemplazo",
  declinar_moq: "Declinar · MOQ",
  declinar_ya_disponible: "Declinar · ya disponible",
  cotizar_con_reemplazo: "Cotizar con reemplazo",
  revisar_lt: "Revisar tiempo de entrega",
  revisar_disponibilidad_np: "Revisar disponibilidad NP",
  ingresar_pinq: "Ingresar PINQ",
  consultar_planner: "Consultar Planner",
};

const CLASE_SELECT =
  "mt-1 h-10 w-full rounded-lg border border-borde bg-fondo px-3 text-sm text-texto " +
  "outline-none focus:border-primario focus:ring-2 focus:ring-primario-suave";

export function FiltrosBandeja({ cargas }: { cargas: readonly CargaCsr[] }) {
  const router = useRouter();
  const ruta = usePathname();
  const parametros = useSearchParams();
  const [enVuelo, iniciar] = useTransition();

  function fijar(clave: string, valor: string) {
    const siguientes = new URLSearchParams(parametros.toString());
    if (valor === "") siguientes.delete(clave);
    else siguientes.set(clave, valor);
    // La solicitud abierta en el panel puede quedar fuera del nuevo filtro.
    siguientes.delete("solicitud");
    iniciar(() => router.replace(`${ruta}?${siguientes.toString()}`));
  }

  const hayFiltros = ["estado", "clasificacion", "csr"].some((clave) => parametros.get(clave));

  return (
    <section
      aria-label="Filtros de la bandeja"
      className="grid gap-3 rounded-xl border border-borde bg-fondo p-4 md:grid-cols-[1fr_1.4fr_1fr_auto] md:items-end"
    >
      <label className="block">
        <span className="text-sm font-medium text-texto">Estado</span>
        <select
          value={parametros.get("estado") ?? ""}
          onChange={(evento) => fijar("estado", evento.target.value)}
          className={CLASE_SELECT}
        >
          <option value="">Todas</option>
          <option value="abierta">Abiertas</option>
          <option value="atendida">Atendidas</option>
        </select>
      </label>

      <label className="block">
        <span className="text-sm font-medium text-texto">Clasificación QMS</span>
        <select
          value={parametros.get("clasificacion") ?? ""}
          onChange={(evento) => fijar("clasificacion", evento.target.value)}
          className={CLASE_SELECT}
        >
          <option value="">Todas</option>
          {RUTAS_QMS.map((valor) => (
            <option key={valor} value={valor}>
              {ETIQUETAS_RUTA[valor]}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-sm font-medium text-texto">CSR</span>
        <select
          value={parametros.get("csr") ?? ""}
          onChange={(evento) => fijar("csr", evento.target.value)}
          className={CLASE_SELECT}
        >
          <option value="">Todos</option>
          <option value="sin-asignar">Sin asignar</option>
          {cargas
            .filter((carga) => carga.activo)
            .map((carga) => (
              <option key={carga.codigo} value={carga.codigo}>
                {carga.codigo} · {carga.abiertas} abiertas
              </option>
            ))}
        </select>
      </label>

      <button
        type="button"
        disabled={enVuelo || !hayFiltros}
        onClick={() => iniciar(() => router.replace(ruta))}
        className="h-10 rounded-lg border border-borde bg-fondo px-4 text-sm font-medium text-texto hover:bg-fondo-sutil disabled:opacity-40"
      >
        Limpiar
      </button>
    </section>
  );
}
```

- [ ] **Paso 2: Añadir las dos columnas a la tabla**

En `components/operador/lista-solicitudes.tsx`, añade las cabeceras `CSR` y `Estado` después de `Antigüedad`:

```tsx
<th className="px-4 py-3">Antigüedad</th>
<th className="px-4 py-3">CSR</th>
<th className="px-4 py-3">Estado</th>
<th className="px-4 py-3">Clasificación QMS</th>
```

Y las celdas, justo después de la de antigüedad:

```tsx
<td className="px-4 py-4">
  {solicitud.csrAsignado ? (
    <span className="designacion text-texto">{solicitud.csrAsignado}</span>
  ) : (
    <span className="text-texto-tenue">Sin asignar</span>
  )}
</td>
<td className="px-4 py-4">
  {solicitud.atendidaEn === null ? (
    <span className="text-texto">Abierta</span>
  ) : (
    <span
      className={
        solicitud.resultado === "cotizada"
          ? "inline-flex rounded-full border border-confirmacion bg-confirmacion-suave px-2.5 py-1 text-xs font-medium text-confirmacion"
          : "inline-flex rounded-full border border-borde bg-fondo-sutil px-2.5 py-1 text-xs font-medium text-texto"
      }
    >
      {solicitud.resultado === "cotizada" ? "Cotizada" : "Declinada"}
    </span>
  )}
</td>
```

Verde solo en *Cotizada*: es una confirmación. *Declinada* es un resultado legítimo del procedimiento, no un error, así que va en neutro y nunca en rojo.

- [ ] **Paso 3: Leer los filtros en la página**

`app/(operador)/operador/page.tsx`, sustituyendo los imports, la firma y el bloque de carga de datos:

```tsx
import { PanelChat } from "@/components/chat/panel-chat";
import { BarraSuperior } from "@/components/marco/barra-superior";
import { FiltrosBandeja } from "@/components/operador/filtros-bandeja";
import { ListaSolicitudes } from "@/components/operador/lista-solicitudes";
import { ProveedorSesion } from "@/components/sesion/proveedor-sesion";
import {
  cargaPorCsr,
  type EstadoSolicitud,
  type FiltroBandeja,
  solicitudesFiltradas,
  todasLasPlantas,
} from "@/lib/fuentes";
import { indicadoresDeSesion } from "@/lib/metricas/indicadores";
import { type RutaQMS, RUTAS_QMS } from "@/lib/reglas-qms";
import { leerSesion } from "@/lib/sesion-demo/leer";

export const dynamic = "force-dynamic";

type Parametros = Promise<Record<string, string | string[] | undefined>>;

/** Un `searchParams` repetido llega como arreglo; la bandeja usa el primero. */
function uno(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}

export default async function PaginaOperador({ searchParams }: { searchParams: Parametros }) {
  const parametros = await searchParams;
  const sesion = await leerSesion();

  const estado = uno(parametros.estado);
  const clasificacion = uno(parametros.clasificacion);
  const csr = uno(parametros.csr);

  const filtro: FiltroBandeja = {
    desde: sesion.iniciadaEn,
    estado: estado === "abierta" || estado === "atendida" ? (estado as EstadoSolicitud) : undefined,
    clasificacion: RUTAS_QMS.includes(clasificacion as RutaQMS)
      ? (clasificacion as RutaQMS)
      : undefined,
    csr: csr === "sin-asignar" ? null : csr,
  };

  const [plantas, indicadores, solicitudes, cargas] = await Promise.all([
    todasLasPlantas(),
    indicadoresDeSesion(),
    solicitudesFiltradas(filtro),
    cargaPorCsr(sesion.iniciadaEn),
  ]);
```

El resto del componente se conserva tal cual. Entre el bloque de métricas y `<ListaSolicitudes>`, inserta:

```tsx
<div className="mb-4">
  <FiltrosBandeja cargas={cargas} />
</div>
```

- [ ] **Paso 4: Verificar en pantalla**

```bash
pnpm dev
```

Con las solicitudes de la Tarea 4 ya en la base, comprueba en `/operador`:

1. Las columnas CSR y Estado aparecen y el código del CSR se muestra en monoespaciada.
2. Filtrar por *Abiertas* mantiene las tres; filtrar por un CSR concreto deja solo la suya.
3. *Sin asignar* deja la tabla vacía —todas se asignaron solas— y la URL muestra `?csr=sin-asignar`.
4. Recargar la página con el filtro puesto lo conserva.
5. *Limpiar* devuelve la URL a `/operador`.

- [ ] **Paso 5: Compilar, escribir el contexto y commitear**

```bash
pnpm build
pnpm lint
git add "app/(operador)" components/operador docs/superpowers/contexto
git commit -m "Bandeja: filtros en la URL y columnas de CSR y estado"
```

---

## Tarea 7: Panel de detalle, asignación y resolución

**Archivos:**
- Crear: `components/operador/bandeja.tsx`, `components/operador/panel-detalle.tsx`
- Modificar: `components/operador/lista-solicitudes.tsx`, `app/(operador)/operador/page.tsx`
- Crear: `docs/superpowers/contexto/plan-4a/tarea-7-contexto.md`

**Interfaces:**
- Consume: `detalleDeSolicitud`, `asignarSolicitud`, `resolverSolicitud` de `app/(operador)/acciones`; `<EstimacionTE>`.
- Produce:
  - `<Bandeja solicitudes cargas />` — dueño del estado de selección
  - `<ListaSolicitudes solicitudes seleccionada onSeleccionar />`
  - `<PanelDetalle numero cargas onCerrar />`

**Por qué la tabla pasa a ser componente de cliente.** Seleccionar una fila es interacción, y el detalle se compone llamando a una Server Action desde el navegador (§6.9 del spec). El estado de selección vive en `<Bandeja>`, un envoltorio de cliente delgado: la página sigue siendo un componente de servidor que hace las lecturas, y la tabla no gana lógica de datos.

**Por qué el motivo de declinación es un selector y no texto libre.** El enum `motivo_declinado` tiene cinco valores y la base los exige. Un campo libre produciría un error de restricción delante del cliente.

- [ ] **Paso 1: Convertir la tabla en componente de cliente seleccionable**

En `components/operador/lista-solicitudes.tsx`, añade `"use client";` como primera línea y cambia la firma y la fila:

```tsx
export function ListaSolicitudes({
  solicitudes,
  seleccionada,
  onSeleccionar,
}: {
  solicitudes: SolicitudResumen[];
  seleccionada: string | null;
  onSeleccionar: (numero: string) => void;
}) {
```

Y la fila del `map`:

```tsx
<tr
  key={solicitud.numero}
  onClick={() => onSeleccionar(solicitud.numero)}
  className={
    solicitud.numero === seleccionada
      ? "cursor-pointer align-top bg-primario-suave"
      : "cursor-pointer align-top hover:bg-fondo-sutil"
  }
>
```

El mensaje de bandeja vacía y el resto de las celdas no cambian.

- [ ] **Paso 2: Escribir el envoltorio con el estado de selección**

`components/operador/bandeja.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { CargaCsr, SolicitudResumen } from "@/lib/fuentes";
import { ListaSolicitudes } from "./lista-solicitudes";
import { PanelDetalle } from "./panel-detalle";

export function Bandeja({
  solicitudes,
  cargas,
}: {
  solicitudes: SolicitudResumen[];
  cargas: readonly CargaCsr[];
}) {
  const [seleccionada, setSeleccionada] = useState<string | null>(null);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(22rem,1fr)] xl:items-start">
      <ListaSolicitudes
        solicitudes={solicitudes}
        seleccionada={seleccionada}
        onSeleccionar={(numero) => setSeleccionada(numero === seleccionada ? null : numero)}
      />
      {seleccionada !== null && (
        <PanelDetalle
          numero={seleccionada}
          cargas={cargas}
          onCerrar={() => setSeleccionada(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Paso 3: Escribir el panel de detalle**

`components/operador/panel-detalle.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  asignarSolicitud,
  type DetalleSolicitud,
  detalleDeSolicitud,
  resolverSolicitud,
} from "@/app/(operador)/acciones";
import { EstimacionTE } from "@/components/estimador/estimacion-te";
import type { CargaCsr } from "@/lib/fuentes";
import type { MotivoDeclinado } from "@/lib/reglas-qms";

const MOTIVOS: { valor: MotivoDeclinado; etiqueta: string }[] = [
  { valor: "designacion_invalida", etiqueta: "Designación inválida (4.8)" },
  { valor: "planta_sin_ruta", etiqueta: "Planta sin conexión ni ruta (4.5b)" },
  { valor: "obsoleto_sin_reemplazo", etiqueta: "Obsoleto sin reemplazo (4.7)" },
  { valor: "moq_mayor", etiqueta: "MOQ mayor a lo solicitado (4.4)" },
  { valor: "ya_disponible_wcl", etiqueta: "Ya disponible en WCL (4.1)" },
];

export function PanelDetalle({
  numero,
  cargas,
  onCerrar,
}: {
  numero: string;
  cargas: readonly CargaCsr[];
  onCerrar: () => void;
}) {
  const router = useRouter();
  const [detalle, setDetalle] = useState<DetalleSolicitud | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [motivo, setMotivo] = useState<MotivoDeclinado | "">("");
  const [enVuelo, iniciar] = useTransition();

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setError(null);
    detalleDeSolicitud(numero)
      .then((resultado) => {
        if (!vigente) return;
        setDetalle(resultado);
        setCargando(false);
      })
      .catch((causa: unknown) => {
        if (!vigente) return;
        setError(causa instanceof Error ? causa.message : "No se pudo cargar el detalle.");
        setCargando(false);
      });
    // Cancela el resultado de una solicitud anterior si el CSR cambia de fila
    // antes de que responda: sin esto, el panel puede terminar mostrando el
    // detalle de la fila que ya no está seleccionada.
    return () => {
      vigente = false;
    };
  }, [numero]);

  function ejecutar(accion: () => Promise<void>) {
    setError(null);
    iniciar(async () => {
      try {
        await accion();
        setDetalle(await detalleDeSolicitud(numero));
        router.refresh();
      } catch (causa) {
        setError(causa instanceof Error ? causa.message : "No se pudo completar la acción.");
      }
    });
  }

  return (
    <aside className="rounded-xl border border-borde bg-fondo p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-texto-tenue">Solicitud</p>
          <h2 className="designacion mt-1 text-lg font-semibold text-texto">{numero}</h2>
        </div>
        <button
          type="button"
          onClick={onCerrar}
          className="rounded-lg border border-borde px-2.5 py-1 text-xs font-medium text-texto hover:bg-fondo-sutil"
        >
          Cerrar
        </button>
      </div>

      {cargando && <p className="mt-4 text-sm text-texto-tenue">Reuniendo el contexto QMS…</p>}
      {error && (
        <div className="mt-4 rounded-lg border border-error bg-error-suave p-3 text-sm text-error">
          {error}
        </div>
      )}

      {detalle && (
        <div className="mt-4 space-y-4 text-sm">
          <div>
            <p className="text-texto-tenue">Designación capturada</p>
            <p className="designacion font-medium text-texto">{detalle.fila.designacionTexto}</p>
            <p className="mt-1 text-texto-tenue">
              {detalle.fila.cantidad} piezas · cantidad efectiva{" "}
              {detalle.evaluacion.cantidadEfectiva}
            </p>
          </div>

          <div className="border-l-2 border-primario pl-3">
            <p className="font-medium text-texto">Regla QMS · punto {detalle.evaluacion.punto}</p>
            <p className="mt-1 text-texto-tenue">{detalle.evaluacion.mensaje}</p>
          </div>

          {detalle.evaluacion.avisos.length > 0 && (
            <ul className="space-y-1">
              {detalle.evaluacion.avisos.map((aviso) => (
                <li key={`${aviso.tipo}-${aviso.punto}`} className="text-texto-tenue">
                  <span className="font-medium text-texto">Punto {aviso.punto}:</span>{" "}
                  {aviso.mensaje}
                </li>
              ))}
            </ul>
          )}

          {detalle.contexto.designacion === null ? (
            <p className="text-texto-tenue">
              La designación capturada no existe en el catálogo: no hay existencias, homólogos ni
              estimación que mostrar.
            </p>
          ) : (
            <>
              <div>
                <p className="text-texto-tenue">Existencias</p>
                <p className="text-texto">
                  {detalle.contexto.existencias.length === 0
                    ? "Sin existencias registradas"
                    : detalle.contexto.existencias
                        .map((existencia) => `${existencia.almacen}: ${existencia.cantidad}`)
                        .join(" · ")}
                </p>
              </div>

              {detalle.homologos.length > 0 && (
                <div>
                  <p className="text-texto-tenue">Homólogos registrados</p>
                  <ul className="mt-1 space-y-1">
                    {detalle.homologos.map((homologo) => (
                      <li key={homologo.equivalente}>
                        <span className="designacion font-medium text-texto">
                          {homologo.equivalente}
                        </span>
                        <span className="text-texto-tenue"> · {homologo.motivo}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {detalle.estimacion ? (
                <EstimacionTE estimacion={detalle.estimacion} />
              ) : (
                <p className="text-texto-tenue">
                  No hay base histórica suficiente para estimar el tiempo de entrega. Se confirmará
                  al procesar la cotización.
                </p>
              )}
            </>
          )}

          <div className="border-t border-borde pt-4">
            <label className="block">
              <span className="text-texto-tenue">CSR asignado</span>
              <select
                value={detalle.fila.csrAsignado ?? ""}
                disabled={enVuelo}
                onChange={(evento) =>
                  ejecutar(() =>
                    asignarSolicitud(numero, evento.target.value === "" ? null : evento.target.value),
                  )
                }
                className="mt-1 h-10 w-full rounded-lg border border-borde bg-fondo px-3 text-sm text-texto outline-none focus:border-primario focus:ring-2 focus:ring-primario-suave"
              >
                <option value="">Sin asignar</option>
                {cargas
                  .filter((carga) => carga.activo)
                  .map((carga) => (
                    <option key={carga.codigo} value={carga.codigo}>
                      {carga.codigo} · {carga.abiertas} abiertas
                    </option>
                  ))}
              </select>
            </label>
          </div>

          {detalle.fila.atendidaEn === null ? (
            <div className="space-y-2 border-t border-borde pt-4">
              <p className="text-texto-tenue">Resolver</p>
              <button
                type="button"
                disabled={enVuelo}
                onClick={() => ejecutar(() => resolverSolicitud(numero, "cotizada"))}
                className="w-full rounded-lg bg-primario px-4 py-2 font-medium text-primario-contraste hover:opacity-90 disabled:opacity-50"
              >
                Marcar como cotizada
              </button>
              <select
                value={motivo}
                onChange={(evento) => setMotivo(evento.target.value as MotivoDeclinado | "")}
                className="h-10 w-full rounded-lg border border-borde bg-fondo px-3 text-sm text-texto outline-none focus:border-primario focus:ring-2 focus:ring-primario-suave"
              >
                <option value="">Motivo según la clasificación QMS</option>
                {MOTIVOS.map((opcion) => (
                  <option key={opcion.valor} value={opcion.valor}>
                    {opcion.etiqueta}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={enVuelo}
                onClick={() =>
                  ejecutar(() =>
                    resolverSolicitud(numero, "declinada", motivo === "" ? undefined : motivo),
                  )
                }
                className="w-full rounded-lg border border-borde px-4 py-2 font-medium text-texto hover:bg-fondo-sutil disabled:opacity-50"
              >
                Declinar
              </button>
            </div>
          ) : (
            <div className="border-t border-borde pt-4">
              <p className="text-texto">
                Resuelta como{" "}
                <span className="font-medium">
                  {detalle.fila.resultado === "cotizada" ? "cotizada" : "declinada"}
                </span>
                {detalle.fila.motivoDeclinado && ` · ${detalle.fila.motivoDeclinado}`}
              </p>
              <p className="mt-1 text-texto-tenue">
                {new Date(detalle.fila.atendidaEn).toLocaleString("es-MX")}
              </p>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
```

- [ ] **Paso 4: Montar la bandeja en la página**

En `app/(operador)/operador/page.tsx`, sustituye el import y el uso de `ListaSolicitudes` por `Bandeja`:

```tsx
import { Bandeja } from "@/components/operador/bandeja";
```

```tsx
<Bandeja solicitudes={solicitudes} cargas={cargas} />
```

- [ ] **Paso 5: Verificar el recorrido completo**

```bash
pnpm dev
```

En `/operador`:

1. Al pulsar una fila se abre el panel con la regla QMS, el punto, las existencias y la estimación (o el aviso de que no hay base histórica).
2. Cambiar el CSR en el selector actualiza la columna de la tabla sin recargar a mano.
3. *Marcar como cotizada* pasa la fila a estado *Cotizada* y el panel muestra la hora de atención.
4. En una solicitud clasificada como `declinar_designacion_invalida`, *Declinar* sin elegir motivo funciona y guarda `designacion_invalida`: el motivo se derivó de la ruta.
5. En una solicitud cuya ruta **no** declina (por ejemplo `ingresar_pinq`), *Declinar* sin motivo muestra el mensaje de error y **no** escribe nada.
6. Filtrar por *Atendidas* muestra las que acabas de resolver.

- [ ] **Paso 6: Compilar, escribir el contexto y commitear**

```bash
pnpm build
pnpm lint
git add "app/(operador)" components/operador docs/superpowers/contexto
git commit -m "Bandeja: panel de detalle con asignacion y resolucion"
```

---

## Tarea 8: Confirmación guiada de homólogos (módulo puro)

**Archivos:**
- Crear: `lib/validador/confirmacion.ts`, `lib/validador/confirmacion.test.ts`
- Crear: `docs/superpowers/contexto/plan-4a/tarea-8-contexto.md`

**Interfaces:**
- Consume: el tipo `Homologo` de `lib/fuentes/homologos` — **import de solo tipos**, para que el test siga siendo hermético y no arrastre el cliente de Supabase.
- Produce:
  - `interface PasoConfirmacion { atributo; valorOrigen; valorEquivalente; requiereValidacion }`
  - `interface Confirmacion { origen; equivalente; motivo; pasos; requiereIngenieriaVentas; punto: "4.6" }`
  - `construirConfirmacion(homologo: Homologo): Confirmacion`

**Qué decide este módulo y qué no.** Convierte las `diferencias` que ya trae `homologosDe()` en pasos que el cliente reconoce uno por uno. No consulta nada, no decide si el homólogo es válido y no escribe. La UI es la que impide continuar sin marcar cada paso.

**El criterio de `requiereValidacion` es un supuesto del POC, no una regla del QMS.** El procedimiento dice que el cliente revise el reemplazo con su Ingeniero de Ventas, pero no enumera qué atributos lo disparan. Aquí se fija un criterio explícito: **una diferencia exige validación cuando cambia el ajuste montado o el envolvente de operación** (juego interno, temperatura máxima, velocidad límite); las que cambian construcción o suministro sin mover ese envolvente (sellado, jaula, lubricación) se muestran pero no lo exigen. Va anotado como supuesto abierto con SKF, junto a los del §10 del spec. El caso curado de la escena 3 (`DEMO-OBS-CON` → `DEMO-6205-2RSH/C3`) trae *Sellado* y *Juego interno*, así que cae del lado que sí exige validación — que es lo que la escena necesita mostrar.

- [ ] **Paso 1: Escribir el test que falla**

`lib/validador/confirmacion.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { Homologo } from "@/lib/fuentes/homologos";
import { construirConfirmacion } from "./confirmacion";

const homologo = (diferencias: Homologo["diferencias"]): Homologo => ({
  origen: "DEMO-OBS-CON",
  equivalente: "DEMO-6205-2RSH/C3",
  motivo: "Reemplazo por obsolescencia con validación técnica",
  diferencias,
});

describe("construirConfirmacion", () => {
  it("convierte cada diferencia en un paso, en el mismo orden", () => {
    const confirmacion = construirConfirmacion(
      homologo([
        { atributo: "Sellado", valor_origen: "Abierto", valor_equivalente: "2RSH" },
        { atributo: "Juego interno", valor_origen: "Normal (CN)", valor_equivalente: "Aumentado (C3)" },
      ]),
    );
    expect(confirmacion.pasos.map((paso) => paso.atributo)).toEqual(["Sellado", "Juego interno"]);
    expect(confirmacion.pasos[0].valorOrigen).toBe("Abierto");
    expect(confirmacion.pasos[0].valorEquivalente).toBe("2RSH");
  });

  it("exige Ingeniería de Ventas cuando cambia el juego interno", () => {
    const confirmacion = construirConfirmacion(
      homologo([
        { atributo: "Juego interno", valor_origen: "Normal (CN)", valor_equivalente: "Aumentado (C3)" },
      ]),
    );
    expect(confirmacion.pasos[0].requiereValidacion).toBe(true);
    expect(confirmacion.requiereIngenieriaVentas).toBe(true);
  });

  it("no la exige cuando las diferencias son solo de construcción o suministro", () => {
    const confirmacion = construirConfirmacion(
      homologo([
        { atributo: "Jaula", valor_origen: "Acero estampado", valor_equivalente: "Poliamida (TN9)" },
        { atributo: "Lubricación", valor_origen: "Grasa estándar", valor_equivalente: "Sin lubricar" },
      ]),
    );
    expect(confirmacion.pasos.every((paso) => !paso.requiereValidacion)).toBe(true);
    expect(confirmacion.requiereIngenieriaVentas).toBe(false);
  });

  it("reconoce el atributo con acentos y mayúsculas distintas", () => {
    const confirmacion = construirConfirmacion(
      homologo([{ atributo: "TEMPERATURA MÁXIMA", valor_origen: "+120 °C", valor_equivalente: "+150 °C" }]),
    );
    expect(confirmacion.requiereIngenieriaVentas).toBe(true);
  });

  it("sin diferencias no hay pasos ni validación pendiente", () => {
    const confirmacion = construirConfirmacion(homologo([]));
    expect(confirmacion.pasos).toEqual([]);
    expect(confirmacion.requiereIngenieriaVentas).toBe(false);
  });

  it("siempre cita el punto 4.6 y conserva origen, equivalente y motivo", () => {
    const confirmacion = construirConfirmacion(homologo([]));
    expect(confirmacion.punto).toBe("4.6");
    expect(confirmacion.origen).toBe("DEMO-OBS-CON");
    expect(confirmacion.equivalente).toBe("DEMO-6205-2RSH/C3");
    expect(confirmacion.motivo).toBe("Reemplazo por obsolescencia con validación técnica");
  });
});
```

- [ ] **Paso 2: Ejecutar y ver el fallo**

```bash
pnpm vitest run lib/validador/confirmacion.test.ts
```

Esperado: FALLA con «Failed to resolve import "./confirmacion"».

- [ ] **Paso 3: Implementar el módulo**

`lib/validador/confirmacion.ts`:

```ts
import type { Homologo } from "@/lib/fuentes/homologos";

export interface PasoConfirmacion {
  atributo: string;
  valorOrigen: string;
  valorEquivalente: string;
  requiereValidacion: boolean;
}

export interface Confirmacion {
  origen: string;
  equivalente: string;
  motivo: string;
  pasos: PasoConfirmacion[];
  requiereIngenieriaVentas: boolean;
  punto: "4.6";
}

/**
 * Atributos cuya diferencia cambia el ajuste montado o el envolvente de
 * operación, y por tanto exige que el cliente lo revise con su Ingeniero de
 * Ventas antes de aceptar la equivalencia.
 *
 * SUPUESTO DEL POC, no una regla del QMS: el procedimiento pide la validación
 * pero no enumera los disparadores. Es una de las preguntas abiertas con SKF.
 * Los que quedan fuera —sellado, jaula, lubricación— cambian construcción o
 * suministro y se muestran igual, pero no bloquean la equivalencia.
 */
const ATRIBUTOS_CRITICOS = new Set(["juego interno", "temperatura maxima", "velocidad limite"]);

/** Sin acentos, sin mayúsculas y sin espacios sobrantes: el dato viene de siembra. */
function clave(atributo: string): string {
  return atributo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Pasos que el cliente debe reconocer uno por uno antes de aceptar un homólogo.
 *
 * La diferencia entre este POC y un buscador que sugiere piezas incompatibles
 * está aquí: la equivalencia no se presenta como confirmada mientras haya un
 * paso que exija validación técnica.
 */
export function construirConfirmacion(homologo: Homologo): Confirmacion {
  const pasos: PasoConfirmacion[] = homologo.diferencias.map((diferencia) => ({
    atributo: diferencia.atributo,
    valorOrigen: diferencia.valor_origen,
    valorEquivalente: diferencia.valor_equivalente,
    requiereValidacion: ATRIBUTOS_CRITICOS.has(clave(diferencia.atributo)),
  }));

  return {
    origen: homologo.origen,
    equivalente: homologo.equivalente,
    motivo: homologo.motivo,
    pasos,
    requiereIngenieriaVentas: pasos.some((paso) => paso.requiereValidacion),
    punto: "4.6",
  };
}
```

- [ ] **Paso 4: Ejecutar y ver que pasa**

```bash
pnpm test
```

Esperado: los 6 tests nuevos en verde y la suite completa sin regresiones.

- [ ] **Paso 5: Escribir el contexto y commitear**

Anota el criterio de `ATRIBUTOS_CRITICOS` como **supuesto abierto con SKF** en «Decisiones tomadas y por qué». Es la clase de dato que un ingeniero de SKF corregirá en dos minutos y que nadie deducirá del código.

```bash
pnpm lint
git add lib/validador docs/superpowers/contexto
git commit -m "Confirmacion de homologos: diferencias tecnicas como pasos del punto 4.6"
```

---

## Tarea 9: Confirmación guiada en el portal

**Archivos:**
- Modificar: `app/(portal)/portal/acciones.ts`
- Crear: `components/portal/confirmacion-homologo.tsx`
- Modificar: `components/portal/detalle-designacion.tsx`, `components/portal/tarjeta-sugerencia.tsx`
- Crear: `docs/superpowers/contexto/plan-4a/tarea-9-contexto.md`

**Interfaces:**
- Consume: `homologosDe`, `obtenerDesignacion`, `construirConfirmacion`, `emitirEvento`.
- Produce:
  - `equivalenciasDe(codigo: string): Promise<Confirmacion[]>`
  - `confirmarHomologo(origen, equivalente, cantidad): Promise<{ designacion: string; requiereIngenieriaVentas: boolean }>`
  - `<ConfirmacionHomologo codigo cantidad />`

**Por qué las equivalencias se cargan a demanda.** Resolverlas para todos los candidatos en cada búsqueda añade una consulta por candidato a un buscador que la escena 2 necesita instantáneo. El cliente pulsa *Ver equivalencias* y solo entonces se consultan.

**Qué color lleva el resultado.** Verde **solo** cuando `requiereIngenieriaVentas` es falso: verde es confirmación y nada más. Cuando es verdadero, el resultado va en el azul primario con el texto de que queda sujeto a validación de Ingeniería de Ventas. Ámbar no aparece aquí: es exclusivo de desconexión.

- [ ] **Paso 1: Añadir las dos acciones al portal**

Al final de `app/(portal)/portal/acciones.ts`:

```ts
/** Equivalencias registradas de una designación, ya convertidas en pasos. */
export async function equivalenciasDe(codigo: string): Promise<Confirmacion[]> {
  const homologos = await homologosDe(codigo);
  return homologos.map(construirConfirmacion);
}

/**
 * Cierre de la confirmación guiada.
 *
 * Se vuelve a resolver el homólogo en el servidor en vez de confiar en lo que
 * manda el navegador: la equivalencia tiene que existir en la base, igual que
 * el validador solo elige designaciones del catálogo.
 */
export async function confirmarHomologo(
  origen: string,
  equivalente: string,
  cantidad: number,
): Promise<{ designacion: string; requiereIngenieriaVentas: boolean }> {
  const homologos = await homologosDe(origen);
  const elegido = homologos.find((homologo) => homologo.equivalente === equivalente);
  if (!elegido) throw new Error(`${equivalente} no es un homólogo registrado de ${origen}.`);

  const designacion = await obtenerDesignacion(equivalente);
  if (!designacion) throw new Error(`${equivalente} no existe en el catálogo.`);

  const confirmacion = construirConfirmacion(elegido);
  await emitirEvento({
    tipo: "confirmacion_homologo",
    perfil: "cliente",
    designacion: origen,
    pdiv: designacion.pdiv,
    detalle: {
      equivalente,
      cantidad,
      pasos: confirmacion.pasos.length,
      requiereIngenieriaVentas: confirmacion.requiereIngenieriaVentas,
    },
  });
  revalidatePath("/operador");

  return {
    designacion: equivalente,
    requiereIngenieriaVentas: confirmacion.requiereIngenieriaVentas,
  };
}
```

Añade a los imports del archivo: `homologosDe` a la lista que ya trae `@/lib/fuentes`, y `construirConfirmacion` con el tipo `Confirmacion` desde `@/lib/validador/confirmacion`. `obtenerDesignacion`, `emitirEvento` y `revalidatePath` ya están importados.

- [ ] **Paso 2: Escribir el componente de confirmación guiada**

`components/portal/confirmacion-homologo.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { confirmarHomologo, equivalenciasDe } from "@/app/(portal)/portal/acciones";
import type { Confirmacion } from "@/lib/validador/confirmacion";

export function ConfirmacionHomologo({ codigo, cantidad }: { codigo: string; cantidad: number }) {
  const [equivalencias, setEquivalencias] = useState<Confirmacion[] | null>(null);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [marcados, setMarcados] = useState<Set<number>>(new Set());
  const [resultado, setResultado] = useState<{
    designacion: string;
    requiereIngenieriaVentas: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enVuelo, iniciar] = useTransition();

  function cargar() {
    setError(null);
    iniciar(async () => {
      try {
        setEquivalencias(await equivalenciasDe(codigo));
      } catch (causa) {
        setError(causa instanceof Error ? causa.message : "No se pudieron cargar las equivalencias.");
      }
    });
  }

  function abrir(equivalente: string) {
    setAbierta(equivalente === abierta ? null : equivalente);
    setMarcados(new Set());
    setResultado(null);
  }

  function alternar(indice: number) {
    const siguiente = new Set(marcados);
    if (siguiente.has(indice)) siguiente.delete(indice);
    else siguiente.add(indice);
    setMarcados(siguiente);
  }

  if (equivalencias === null) {
    return (
      <button
        type="button"
        onClick={cargar}
        disabled={enVuelo}
        className="mt-3 rounded-lg border border-borde px-3 py-1.5 text-sm font-medium text-texto hover:bg-fondo-sutil disabled:opacity-50"
      >
        {enVuelo ? "Buscando equivalencias…" : "Ver equivalencias registradas"}
      </button>
    );
  }

  if (equivalencias.length === 0) {
    return (
      <p className="mt-3 text-sm text-texto-tenue">
        No hay equivalencias registradas para esta designación.
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      {error && (
        <div className="rounded-lg border border-error bg-error-suave p-3 text-sm text-error">
          {error}
        </div>
      )}
      {equivalencias.map((equivalencia) => {
        const activa = abierta === equivalencia.equivalente;
        const completos = marcados.size === equivalencia.pasos.length;
        return (
          <div key={equivalencia.equivalente} className="rounded-lg border border-borde bg-fondo p-3">
            <button
              type="button"
              onClick={() => abrir(equivalencia.equivalente)}
              className="flex w-full flex-wrap items-center justify-between gap-2 text-left"
            >
              <span>
                <span className="designacion font-medium text-texto">
                  {equivalencia.equivalente}
                </span>
                <span className="ml-2 text-sm text-texto-tenue">{equivalencia.motivo}</span>
              </span>
              <span className="text-sm text-primario">{activa ? "Cerrar" : "Revisar"}</span>
            </button>

            {activa && (
              <div className="mt-3 space-y-2 border-t border-borde pt-3 text-sm">
                <p className="text-texto-tenue">
                  Punto {equivalencia.punto} del procedimiento. Reconoce cada diferencia técnica
                  antes de aceptar la equivalencia.
                </p>
                {equivalencia.pasos.map((paso, indice) => (
                  <label key={paso.atributo} className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={marcados.has(indice)}
                      onChange={() => alternar(indice)}
                      className="mt-1"
                    />
                    <span>
                      <span className="font-medium text-texto">{paso.atributo}:</span>{" "}
                      <span className="text-texto-tenue">
                        {paso.valorOrigen} → {paso.valorEquivalente}
                      </span>
                      {paso.requiereValidacion && (
                        <span className="block text-texto">
                          Cambia el ajuste o el envolvente de operación: requiere validación de
                          Ingeniería de Ventas.
                        </span>
                      )}
                    </span>
                  </label>
                ))}

                <button
                  type="button"
                  disabled={enVuelo || !completos}
                  onClick={() =>
                    iniciar(async () => {
                      setError(null);
                      try {
                        setResultado(
                          await confirmarHomologo(codigo, equivalencia.equivalente, cantidad),
                        );
                      } catch (causa) {
                        setError(
                          causa instanceof Error ? causa.message : "No se pudo confirmar la equivalencia.",
                        );
                      }
                    })
                  }
                  className="rounded-lg bg-primario px-4 py-2 font-medium text-primario-contraste hover:opacity-90 disabled:opacity-50"
                >
                  {completos ? "Aceptar equivalencia" : "Marca cada diferencia para continuar"}
                </button>

                {resultado && resultado.designacion === equivalencia.equivalente && (
                  <div
                    className={
                      resultado.requiereIngenieriaVentas
                        ? "rounded-lg border border-primario bg-primario-suave p-3 text-primario"
                        : "rounded-lg border border-confirmacion bg-confirmacion-suave p-3 text-confirmacion"
                    }
                  >
                    {resultado.requiereIngenieriaVentas ? (
                      <p>
                        Equivalencia registrada con{" "}
                        <span className="designacion font-semibold">{resultado.designacion}</span>,
                        <strong> sujeta a validación de Ingeniería de Ventas</strong>. No se
                        presenta como equivalencia confirmada.
                      </p>
                    ) : (
                      <p>
                        Equivalencia confirmada con{" "}
                        <span className="designacion font-semibold">{resultado.designacion}</span>.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Paso 3: Colgar el componente del detalle de la designación**

En `components/portal/detalle-designacion.tsx`, importa el componente y añade `cantidad` a las props:

```tsx
import { ConfirmacionHomologo } from "./confirmacion-homologo";
```

```tsx
export function DetalleDesignacion({
  sugerencia,
  estimacion,
  cantidad,
}: {
  sugerencia: Sugerencia;
  estimacion: Estimacion | null;
  cantidad: number;
}) {
```

Debajo del botón *Usar esta designación*, dentro del mismo `<div>`:

```tsx
<ConfirmacionHomologo codigo={designacion.designacion} cantidad={cantidad} />
```

Y en `components/portal/tarjeta-sugerencia.tsx`, pasa la cantidad hacia abajo:

```tsx
<DetalleDesignacion sugerencia={sugerencia} estimacion={estimacion} cantidad={cantidad} />
```

- [ ] **Paso 4: Verificar la escena 3**

```bash
pnpm dev
```

En `/demo`, activa el escenario de la escena 3 (o pon el modo en *con la solución*). En `/portal`, busca `DEMO-OBS-CON`:

1. Aparece *Ver equivalencias registradas*; al pulsarlo se lista `DEMO-6205-2RSH/C3`.
2. Al abrirla se ven los dos pasos —*Sellado* y *Juego interno*— y el botón está deshabilitado.
3. Marcando solo uno sigue deshabilitado. Con los dos marcados se habilita.
4. Al aceptar, el resultado sale en azul primario con el texto **sujeto a validación de Ingeniería de Ventas** — nunca en verde.
5. En el editor SQL: `select tipo, designacion, detalle from eventos_demo where tipo = 'confirmacion_homologo' order by ocurrido_en desc limit 3;` devuelve el evento con `requiereIngenieriaVentas: true`.

- [ ] **Paso 5: Compilar, escribir el contexto y commitear**

```bash
pnpm build
pnpm lint
git add "app/(portal)" components/portal docs/superpowers/contexto
git commit -m "Portal: confirmacion guiada de homologos paso por paso"
```

---

## Tarea 10: Fuente de intenciones de pedido

**Archivos:**
- Crear: `lib/fuentes/intenciones.ts`, `lib/fuentes/intenciones.integracion.test.ts`
- Modificar: `lib/fuentes/index.ts`
- Crear: `docs/superpowers/contexto/plan-4a/tarea-10-contexto.md`

**Interfaces:**
- Consume: `clienteLectura`, `lanzarSiError`, el tipo `Database`.
- Produce:
  - `ESTADOS_INTENCION` y `type EstadoIntencion = "encolada" | "confirmada" | "ajustada" | "escalada"`
  - `interface Intencion { id; designacion; cantidad; pdiv; encoladaEn; estado; resueltaEn; nota }`
  - `intencionesDe(pdiv: string, estado?: EstadoIntencion): Promise<Intencion[]>`
  - `intencionesDesde(iniciadaEn: string): Promise<Intencion[]>`

**Solo lectura, a propósito.** Encolar y reconciliar son escrituras y viven en Server Actions (tareas 12 y 13). Esta fuente existe para que ni la pantalla del cliente ni la reconciliación consulten la tabla por su cuenta.

**Por qué el tipo se declara con `satisfies` contra el enum SQL.** El spec lo escribe como unión literal y así se conserva, pero anclado al enum generado: si alguien altera `estado_intencion` en la base y regenera `lib/supabase/tipos.ts`, la línea deja de compilar en lugar de fallar en tiempo de ejecución con un valor que la tabla ya no acepta. Es el mismo recurso que usa `RUTAS_QMS`.

- [ ] **Paso 1: Escribir la fuente**

`lib/fuentes/intenciones.ts`:

```ts
import { clienteLectura } from "@/lib/supabase/lectura";
import type { Database } from "@/lib/supabase/tipos";
import { lanzarSiError } from "./errores";

/**
 * Estados de la cola. Anclados al enum SQL: si el enum cambia y se regeneran
 * los tipos, esta línea deja de compilar en vez de fallar al escribir.
 */
export const ESTADOS_INTENCION = [
  "encolada",
  "confirmada",
  "ajustada",
  "escalada",
] as const satisfies readonly Database["public"]["Enums"]["estado_intencion"][];

export type EstadoIntencion = (typeof ESTADOS_INTENCION)[number];

export interface Intencion {
  id: number;
  designacion: string;
  cantidad: number;
  pdiv: string;
  encoladaEn: string;
  estado: EstadoIntencion;
  resueltaEn: string | null;
  nota: string | null;
}

const COLUMNAS = "id, designacion, cantidad, pdiv, encolada_en, estado, resuelta_en, nota";

interface FilaIntencion {
  id: number;
  designacion: string;
  cantidad: number;
  pdiv: string;
  encolada_en: string;
  estado: EstadoIntencion;
  resuelta_en: string | null;
  nota: string | null;
}

function aIntencion(fila: FilaIntencion): Intencion {
  return {
    id: fila.id,
    designacion: fila.designacion,
    cantidad: fila.cantidad,
    pdiv: fila.pdiv,
    encoladaEn: fila.encolada_en,
    estado: fila.estado,
    resueltaEn: fila.resuelta_en,
    nota: fila.nota,
  };
}

/** Intenciones de una planta, opcionalmente filtradas por estado. */
export async function intencionesDe(pdiv: string, estado?: EstadoIntencion): Promise<Intencion[]> {
  let consulta = clienteLectura().from("intenciones_pedido").select(COLUMNAS).eq("pdiv", pdiv);
  if (estado) consulta = consulta.eq("estado", estado);
  const { data, error } = await consulta.order("encolada_en");
  lanzarSiError(error, `obtener las intenciones de la planta ${pdiv}`);
  return ((data ?? []) as unknown as FilaIntencion[]).map(aIntencion);
}

/** Cola completa de la sesión, para la pantalla del cliente. */
export async function intencionesDesde(iniciadaEn: string): Promise<Intencion[]> {
  const { data, error } = await clienteLectura()
    .from("intenciones_pedido")
    .select(COLUMNAS)
    .gte("encolada_en", iniciadaEn)
    .order("encolada_en");
  lanzarSiError(error, "obtener las intenciones de la sesión");
  return ((data ?? []) as unknown as FilaIntencion[]).map(aIntencion);
}
```

- [ ] **Paso 2: Exportarla desde el índice**

En `lib/fuentes/index.ts`, añade `export * from "./intenciones";` respetando el orden alfabético (va después de `./homologos`).

- [ ] **Paso 3: Escribir el test de integración**

`lib/fuentes/intenciones.integracion.test.ts`:

```ts
/** Test de INTEGRACIÓN. Se corre con `pnpm test:integracion`. */
import { config } from "dotenv";
import { beforeAll, describe, expect, it } from "vitest";
import { ESTADOS_INTENCION, intencionesDe, intencionesDesde } from "./intenciones";

beforeAll(() => config({ path: ".env.local", quiet: true }));

describe("intenciones", () => {
  it("lee la cola de una planta sin romperse cuando está vacía", async () => {
    expect(Array.isArray(await intencionesDe("P103"))).toBe(true);
  });

  it("el filtro por estado solo devuelve ese estado", async () => {
    const encoladas = await intencionesDe("P103", "encolada");
    expect(encoladas.every((intencion) => intencion.estado === "encolada")).toBe(true);
  });

  it("toda intención de la sesión trae un estado del enum", async () => {
    const intenciones = await intencionesDesde(new Date(0).toISOString());
    for (const intencion of intenciones) {
      expect(ESTADOS_INTENCION).toContain(intencion.estado);
    }
  });
});
```

- [ ] **Paso 4: Ejecutar las dos suites**

```bash
pnpm test
pnpm test:integracion
```

- [ ] **Paso 5: Escribir el contexto y commitear**

```bash
pnpm lint
git add lib/fuentes docs/superpowers/contexto
git commit -m "Fuente de intenciones: lectura de la cola de pedidos"
```

---

## Tarea 11: Reconciliación de la cola (módulo puro)

**Archivos:**
- Modificar: `lib/reglas-qms/cantidades.ts`, `lib/reglas-qms/cantidades.test.ts`
- Crear: `lib/operacion/reconciliacion.ts`, `lib/operacion/reconciliacion.test.ts`
- Crear: `docs/superpowers/contexto/plan-4a/tarea-11-contexto.md`

**Interfaces:**
- Consume: `incumpleMoq` y `redondearAPack` de `lib/reglas-qms`; los tipos `Intencion` y `EstadoIntencion` de `lib/fuentes/intenciones` y `Existencia` de `lib/reglas-qms` — todos **import de solo tipos** salvo las dos funciones.
- Produce:
  - `interface EntradaReconciliacion { intencion: Intencion; existencias: Existencia[]; moq: number; packQuantity: number }`
  - `interface ResultadoReconciliacion { estado: Exclude<EstadoIntencion, "encolada">; cantidadFinal: number; nota: string; punto: string | null }`
  - `reconciliar(entrada: EntradaReconciliacion): ResultadoReconciliacion`

**Por qué se ensanchan dos firmas de `cantidades.ts` en lugar de reimplementar la regla.** El contrato de `reconciliar` recibe `moq` y `packQuantity` sueltos, no una `Designacion`. `incumpleMoq` y `redondearAPack` hoy piden una `Designacion` entera aunque solo usen un campo. Se ensanchan a `Pick<Designacion, "moq">` y `Pick<Designacion, "packQuantity">`: es un cambio compatible —una `Designacion` completa sigue siendo asignable, así que ningún llamador existente se toca— y evita la única alternativa, que era copiar el redondeo del punto 4.5a a un segundo archivo. Dos implementaciones de la misma regla es cómo se llega a dos cantidades distintas en dos pantallas.

**Las reglas se aplican en orden y con retorno inmediato,** igual que `evaluarSolicitud`. Consecuencia deliberada: una intención ajustada por pack quantity **no** se contrasta contra existencias, y por eso su nota no promete disponibilidad, solo anuncia que un CSR la confirma al procesar la cotización.

**Ninguna nota lleva fecha ni plazo.** La reconciliación confirma disponibilidad, no tiempo de entrega: el TE en firme sigue saliendo al procesar la cotización. Hay un test que lo vigila, porque este es el punto donde más tienta romper la invariante.

- [ ] **Paso 1: Ensanchar las dos firmas de `cantidades.ts`**

En `lib/reglas-qms/cantidades.ts`, cambia únicamente los tipos de los parámetros:

```ts
/**
 * Punto 4.4 — "Si la designación tiene MOQ mayor a lo que el cliente pide se
 * le indica el MOQ al cliente y se declina."
 *
 * Recibe `Pick<Designacion, "moq">` y no la designación entera para que la
 * reconciliación de la cola (`lib/operacion/reconciliacion.ts`) pueda reusar
 * esta misma regla con el MOQ suelto, en vez de reimplementarla.
 */
export function incumpleMoq(d: Pick<Designacion, "moq">, cantidad: number): boolean {
  return cantidad < d.moq;
}

/**
 * Punto 4.5a — el sistema redondea al pack quantity asignado. Siempre hacia
 * arriba: no se puede despachar una fracción de caja.
 */
export function redondearAPack(d: Pick<Designacion, "packQuantity">, cantidad: number): number {
  if (d.packQuantity <= 1) return cantidad;
  return Math.ceil(cantidad / d.packQuantity) * d.packQuantity;
}

export function avisoPackQuantity(
  d: Pick<Designacion, "packQuantity">,
  cantidad: number,
): Aviso | null {
```

El cuerpo de `avisoPackQuantity` no cambia.

- [ ] **Paso 2: Añadir el test que fija el ensanchamiento**

Al final de `lib/reglas-qms/cantidades.test.ts`, dentro del `describe` que corresponda o en uno nuevo:

```ts
describe("firmas parciales", () => {
  it("redondea con solo el pack quantity, sin una designación completa", () => {
    expect(redondearAPack({ packQuantity: 25 }, 30)).toBe(50);
  });

  it("evalúa el MOQ con solo el MOQ", () => {
    expect(incumpleMoq({ moq: 100 }, 40)).toBe(true);
    expect(incumpleMoq({ moq: 100 }, 100)).toBe(false);
  });
});
```

- [ ] **Paso 3: Escribir el test de reconciliación**

`lib/operacion/reconciliacion.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { Intencion } from "@/lib/fuentes/intenciones";
import type { Existencia } from "@/lib/reglas-qms";
import { type EntradaReconciliacion, reconciliar } from "./reconciliacion";

const intencion = (cantidad: number): Intencion => ({
  id: 1,
  designacion: "DEMO-VENTANA-01",
  cantidad,
  pdiv: "P103",
  encoladaEn: "2026-08-04T10:00:00.000Z",
  estado: "encolada",
  resueltaEn: null,
  nota: null,
});

const entrada = (
  cantidad: number,
  existencias: Existencia[],
  moq = 10,
  packQuantity = 1,
): EntradaReconciliacion => ({ intencion: intencion(cantidad), existencias, moq, packQuantity });

describe("reconciliar", () => {
  it("escala por MOQ citando el punto 4.4 y conserva la cantidad pedida", () => {
    const resultado = reconciliar(entrada(5, [{ almacen: "PS", cantidad: 500 }], 100));
    expect(resultado.estado).toBe("escalada");
    expect(resultado.punto).toBe("4.4");
    expect(resultado.cantidadFinal).toBe(5);
    expect(resultado.nota).toContain("100");
  });

  it("ajusta al pack quantity citando el punto 4.5a y redondea hacia arriba", () => {
    const resultado = reconciliar(entrada(30, [{ almacen: "PS", cantidad: 500 }], 10, 25));
    expect(resultado.estado).toBe("ajustada");
    expect(resultado.punto).toBe("4.5a");
    expect(resultado.cantidadFinal).toBe(50);
  });

  it("confirma cuando las existencias cubren la cantidad y nombra el almacén", () => {
    const resultado = reconciliar(entrada(100, [{ almacen: "PS", cantidad: 400 }]));
    expect(resultado.estado).toBe("confirmada");
    expect(resultado.punto).toBeNull();
    expect(resultado.nota).toContain("PS");
    expect(resultado.nota).toContain("400");
  });

  it("suma los almacenes antes de decidir si alcanza", () => {
    const resultado = reconciliar(
      entrada(100, [
        { almacen: "PS", cantidad: 60 },
        { almacen: "SL", cantidad: 60 },
      ]),
    );
    expect(resultado.estado).toBe("confirmada");
  });

  it("escala sin punto cuando las existencias no alcanzan", () => {
    const resultado = reconciliar(entrada(100, [{ almacen: "PS", cantidad: 20 }]));
    expect(resultado.estado).toBe("escalada");
    expect(resultado.punto).toBeNull();
    expect(resultado.nota).toContain("fábrica");
  });

  it("escala sin existencias registradas", () => {
    expect(reconciliar(entrada(100, [])).estado).toBe("escalada");
  });

  it("el MOQ gana sobre el pack quantity: se evalúa primero", () => {
    const resultado = reconciliar(entrada(5, [{ almacen: "PS", cantidad: 500 }], 100, 25));
    expect(resultado.estado).toBe("escalada");
    expect(resultado.punto).toBe("4.4");
  });

  it("ninguna nota inventa una fecha ni un plazo", () => {
    const casos = [
      entrada(5, [{ almacen: "PS", cantidad: 500 }], 100),
      entrada(30, [{ almacen: "PS", cantidad: 500 }], 10, 25),
      entrada(100, [{ almacen: "PS", cantidad: 400 }]),
      entrada(100, [{ almacen: "PS", cantidad: 20 }]),
    ];
    for (const caso of casos) {
      const { nota } = reconciliar(caso);
      expect(nota).not.toMatch(/\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}|semana|día|dias|plazo|entrega/i);
    }
  });
});
```

- [ ] **Paso 4: Ejecutar y ver el fallo**

```bash
pnpm vitest run lib/operacion/reconciliacion.test.ts
```

Esperado: FALLA con «Failed to resolve import "./reconciliacion"».

- [ ] **Paso 5: Implementar el módulo**

`lib/operacion/reconciliacion.ts`:

```ts
import type { EstadoIntencion, Intencion } from "@/lib/fuentes/intenciones";
import { type Existencia, incumpleMoq, redondearAPack } from "@/lib/reglas-qms";

export interface EntradaReconciliacion {
  intencion: Intencion;
  /** Ya resueltas por `existenciasDe()`, en orden PS, SL, XX. */
  existencias: Existencia[];
  moq: number;
  packQuantity: number;
}

export interface ResultadoReconciliacion {
  estado: Exclude<EstadoIntencion, "encolada">;
  cantidadFinal: number;
  nota: string;
  /** Punto del QMS que justifica el ajuste, o `null` si no lo hay. */
  punto: string | null;
}

/**
 * Qué pasa con una intención cuando la planta vuelve.
 *
 * Puro: recibe el inventario ya resuelto y no toca la base. Las reglas se
 * aplican en orden y con retorno inmediato, igual que `evaluarSolicitud`.
 *
 * NINGUNA NOTA LLEVA FECHA. La reconciliación confirma disponibilidad, no
 * plazo: el tiempo de entrega en firme sigue saliendo al procesar la
 * cotización. Es la invariante de honestidad aplicada al caso más tentador de
 * romperla — el cliente acaba de esperar una ventana y quiere una fecha.
 */
export function reconciliar({
  intencion,
  existencias,
  moq,
  packQuantity,
}: EntradaReconciliacion): ResultadoReconciliacion {
  const { cantidad } = intencion;

  // 4.4 — por debajo del MOQ no hay pedido que ajustar.
  if (incumpleMoq({ moq }, cantidad)) {
    return {
      estado: "escalada",
      cantidadFinal: cantidad,
      nota:
        `La cantidad mínima de orden es ${moq} piezas y la intención quedó registrada por ` +
        `${cantidad}. Un CSR contactará al cliente para ajustar el pedido.`,
      punto: "4.4",
    };
  }

  // 4.5a — el pack quantity ajusta, no declina.
  const cantidadFinal = redondearAPack({ packQuantity }, cantidad);
  if (cantidadFinal !== cantidad) {
    return {
      estado: "ajustada",
      cantidadFinal,
      nota:
        `La cantidad se ajusta de ${cantidad} a ${cantidadFinal} piezas: esta designación se ` +
        `surte en cajas de ${packQuantity}. Un CSR confirma la disponibilidad al procesar la ` +
        "cotización.",
      punto: "4.5a",
    };
  }

  const disponible = existencias.reduce((suma, existencia) => suma + existencia.cantidad, 0);
  if (disponible >= cantidadFinal) {
    const principal = existencias.find((existencia) => existencia.cantidad > 0);
    return {
      estado: "confirmada",
      cantidadFinal,
      nota:
        `Hay ${disponible} piezas disponibles` +
        (principal ? ` (almacén ${principal.almacen} como principal)` : "") +
        ` para las ${cantidadFinal} de la intención.`,
      punto: null,
    };
  }

  return {
    estado: "escalada",
    cantidadFinal,
    nota:
      `Las existencias disponibles (${disponible} piezas) no cubren las ${cantidadFinal} de la ` +
      "intención: requiere consulta a fábrica.",
    punto: null,
  };
}
```

- [ ] **Paso 6: Ejecutar toda la suite**

```bash
pnpm test
```

Esperado: los 8 tests nuevos de reconciliación, los 2 de firmas parciales y **todos** los de `lib/reglas-qms` en verde. Si algo de `reglas-qms` se pone rojo, el ensanchamiento se hizo mal: revisa que sean `Pick<...>` y no un tipo nuevo.

- [ ] **Paso 7: Escribir el contexto y commitear**

Deja escrito en «Decisiones tomadas y por qué» el orden de las reglas con retorno inmediato y su consecuencia: una intención ajustada por pack quantity no se contrasta contra existencias.

```bash
pnpm lint
git add lib/operacion lib/reglas-qms docs/superpowers/contexto
git commit -m "Reconciliacion de la cola: MOQ, pack quantity y existencias sin inventar fechas"
```

---

## Tarea 12: Encolar una intención durante la ventana

**Archivos:**
- Modificar: `app/(portal)/portal/acciones.ts`
- Crear: `components/portal/cola-intenciones.tsx`
- Modificar: `components/portal/detalle-designacion.tsx`, `components/portal/tarjeta-sugerencia.tsx`, `app/(portal)/portal/page.tsx`
- Crear: `docs/superpowers/contexto/plan-4a/tarea-12-contexto.md`

**Interfaces:**
- Consume: `obtenerDesignacion`, `plantaCompleta`, `intencionesDesde`, `estadoDePlanta`, `ahoraSimulada`, `leerSesion`, `clienteAdmin`, `emitirEvento`.
- Produce:
  - `encolarIntencion(codigo: string, cantidad: number): Promise<{ id: number; pdiv: string }>`
  - `listarIntenciones(): Promise<Intencion[]>`
  - `<ColaIntenciones />`

**Por qué encolar falla fuera de ventana.** Encolar con la planta viva sería resolver un problema que no existe: la consulta se responde en el momento. La acción comprueba el estado real de la planta —con el reloj simulado y el override del presentador, igual que el resto del sistema— y rechaza el encolado si no está en `ventana`. No es una validación defensiva: es la regla que hace que la escena 4 signifique algo.

**Por qué el estado `encolada` va en ámbar.** Ámbar es exclusivo de desconexión, y la cola existe **porque** la planta está desconectada. Confirmada va en verde; ajustada y escalada, en neutro: son resultados legítimos, no confirmaciones ni fallos.

- [ ] **Paso 1: Añadir las dos acciones al portal**

Al final de `app/(portal)/portal/acciones.ts`:

```ts
/**
 * Registra la intención de pedido de un cliente mientras su planta está en
 * ventana de mantenimiento.
 *
 * Solo procede si la planta está realmente en `ventana`. Fuera de ventana
 * devuelve error: encolar con la planta viva sería resolver un problema que no
 * existe, y en pantalla se leería como un rodeo innecesario.
 */
export async function encolarIntencion(
  codigo: string,
  cantidad: number,
): Promise<{ id: number; pdiv: string }> {
  const designacion = await obtenerDesignacion(codigo);
  if (!designacion) throw new Error(`La designación ${codigo} no existe en el catálogo.`);

  const [planta, sesion] = await Promise.all([plantaCompleta(designacion.pdiv), leerSesion()]);
  if (!planta) throw new Error(`No se encontró la planta ${designacion.pdiv}.`);

  const estado = estadoDePlanta(
    planta,
    ahoraSimulada(sesion.relojOffsetMin),
    sesion.plantasOverride[planta.pdiv],
  );
  if (estado !== "ventana") {
    throw new Error(
      `${planta.nombre} no está en ventana de mantenimiento: la consulta se resuelve en vivo y no ` +
        "hace falta encolar.",
    );
  }

  const { data, error } = await clienteAdmin()
    .from("intenciones_pedido")
    .insert({ designacion: designacion.designacion, cantidad, pdiv: planta.pdiv })
    .select("id")
    .single();
  if (error) throw new Error(`No se pudo encolar la intención: ${error.message}`);

  await emitirEvento({
    tipo: "intencion_encolada",
    perfil: "cliente",
    designacion: designacion.designacion,
    pdiv: planta.pdiv,
    detalle: { id: data.id, cantidad, planta: planta.nombre },
  });
  revalidatePath("/portal");

  return { id: data.id, pdiv: planta.pdiv };
}

/** Cola de la sesión para la pantalla del cliente. */
export async function listarIntenciones(): Promise<Intencion[]> {
  const sesion = await leerSesion();
  return intencionesDesde(sesion.iniciadaEn);
}
```

Añade a los imports desde `@/lib/fuentes`: `intencionesDesde` y el tipo `Intencion`. `obtenerDesignacion`, `plantaCompleta`, `estadoDePlanta`, `ahoraSimulada`, `leerSesion`, `clienteAdmin`, `emitirEvento` y `revalidatePath` ya están en el archivo.

- [ ] **Paso 2: Ofrecer el encolado junto al TE estimado**

En `components/portal/detalle-designacion.tsx`, añade la prop `plantaEnVentana` y el bloque de encolado. La firma queda:

```tsx
export function DetalleDesignacion({
  sugerencia,
  estimacion,
  cantidad,
  plantaEnVentana,
}: {
  sugerencia: Sugerencia;
  estimacion: Estimacion | null;
  cantidad: number;
  plantaEnVentana: { pdiv: string; planta: string } | null;
}) {
  const [registrada, setRegistrada] = useState(false);
  const [encolada, setEncolada] = useState<number | null>(null);
  const [errorCola, setErrorCola] = useState<string | null>(null);
  const [enVuelo, iniciar] = useTransition();
```

Importa la acción junto a la que ya se importa:

```tsx
import { encolarIntencion, registrarSolicitudEvitada } from "@/app/(portal)/portal/acciones";
```

Y dentro de la columna de la estimación, justo después del bloque `{estimacion ? … : …}`, envuelve ambos en un fragmento y añade:

```tsx
{plantaEnVentana && (
  <div className="mt-3 rounded-md border border-desconexion bg-desconexion-suave p-4 text-sm text-desconexion">
    {encolada === null ? (
      <>
        <p className="font-medium">Registrar la intención de pedido</p>
        <p className="mt-1">
          {plantaEnVentana.planta} está desconectada. Podemos registrar tu intención de{" "}
          {cantidad} piezas y confirmarla en cuanto la planta vuelva, sobre el rango estimado de
          arriba. No es un pedido en firme.
        </p>
        <button
          type="button"
          disabled={enVuelo}
          onClick={() =>
            iniciar(async () => {
              setErrorCola(null);
              try {
                const { id } = await encolarIntencion(designacion.designacion, cantidad);
                setEncolada(id);
              } catch (causa) {
                setErrorCola(
                  causa instanceof Error ? causa.message : "No se pudo encolar la intención.",
                );
              }
            })
          }
          className="mt-3 rounded-lg border border-desconexion px-4 py-2 font-medium text-desconexion hover:bg-fondo disabled:opacity-50"
        >
          {enVuelo ? "Registrando…" : "Encolar intención de pedido"}
        </button>
        {errorCola && <p className="mt-2 text-error">{errorCola}</p>}
      </>
    ) : (
      <p>
        Intención registrada en la cola de {plantaEnVentana.planta}. Se resolverá al restablecerse
        la planta y la verás abajo con su resultado.
      </p>
    )}
  </div>
)}
```

En `components/portal/tarjeta-sugerencia.tsx`, pasa la prop hacia abajo:

```tsx
<DetalleDesignacion
  sugerencia={sugerencia}
  estimacion={estimacion}
  cantidad={cantidad}
  plantaEnVentana={plantaEnVentana}
/>
```

- [ ] **Paso 3: Escribir la cola del cliente**

`components/portal/cola-intenciones.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { listarIntenciones } from "@/app/(portal)/portal/acciones";
import { useSesion } from "@/components/sesion/proveedor-sesion";
import type { EstadoIntencion, Intencion } from "@/lib/fuentes";

const ETIQUETA: Record<EstadoIntencion, string> = {
  encolada: "En cola",
  confirmada: "Confirmada",
  ajustada: "Ajustada",
  escalada: "Escalada",
};

/**
 * Ámbar solo en `encolada`: la cola existe porque la planta está desconectada.
 * Verde solo en `confirmada`. Ajustada y escalada son resultados legítimos del
 * procedimiento, no fallos, así que van en neutro.
 */
const CLASE: Record<EstadoIntencion, string> = {
  encolada: "border-desconexion bg-desconexion-suave text-desconexion",
  confirmada: "border-confirmacion bg-confirmacion-suave text-confirmacion",
  ajustada: "border-borde bg-fondo-sutil text-texto",
  escalada: "border-borde bg-fondo-sutil text-texto",
};

export function ColaIntenciones() {
  const { sesion } = useSesion();
  const [intenciones, setIntenciones] = useState<Intencion[]>([]);

  const refrescar = useCallback(() => {
    listarIntenciones()
      .then(setIntenciones)
      .catch(() => {
        // Una cola que no carga no puede tumbar el portal en mitad de la
        // escena: se queda con lo último que mostró.
      });
  }, []);

  // Se refresca cuando cambia la sesión: cerrar la ventana desde /demo cambia
  // `plantasOverride`, ese cambio llega por Realtime y arrastra la relectura de
  // la cola ya reconciliada. No hace falta un canal nuevo sobre esta tabla.
  useEffect(() => {
    refrescar();
  }, [refrescar, sesion]);

  if (intenciones.length === 0) return null;

  return (
    <section className="mt-8" aria-labelledby="titulo-cola">
      <h2 id="titulo-cola" className="text-lg font-semibold text-texto">
        Intenciones de pedido registradas
      </h2>
      <p className="mt-1 text-sm text-texto-tenue">
        Registro de intención sobre datos simulados. No es un pedido en firme ni un compromiso de
        fecha.
      </p>
      <ul className="mt-3 space-y-2">
        {intenciones.map((intencion) => (
          <li key={intencion.id} className="rounded-xl border border-borde bg-fondo p-3 text-sm">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="designacion font-medium text-texto">{intencion.designacion}</span>
              <span className="text-texto-tenue">{intencion.cantidad} piezas</span>
              <span className="designacion text-texto-tenue">{intencion.pdiv}</span>
              <span
                className={`ml-auto inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${CLASE[intencion.estado]}`}
              >
                {ETIQUETA[intencion.estado]}
              </span>
            </div>
            {intencion.nota && <p className="mt-2 text-texto-tenue">{intencion.nota}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Paso 4: Montar la cola en el portal**

En `app/(portal)/portal/page.tsx`, importa el componente y colócalo después de `<Buscador />`, dentro del `<main>`:

```tsx
import { ColaIntenciones } from "@/components/portal/cola-intenciones";
```

```tsx
<Buscador />
<ColaIntenciones />
```

- [ ] **Paso 5: Verificar la primera mitad de la escena 4**

```bash
pnpm dev
```

Con `/demo` en una ventana y `/portal` en otra:

1. En `/demo`, fuerza la planta `P103` a *ventana*.
2. En `/portal`, con el modo en *con la solución*, busca `DEMO-VENTANA` y pide una cantidad.
3. La tarjeta muestra el aviso ámbar de inventario no disponible y, junto al TE estimado, el botón *Encolar intención de pedido*.
4. Al pulsarlo aparece el mensaje de intención registrada y la cola de abajo muestra la fila **En cola** en ámbar.
5. En `/demo`, devuelve `P103` a *online*. En `/portal` el botón de encolar desaparece; si lo hubieras pulsado con la planta viva, la acción habría devuelto el error de «no está en ventana».
6. En el editor SQL: `select tipo, designacion, pdiv from eventos_demo where tipo = 'intencion_encolada' order by ocurrido_en desc limit 3;` devuelve el evento.

La cola sigue en **En cola**: reconciliarla es la Tarea 13.

- [ ] **Paso 6: Compilar, escribir el contexto y commitear**

```bash
pnpm build
pnpm lint
git add "app/(portal)" components/portal docs/superpowers/contexto
git commit -m "Portal: encolar intencion de pedido durante la ventana de planta"
```

---

## Tarea 13: Reconciliación al reabrir la planta y eventos de ventana

**Archivos:**
- Modificar: `lib/sesion-demo/acciones.ts`
- Crear: `docs/superpowers/contexto/plan-4a/tarea-13-contexto.md`

**Interfaces:**
- Consume: `intencionesDe`, `obtenerDesignacion`, `existenciasDe`, `plantaCompleta` de `lib/fuentes`; `reconciliar` de `lib/operacion/reconciliacion`; `estadoDePlanta`, `ahoraSimulada`; `emitirEvento`; `clienteAdmin`.
- Produce: `cerrarVentanaEnCurso(pdiv)` y `fijarEstadoPlanta(pdiv, estado)` **con sus firmas actuales**. Ganan la reconciliación y la emisión de `ventana_inicio` / `ventana_fin`.

**El orden importa y no es un detalle de estilo.** La reconciliación va **antes** de tocar el override. Si el override se limpiara primero, la pantalla del cliente se refrescaría por Realtime con la planta ya viva y la cola todavía sin resolver — el cliente vería «En cola» junto a una planta en línea, que es exactamente la incoherencia que la escena 4 existe para desmentir.

**Por qué la reconciliación es secuencial y no `Promise.all`.** Son unas pocas intenciones y cada una emite su evento. En serie, el orden de los eventos en `eventos_demo` coincide con el orden de la cola en pantalla, y eso hace que el dashboard de 4B se lea igual que lo que el cliente acaba de ver.

- [ ] **Paso 1: Añadir la reconciliación y los eventos de ventana**

En `lib/sesion-demo/acciones.ts`, amplía los imports:

```ts
import { ahoraSimulada, type EstadoPlanta, estadoDePlanta } from "@/lib/estado-fabricas";
import { existenciasDe, intencionesDe, obtenerDesignacion, plantaCompleta } from "@/lib/fuentes";
import { emitirEvento } from "@/lib/metricas/emitir";
import { reconciliar } from "@/lib/operacion/reconciliacion";
```

Sustituye `fijarEstadoPlanta` y `cerrarVentanaEnCurso` por:

```ts
/**
 * Resuelve toda intención `encolada` de una planta.
 *
 * No se exporta: un archivo `"use server"` solo puede exportar funciones
 * asíncronas que sean acciones, y esto es un paso interno de
 * `cerrarVentanaEnCurso`. En serie a propósito, para que el orden de los
 * eventos coincida con el de la cola en pantalla.
 */
async function reconciliarIntenciones(pdiv: string): Promise<void> {
  const pendientes = await intencionesDe(pdiv, "encolada");
  if (pendientes.length === 0) return;
  const admin = clienteAdmin();

  for (const intencion of pendientes) {
    const [designacion, existencias] = await Promise.all([
      obtenerDesignacion(intencion.designacion),
      existenciasDe(intencion.designacion),
    ]);
    // La clave foránea lo impide, pero si faltara el catálogo no se puede
    // decidir nada honesto: se deja encolada en vez de inventar un resultado.
    if (!designacion) continue;

    const resultado = reconciliar({
      intencion,
      existencias,
      moq: designacion.moq,
      packQuantity: designacion.packQuantity,
    });

    const { error } = await admin
      .from("intenciones_pedido")
      .update({
        estado: resultado.estado,
        resuelta_en: new Date().toISOString(),
        nota: resultado.nota,
      })
      .eq("id", intencion.id);
    if (error) {
      throw new Error(`No se pudo reconciliar la intención ${intencion.id}: ${error.message}`);
    }

    await emitirEvento({
      tipo: "reconciliacion",
      perfil: "cliente",
      designacion: intencion.designacion,
      pdiv,
      detalle: {
        estado: resultado.estado,
        cantidadFinal: resultado.cantidadFinal,
        punto: resultado.punto,
      },
    });
  }
}

/** `null` devuelve la planta al calendario en vez de forzarle un estado. */
export async function fijarEstadoPlanta(pdiv: string, estado: EstadoPlanta | null): Promise<void> {
  const sesion = await leerSesion();
  const planta = await plantaCompleta(pdiv);
  const momento = ahoraSimulada(sesion.relojOffsetMin);
  const anterior = planta
    ? estadoDePlanta(planta, momento, sesion.plantasOverride[pdiv])
    : null;

  const overrides = { ...sesion.plantasOverride };
  if (estado === null) delete overrides[pdiv];
  else overrides[pdiv] = estado;
  await actualizar({ plantas_override: overrides });

  if (!planta) return;
  // El evento se emite DESPUÉS de escribir: la pantalla del presentador no
  // espera a la métrica, y `emitirEvento` no lanza jamás.
  const nuevo = estadoDePlanta(planta, momento, overrides[pdiv]);
  if (anterior !== "ventana" && nuevo === "ventana") {
    await emitirEvento({ tipo: "ventana_inicio", pdiv, detalle: { planta: planta.nombre } });
  }
  if (anterior === "ventana" && nuevo !== "ventana") {
    await emitirEvento({ tipo: "ventana_fin", pdiv, detalle: { planta: planta.nombre } });
  }
}

/**
 * Cierra la ventana en curso de una planta.
 *
 * Quitar el override no basta si la planta está además dentro de su ventana de
 * calendario: hay que forzarla a 'online'. El presentador usa esto al final de
 * la escena 4, cuando la cola se envía en lote.
 *
 * ORDEN DELIBERADO: primero se reconcilia la cola, después se libera la planta.
 * Al revés, la pantalla del cliente se refrescaría con la planta viva y la cola
 * todavía sin resolver.
 */
export async function cerrarVentanaEnCurso(pdiv: string): Promise<void> {
  await reconciliarIntenciones(pdiv);
  await fijarEstadoPlanta(pdiv, "online");
}
```

- [ ] **Paso 2: Verificar la escena 4 completa**

```bash
pnpm dev
```

Con `/demo` y `/portal` en dos ventanas:

1. En `/demo`, fuerza `P103` a *ventana*.
2. En `/portal`, encola **tres** intenciones de la misma planta con cantidades distintas: una por debajo del MOQ de la designación, una que no sea múltiplo del pack quantity y una limpia con existencias suficientes.
3. En `/demo`, pulsa *Cerrar la ventana en curso*.
4. En `/portal`, **sin recargar**, la cola pasa a mostrar los tres resultados: *Escalada* con el punto 4.4, *Ajustada* con la cantidad redondeada y *Confirmada* en verde con el almacén.
5. Ninguna de las tres notas contiene una fecha ni un plazo.
6. En el editor SQL:

```sql
select tipo, pdiv, detalle
from eventos_demo
where tipo in ('reconciliacion', 'ventana_inicio', 'ventana_fin')
order by ocurrido_en desc
limit 10;
```

Esperado: un `reconciliacion` por intención con `estado`, `cantidadFinal` y `punto`; un `ventana_inicio` al forzar la ventana y un `ventana_fin` al cerrarla.

- [ ] **Paso 3: Compilar, ejecutar la suite y commitear**

```bash
pnpm test
pnpm build
pnpm lint
git add lib/sesion-demo docs/superpowers/contexto
git commit -m "Cerrar ventana: reconcilia la cola antes de liberar la planta"
```

---

## Tarea 14: Los eventos que faltan y la verificación de los doce tipos

**Archivos:**
- Crear: `lib/fuentes/eventos.ts`
- Modificar: `lib/fuentes/index.ts`, `app/(portal)/portal/acciones.ts`, `app/(operador)/acciones.ts`
- Modificar: `components/portal/detalle-designacion.tsx`, `components/portal/tarjeta-sugerencia.tsx`, `components/portal/resultado-busqueda.tsx`
- Crear: `docs/superpowers/contexto/plan-4a/tarea-14-contexto.md`

**Interfaces:**
- Consume: `emitirEvento`, el tipo `TipoEvento`, `Sugerencia`, `Estrategia`.
- Produce:
  - `hayAvisoDeOperador(tipo: TipoEvento, numero: string): Promise<boolean>`
  - `registrarSolicitudEvitada(codigo: string, estrategia?: Estrategia): Promise<void>` — la firma se amplía; el parámetro es opcional y los llamadores actuales siguen compilando.

**Cuándo es `sugerencia_aceptada` y cuándo no.** El botón *Usar esta designación* resuelve la consulta sin cotización, y eso ya emite `solicitud_evitada`. Solo emite además `sugerencia_aceptada` cuando el candidato lo **encontró el validador** —normalización, prefijo, trigramas o el respaldo del modelo—, no cuando el cliente escribió la designación exacta. Contar la coincidencia exacta como sugerencia aceptada inflaría el indicador con casos en los que el sistema no aportó nada.

**Por qué la bandeja deduplica sus avisos.** El evento se emite donde ocurre el hecho, y en el portal el hecho ocurre en cada búsqueda: si el cliente busca tres veces con una cantidad por debajo del MOQ, son tres avisos anticipados y las tres son ciertas. En la bandeja no: abrir el mismo detalle cinco veces no son cinco avisos. Se emite una sola vez por solicitud, comprobando antes si ya existe. Sin esa comprobación, `avisosAnticipados` crecería cada vez que el CSR pulsa una fila y el dashboard de 4B mostraría una cifra inventada.

- [ ] **Paso 1: Escribir la fuente de comprobación**

`lib/fuentes/eventos.ts`:

```ts
import type { TipoEvento } from "@/lib/metricas/calculo";
import { clienteLectura } from "@/lib/supabase/lectura";
import { lanzarSiError } from "./errores";

/**
 * ¿La bandeja ya emitió este aviso para esta solicitud?
 *
 * Existe para que abrir el mismo detalle varias veces no multiplique el
 * contador de avisos anticipados del dashboard. El filtro por tipo y perfil
 * deja un puñado de filas por sesión, así que la comparación del número se
 * hace en memoria y no hace falta un operador de ruta JSON en la consulta.
 */
export async function hayAvisoDeOperador(tipo: TipoEvento, numero: string): Promise<boolean> {
  const { data, error } = await clienteLectura()
    .from("eventos_demo")
    .select("detalle")
    .eq("tipo", tipo)
    .eq("perfil", "operador");
  lanzarSiError(error, `revisar los avisos ya emitidos de la solicitud ${numero}`);
  return (data ?? []).some((fila) => (fila.detalle as { numero?: string }).numero === numero);
}
```

Añade `export * from "./eventos";` a `lib/fuentes/index.ts`, entre `./designaciones` y `./homologos`.

- [ ] **Paso 2: Emitir los avisos del portal**

En `app/(portal)/portal/acciones.ts`, añade el emisor y llámalo desde el único embudo que atraviesan las dos rutas de búsqueda:

```ts
/**
 * Avisos que el cliente ve en la tarjeta de un candidato.
 *
 * Se emiten aquí, donde se producen, y no en el componente que los pinta: un
 * aviso calculado que la pantalla nunca recibió no es un aviso anticipado, y
 * uno que el servidor devolvió sí lo es. Se emite en los dos modos, con el
 * modo en el detalle, para que el contraste 'hoy' / 'solución' quede auditable.
 */
async function emitirAvisos(
  candidatos: readonly Sugerencia[],
  cantidad: number,
  modo: string,
): Promise<void> {
  for (const candidato of candidatos) {
    const { designacion, evaluacion } = candidato;
    if (evaluacion.ruta === "declinar_moq") {
      await emitirEvento({
        tipo: "aviso_moq",
        perfil: "cliente",
        designacion: designacion.designacion,
        pdiv: designacion.pdiv,
        detalle: { modo, cantidad, moq: designacion.moq },
      });
    }
    if (evaluacion.avisos.some((aviso) => aviso.tipo === "pack_quantity_ajustado")) {
      await emitirEvento({
        tipo: "aviso_pack_quantity",
        perfil: "cliente",
        designacion: designacion.designacion,
        pdiv: designacion.pdiv,
        detalle: { modo, cantidad, cantidadEfectiva: evaluacion.cantidadEfectiva },
      });
    }
  }
}
```

Dentro de `conEstimaciones`, justo antes del `return`:

```ts
  await emitirAvisos(resultado.candidatos, cantidad, sesion.modo);

  return {
    ...resultado,
```

Importa el tipo `Sugerencia` desde `@/lib/validador/tipos` (el archivo ya importa `ResultadoValidacion` de ahí).

- [ ] **Paso 3: Emitir `sugerencia_aceptada`**

Sustituye `registrarSolicitudEvitada` en el mismo archivo:

```ts
export async function registrarSolicitudEvitada(
  codigo: string,
  estrategia?: Estrategia,
): Promise<void> {
  // Solo cuenta como sugerencia aceptada si el candidato lo encontró el
  // validador. Una coincidencia exacta la escribió el cliente: ahí el sistema
  // no sugirió nada.
  if (estrategia !== undefined && estrategia !== "exacta" && estrategia !== "ninguna") {
    await emitirEvento({
      tipo: "sugerencia_aceptada",
      perfil: "cliente",
      designacion: codigo,
      detalle: { estrategia },
    });
  }
  await emitirEvento({ tipo: "solicitud_evitada", perfil: "cliente", designacion: codigo });
  revalidatePath("/operador");
}
```

Importa el tipo `Estrategia` desde `@/lib/validador/tipos`.

- [ ] **Paso 4: Hacer llegar la estrategia hasta el botón**

`components/portal/resultado-busqueda.tsx`, en el `map` de candidatos:

```tsx
<TarjetaSugerencia
  key={sugerencia.designacion.designacion}
  sugerencia={sugerencia}
  cantidad={cantidad}
  estrategia={resultado.estrategia}
  estimacion={resultado.estimaciones[sugerencia.designacion.designacion] ?? null}
  plantaEnVentana={resultado.plantasEnVentana[sugerencia.designacion.designacion] ?? null}
/>
```

`components/portal/tarjeta-sugerencia.tsx`: añade `estrategia: Estrategia` a las props —importando el tipo desde `@/lib/validador/tipos`— y pásala a `<DetalleDesignacion>`.

`components/portal/detalle-designacion.tsx`: añade `estrategia: Estrategia` a las props y úsala en la llamada:

```tsx
await registrarSolicitudEvitada(designacion.designacion, estrategia);
```

- [ ] **Paso 5: Emitir los avisos de la bandeja, una sola vez por solicitud**

En `app/(operador)/acciones.ts`, dentro de `detalleDeSolicitud`, justo antes del `return`:

```ts
  // Una sola vez por solicitud: abrir el detalle cinco veces no son cinco
  // avisos anticipados, y el dashboard del Plan 4B cuenta estos eventos.
  const pdiv = contexto.designacion?.pdiv ?? null;
  if (evaluacion.ruta === "declinar_moq" && !(await hayAvisoDeOperador("aviso_moq", numero))) {
    await emitirEvento({
      tipo: "aviso_moq",
      perfil: "operador",
      designacion: fila.designacionTexto,
      pdiv,
      detalle: { numero, cantidad: fila.cantidad },
    });
  }
  if (
    evaluacion.avisos.some((aviso) => aviso.tipo === "pack_quantity_ajustado") &&
    !(await hayAvisoDeOperador("aviso_pack_quantity", numero))
  ) {
    await emitirEvento({
      tipo: "aviso_pack_quantity",
      perfil: "operador",
      designacion: fila.designacionTexto,
      pdiv,
      detalle: { numero, cantidad: fila.cantidad, cantidadEfectiva: evaluacion.cantidadEfectiva },
    });
  }

  return { fila, contexto, evaluacion, homologos, estimacion };
```

Añade `hayAvisoDeOperador` a los imports de `@/lib/fuentes` y `emitirEvento` desde `@/lib/metricas/emitir`.

- [ ] **Paso 6: Verificar que los doce tipos se emiten**

```bash
pnpm dev
```

Sobre una sesión recién reiniciada desde `/demo`, recorre: una búsqueda con designación mal escrita y *Usar esta designación* sobre un candidato sugerido; una búsqueda con cantidad por debajo del MOQ; una que no sea múltiplo del pack quantity; *Solicitar cotización*; abrir esa solicitud en `/operador` dos veces; la confirmación de homólogo de la escena 3; y la escena 4 completa —forzar ventana, encolar, cerrar ventana—. Después:

```sql
select tipo, count(*)
from eventos_demo
where ocurrido_en >= (select iniciada_en from sesion_demo where id = 1)
group by tipo
order by tipo;
```

Esperado: los doce valores del enum con conteo mayor que cero — `busqueda`, `sugerencia_aceptada`, `solicitud_evitada`, `solicitud_generada`, `confirmacion_homologo`, `aviso_moq`, `aviso_pack_quantity`, `ventana_inicio`, `ventana_fin`, `intencion_encolada`, `reconciliacion`, `llamada_modelo` (este último requiere haber usado el chat al menos una vez). Comprueba además que abrir el mismo detalle dos veces **no** subió el conteo de `aviso_moq` con `perfil = 'operador'`.

- [ ] **Paso 7: Compilar, ejecutar la suite y commitear**

```bash
pnpm test
pnpm build
pnpm lint
git add lib/fuentes "app/(portal)" "app/(operador)" components/portal docs/superpowers/contexto
git commit -m "Metricas: sugerencia aceptada y avisos anticipados del portal y la bandeja"
```

---

## Cierre del Plan 4A

Antes de dar 4A por terminado, corre la verificación completa y comprueba los criterios de aceptación del §9 del spec que corresponden a este plan.

- [ ] **Verificación final**

```bash
pnpm test
pnpm test:integracion
pnpm build
pnpm lint
```

- [ ] **Escena 3 — Homólogos y obsoletos**

El cliente recorre los pasos de diferencia técnica uno por uno, no puede continuar sin marcarlos todos, y el resultado se presenta como **sujeto a validación de Ingeniería de Ventas** —nunca en verde— cuando `requiereIngenieriaVentas` es verdadero. Se emite `confirmacion_homologo`.

- [ ] **Escena 4 — Ventana de desconexión**

Con la planta en ventana se encola una intención con su TE estimado a la vista. Al reabrir desde `/demo`, la cola queda confirmada, ajustada o escalada, cada una con su punto del QMS cuando corresponde, **sin ninguna fecha inventada**, y la pantalla del cliente se actualiza sin recargar.

- [ ] **Invariantes**

Ningún componente ni Server Action consulta Supabase fuera de `lib/fuentes`. Ninguna escritura sale del navegador. Ámbar solo en desconexión —cola encolada, inventario no disponible—, verde solo en confirmación —cotizada, intención confirmada, equivalencia sin validación pendiente—. Ninguna migración nueva.

- [ ] **Actualizar el estado para 4B**

Escribe `docs/superpowers/specs/2026-08-04-estado-tras-plan-4a.md` con la misma estructura que `2026-08-04-estado-tras-plan-3.md`: lo entregado, las restricciones que hereda 4B, los contratos que consumirá, la deuda consciente y los supuestos abiertos. Añade explícitamente a los supuestos el criterio de `ATRIBUTOS_CRITICOS` de la Tarea 8 y la consecuencia del orden de reglas de la Tarea 11.

```bash
git add docs/superpowers/specs
git commit -m "Estado tras el Plan 4A: restricciones y contratos que hereda 4B"
```

4B arranca desde aquí: `/impacto`, indicadores vivos, despliegue a Vercel, ensayo cronometrado y video de respaldo.

