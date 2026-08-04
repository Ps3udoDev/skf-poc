# Plan 2 — Datos sintéticos

> **Para agentes ejecutores:** SUB-SKILL REQUERIDA: usa `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans` para implementar tarea por tarea. Los pasos usan casillas (`- [ ]`) para seguimiento.

**Objetivo:** Poblar la base con un catálogo de 30.000 designaciones y 6 meses de histórico de cotizaciones, sintéticos pero estructuralmente fieles al procedimiento QMS, de modo que el demo se sienta un sistema real y que el dashboard pueda *encontrar* los problemas que la propuesta describe.

**Arquitectura:** Scripts de Node ejecutados con `tsx`, con un generador determinista de semilla fija. La generación se separa de la carga: cada módulo produce filas en memoria y un único cargador las inserta por `COPY` contra el pooler de sesión. Ningún script consulta la base para decidir qué generar — la coherencia se resuelve en memoria antes de escribir.

**Stack:** TypeScript · tsx · `pg` (COPY) · `@faker-js/faker` · Vitest

## Restricciones globales

- **Todo en español:** nombres de archivos, funciones, variables y textos generados.
- **Cero datos reales de SKF.** Ninguna designación, cliente, precio o código de planta puede coincidir con los suyos. Las designaciones siguen **patrones públicos de nomenclatura de rodamientos**, que es distinto de copiar su catálogo.
- **Operadores como `CSR 1`, `CSR 2`…** nunca nombres de personas.
- **Determinismo absoluto.** Prohibido `Math.random()` y `Date.now()` en la generación. Todo sale del PRNG sembrado con `DEMO_SEED` de `.env.local`. Ejecutar la siembra dos veces debe producir bytes idénticos.
- **Formato del número de cotización:** `AAAAQ#####` — el `CHECK` de la base lo exige.
- **Linter Biome.** Su reordenamiento de imports y ajustes de formato son esperados, **no** desviación.
- **Nunca editar una migración ya aplicada.** Las aplicadas son `000001, 000002, 000003, 000005, 000006, 000007`; el hueco en `000004` es deliberado.
- **Base de datos:** Supabase cloud, sin Docker. Conexión por `SUPABASE_DB_URL` de `.env.local` (pooler de sesión) con `ssl: { rejectUnauthorized: false }`. La directa `db.<ref>.supabase.co` no resuelve, es IPv6.
- **Vitest usa `pool: "threads"`**, ya fijado. Los tests que tocan la red viven en `*.integracion.test.ts` y no corren con `pnpm test`.

### Contrato de contexto por tarea (obligatorio)

Cada tarea **debe** escribir `docs/superpowers/contexto/plan-2/tarea-N-contexto.md` y **commitearlo junto con el código**. Va versionado en git a propósito: si la sesión se corta por límite de tokens, otro agente retoma desde ahí sin acceso a esta conversación.

Estructura mínima, en español:

```markdown
# Tarea N — <título>

## Estado
<completa | en curso | bloqueada>

No cites el hash de tu propio commit: el archivo va dentro de ese commit y no
puedes conocerlo al escribirlo. Enmendar el commit para corregirlo solo genera
un hash nuevo y el problema se repite. Para ubicar el trabajo basta con
`git log --oneline -- <ruta de los archivos de la tarea>`.

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

---

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `scripts/seed/aleatorio.ts` | PRNG determinista y ayudantes de muestreo |
| `scripts/seed/cargador.ts` | Inserción masiva por `COPY` |
| `scripts/seed/plantas.ts` | Las 18 plantas, definidas a mano |
| `scripts/seed/nomenclatura.ts` | Patrones de designación por familia |
| `scripts/seed/designaciones.ts` | Catálogo con su clasificación QMS |
| `scripts/seed/homologos.ts` | Equivalencias y cadenas de obsolescencia |
| `scripts/seed/inventario.ts` | Existencias por almacén |
| `scripts/seed/comercial.ts` | Clientes y operadores |
| `scripts/seed/cotizaciones.ts` | Histórico con los patrones sembrados |
| `scripts/seed/casos-curados.ts` | Los 8 casos del guion del demo |
| `scripts/seed/index.ts` | Orquestador — `pnpm seed` |
| `scripts/seed/verificar.ts` | Comprobaciones sobre los datos ya cargados |
| `scripts/seed/*.test.ts` | Tests unitarios de los generadores |

---

## Tarea 1: Generador determinista y cargador masivo

**Archivos:**
- Crear: `scripts/seed/aleatorio.ts`, `scripts/seed/aleatorio.test.ts`
- Crear: `scripts/seed/cargador.ts`
- Crear: `docs/superpowers/contexto/plan-2/tarea-1-contexto.md`

**Interfaces:**
- Produce:
  - `crearAleatorio(semilla: number): Aleatorio`
  - `Aleatorio` con: `entero(min, max)`, `decimal(min, max, decimales)`, `elegir<T>(lista: T[]): T`, `elegirPonderado<T>(opciones: [T, number][]): T`, `probabilidad(p: number): boolean`, `barajar<T>(lista: T[]): T[]`
  - `conectar(): Client`
  - `cargar(cliente: Client, tabla: string, columnas: readonly string[], filas: readonly unknown[][], tamanoLote?: number): Promise<number>`

**Nota de diseño:** el PRNG es `mulberry32` — 32 bits, rápido, determinista y suficiente para datos de demostración. No es criptográfico y no debe usarse para nada que no sea generar este catálogo.

- [ ] **Paso 1: Escribir el test que falle**

`scripts/seed/aleatorio.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { crearAleatorio } from "./aleatorio";

describe("determinismo", () => {
  it("dos generadores con la misma semilla producen la misma secuencia", () => {
    const a = crearAleatorio(20260803);
    const b = crearAleatorio(20260803);
    const serieA = Array.from({ length: 50 }, () => a.entero(0, 1000));
    const serieB = Array.from({ length: 50 }, () => b.entero(0, 1000));
    expect(serieA).toEqual(serieB);
  });

  it("semillas distintas producen secuencias distintas", () => {
    const a = crearAleatorio(1);
    const b = crearAleatorio(2);
    expect(a.entero(0, 1e9)).not.toBe(b.entero(0, 1e9));
  });
});

describe("rangos", () => {
  it("entero respeta ambos extremos inclusive", () => {
    const a = crearAleatorio(7);
    const vistos = new Set<number>();
    for (let i = 0; i < 500; i++) vistos.add(a.entero(1, 3));
    expect([...vistos].sort()).toEqual([1, 2, 3]);
  });

  it("decimal respeta el numero de decimales", () => {
    const a = crearAleatorio(7);
    const v = a.decimal(0, 100, 2);
    expect(v).toBe(Number(v.toFixed(2)));
  });
});

describe("muestreo", () => {
  it("elegirPonderado respeta las proporciones de forma aproximada", () => {
    const a = crearAleatorio(11);
    const conteo = { alto: 0, bajo: 0 };
    for (let i = 0; i < 10000; i++) {
      conteo[a.elegirPonderado<"alto" | "bajo">([["alto", 80], ["bajo", 20]])]++;
    }
    expect(conteo.alto / 10000).toBeGreaterThan(0.77);
    expect(conteo.alto / 10000).toBeLessThan(0.83);
  });

  it("barajar no pierde ni duplica elementos", () => {
    const a = crearAleatorio(3);
    const original = [1, 2, 3, 4, 5, 6, 7, 8];
    const barajado = a.barajar(original);
    expect([...barajado].sort((x, y) => x - y)).toEqual(original);
  });

  it("barajar no muta la lista de entrada", () => {
    const a = crearAleatorio(3);
    const original = [1, 2, 3, 4, 5];
    a.barajar(original);
    expect(original).toEqual([1, 2, 3, 4, 5]);
  });

  it("probabilidad(1) siempre es cierto y probabilidad(0) siempre falso", () => {
    const a = crearAleatorio(5);
    for (let i = 0; i < 20; i++) {
      expect(a.probabilidad(1)).toBe(true);
      expect(a.probabilidad(0)).toBe(false);
    }
  });
});
```

- [ ] **Paso 2: Ejecutar y ver el fallo**

Ejecuta: `pnpm test aleatorio`
Esperado: FALLA — `Cannot find module './aleatorio'`.

- [ ] **Paso 3: Implementar el generador**

`scripts/seed/aleatorio.ts`:

```ts
/**
 * Generador pseudoaleatorio determinista para la siembra.
 *
 * Con la misma semilla produce siempre la misma secuencia: reconstruir la base
 * antes de una presentación da un resultado idéntico al anterior.
 *
 * Algoritmo mulberry32. NO es criptográfico: no usar para nada que no sea
 * generar este catálogo de demostración.
 */
export interface Aleatorio {
  entero(min: number, max: number): number;
  decimal(min: number, max: number, decimales: number): number;
  elegir<T>(lista: readonly T[]): T;
  elegirPonderado<T>(opciones: readonly (readonly [T, number])[]): T;
  probabilidad(p: number): boolean;
  barajar<T>(lista: readonly T[]): T[];
}

export function crearAleatorio(semilla: number): Aleatorio {
  let estado = semilla >>> 0;

  const siguiente = (): number => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const entero = (min: number, max: number) => min + Math.floor(siguiente() * (max - min + 1));

  return {
    entero,
    decimal: (min, max, decimales) =>
      Number((min + siguiente() * (max - min)).toFixed(decimales)),
    elegir: <T,>(lista: readonly T[]) => lista[entero(0, lista.length - 1)],
    elegirPonderado: <T,>(opciones: readonly (readonly [T, number])[]) => {
      const total = opciones.reduce((s, [, peso]) => s + peso, 0);
      let corte = siguiente() * total;
      for (const [valor, peso] of opciones) {
        corte -= peso;
        if (corte <= 0) return valor;
      }
      return opciones[opciones.length - 1][0];
    },
    probabilidad: (p) => siguiente() < p,
    barajar: <T,>(lista: readonly T[]) => {
      const copia = [...lista];
      for (let i = copia.length - 1; i > 0; i--) {
        const j = entero(0, i);
        [copia[i], copia[j]] = [copia[j], copia[i]];
      }
      return copia;
    },
  };
}
```

- [ ] **Paso 4: Ejecutar y verificar**

Ejecuta: `pnpm test aleatorio`
Esperado: PASAN los 8 tests.

- [ ] **Paso 5: Implementar el cargador masivo**

`scripts/seed/cargador.ts`:

```ts
import { Client } from "pg";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

/**
 * Inserción masiva por COPY.
 *
 * A 30.000 designaciones la diferencia contra la API REST es de minutos
 * contra horas, y contra INSERT fila a fila es de segundos contra minutos.
 *
 * Se conecta por el pooler de sesión: la conexión directa a
 * db.<ref>.supabase.co es IPv6 y no resuelve desde redes domésticas.
 */
export function conectar(): Client {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) throw new Error("Falta la variable de entorno SUPABASE_DB_URL");
  return new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
}

/** Escapa un valor al formato de texto de COPY. */
function escapar(valor: unknown): string {
  if (valor === null || valor === undefined) return "\\N";
  if (valor instanceof Date) return valor.toISOString();
  if (typeof valor === "boolean") return valor ? "t" : "f";
  return String(valor)
    .replace(/\\/g, "\\\\")
    .replace(/\t/g, "\\t")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
}

export async function cargar(
  cliente: Client,
  tabla: string,
  columnas: readonly string[],
  filas: readonly unknown[][],
  tamanoLote = 5000,
): Promise<number> {
  if (filas.length === 0) return 0;
  const { from } = await import("pg-copy-streams");
  let insertadas = 0;

  for (let i = 0; i < filas.length; i += tamanoLote) {
    const lote = filas.slice(i, i + tamanoLote);
    const flujo = cliente.query(
      from(`COPY ${tabla} (${columnas.join(", ")}) FROM STDIN`),
    );
    const texto = `${lote.map((f) => f.map(escapar).join("\t")).join("\n")}\n`;
    await new Promise<void>((resolver, rechazar) => {
      flujo.on("finish", resolver);
      flujo.on("error", rechazar);
      flujo.write(texto);
      flujo.end();
    });
    insertadas += lote.length;
  }
  return insertadas;
}
```

- [ ] **Paso 6: Instalar la dependencia del COPY**

```bash
pnpm add -D pg-copy-streams @types/pg-copy-streams
```

- [ ] **Paso 7: Verificar que el cargador funciona contra la base real**

Crea un script temporal fuera del repo que conecte, cree una tabla `prueba_carga (a int, b text)`, cargue 3 filas con `cargar()`, las lea y borre la tabla. Confirma que devuelve 3 y que los valores coinciden, incluido un texto con tabulador y otro nulo.

Esperado: 3 filas insertadas, valores intactos, tabla eliminada al final.

- [ ] **Paso 8: Escribir el contexto de la tarea**

Crea `docs/superpowers/contexto/plan-2/tarea-1-contexto.md` siguiendo la estructura del contrato de contexto de las restricciones globales. En "Contrato que exponen estos archivos" incluye las firmas exactas de `crearAleatorio`, `Aleatorio`, `conectar` y `cargar`, porque **todas las tareas siguientes las consumen**.

- [ ] **Paso 9: Commit**

```bash
pnpm lint
git add scripts/seed package.json pnpm-lock.yaml docs/superpowers/contexto
git commit -m "Generador determinista y cargador masivo por COPY"
```

---

## Tarea 2: Las plantas

**Archivos:**
- Crear: `scripts/seed/plantas.ts`, `scripts/seed/plantas.test.ts`
- Crear: `docs/superpowers/contexto/plan-2/tarea-2-contexto.md`

**Interfaces:**
- Consume: nada (datos fijos).
- Produce: `PLANTAS: readonly PlantaSemilla[]` y `filasPlantas(): unknown[][]`.

**Nota de origen — importante para la honestidad del demo.** La minuta del 22 de julio, que contenía los horarios reales de las ventanas por planta, **no está disponible**. Esta configuración es **inventada**, coherente con lo único que la Propuesta Integral afirma: ventanas *"concentradas en actualizaciones nocturnas de Europa, de entre 2 y 2.5 horas, que coinciden con el horario pico en México"*, y que Bélgica tiene un horario que varía. Los códigos PDIV son sintéticos (`P1xx` Europa, `P2xx` Asia, `P3xx` América) y no corresponden a ninguna planta real de SKF. Debe quedar anotado en el contexto de la tarea y en el guion del demo.

`ventana_inicio_min` son minutos desde medianoche **hora de México**. 12:30 = 750.

- [ ] **Paso 1: Escribir el test que falle**

`scripts/seed/plantas.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { PLANTAS, filasPlantas } from "./plantas";

describe("catalogo de plantas", () => {
  it("tiene 18 plantas con pdiv unico", () => {
    expect(PLANTAS).toHaveLength(18);
    expect(new Set(PLANTAS.map((p) => p.pdiv)).size).toBe(18);
  });

  it("ninguna ventana dura menos de 2 h ni mas de 2.5 h", () => {
    for (const p of PLANTAS) {
      expect(p.ventana_duracion_min).toBeGreaterThanOrEqual(120);
      expect(p.ventana_duracion_min).toBeLessThanOrEqual(150);
    }
  });

  it("la mayoria de las plantas europeas abre su ventana en el pico de Mexico", () => {
    const europeas = PLANTAS.filter((p) => p.pdiv.startsWith("P1"));
    const enPico = europeas.filter(
      (p) => p.ventana_inicio_min >= 720 && p.ventana_inicio_min <= 900,
    );
    expect(europeas.length).toBeGreaterThanOrEqual(8);
    expect(enPico.length / europeas.length).toBeGreaterThan(0.7);
  });

  it("exactamente una planta tiene ventana de inicio variable", () => {
    const variables = PLANTAS.filter((p) => p.ventana_variabilidad_min > 0);
    expect(variables).toHaveLength(1);
    expect(variables[0].pais).toBe("Bélgica");
    expect(variables[0].ventana_variabilidad_min).toBeGreaterThanOrEqual(60);
  });

  it("al menos dos plantas no son cotizables, para ejercer el punto 4.5b", () => {
    const noCotizables = PLANTAS.filter((p) => !p.tiene_conexion || !p.tiene_ruta_embarque);
    expect(noCotizables.length).toBeGreaterThanOrEqual(2);
  });

  it("hay al menos una sin conexion y al menos una sin ruta de embarque", () => {
    expect(PLANTAS.some((p) => !p.tiene_conexion)).toBe(true);
    expect(PLANTAS.some((p) => !p.tiene_ruta_embarque)).toBe(true);
  });

  it("el desempeno de TE es siempre positivo", () => {
    for (const p of PLANTAS) expect(p.desempeno_te).toBeGreaterThan(0);
  });

  it("filasPlantas produce una fila por planta con 11 columnas", () => {
    const filas = filasPlantas();
    expect(filas).toHaveLength(18);
    for (const f of filas) expect(f).toHaveLength(11);
  });
});
```

- [ ] **Paso 2: Ejecutar y ver el fallo**

Ejecuta: `pnpm test plantas`
Esperado: FALLA — no existe `./plantas`.

- [ ] **Paso 3: Implementar**

`scripts/seed/plantas.ts`:

```ts
/**
 * Catálogo de plantas (PDIV).
 *
 * ORIGEN DE LOS DATOS — leer antes de presentar: la minuta del 22/07/2026 con
 * los horarios reales de las ventanas de mantenimiento no está disponible.
 * Esta configuración es INVENTADA y solo respeta lo que la Propuesta Integral
 * afirma: ventanas concentradas en las actualizaciones nocturnas de Europa, de
 * 2 a 2.5 h, coincidentes con el horario pico de México, y una planta belga
 * cuyo horario varía. Los códigos PDIV son sintéticos y no corresponden a
 * ninguna planta real de SKF.
 *
 * ventana_inicio_min: minutos desde medianoche, hora de México. 12:30 = 750.
 */
export interface PlantaSemilla {
  pdiv: string;
  nombre: string;
  pais: string;
  com: string;
  huso: string;
  tiene_conexion: boolean;
  tiene_ruta_embarque: boolean;
  ventana_inicio_min: number;
  ventana_duracion_min: number;
  ventana_variabilidad_min: number;
  desempeno_te: number;
}

export const PLANTAS: readonly PlantaSemilla[] = [
  // ── Europa: el grueso, con ventana en el pico de México ──────────────────
  { pdiv: "P101", nombre: "Planta Norte 1", pais: "Alemania", com: "DE", huso: "Europe/Berlin",     tiene_conexion: true,  tiene_ruta_embarque: true,  ventana_inicio_min: 750, ventana_duracion_min: 130, ventana_variabilidad_min: 0,   desempeno_te: 1.00 },
  { pdiv: "P102", nombre: "Planta Norte 2", pais: "Alemania", com: "DE", huso: "Europe/Berlin",     tiene_conexion: true,  tiene_ruta_embarque: true,  ventana_inicio_min: 765, ventana_duracion_min: 120, ventana_variabilidad_min: 0,   desempeno_te: 0.95 },
  { pdiv: "P103", nombre: "Planta Central",  pais: "Bélgica",  com: "BE", huso: "Europe/Brussels",   tiene_conexion: true,  tiene_ruta_embarque: true,  ventana_inicio_min: 735, ventana_duracion_min: 150, ventana_variabilidad_min: 120, desempeno_te: 1.15 },
  { pdiv: "P104", nombre: "Planta Sur 1",    pais: "Italia",   com: "IT", huso: "Europe/Rome",       tiene_conexion: true,  tiene_ruta_embarque: true,  ventana_inicio_min: 780, ventana_duracion_min: 125, ventana_variabilidad_min: 0,   desempeno_te: 1.05 },
  { pdiv: "P105", nombre: "Planta Sur 2",    pais: "España",   com: "ES", huso: "Europe/Madrid",     tiene_conexion: true,  tiene_ruta_embarque: true,  ventana_inicio_min: 795, ventana_duracion_min: 120, ventana_variabilidad_min: 0,   desempeno_te: 1.10 },
  { pdiv: "P106", nombre: "Planta Este 1",   pais: "Polonia",  com: "PL", huso: "Europe/Warsaw",     tiene_conexion: true,  tiene_ruta_embarque: true,  ventana_inicio_min: 740, ventana_duracion_min: 140, ventana_variabilidad_min: 0,   desempeno_te: 1.20 },
  { pdiv: "P107", nombre: "Planta Este 2",   pais: "Chequia",  com: "CZ", huso: "Europe/Prague",     tiene_conexion: true,  tiene_ruta_embarque: true,  ventana_inicio_min: 755, ventana_duracion_min: 135, ventana_variabilidad_min: 0,   desempeno_te: 1.08 },
  { pdiv: "P108", nombre: "Planta Nórdica",  pais: "Suecia",   com: "SE", huso: "Europe/Stockholm",  tiene_conexion: true,  tiene_ruta_embarque: true,  ventana_inicio_min: 725, ventana_duracion_min: 120, ventana_variabilidad_min: 0,   desempeno_te: 0.90 },
  { pdiv: "P109", nombre: "Planta Oeste",    pais: "Francia",  com: "FR", huso: "Europe/Paris",      tiene_conexion: true,  tiene_ruta_embarque: true,  ventana_inicio_min: 810, ventana_duracion_min: 130, ventana_variabilidad_min: 0,   desempeno_te: 1.12 },
  // Sin ruta de embarque: ejercita el punto 4.5b aunque la conexión exista.
  { pdiv: "P110", nombre: "Planta Alpina",   pais: "Austria",  com: "AT", huso: "Europe/Vienna",     tiene_conexion: true,  tiene_ruta_embarque: false, ventana_inicio_min: 770, ventana_duracion_min: 120, ventana_variabilidad_min: 0,   desempeno_te: 1.30 },

  // ── Asia ─────────────────────────────────────────────────────────────────
  { pdiv: "P201", nombre: "Planta Oriental 1", pais: "China",  com: "CN", huso: "Asia/Shanghai",     tiene_conexion: true,  tiene_ruta_embarque: true,  ventana_inicio_min: 300, ventana_duracion_min: 140, ventana_variabilidad_min: 0,   desempeno_te: 1.45 },
  { pdiv: "P202", nombre: "Planta Oriental 2", pais: "China",  com: "CN", huso: "Asia/Shanghai",     tiene_conexion: true,  tiene_ruta_embarque: true,  ventana_inicio_min: 315, ventana_duracion_min: 130, ventana_variabilidad_min: 0,   desempeno_te: 1.50 },
  { pdiv: "P203", nombre: "Planta Índica",     pais: "India",  com: "IN", huso: "Asia/Kolkata",      tiene_conexion: true,  tiene_ruta_embarque: true,  ventana_inicio_min: 360, ventana_duracion_min: 150, ventana_variabilidad_min: 0,   desempeno_te: 1.40 },
  // Sin conexión: el otro caso del 4.5b.
  { pdiv: "P204", nombre: "Planta Sudeste",    pais: "Tailandia", com: "TH", huso: "Asia/Bangkok",   tiene_conexion: false, tiene_ruta_embarque: true,  ventana_inicio_min: 330, ventana_duracion_min: 120, ventana_variabilidad_min: 0,   desempeno_te: 1.60 },

  // ── América ──────────────────────────────────────────────────────────────
  { pdiv: "P301", nombre: "Planta Local 1",    pais: "México", com: "MX", huso: "America/Mexico_City", tiene_conexion: true, tiene_ruta_embarque: true, ventana_inicio_min: 60,  ventana_duracion_min: 120, ventana_variabilidad_min: 0,   desempeno_te: 0.70 },
  { pdiv: "P302", nombre: "Planta Local 2",    pais: "México", com: "MX", huso: "America/Monterrey",   tiene_conexion: true, tiene_ruta_embarque: true, ventana_inicio_min: 75,  ventana_duracion_min: 120, ventana_variabilidad_min: 0,   desempeno_te: 0.75 },
  { pdiv: "P303", nombre: "Planta Norteña",    pais: "Estados Unidos", com: "US", huso: "America/Chicago", tiene_conexion: true, tiene_ruta_embarque: true, ventana_inicio_min: 120, ventana_duracion_min: 125, ventana_variabilidad_min: 0, desempeno_te: 0.85 },
  { pdiv: "P304", nombre: "Planta Austral",    pais: "Brasil", com: "BR", huso: "America/Sao_Paulo",   tiene_conexion: true, tiene_ruta_embarque: true, ventana_inicio_min: 180, ventana_duracion_min: 135, ventana_variabilidad_min: 0,   desempeno_te: 1.25 },
] as const;

export const COLUMNAS_PLANTAS = [
  "pdiv", "nombre", "pais", "com", "huso",
  "tiene_conexion", "tiene_ruta_embarque",
  "ventana_inicio_min", "ventana_duracion_min", "ventana_variabilidad_min",
  "desempeno_te",
] as const;

export function filasPlantas(): unknown[][] {
  return PLANTAS.map((p) => [
    p.pdiv, p.nombre, p.pais, p.com, p.huso,
    p.tiene_conexion, p.tiene_ruta_embarque,
    p.ventana_inicio_min, p.ventana_duracion_min, p.ventana_variabilidad_min,
    p.desempeno_te,
  ]);
}
```

- [ ] **Paso 4: Ejecutar y verificar**

Ejecuta: `pnpm test plantas`
Esperado: PASAN los 8 tests.

- [ ] **Paso 5: Escribir el contexto**

Crea `docs/superpowers/contexto/plan-2/tarea-2-contexto.md`. **En "Decisiones tomadas y por qué" tiene que quedar escrito que la configuración de ventanas es inventada por ausencia de la minuta del 22/07**, con el detalle de qué sí respeta de la propuesta. Es un dato que el presentador necesita conocer para no afirmar algo falso delante del cliente.

- [ ] **Paso 6: Commit**

```bash
pnpm lint
git add scripts/seed/plantas.ts scripts/seed/plantas.test.ts docs/superpowers/contexto
git commit -m "Catalogo de 18 plantas con ventanas de mantenimiento"
```

---

## Tarea 3: Nomenclatura de designaciones

**Archivos:**
- Crear: `scripts/seed/nomenclatura.ts`, `scripts/seed/nomenclatura.test.ts`
- Crear: `docs/superpowers/contexto/plan-2/tarea-3-contexto.md`

**Interfaces:**
- Consume: `Aleatorio` de `./aleatorio`.
- Produce:
  - `FAMILIAS: readonly Familia[]`
  - `generarDesignaciones(a: Aleatorio, cantidad: number): DesignacionBase[]`
  - `DesignacionBase = { designacion, descripcion, familia, segmento }`

**Nota de diseño — de aquí nace la verosimilitud del demo.** Los sufijos deben seguir patrones **públicos** de nomenclatura de rodamientos, porque de ahí nacen los errores de tipeo creíbles: un cliente que escribe `6205-2RSH` en vez de `6205-2RSH/C3` es exactamente el caso truncado del guion. Un catálogo de códigos aleatorios no produce ese efecto.

Codificación del diámetro interior, estándar público: `00` = 10 mm, `01` = 12 mm, `02` = 15 mm, `03` = 17 mm, y de `04` en adelante el código × 5 mm.

- [ ] **Paso 1: Escribir el test que falle**

`scripts/seed/nomenclatura.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { crearAleatorio } from "./aleatorio";
import { FAMILIAS, diametroInterior, generarDesignaciones } from "./nomenclatura";

describe("codificacion del diametro interior", () => {
  it("respeta los cuatro codigos especiales", () => {
    expect(diametroInterior("00")).toBe(10);
    expect(diametroInterior("01")).toBe(12);
    expect(diametroInterior("02")).toBe(15);
    expect(diametroInterior("03")).toBe(17);
  });

  it("de 04 en adelante multiplica por 5", () => {
    expect(diametroInterior("04")).toBe(20);
    expect(diametroInterior("05")).toBe(25);
    expect(diametroInterior("20")).toBe(100);
  });
});

describe("familias", () => {
  it("cubre al menos 7 familias", () => {
    expect(FAMILIAS.length).toBeGreaterThanOrEqual(7);
  });

  it("al menos una familia es de transmision de potencia", () => {
    expect(FAMILIAS.some((f) => f.segmento === "power_transmission")).toBe(true);
  });
});

describe("generacion", () => {
  it("produce la cantidad pedida sin designaciones repetidas", () => {
    const d = generarDesignaciones(crearAleatorio(20260803), 5000);
    expect(d).toHaveLength(5000);
    expect(new Set(d.map((x) => x.designacion)).size).toBe(5000);
  });

  it("es determinista con la misma semilla", () => {
    const a = generarDesignaciones(crearAleatorio(42), 300);
    const b = generarDesignaciones(crearAleatorio(42), 300);
    expect(a).toEqual(b);
  });

  it("toda designacion tiene descripcion no vacia y familia conocida", () => {
    const nombres = new Set(FAMILIAS.map((f) => f.nombre));
    for (const x of generarDesignaciones(crearAleatorio(9), 500)) {
      expect(x.descripcion.length).toBeGreaterThan(10);
      expect(nombres.has(x.familia)).toBe(true);
    }
  });

  it("genera designaciones con sufijo y sin sufijo, para que existan truncamientos verosimiles", () => {
    const d = generarDesignaciones(crearAleatorio(4), 2000);
    const conSufijo = d.filter((x) => /[-/]/.test(x.designacion));
    expect(conSufijo.length).toBeGreaterThan(200);
    expect(conSufijo.length).toBeLessThan(d.length);
  });

  it("existen pares donde una designacion es prefijo de otra (el caso del copiado truncado)", () => {
    const d = generarDesignaciones(crearAleatorio(20260803), 5000);
    const codigos = d.map((x) => x.designacion);
    const conjunto = new Set(codigos);
    const prefijos = codigos.filter((c) => {
      for (const otro of conjunto) if (otro !== c && otro.startsWith(c)) return true;
      return false;
    });
    expect(prefijos.length).toBeGreaterThan(50);
  });

  it("la proporcion de transmision de potencia esta entre 8% y 25%", () => {
    const d = generarDesignaciones(crearAleatorio(20260803), 5000);
    const pt = d.filter((x) => x.segmento === "power_transmission").length / d.length;
    expect(pt).toBeGreaterThan(0.08);
    expect(pt).toBeLessThan(0.25);
  });
});
```

- [ ] **Paso 2: Ejecutar y ver el fallo**

Ejecuta: `pnpm test nomenclatura`
Esperado: FALLA — no existe `./nomenclatura`.

- [ ] **Paso 3: Implementar**

`scripts/seed/nomenclatura.ts`:

```ts
import type { Aleatorio } from "./aleatorio";

export type Segmento = "rodamiento" | "power_transmission";

export interface Familia {
  nombre: string;
  segmento: Segmento;
  /** Prefijos de serie. Cadena vacía significa que la serie va sin prefijo. */
  prefijos: readonly string[];
  /** Series numéricas que anteceden al código de diámetro. */
  series: readonly string[];
  /** Sufijos técnicos posibles. Cadena vacía = designación base sin sufijo. */
  sufijos: readonly string[];
  /** Peso relativo en el catálogo. */
  peso: number;
  descripcionBase: string;
}

/**
 * Codificación pública del diámetro interior de un rodamiento.
 * 00 = 10 mm, 01 = 12 mm, 02 = 15 mm, 03 = 17 mm; de 04 en adelante, × 5 mm.
 */
export function diametroInterior(codigo: string): number {
  const especiales: Record<string, number> = { "00": 10, "01": 12, "02": 15, "03": 17 };
  return especiales[codigo] ?? Number(codigo) * 5;
}

export const FAMILIAS: readonly Familia[] = [
  {
    nombre: "Rodamiento rígido de bolas",
    segmento: "rodamiento",
    prefijos: [""],
    series: ["60", "62", "63", "64", "160", "618", "619", "622", "623"],
    sufijos: ["", "-2Z", "-2RS1", "-2RSH", "-RS1", "-Z", "/C3", "/C4", "-2Z/C3", "-2RS1/C3", "-2RSH/C3", "/W64"],
    peso: 32,
    descripcionBase: "Rodamiento rígido de bolas, una hilera",
  },
  {
    nombre: "Rodamiento de rodillos cónicos",
    segmento: "rodamiento",
    prefijos: [""],
    series: ["302", "303", "320", "322", "323", "329", "330", "331", "332"],
    sufijos: ["", "/Q", "/DF", "/DB", "/C3"],
    peso: 14,
    descripcionBase: "Rodamiento de rodillos cónicos, una hilera",
  },
  {
    nombre: "Rodamiento de rodillos a rótula",
    segmento: "rodamiento",
    prefijos: [""],
    series: ["222", "223", "230", "231", "232", "240", "241"],
    sufijos: ["", " E", " CC/W33", " CCK/W33", " E/C3", " EK"],
    peso: 12,
    descripcionBase: "Rodamiento de rodillos a rótula, dos hileras",
  },
  {
    nombre: "Rodamiento de rodillos cilíndricos",
    segmento: "rodamiento",
    prefijos: ["NU", "NJ", "NUP", "N", "NCF"],
    series: ["2", "3", "4", "10", "22", "23"],
    sufijos: ["", " ECP", " ECJ", " ECML", "/C3"],
    peso: 12,
    descripcionBase: "Rodamiento de rodillos cilíndricos",
  },
  {
    nombre: "Rodamiento de bolas a rótula",
    segmento: "rodamiento",
    prefijos: [""],
    series: ["12", "13", "22", "23"],
    sufijos: ["", " K", " ETN9", " K/C3"],
    peso: 6,
    descripcionBase: "Rodamiento de bolas a rótula, dos hileras",
  },
  {
    nombre: "Rodamiento de agujas",
    segmento: "rodamiento",
    prefijos: ["HK", "BK", "NA", "NKI", "NK"],
    series: ["", "48", "49", "69"],
    sufijos: ["", " TN", "/C3"],
    peso: 6,
    descripcionBase: "Rodamiento de agujas",
  },
  {
    nombre: "Unidad de rodamiento",
    segmento: "rodamiento",
    prefijos: ["YAR", "YET", "YEL", "SY", "SYJ", "FY", "FYJ"],
    series: [""],
    sufijos: ["", "-2F", " TF", " M", " WF", "-2RF/HV"],
    peso: 8,
    descripcionBase: "Unidad de rodamiento con soporte",
  },
  {
    nombre: "Sello radial",
    segmento: "rodamiento",
    prefijos: ["HMSA10", "HMS5", "CR"],
    series: [""],
    sufijos: ["", " RG", " V", " R"],
    peso: 3,
    descripcionBase: "Sello radial de eje",
  },
  {
    nombre: "Transmisión de potencia",
    segmento: "power_transmission",
    prefijos: ["PHE", "PHG", "PHC"],
    series: ["XPZ", "SPA", "SPB", "CH", "TB"],
    sufijos: ["", "-A", "-B", "-SD"],
    peso: 7,
    descripcionBase: "Componente de transmisión de potencia",
  },
] as const;

export interface DesignacionBase {
  designacion: string;
  descripcion: string;
  familia: string;
  segmento: Segmento;
}

/**
 * Genera el catálogo combinatoriamente.
 *
 * La clave está en que los sufijos sigan patrones reales: de ahí nacen los
 * errores de captura verosímiles del guion (un cliente que copia `6205-2RSH`
 * desde Word y pierde el `/C3` final). Un catálogo de códigos aleatorios no
 * produciría ese efecto.
 */
export function generarDesignaciones(a: Aleatorio, cantidad: number): DesignacionBase[] {
  const pesos = FAMILIAS.map((f) => [f, f.peso] as const);
  const vistas = new Set<string>();
  const salida: DesignacionBase[] = [];
  let intentos = 0;

  while (salida.length < cantidad && intentos < cantidad * 200) {
    intentos++;
    const familia = a.elegirPonderado(pesos);
    const prefijo = a.elegir(familia.prefijos);
    const serie = a.elegir(familia.series);
    const codigoDiametro = String(a.entero(0, 48)).padStart(2, "0");
    const sufijo = a.elegir(familia.sufijos);

    const separador = prefijo && !serie ? " " : "";
    const designacion = `${prefijo}${separador}${serie}${codigoDiametro}${sufijo}`.trim();
    if (vistas.has(designacion)) continue;
    vistas.add(designacion);

    const mm = diametroInterior(codigoDiametro);
    salida.push({
      designacion,
      descripcion: `${familia.descripcionBase}, diámetro interior ${mm} mm`,
      familia: familia.nombre,
      segmento: familia.segmento,
    });
  }

  if (salida.length < cantidad) {
    throw new Error(
      `Solo se generaron ${salida.length} designaciones únicas de ${cantidad} pedidas. ` +
        "Amplía las series o los sufijos de FAMILIAS.",
    );
  }
  return salida;
}
```

- [ ] **Paso 4: Ejecutar y verificar**

Ejecuta: `pnpm test nomenclatura`
Esperado: PASAN los 10 tests.

Si el test de prefijos falla por no encontrar suficientes pares, **no bajes el umbral**: significa que la combinatoria produce pocos truncamientos y hay que añadir sufijos a las familias. Ese caso es la escena 2 del guion.

- [ ] **Paso 5: Escribir el contexto**

Crea `docs/superpowers/contexto/plan-2/tarea-3-contexto.md`. Incluye en el contrato la firma de `generarDesignaciones` y el tipo `DesignacionBase`, que consume la tarea siguiente.

- [ ] **Paso 6: Commit**

```bash
pnpm lint
git add scripts/seed/nomenclatura.ts scripts/seed/nomenclatura.test.ts docs/superpowers/contexto
git commit -m "Generador combinatorio de designaciones con nomenclatura verosimil"
```

---

## Tarea 4: Clasificación QMS del catálogo

**Archivos:**
- Crear: `scripts/seed/designaciones.ts`, `scripts/seed/designaciones.test.ts`
- Crear: `docs/superpowers/contexto/plan-2/tarea-4-contexto.md`

**Interfaces:**
- Consume: `Aleatorio`, `DesignacionBase` y `generarDesignaciones` de las tareas 1 y 3; `PLANTAS` de la tarea 2.
- Produce:
  - `DesignacionCompleta` — todos los campos de la tabla `designaciones`
  - `generarCatalogo(a: Aleatorio, cantidad: number): DesignacionCompleta[]`
  - `COLUMNAS_DESIGNACIONES`, `filasDesignaciones(catalogo): unknown[][]`

**Distribuciones exigidas** (doc 04 §2 y el estado tras el Plan 1):

| Atributo | Distribución |
|---|---|
| `lcc` | 60% `PLAN`, 35% `NP`, 5% obsoletos (los obsoletos conservan el LCC que tuvieran) |
| `pcc` | `PLAN` → `C`; `NP` → 70% `N`, 30% `P`; obsoleto → `O` |
| `vigente` | `false` si y solo si `pcc = 'O'` — lo exige el CHECK `obsoleto_no_vigente` |
| `fpc` | 75% `1`, 25% `2` |
| `precio_lista` | `FPC 1` → siempre con precio; `FPC 2` → **nulo en el 80%** de los casos (no son productos de línea, no tienen Precio de Lista) |
| `moq` | `PLAN` → casi siempre 1; `NP` → ponderado entre 1, 10, 25, 50 y 100 |
| `pack_quantity` | ponderado entre 1, 5, 10, 20 y 50 |
| `es_nueva_creacion` | ~2% |
| `segmento` | el que traiga la familia |
| `pdiv` | una planta ponderada: las europeas concentran el grueso |

**Nota de diseño:** `reemplazado_por` y `reemplazo_indicado_fabrica` se dejan **nulos aquí** y los rellena la tarea 5, que es la que construye las cadenas de obsolescencia. Esta tarea no puede resolverlos porque necesitaría el catálogo completo antes de terminarlo.

- [ ] **Paso 1: Escribir el test que falle**

`scripts/seed/designaciones.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { crearAleatorio } from "./aleatorio";
import { COLUMNAS_DESIGNACIONES, filasDesignaciones, generarCatalogo } from "./designaciones";
import { PLANTAS } from "./plantas";

const catalogo = generarCatalogo(crearAleatorio(20260803), 6000);

describe("distribuciones del catalogo", () => {
  it("aproximadamente 60% planeados", () => {
    const p = catalogo.filter((d) => d.lcc === "PLAN").length / catalogo.length;
    expect(p).toBeGreaterThan(0.54);
    expect(p).toBeLessThan(0.66);
  });

  it("aproximadamente 5% obsoletos", () => {
    const o = catalogo.filter((d) => d.pcc === "O").length / catalogo.length;
    expect(o).toBeGreaterThan(0.03);
    expect(o).toBeLessThan(0.08);
  });

  it("aproximadamente 25% FPC 2", () => {
    const f = catalogo.filter((d) => d.fpc === "2").length / catalogo.length;
    expect(f).toBeGreaterThan(0.19);
    expect(f).toBeLessThan(0.31);
  });

  it("hay designaciones de nueva creacion, pero pocas", () => {
    const n = catalogo.filter((d) => d.es_nueva_creacion).length / catalogo.length;
    expect(n).toBeGreaterThan(0.005);
    expect(n).toBeLessThan(0.05);
  });
});

describe("coherencia con las restricciones de la base", () => {
  it("obsoleto si y solo si no vigente (CHECK obsoleto_no_vigente)", () => {
    for (const d of catalogo) expect(d.pcc === "O").toBe(d.vigente === false);
  });

  it("moq y pack_quantity son siempre mayores o iguales a 1", () => {
    for (const d of catalogo) {
      expect(d.moq).toBeGreaterThanOrEqual(1);
      expect(d.pack_quantity).toBeGreaterThanOrEqual(1);
    }
  });

  it("todo pdiv referenciado existe en PLANTAS", () => {
    const validos = new Set(PLANTAS.map((p) => p.pdiv));
    for (const d of catalogo) expect(validos.has(d.pdiv)).toBe(true);
  });

  it("los precios existentes son positivos", () => {
    for (const d of catalogo) {
      if (d.precio_lista !== null) expect(d.precio_lista).toBeGreaterThan(0);
    }
  });
});

describe("precio segun FPC", () => {
  it("todo FPC 1 tiene precio de lista", () => {
    for (const d of catalogo.filter((x) => x.fpc === "1")) {
      expect(d.precio_lista).not.toBeNull();
    }
  });

  it("la mayoria de los FPC 2 no tiene precio de lista", () => {
    const fpc2 = catalogo.filter((d) => d.fpc === "2");
    const sinPrecio = fpc2.filter((d) => d.precio_lista === null).length / fpc2.length;
    expect(sinPrecio).toBeGreaterThan(0.7);
  });
});

describe("obsolescencia diferida", () => {
  it("esta tarea deja las cadenas de reemplazo sin resolver", () => {
    for (const d of catalogo) {
      expect(d.reemplazado_por).toBeNull();
      expect(d.reemplazo_indicado_fabrica).toBeNull();
    }
  });
});

describe("determinismo y serializacion", () => {
  it("misma semilla, mismo catalogo", () => {
    expect(generarCatalogo(crearAleatorio(1), 200)).toEqual(
      generarCatalogo(crearAleatorio(1), 200),
    );
  });

  it("filasDesignaciones produce una columna por cada nombre declarado", () => {
    const filas = filasDesignaciones(catalogo.slice(0, 10));
    expect(filas).toHaveLength(10);
    for (const f of filas) expect(f).toHaveLength(COLUMNAS_DESIGNACIONES.length);
  });
});
```

- [ ] **Paso 2: Ejecutar y ver el fallo**

Ejecuta: `pnpm test designaciones`
Esperado: FALLA — no existe `./designaciones`.

- [ ] **Paso 3: Implementar**

`scripts/seed/designaciones.ts`:

```ts
import type { Aleatorio } from "./aleatorio";
import { type DesignacionBase, generarDesignaciones } from "./nomenclatura";
import { PLANTAS } from "./plantas";

export interface DesignacionCompleta extends DesignacionBase {
  pcc: "C" | "P" | "N" | "O";
  lcc: "PLAN" | "NP";
  fpc: "1" | "2";
  pdiv: string;
  moq: number;
  pack_quantity: number;
  precio_lista: number | null;
  vigente: boolean;
  reemplazado_por: string | null;
  reemplazo_indicado_fabrica: string | null;
  es_nueva_creacion: boolean;
}

/** Las europeas concentran el grueso del catálogo, como en la operación real. */
const PESOS_PLANTA = PLANTAS.map(
  (p) => [p.pdiv, p.pdiv.startsWith("P1") ? 6 : p.pdiv.startsWith("P2") ? 3 : 2] as const,
);

/**
 * Aplica la clasificación del procedimiento QMS al catálogo generado.
 *
 * `reemplazado_por` y `reemplazo_indicado_fabrica` quedan nulos: los resuelve
 * la tarea de homólogos, que es la única que ve el catálogo completo.
 */
export function generarCatalogo(a: Aleatorio, cantidad: number): DesignacionCompleta[] {
  return generarDesignaciones(a, cantidad).map((base) => {
    const clase = a.elegirPonderado<"PLAN" | "NP" | "OBSOLETO">([
      ["PLAN", 60],
      ["NP", 35],
      ["OBSOLETO", 5],
    ]);

    const esObsoleto = clase === "OBSOLETO";
    const lcc: "PLAN" | "NP" = esObsoleto
      ? a.elegirPonderado([["PLAN", 40], ["NP", 60]])
      : clase;

    // El CHECK obsoleto_no_vigente exige la bicondicional pcc='O' <=> !vigente.
    const pcc: DesignacionCompleta["pcc"] = esObsoleto
      ? "O"
      : lcc === "PLAN"
        ? "C"
        : a.elegirPonderado([["N", 70], ["P", 30]]);

    const fpc: "1" | "2" = a.elegirPonderado([["1", 75], ["2", 25]]);

    // FPC 2 no son productos de línea: la mayoría no tiene Precio de Lista.
    const tienePrecio = fpc === "1" || a.probabilidad(0.2);
    const precio_lista = tienePrecio ? a.decimal(35, 18500, 2) : null;

    const moq =
      lcc === "PLAN"
        ? a.elegirPonderado([[1, 90], [10, 8], [25, 2]])
        : a.elegirPonderado([[1, 30], [10, 25], [25, 20], [50, 15], [100, 10]]);

    return {
      ...base,
      pcc,
      lcc,
      fpc,
      pdiv: a.elegirPonderado(PESOS_PLANTA),
      moq,
      pack_quantity: a.elegirPonderado([[1, 55], [5, 15], [10, 15], [20, 10], [50, 5]]),
      precio_lista,
      vigente: !esObsoleto,
      reemplazado_por: null,
      reemplazo_indicado_fabrica: null,
      es_nueva_creacion: a.probabilidad(0.02),
    };
  });
}

export const COLUMNAS_DESIGNACIONES = [
  "designacion", "descripcion", "familia", "pcc", "lcc", "fpc", "pdiv",
  "moq", "pack_quantity", "precio_lista", "vigente",
  "reemplazado_por", "reemplazo_indicado_fabrica", "es_nueva_creacion", "segmento",
] as const;

export function filasDesignaciones(catalogo: readonly DesignacionCompleta[]): unknown[][] {
  return catalogo.map((d) => [
    d.designacion, d.descripcion, d.familia, d.pcc, d.lcc, d.fpc, d.pdiv,
    d.moq, d.pack_quantity, d.precio_lista, d.vigente,
    d.reemplazado_por, d.reemplazo_indicado_fabrica, d.es_nueva_creacion, d.segmento,
  ]);
}
```

- [ ] **Paso 4: Ejecutar y verificar**

Ejecuta: `pnpm test designaciones`
Esperado: PASAN los 12 tests.

- [ ] **Paso 5: Escribir el contexto y commitear**

Crea `docs/superpowers/contexto/plan-2/tarea-4-contexto.md`. Deja explícito en "Qué falta / qué NO hace" que las cadenas de obsolescencia quedan sin resolver a propósito.

```bash
pnpm lint
git add scripts/seed/designaciones.ts scripts/seed/designaciones.test.ts docs/superpowers/contexto
git commit -m "Clasificacion QMS del catalogo: PCC, LCC, FPC, MOQ, pack y precio"
```

---

## Tarea 5: Homólogos y cadenas de obsolescencia

**Archivos:**
- Crear: `scripts/seed/homologos.ts`, `scripts/seed/homologos.test.ts`
- Crear: `docs/superpowers/contexto/plan-2/tarea-5-contexto.md`

**Interfaces:**
- Consume: `Aleatorio`, `DesignacionCompleta`.
- Produce:
  - `resolverObsolescencia(a, catalogo): void` — **muta** el catálogo rellenando `reemplazado_por` y `reemplazo_indicado_fabrica`
  - `generarHomologos(a, catalogo): Homologo[]`
  - `COLUMNAS_HOMOLOGOS`, `filasHomologos(homologos): unknown[][]`

**Reparto de los obsoletos** (así quedan representadas las tres salidas del árbol):

| Caso | Proporción | Efecto en el motor |
|---|---|---|
| Reemplazo **en sistema** (`reemplazado_por`) | 55% | Punto 4.6, primer sub-caso: cotiza indicando el cambio |
| Reemplazo **solo indicado por fábrica** (`reemplazo_indicado_fabrica`) | 20% | Punto 4.6, segundo sub-caso: cotiza y exige validar con el Ing. de Ventas |
| Sin reemplazo | 25% | Punto 4.7: declina |

**Las diferencias técnicas son lo que hace funcionar la escena 3 del guion.** Sin ellas la confirmación guiada es un diálogo vacío. Cada homólogo lleva `diferencias` como lista de `{atributo, valor_origen, valor_equivalente}`.

- [ ] **Paso 1: Escribir el test que falle**

`scripts/seed/homologos.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { crearAleatorio } from "./aleatorio";
import { generarCatalogo } from "./designaciones";
import { COLUMNAS_HOMOLOGOS, filasHomologos, generarHomologos, resolverObsolescencia } from "./homologos";

function preparar(semilla = 20260803, n = 6000) {
  const a = crearAleatorio(semilla);
  const catalogo = generarCatalogo(a, n);
  resolverObsolescencia(a, catalogo);
  return { a, catalogo };
}

describe("reparto de los obsoletos", () => {
  it("cubre los tres casos del arbol en proporciones razonables", () => {
    const { catalogo } = preparar();
    const obs = catalogo.filter((d) => d.pcc === "O");
    expect(obs.length).toBeGreaterThan(100);

    const enSistema = obs.filter((d) => d.reemplazado_por !== null).length / obs.length;
    const porFabrica = obs.filter(
      (d) => d.reemplazado_por === null && d.reemplazo_indicado_fabrica !== null,
    ).length / obs.length;
    const sinNada = obs.filter(
      (d) => d.reemplazado_por === null && d.reemplazo_indicado_fabrica === null,
    ).length / obs.length;

    expect(enSistema).toBeGreaterThan(0.45);
    expect(porFabrica).toBeGreaterThan(0.12);
    expect(sinNada).toBeGreaterThan(0.15);
    expect(enSistema + porFabrica + sinNada).toBeCloseTo(1, 5);
  });

  it("ninguna designacion vigente queda marcada como reemplazada", () => {
    const { catalogo } = preparar();
    for (const d of catalogo.filter((x) => x.vigente)) {
      expect(d.reemplazado_por).toBeNull();
      expect(d.reemplazo_indicado_fabrica).toBeNull();
    }
  });

  it("todo reemplazado_por apunta a una designacion existente y vigente", () => {
    const { catalogo } = preparar();
    const vigentes = new Set(catalogo.filter((d) => d.vigente).map((d) => d.designacion));
    for (const d of catalogo.filter((x) => x.reemplazado_por !== null)) {
      expect(vigentes.has(d.reemplazado_por as string)).toBe(true);
    }
  });

  it("reemplazo_indicado_fabrica NO existe en el catalogo, que es justo su razon de ser", () => {
    const { catalogo } = preparar();
    const existentes = new Set(catalogo.map((d) => d.designacion));
    const marcadas = catalogo.filter((d) => d.reemplazo_indicado_fabrica !== null);
    expect(marcadas.length).toBeGreaterThan(20);
    for (const d of marcadas) {
      expect(existentes.has(d.reemplazo_indicado_fabrica as string)).toBe(false);
    }
  });

  it("ninguna designacion tiene los dos tipos de reemplazo a la vez", () => {
    const { catalogo } = preparar();
    for (const d of catalogo) {
      expect(d.reemplazado_por !== null && d.reemplazo_indicado_fabrica !== null).toBe(false);
    }
  });
});

describe("homologos", () => {
  it("genera relaciones entre designaciones existentes, sin reflexivas ni duplicadas", () => {
    const { a, catalogo } = preparar();
    const h = generarHomologos(a, catalogo);
    const existentes = new Set(catalogo.map((d) => d.designacion));
    const pares = new Set<string>();
    expect(h.length).toBeGreaterThan(300);
    for (const r of h) {
      expect(existentes.has(r.origen)).toBe(true);
      expect(existentes.has(r.equivalente)).toBe(true);
      expect(r.origen).not.toBe(r.equivalente);
      const clave = `${r.origen}|${r.equivalente}`;
      expect(pares.has(clave)).toBe(false);
      pares.add(clave);
    }
  });

  it("toda relacion trae motivo y al menos una diferencia tecnica descrita", () => {
    const { a, catalogo } = preparar();
    for (const r of generarHomologos(a, catalogo)) {
      expect(r.motivo.length).toBeGreaterThan(5);
      expect(r.diferencias.length).toBeGreaterThan(0);
      for (const d of r.diferencias) {
        expect(d.atributo.length).toBeGreaterThan(0);
        expect(d.valor_origen).not.toBe(d.valor_equivalente);
      }
    }
  });

  it("los homologos son de la misma familia: una equivalencia entre familias no tendria sentido", () => {
    const { a, catalogo } = preparar();
    const familia = new Map(catalogo.map((d) => [d.designacion, d.familia]));
    for (const r of generarHomologos(a, catalogo)) {
      expect(familia.get(r.origen)).toBe(familia.get(r.equivalente));
    }
  });

  it("filasHomologos serializa las diferencias como JSON", () => {
    const { a, catalogo } = preparar();
    const filas = filasHomologos(generarHomologos(a, catalogo).slice(0, 5));
    for (const f of filas) {
      expect(f).toHaveLength(COLUMNAS_HOMOLOGOS.length);
      expect(() => JSON.parse(f[3] as string)).not.toThrow();
    }
  });
});
```

- [ ] **Paso 2: Ejecutar y ver el fallo**

Ejecuta: `pnpm test homologos`
Esperado: FALLA — no existe `./homologos`.

- [ ] **Paso 3: Implementar**

`scripts/seed/homologos.ts`:

```ts
import type { Aleatorio } from "./aleatorio";
import type { DesignacionCompleta } from "./designaciones";

export interface DiferenciaTecnica {
  atributo: string;
  valor_origen: string;
  valor_equivalente: string;
}

export interface Homologo {
  origen: string;
  equivalente: string;
  motivo: string;
  diferencias: DiferenciaTecnica[];
}

const MOTIVOS = [
  "Mismo dimensional, distinto tipo de sellado",
  "Mismo desempeño, distinta jaula",
  "Misma capacidad de carga, distinto juego interno",
  "Equivalente dimensional de otra planta",
  "Reemplazo por obsolescencia",
] as const;

const ATRIBUTOS: readonly (readonly [string, readonly string[]])[] = [
  ["Sellado", ["Abierto", "2 tapas metálicas (2Z)", "2 sellos de contacto (2RS1)", "1 sello (RS1)"]],
  ["Juego interno", ["Normal (CN)", "Aumentado (C3)", "Muy aumentado (C4)", "Reducido (C2)"]],
  ["Jaula", ["Acero estampado", "Poliamida (TN9)", "Latón mecanizado (M)", "Bronce (MA)"]],
  ["Temperatura máxima", ["+120 °C", "+150 °C", "+200 °C"]],
  ["Velocidad límite", ["11 000 r/min", "15 000 r/min", "19 000 r/min", "24 000 r/min"]],
  ["Lubricación", ["Grasa estándar", "Grasa alta temperatura", "Sin lubricar"]],
] as const;

/**
 * Rellena las cadenas de obsolescencia **mutando** el catálogo.
 *
 * Reparte los obsoletos entre las tres salidas del punto 4 del QMS:
 *   55% con reemplazo en sistema      → 4.6, primer sub-caso
 *   20% con reemplazo solo de fábrica → 4.6, segundo sub-caso
 *   25% sin reemplazo                 → 4.7, se declina
 *
 * El código de `reemplazo_indicado_fabrica` se construye deliberadamente para
 * que NO exista en el catálogo: esa es exactamente su definición según el
 * procedimiento — "no está en sistema, pero la fábrica lo indica".
 */
export function resolverObsolescencia(a: Aleatorio, catalogo: DesignacionCompleta[]): void {
  const vigentesPorFamilia = new Map<string, DesignacionCompleta[]>();
  for (const d of catalogo) {
    if (!d.vigente) continue;
    const lista = vigentesPorFamilia.get(d.familia) ?? [];
    lista.push(d);
    vigentesPorFamilia.set(d.familia, lista);
  }

  const existentes = new Set(catalogo.map((d) => d.designacion));

  for (const d of catalogo) {
    if (d.vigente) continue;
    // Los casos curados traen su obsolescencia decidida a mano y el guion
    // depende de ella. El prefijo DEMO- está reservado justamente para poder
    // excluirlos aquí sin ambigüedad.
    if (d.designacion.startsWith("DEMO-")) continue;
    const caso = a.elegirPonderado<"SISTEMA" | "FABRICA" | "NINGUNO">([
      ["SISTEMA", 55],
      ["FABRICA", 20],
      ["NINGUNO", 25],
    ]);

    if (caso === "SISTEMA") {
      const candidatos = vigentesPorFamilia.get(d.familia);
      if (candidatos && candidatos.length > 0) {
        d.reemplazado_por = a.elegir(candidatos).designacion;
        continue;
      }
      // Sin candidato en su familia, se degrada al caso sin reemplazo.
      continue;
    }

    if (caso === "FABRICA") {
      // Sufijo que no produce ninguna designación del catálogo.
      let propuesto = `${d.designacion}-NS`;
      let intento = 0;
      while (existentes.has(propuesto) && intento < 50) {
        intento++;
        propuesto = `${d.designacion}-NS${intento}`;
      }
      if (!existentes.has(propuesto)) d.reemplazo_indicado_fabrica = propuesto;
    }
  }
}

/**
 * Relaciones de equivalencia dentro de una misma familia.
 *
 * El campo `diferencias` es lo que hace funcionar la confirmación guiada de la
 * escena 3: sin diferencias explícitas el diálogo queda vacío y no evidencia
 * nada.
 */
export function generarHomologos(
  a: Aleatorio,
  catalogo: readonly DesignacionCompleta[],
): Homologo[] {
  const porFamilia = new Map<string, DesignacionCompleta[]>();
  for (const d of catalogo) {
    const lista = porFamilia.get(d.familia) ?? [];
    lista.push(d);
    porFamilia.set(d.familia, lista);
  }

  const salida: Homologo[] = [];
  const pares = new Set<string>();

  for (const [, miembros] of porFamilia) {
    if (miembros.length < 2) continue;
    const cuantos = Math.floor(miembros.length * 0.14);
    for (let i = 0; i < cuantos; i++) {
      const origen = a.elegir(miembros);
      const equivalente = a.elegir(miembros);
      if (origen.designacion === equivalente.designacion) continue;
      const clave = `${origen.designacion}|${equivalente.designacion}`;
      if (pares.has(clave)) continue;
      pares.add(clave);

      const cuantasDiferencias = a.entero(1, 3);
      const atributos = a.barajar(ATRIBUTOS).slice(0, cuantasDiferencias);
      const diferencias: DiferenciaTecnica[] = [];
      for (const [atributo, valores] of atributos) {
        const barajados = a.barajar(valores);
        diferencias.push({
          atributo,
          valor_origen: barajados[0],
          valor_equivalente: barajados[1],
        });
      }

      salida.push({
        origen: origen.designacion,
        equivalente: equivalente.designacion,
        motivo: a.elegir(MOTIVOS),
        diferencias,
      });
    }
  }
  return salida;
}

export const COLUMNAS_HOMOLOGOS = ["origen", "equivalente", "motivo", "diferencias"] as const;

export function filasHomologos(homologos: readonly Homologo[]): unknown[][] {
  return homologos.map((h) => [h.origen, h.equivalente, h.motivo, JSON.stringify(h.diferencias)]);
}
```

- [ ] **Paso 4: Ejecutar y verificar**

Ejecuta: `pnpm test homologos`
Esperado: PASAN los 9 tests.

- [ ] **Paso 5: Escribir el contexto y commitear**

Crea `docs/superpowers/contexto/plan-2/tarea-5-contexto.md`. Deja claro que `resolverObsolescencia` **muta** el catálogo y debe llamarse **antes** de serializar las designaciones, o los reemplazos se pierden.

```bash
pnpm lint
git add scripts/seed/homologos.ts scripts/seed/homologos.test.ts docs/superpowers/contexto
git commit -m "Cadenas de obsolescencia y homologos con diferencias tecnicas"
```

---

## Tarea 6: Inventario por almacén

**Archivos:**
- Crear: `scripts/seed/inventario.ts`, `scripts/seed/inventario.test.ts`
- Crear: `docs/superpowers/contexto/plan-2/tarea-6-contexto.md`

**Interfaces:**
- Produce: `generarInventario(a, catalogo): FilaInventario[]`, `COLUMNAS_INVENTARIO`, `filasInventario(inv)`.

**Regla que hace funcionar el demo:** los planeados tienen stock con frecuencia y los no planeados casi nunca — es justamente lo que dispara la cotización. Si se siembra al revés, el punto 4.1 nunca declina y la escena 2 pierde su fuerza.

La consulta es escalonada: `PS` primario, `SL` secundario, `XX` terciario. Una designación puede tener filas en uno, dos o tres almacenes, nunca dos filas del mismo (la PK compuesta lo impide).

- [ ] **Paso 1: Escribir el test que falle**

`scripts/seed/inventario.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { crearAleatorio } from "./aleatorio";
import { generarCatalogo } from "./designaciones";
import { COLUMNAS_INVENTARIO, filasInventario, generarInventario } from "./inventario";

const a = crearAleatorio(20260803);
const catalogo = generarCatalogo(a, 6000);
const inventario = generarInventario(a, catalogo);

describe("estructura", () => {
  it("no repite el par designacion + almacen (lo impide la PK compuesta)", () => {
    const claves = new Set(inventario.map((i) => `${i.designacion}|${i.almacen}`));
    expect(claves.size).toBe(inventario.length);
  });

  it("solo usa los tres codigos de almacen del procedimiento", () => {
    for (const i of inventario) expect(["PS", "SL", "XX"]).toContain(i.almacen);
  });

  it("toda fila apunta a una designacion del catalogo", () => {
    const existentes = new Set(catalogo.map((d) => d.designacion));
    for (const i of inventario) expect(existentes.has(i.designacion)).toBe(true);
  });

  it("el pdiv dueno coincide con el de la designacion", () => {
    const pdiv = new Map(catalogo.map((d) => [d.designacion, d.pdiv]));
    for (const i of inventario) expect(i.pdiv_dueno).toBe(pdiv.get(i.designacion));
  });

  it("ninguna cantidad es negativa (CHECK cantidad_no_negativa)", () => {
    for (const i of inventario) expect(i.cantidad).toBeGreaterThanOrEqual(0);
  });
});

describe("la regla que dispara la cotizacion", () => {
  it("la gran mayoria de los planeados tiene stock", () => {
    const planeados = catalogo.filter((d) => d.lcc === "PLAN" && d.vigente);
    const conStock = new Set(
      inventario.filter((i) => i.cantidad > 0).map((i) => i.designacion),
    );
    const proporcion = planeados.filter((d) => conStock.has(d.designacion)).length / planeados.length;
    expect(proporcion).toBeGreaterThan(0.8);
  });

  it("la gran mayoria de los no planeados NO tiene stock", () => {
    const noPlaneados = catalogo.filter((d) => d.lcc === "NP" && d.vigente);
    const conStock = new Set(
      inventario.filter((i) => i.cantidad > 0).map((i) => i.designacion),
    );
    const proporcion = noPlaneados.filter((d) => conStock.has(d.designacion)).length / noPlaneados.length;
    expect(proporcion).toBeLessThan(0.2);
  });

  it("el almacen primario concentra mas existencias que el terciario", () => {
    const suma = (alm: string) =>
      inventario.filter((i) => i.almacen === alm).reduce((s, i) => s + i.cantidad, 0);
    expect(suma("PS")).toBeGreaterThan(suma("XX"));
  });
});

describe("serializacion", () => {
  it("filasInventario respeta el numero de columnas", () => {
    for (const f of filasInventario(inventario.slice(0, 10))) {
      expect(f).toHaveLength(COLUMNAS_INVENTARIO.length);
    }
  });
});
```

- [ ] **Paso 2: Ejecutar y ver el fallo**

Ejecuta: `pnpm test inventario`
Esperado: FALLA — no existe `./inventario`.

- [ ] **Paso 3: Implementar**

`scripts/seed/inventario.ts`:

```ts
import type { Aleatorio } from "./aleatorio";
import type { DesignacionCompleta } from "./designaciones";

export interface FilaInventario {
  designacion: string;
  almacen: "PS" | "SL" | "XX";
  cantidad: number;
  pdiv_dueno: string;
}

/**
 * Existencias por almacén, con la consulta escalonada del QMS:
 * PS primario, SL secundario, XX terciario (los dos últimos sujetos a
 * aprobación del Supplier).
 *
 * La regla que hace funcionar el demo: los planeados tienen stock con
 * frecuencia y los no planeados casi nunca. Es lo que dispara la cotización y
 * lo que hace que el punto 4.1 pueda declinar en la escena 2.
 */
export function generarInventario(
  a: Aleatorio,
  catalogo: readonly DesignacionCompleta[],
): FilaInventario[] {
  const salida: FilaInventario[] = [];

  for (const d of catalogo) {
    // Un obsoleto puede conservar saldo, pero rara vez.
    const probabilidadStock = !d.vigente ? 0.15 : d.lcc === "PLAN" ? 0.92 : 0.12;
    if (!a.probabilidad(probabilidadStock)) continue;

    const almacenes: FilaInventario["almacen"][] = ["PS"];
    if (a.probabilidad(0.45)) almacenes.push("SL");
    if (a.probabilidad(0.2)) almacenes.push("XX");

    for (const almacen of almacenes) {
      const base = d.lcc === "PLAN" ? a.entero(40, 4000) : a.entero(1, 120);
      const factor = almacen === "PS" ? 1 : almacen === "SL" ? 0.35 : 0.12;
      salida.push({
        designacion: d.designacion,
        almacen,
        cantidad: Math.max(0, Math.round(base * factor)),
        pdiv_dueno: d.pdiv,
      });
    }
  }
  return salida;
}

export const COLUMNAS_INVENTARIO = ["designacion", "almacen", "cantidad", "pdiv_dueno"] as const;

export function filasInventario(inventario: readonly FilaInventario[]): unknown[][] {
  return inventario.map((i) => [i.designacion, i.almacen, i.cantidad, i.pdiv_dueno]);
}
```

- [ ] **Paso 4: Ejecutar y verificar**

Ejecuta: `pnpm test inventario`
Esperado: PASAN los 9 tests.

- [ ] **Paso 5: Escribir el contexto y commitear**

```bash
pnpm lint
git add scripts/seed/inventario.ts scripts/seed/inventario.test.ts docs/superpowers/contexto
git commit -m "Inventario por almacen con la regla de stock que dispara la cotizacion"
```

---

## Tarea 7: Clientes y operadores

**Archivos:**
- Crear: `scripts/seed/comercial.ts`, `scripts/seed/comercial.test.ts`
- Crear: `docs/superpowers/contexto/plan-2/tarea-7-contexto.md`

**Interfaces:**
- Produce: `generarClientes(a, cantidad)`, `OPERADORES`, y sus columnas y serializadores.

**Restricción de producto, no cosmética:** los operadores son `CSR 1`, `CSR 2`… **nunca** nombres de personas. Que aparezca el nombre de alguien en una bandeja simulada puede leerse como señalamiento.

Los nombres de cliente se generan con Faker **sembrado** (`faker.seed(...)`) para conservar el determinismo, y deben ser claramente ficticios: razones sociales industriales genéricas.

- [ ] **Paso 1: Escribir el test que falle**

`scripts/seed/comercial.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { crearAleatorio } from "./aleatorio";
import { COLUMNAS_CLIENTES, OPERADORES, filasClientes, filasOperadores, generarClientes } from "./comercial";

describe("operadores", () => {
  it("son codigos CSR, nunca nombres de personas", () => {
    expect(OPERADORES.length).toBeGreaterThanOrEqual(6);
    for (const o of OPERADORES) expect(o.codigo).toMatch(/^CSR \d+$/);
  });

  it("los codigos son unicos", () => {
    expect(new Set(OPERADORES.map((o) => o.codigo)).size).toBe(OPERADORES.length);
  });

  it("filasOperadores produce dos columnas por operador", () => {
    for (const f of filasOperadores()) expect(f).toHaveLength(2);
  });
});

describe("clientes", () => {
  const clientes = generarClientes(crearAleatorio(20260803), 300);

  it("genera la cantidad pedida con nombres unicos", () => {
    expect(clientes).toHaveLength(300);
    expect(new Set(clientes.map((c) => c.nombre)).size).toBe(300);
  });

  it("es determinista con la misma semilla", () => {
    expect(generarClientes(crearAleatorio(5), 40)).toEqual(
      generarClientes(crearAleatorio(5), 40),
    );
  });

  it("el descuento esta siempre dentro de [0, 1] (CHECK clientes_descuento_rango)", () => {
    for (const c of clientes) {
      expect(c.descuento).toBeGreaterThanOrEqual(0);
      expect(c.descuento).toBeLessThanOrEqual(1);
    }
  });

  it("cubre los tres tipos de cliente", () => {
    const tipos = new Set(clientes.map((c) => c.tipo));
    expect(tipos).toEqual(new Set(["AFT", "OEM", "USUARIO_FINAL"]));
  });

  it("hay clientes OEM que no usan WCL, como dice el procedimiento", () => {
    const oem = clientes.filter((c) => c.tipo === "OEM");
    expect(oem.some((c) => !c.usa_wcl)).toBe(true);
  });

  it("los AFT usan WCL en su gran mayoria", () => {
    const aft = clientes.filter((c) => c.tipo === "AFT");
    expect(aft.filter((c) => c.usa_wcl).length / aft.length).toBeGreaterThan(0.9);
  });

  it("filasClientes respeta el numero de columnas", () => {
    for (const f of filasClientes(clientes.slice(0, 5))) {
      expect(f).toHaveLength(COLUMNAS_CLIENTES.length);
    }
  });
});
```

- [ ] **Paso 2: Ejecutar y ver el fallo**

Ejecuta: `pnpm test comercial`
Esperado: FALLA — no existe `./comercial`.

- [ ] **Paso 3: Implementar**

`scripts/seed/comercial.ts`:

```ts
import { faker } from "@faker-js/faker";
import type { Aleatorio } from "./aleatorio";

export interface Operador {
  codigo: string;
  activo: boolean;
}

/**
 * Operadores de Customer Service.
 *
 * RESTRICCIÓN DE PRODUCTO: son códigos, nunca nombres de personas. Que
 * aparezca el nombre de alguien real en una bandeja simulada puede leerse
 * como señalamiento.
 */
export const OPERADORES: readonly Operador[] = [
  { codigo: "CSR 1", activo: true },
  { codigo: "CSR 2", activo: true },
  { codigo: "CSR 3", activo: true },
  { codigo: "CSR 4", activo: true },
  { codigo: "CSR 5", activo: true },
  { codigo: "CSR 6", activo: true },
  { codigo: "CSR 7", activo: false },
  { codigo: "CSR 8", activo: true },
] as const;

export interface Cliente {
  nombre: string;
  tipo: "AFT" | "OEM" | "USUARIO_FINAL";
  descuento: number;
  usa_wcl: boolean;
}

const GIROS = [
  "Industrial", "Manufacturas", "Aceros", "Maquinaria", "Refacciones",
  "Rodamientos", "Transmisiones", "Equipos", "Servicios Mecánicos", "Componentes",
] as const;

const FORMAS = ["S.A. de C.V.", "S. de R.L.", "S.A.P.I. de C.V."] as const;

/**
 * Clientes ficticios. Faker se siembra con la misma semilla para que la
 * generación siga siendo reproducible.
 */
export function generarClientes(a: Aleatorio, cantidad: number): Cliente[] {
  faker.seed(20260803);
  const nombres = new Set<string>();
  const salida: Cliente[] = [];
  let intentos = 0;

  while (salida.length < cantidad && intentos < cantidad * 100) {
    intentos++;
    const nombre = `${faker.company.name()} ${a.elegir(GIROS)} ${a.elegir(FORMAS)}`;
    if (nombres.has(nombre)) continue;
    nombres.add(nombre);

    const tipo = a.elegirPonderado<Cliente["tipo"]>([
      ["AFT", 65],
      ["OEM", 20],
      ["USUARIO_FINAL", 15],
    ]);

    salida.push({
      nombre,
      tipo,
      // Los OEM negocian precio neto; los AFT trabajan sobre lista con descuento.
      descuento: tipo === "OEM" ? a.decimal(0.25, 0.55, 3) : a.decimal(0.05, 0.35, 3),
      // El procedimiento contempla que algunos OEM no usan WCL.
      usa_wcl: tipo === "OEM" ? a.probabilidad(0.55) : a.probabilidad(0.97),
    });
  }

  if (salida.length < cantidad) {
    throw new Error(`Solo se generaron ${salida.length} clientes únicos de ${cantidad}.`);
  }
  return salida;
}

export const COLUMNAS_CLIENTES = ["nombre", "tipo", "descuento", "usa_wcl"] as const;
export const COLUMNAS_OPERADORES = ["codigo", "activo"] as const;

export function filasClientes(clientes: readonly Cliente[]): unknown[][] {
  return clientes.map((c) => [c.nombre, c.tipo, c.descuento, c.usa_wcl]);
}

export function filasOperadores(): unknown[][] {
  return OPERADORES.map((o) => [o.codigo, o.activo]);
}
```

- [ ] **Paso 4: Ejecutar y verificar**

Ejecuta: `pnpm test comercial`
Esperado: PASAN los 11 tests.

- [ ] **Paso 5: Escribir el contexto y commitear**

```bash
pnpm lint
git add scripts/seed/comercial.ts scripts/seed/comercial.test.ts docs/superpowers/contexto
git commit -m "Clientes ficticios y operadores CSR"
```

---

## Tarea 8: Histórico de cotizaciones

**Archivos:**
- Crear: `scripts/seed/cotizaciones.ts`, `scripts/seed/cotizaciones.test.ts`
- Crear: `docs/superpowers/contexto/plan-2/tarea-8-contexto.md`

**Interfaces:**
- Produce: `deformar(a, designacion): string`, `generarCotizaciones(a, catalogo, inventario, numClientes, opciones): Cotizacion[]`, columnas y serializador.

**Es el paso más delicado del plan.** Un histórico aleatorio no sirve: el dashboard tiene que poder *encontrar* los problemas que la propuesta describe. Estos patrones se siembran **deliberadamente**:

1. **Pico en la franja de desconexión.** Una proporción alta de las solicitudes entre las 12:30 y las 15:00, con motivo de declinado `ya_disponible_wcl`. Es el gráfico que cuenta la historia solo.
2. **Designaciones mal ingresadas.** Un subconjunto marcado, con errores de captura verosímiles, que termina en `designacion_invalida`.
3. **Tiempos de respuesta alrededor del SLA.** El QMS fija 4 días hábiles **de promedio**, no como plazo individual: la media debe rondar los 4 días con una cola que lo excede.
4. **Cierre de mes.** Los últimos 5 días hábiles de cada mes las cotizaciones se asignan al equipo OEM — regla literal del procedimiento, y da una estacionalidad creíble.
5. **Estacionalidad ligera**, para que las series no se vean planas.

**Restricciones de la base que el generador debe respetar:** `numero` casa `^\d{4}Q\d{5}$`; `cantidad > 0`; `resultado='cotizada'` exige `te_semanas` **y** `precio`; `resultado='declinada'` exige `motivo_declinado`.

- [ ] **Paso 1: Escribir el test que falle**

`scripts/seed/cotizaciones.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { crearAleatorio } from "./aleatorio";
import { generarCatalogo } from "./designaciones";
import { generarInventario } from "./inventario";
import { COLUMNAS_COTIZACIONES, deformar, filasCotizaciones, generarCotizaciones } from "./cotizaciones";

const a = crearAleatorio(20260803);
const catalogo = generarCatalogo(a, 6000);
const inventario = generarInventario(a, catalogo);
const cotizaciones = generarCotizaciones(a, catalogo, inventario, 300, {
  desde: new Date("2026-02-02T00:00:00Z"),
  hasta: new Date("2026-08-01T00:00:00Z"),
  porDiaHabil: 65,
});

describe("deformacion de designaciones", () => {
  it("siempre devuelve algo distinto del original", () => {
    const al = crearAleatorio(3);
    for (const codigo of ["6205-2RSH/C3", "NU2205 ECP", "22308 CC/W33", "YAR 205-2F"]) {
      for (let i = 0; i < 20; i++) expect(deformar(al, codigo)).not.toBe(codigo);
    }
  });

  it("nunca devuelve cadena vacia", () => {
    const al = crearAleatorio(4);
    for (let i = 0; i < 200; i++) {
      expect(deformar(al, "6205-2RSH/C3").length).toBeGreaterThan(0);
    }
  });

  it("produce truncamientos: alguna deformacion es prefijo del original", () => {
    const al = crearAleatorio(20260803);
    const truncados = Array.from({ length: 300 }, () => deformar(al, "6205-2RSH/C3")).filter(
      (d) => "6205-2RSH/C3".startsWith(d),
    );
    expect(truncados.length).toBeGreaterThan(10);
  });
});

describe("volumen y formato", () => {
  it("genera entre 7000 y 11000 cotizaciones para 6 meses a 65 por dia habil", () => {
    expect(cotizaciones.length).toBeGreaterThan(7000);
    expect(cotizaciones.length).toBeLessThan(11000);
  });

  it("todo numero cumple el formato AAAAQ##### que exige el CHECK", () => {
    for (const c of cotizaciones) expect(c.numero).toMatch(/^\d{4}Q\d{5}$/);
  });

  it("los numeros no se repiten", () => {
    expect(new Set(cotizaciones.map((c) => c.numero)).size).toBe(cotizaciones.length);
  });

  it("toda cantidad es positiva (CHECK cotizaciones_cantidad_positiva)", () => {
    for (const c of cotizaciones) expect(c.cantidad).toBeGreaterThan(0);
  });

  it("no hay solicitudes en sabado ni domingo", () => {
    for (const c of cotizaciones) {
      const dia = c.fecha_solicitud.getUTCDay();
      expect(dia).not.toBe(0);
      expect(dia).not.toBe(6);
    }
  });
});

describe("restricciones de coherencia de la base", () => {
  it("cotizada implica te_semanas y precio no nulos", () => {
    for (const c of cotizaciones.filter((x) => x.resultado === "cotizada")) {
      expect(c.te_semanas).not.toBeNull();
      expect(c.precio).not.toBeNull();
      expect(c.motivo_declinado).toBeNull();
    }
  });

  it("declinada implica motivo no nulo", () => {
    for (const c of cotizaciones.filter((x) => x.resultado === "declinada")) {
      expect(c.motivo_declinado).not.toBeNull();
    }
  });

  it("la fecha de respuesta nunca precede a la de solicitud", () => {
    for (const c of cotizaciones) {
      if (c.fecha_respuesta) {
        expect(c.fecha_respuesta.getTime()).toBeGreaterThanOrEqual(c.fecha_solicitud.getTime());
      }
    }
  });
});

describe("patrones sembrados deliberadamente", () => {
  it("hay un pico visible en la franja de desconexion de 12:30 a 15:00", () => {
    const enFranja = cotizaciones.filter((c) => {
      const min = c.fecha_solicitud.getUTCHours() * 60 + c.fecha_solicitud.getUTCMinutes();
      return min >= 750 && min < 900;
    });
    // La franja son 2.5 h de una jornada de 10 h: sin pico daria ~25%.
    expect(enFranja.length / cotizaciones.length).toBeGreaterThan(0.38);
  });

  it("el pico esta dominado por el motivo 'ya estaba disponible en WCL'", () => {
    const enFranjaDeclinadas = cotizaciones.filter((c) => {
      const min = c.fecha_solicitud.getUTCHours() * 60 + c.fecha_solicitud.getUTCMinutes();
      return min >= 750 && min < 900 && c.resultado === "declinada";
    });
    const yaDisponible = enFranjaDeclinadas.filter((c) => c.motivo_declinado === "ya_disponible_wcl");
    expect(yaDisponible.length / enFranjaDeclinadas.length).toBeGreaterThan(0.5);
  });

  it("hay un volumen sustancial de designaciones mal ingresadas", () => {
    const invalidas = cotizaciones.filter((c) => c.motivo_declinado === "designacion_invalida");
    expect(invalidas.length / cotizaciones.length).toBeGreaterThan(0.1);
  });

  it("las designaciones invalidas no existen en el catalogo, que es el punto 4.8", () => {
    const existentes = new Set(catalogo.map((d) => d.designacion));
    const invalidas = cotizaciones.filter((c) => c.motivo_declinado === "designacion_invalida");
    const fuera = invalidas.filter((c) => !existentes.has(c.designacion));
    expect(fuera.length / invalidas.length).toBeGreaterThan(0.9);
  });

  it("el promedio de respuesta ronda los 4 dias habiles del SLA", () => {
    const atendidas = cotizaciones.filter((c) => c.fecha_respuesta !== null);
    const dias = atendidas.map(
      (c) => ((c.fecha_respuesta as Date).getTime() - c.fecha_solicitud.getTime()) / 86400000,
    );
    const promedio = dias.reduce((s, d) => s + d, 0) / dias.length;
    expect(promedio).toBeGreaterThan(2.5);
    expect(promedio).toBeLessThan(5.5);
  });

  it("existe una cola de casos que exceden el SLA", () => {
    const atendidas = cotizaciones.filter((c) => c.fecha_respuesta !== null);
    const excedidas = atendidas.filter(
      (c) => ((c.fecha_respuesta as Date).getTime() - c.fecha_solicitud.getTime()) / 86400000 > 6,
    );
    expect(excedidas.length / atendidas.length).toBeGreaterThan(0.05);
  });

  it("los cinco ultimos dias habiles del mes se asignan al equipo OEM", () => {
    const cierre = cotizaciones.filter((c) => c.patron === "cierre_mes_oem");
    expect(cierre.length).toBeGreaterThan(200);
  });

  it("cubre los cinco motivos de declinado del arbol", () => {
    const motivos = new Set(
      cotizaciones.filter((c) => c.motivo_declinado).map((c) => c.motivo_declinado),
    );
    expect(motivos.size).toBe(5);
  });
});

describe("determinismo y serializacion", () => {
  it("misma semilla, mismo historico", () => {
    const opciones = {
      desde: new Date("2026-06-01T00:00:00Z"),
      hasta: new Date("2026-06-30T00:00:00Z"),
      porDiaHabil: 10,
    };
    const x = crearAleatorio(9);
    const cat = generarCatalogo(x, 500);
    const inv = generarInventario(x, cat);
    const y = crearAleatorio(9);
    const cat2 = generarCatalogo(y, 500);
    const inv2 = generarInventario(y, cat2);
    expect(generarCotizaciones(crearAleatorio(1), cat, inv, 20, opciones)).toEqual(
      generarCotizaciones(crearAleatorio(1), cat2, inv2, 20, opciones),
    );
  });

  it("filasCotizaciones respeta el numero de columnas", () => {
    for (const f of filasCotizaciones(cotizaciones.slice(0, 10))) {
      expect(f).toHaveLength(COLUMNAS_COTIZACIONES.length);
    }
  });
});
```

- [ ] **Paso 2: Ejecutar y ver el fallo**

Ejecuta: `pnpm test cotizaciones`
Esperado: FALLA — no existe `./cotizaciones`.

- [ ] **Paso 3: Implementar**

`scripts/seed/cotizaciones.ts`:

```ts
import type { Aleatorio } from "./aleatorio";
import type { DesignacionCompleta } from "./designaciones";
import type { FilaInventario } from "./inventario";
import { OPERADORES } from "./comercial";

export type MotivoDeclinado =
  | "ya_disponible_wcl"
  | "moq_mayor"
  | "obsoleto_sin_reemplazo"
  | "designacion_invalida"
  | "planta_sin_ruta";

export interface Cotizacion {
  numero: string;
  cliente_id: number;
  designacion: string;
  cantidad: number;
  fecha_solicitud: Date;
  fecha_respuesta: Date | null;
  operador_id: number | null;
  resultado: "cotizada" | "declinada";
  motivo_declinado: MotivoDeclinado | null;
  te_semanas: number | null;
  precio: number | null;
  patron: string | null;
}

export interface OpcionesHistorico {
  desde: Date;
  hasta: Date;
  porDiaHabil: number;
}

const CONFUSIONES: Record<string, string> = {
  "0": "O", O: "0", "1": "I", I: "1", "5": "S", S: "5", "8": "B", B: "8",
};

/**
 * Introduce un error de captura verosímil.
 *
 * Estos son los errores reales que describe la minuta: caracteres
 * transpuestos, sufijo perdido al copiar desde Word, confusión de caracteres
 * visualmente similares, guiones de más o de menos, y capturas que solo
 * conservan los primeros dígitos de la serie.
 */
export function deformar(a: Aleatorio, designacion: string): string {
  const modos = ["truncar", "transponer", "confundir", "guion", "prefijo"] as const;

  for (let intento = 0; intento < 12; intento++) {
    const modo = a.elegir(modos);
    let salida = designacion;

    if (modo === "truncar" && designacion.length > 4) {
      salida = designacion.slice(0, a.entero(4, designacion.length - 1));
    } else if (modo === "transponer" && designacion.length > 3) {
      const i = a.entero(0, designacion.length - 2);
      const c = designacion.split("");
      [c[i], c[i + 1]] = [c[i + 1], c[i]];
      salida = c.join("");
    } else if (modo === "confundir") {
      const posiciones = [...designacion]
        .map((ch, i) => (CONFUSIONES[ch] ? i : -1))
        .filter((i) => i >= 0);
      if (posiciones.length > 0) {
        const i = a.elegir(posiciones);
        salida = designacion.slice(0, i) + CONFUSIONES[designacion[i]] + designacion.slice(i + 1);
      }
    } else if (modo === "guion") {
      salida = designacion.includes("-")
        ? designacion.replace("-", "")
        : `${designacion.slice(0, 4)}-${designacion.slice(4)}`;
    } else if (modo === "prefijo") {
      const soloDigitos = designacion.match(/^[A-Z]*\s?\d{3,5}/);
      if (soloDigitos) salida = soloDigitos[0];
    }

    if (salida !== designacion && salida.length > 0) return salida;
  }
  // Respaldo determinista: siempre distinto y no vacío.
  return `${designacion.slice(0, Math.max(1, designacion.length - 1))}X`;
}

function esDiaHabil(d: Date): boolean {
  const dia = d.getUTCDay();
  return dia !== 0 && dia !== 6;
}

function diasHabiles(desde: Date, hasta: Date): Date[] {
  const salida: Date[] = [];
  const cursor = new Date(desde.getTime());
  while (cursor < hasta) {
    if (esDiaHabil(cursor)) salida.push(new Date(cursor.getTime()));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return salida;
}

/** Los últimos 5 días hábiles de cada mes: el procedimiento los asigna al equipo OEM. */
function marcarCierreDeMes(dias: readonly Date[]): Set<string> {
  const porMes = new Map<string, Date[]>();
  for (const d of dias) {
    const clave = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    const lista = porMes.get(clave) ?? [];
    lista.push(d);
    porMes.set(clave, lista);
  }
  const cierre = new Set<string>();
  for (const [, lista] of porMes) {
    for (const d of lista.slice(-5)) cierre.add(d.toISOString().slice(0, 10));
  }
  return cierre;
}

export function generarCotizaciones(
  a: Aleatorio,
  catalogo: readonly DesignacionCompleta[],
  inventario: readonly FilaInventario[],
  numClientes: number,
  opciones: OpcionesHistorico,
): Cotizacion[] {
  const stock = new Map<string, number>();
  for (const i of inventario) {
    stock.set(i.designacion, (stock.get(i.designacion) ?? 0) + i.cantidad);
  }

  const dias = diasHabiles(opciones.desde, opciones.hasta);
  const cierre = marcarCierreDeMes(dias);
  const activos = OPERADORES.filter((o) => o.activo);
  const salida: Cotizacion[] = [];
  let consecutivo = 1;

  for (const dia of dias) {
    const claveDia = dia.toISOString().slice(0, 10);
    const esCierre = cierre.has(claveDia);
    // Estacionalidad ligera: el cierre de mes baja el volumen del equipo AFT.
    const cuantas = Math.round(opciones.porDiaHabil * (esCierre ? 0.75 : a.decimal(0.85, 1.15, 2)));

    for (let i = 0; i < cuantas; i++) {
      // El pico de la ventana de desconexión: 12:30 a 15:00 hora de México.
      const enPico = a.probabilidad(0.45);
      // Jornada de 08:00 a 18:00. La franja de pico se solapa a propósito con
      // el tráfico normal: durante la ventana también hay consultas legítimas.
      const minutoDia = enPico ? a.entero(750, 899) : a.entero(480, 1079);
      const fecha_solicitud = new Date(dia.getTime());
      fecha_solicitud.setUTCHours(Math.floor(minutoDia / 60), minutoDia % 60, a.entero(0, 59), 0);

      const d = a.elegir(catalogo);
      const disponible = stock.get(d.designacion) ?? 0;

      let designacion = d.designacion;
      let resultado: Cotizacion["resultado"] = "cotizada";
      let motivo: MotivoDeclinado | null = null;
      let patron: string | null = esCierre ? "cierre_mes_oem" : null;

      // Patrón 2: designaciones mal ingresadas.
      if (a.probabilidad(0.16)) {
        designacion = deformar(a, d.designacion);
        resultado = "declinada";
        motivo = "designacion_invalida";
        patron = patron ?? "designacion_mal_ingresada";
      } else if (enPico && d.lcc === "PLAN" && disponible > 0 && a.probabilidad(0.72)) {
        // Patrón 1: cotización innecesaria durante la ventana de desconexión.
        resultado = "declinada";
        motivo = "ya_disponible_wcl";
        patron = patron ?? "ventana_desconexion";
      } else if (!d.vigente && d.reemplazado_por === null && d.reemplazo_indicado_fabrica === null) {
        resultado = "declinada";
        motivo = "obsoleto_sin_reemplazo";
      } else if (d.pdiv === "P110" || d.pdiv === "P204") {
        // Las dos plantas sin ruta o sin conexión: punto 4.5b.
        resultado = "declinada";
        motivo = "planta_sin_ruta";
      }

      const cantidad = a.elegirPonderado([[a.entero(1, 9), 45], [a.entero(10, 99), 40], [a.entero(100, 2000), 15]]);
      if (resultado === "cotizada" && cantidad < d.moq) {
        resultado = "declinada";
        motivo = "moq_mayor";
      }

      // SLA: 4 días hábiles de PROMEDIO, con cola que lo excede.
      const diasRespuesta = a.probabilidad(0.12) ? a.decimal(6.5, 14, 2) : a.decimal(0.5, 5.5, 2);
      const fecha_respuesta = new Date(fecha_solicitud.getTime() + diasRespuesta * 86400000);

      const cotizada = resultado === "cotizada";
      salida.push({
        numero: `${fecha_solicitud.getUTCFullYear()}Q${String(consecutivo++).padStart(5, "0")}`,
        cliente_id: a.entero(1, numClientes),
        designacion,
        cantidad,
        fecha_solicitud,
        fecha_respuesta,
        operador_id: a.entero(1, activos.length),
        resultado,
        motivo_declinado: cotizada ? null : motivo,
        te_semanas: cotizada ? a.decimal(1, 26, 1) : null,
        precio: cotizada ? (d.precio_lista ?? a.decimal(40, 9000, 2)) : null,
        patron,
      });
    }
  }
  return salida;
}

export const COLUMNAS_COTIZACIONES = [
  "numero", "cliente_id", "designacion", "cantidad",
  "fecha_solicitud", "fecha_respuesta", "operador_id",
  "resultado", "motivo_declinado", "te_semanas", "precio", "patron",
] as const;

export function filasCotizaciones(cotizaciones: readonly Cotizacion[]): unknown[][] {
  return cotizaciones.map((c) => [
    c.numero, c.cliente_id, c.designacion, c.cantidad,
    c.fecha_solicitud, c.fecha_respuesta, c.operador_id,
    c.resultado, c.motivo_declinado, c.te_semanas, c.precio, c.patron,
  ]);
}
```

- [ ] **Paso 4: Ejecutar y verificar**

Ejecuta: `pnpm test cotizaciones`
Esperado: PASAN los 19 tests.

Si algún test de proporción falla por poco, **ajusta las probabilidades del generador, no el umbral del test**. Los umbrales expresan lo que el dashboard necesita para contar la historia; bajarlos vacía el demo.

- [ ] **Paso 5: Escribir el contexto y commitear**

Crea `docs/superpowers/contexto/plan-2/tarea-8-contexto.md`, incluyendo la tabla de los cinco patrones sembrados y qué escena del guion depende de cada uno.

```bash
pnpm lint
git add scripts/seed/cotizaciones.ts scripts/seed/cotizaciones.test.ts docs/superpowers/contexto
git commit -m "Historico de cotizaciones con los cinco patrones sembrados"
```

---

## Tarea 9: Casos curados del guion

**Archivos:**
- Crear: `scripts/seed/casos-curados.ts`, `scripts/seed/casos-curados.test.ts`
- Crear: `docs/superpowers/contexto/plan-2/tarea-9-contexto.md`

**Interfaces:**
- Consume: `resolverObsolescencia` de la tarea 5, **solo en el test** que verifica que los casos curados sobreviven a la resolución de obsolescencia.
- Produce: `CASOS_CURADOS: readonly CasoCurado[]`, `aplicarCasosCurados(catalogo, inventario): void`.

**Por qué existen.** Además del volumen hace falta un puñado de casos que se comporten **exactamente** como el guion necesita. Sin ellos el presentador queda a merced del azar en vivo. Se construyen a mano, con designaciones reservadas que el generador no puede producir, y se **inyectan** en el catálogo.

Un caso por escena, según el doc 04 §4:

| Caso | Designación reservada | Qué debe ocurrir |
|---|---|---|
| Truncada | `DEMO-6205-2RSH/C3` | Escribir `DEMO-6205-2RSH` produce 3 sugerencias claras |
| MOQ superior | `DEMO-MOQ-50` | MOQ 50, precio unitario bajo: declinar 5 piezas es absurdo |
| Pack quantity | `DEMO-PACK-20` | Pack de 20, el cliente pide 25 → se ajusta a 40 |
| Obsoleto con reemplazo | `DEMO-OBS-CON` | Reemplazo en sistema, con diferencias técnicas visibles |
| Obsoleto sin reemplazo | `DEMO-OBS-SIN` | Declinado legítimo: no todo se salva, y eso da credibilidad |
| Reemplazo de fábrica | `DEMO-OBS-FAB` | Segundo sub-caso del 4.6: exige validar con el Ing. de Ventas |
| Planeado con stock en planta desconectada | `DEMO-VENTANA` | Existe y hay stock, pero la planta está en ventana |
| Nueva creación | `DEMO-NUEVA` | +4 semanas de TE del punto 4.9 |
| Transmisión sin stock | `DEMO-PT-PLANNER` | Segmento power_transmission → ruta de consulta al Planner |

- [ ] **Paso 1: Escribir el test que falle**

`scripts/seed/casos-curados.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { crearAleatorio } from "./aleatorio";
import { generarCatalogo } from "./designaciones";
import { generarInventario } from "./inventario";
import { CASOS_CURADOS, aplicarCasosCurados } from "./casos-curados";
import { resolverObsolescencia } from "./homologos";

function preparar() {
  const a = crearAleatorio(20260803);
  const catalogo = generarCatalogo(a, 3000);
  const inventario = generarInventario(a, catalogo);
  aplicarCasosCurados(catalogo, inventario);
  return { catalogo, inventario };
}

describe("insercion de los casos", () => {
  it("hay un caso por escena del guion", () => {
    expect(CASOS_CURADOS.length).toBeGreaterThanOrEqual(9);
  });

  it("todos quedan en el catalogo tras aplicarlos", () => {
    const { catalogo } = preparar();
    const codigos = new Set(catalogo.map((d) => d.designacion));
    for (const c of CASOS_CURADOS) expect(codigos.has(c.designacion.designacion)).toBe(true);
  });

  it("las designaciones reservadas llevan el prefijo DEMO- y no colisionan con el generador", () => {
    const { catalogo } = preparar();
    for (const c of CASOS_CURADOS) expect(c.designacion.designacion).toMatch(/^DEMO-/);
    const generadas = catalogo.filter((d) => !d.designacion.startsWith("DEMO-"));
    for (const d of generadas) expect(d.designacion.startsWith("DEMO-")).toBe(false);
  });

it("NO sobrescribe la obsolescencia de los casos curados", () => {
    // El orquestador aplica los casos curados ANTES de resolver la
    // obsolescencia. Sin la guarda del prefijo DEMO-, este paso reasignaria
    // al azar los reemplazos que el guion necesita fijos, y el demo fallaria
    // en vivo sin que ningun otro test lo detecte.
    const a = crearAleatorio(20260803);
    const catalogo = generarCatalogo(a, 3000);
    const inventario = generarInventario(a, catalogo);
    aplicarCasosCurados(catalogo, inventario);
    resolverObsolescencia(a, catalogo);

    const buscar = (c: string) => catalogo.find((d) => d.designacion === c);
    expect(buscar("DEMO-OBS-CON")?.reemplazado_por).toBe("DEMO-6205-2RSH/C3");
    expect(buscar("DEMO-OBS-SIN")?.reemplazado_por).toBeNull();
    expect(buscar("DEMO-OBS-SIN")?.reemplazo_indicado_fabrica).toBeNull();
    expect(buscar("DEMO-OBS-FAB")?.reemplazo_indicado_fabrica).toBe("DEMO-OBS-FAB-NS");
    expect(buscar("DEMO-OBS-FAB")?.reemplazado_por).toBeNull();
  });

  it("aplicarCasosCurados es idempotente: aplicarlo dos veces no duplica", () => {
    const a = crearAleatorio(1);
    const catalogo = generarCatalogo(a, 1000);
    const inventario = generarInventario(a, catalogo);
    aplicarCasosCurados(catalogo, inventario);
    const tras1 = catalogo.length;
    aplicarCasosCurados(catalogo, inventario);
    expect(catalogo.length).toBe(tras1);
  });
});

describe("cada caso se comporta como exige el guion", () => {
  const { catalogo, inventario } = preparar();
  const buscar = (codigo: string) => catalogo.find((d) => d.designacion === codigo);
  const stockDe = (codigo: string) =>
    inventario.filter((i) => i.designacion === codigo).reduce((s, i) => s + i.cantidad, 0);

  it("el caso truncado tiene al menos 3 designaciones que comparten su prefijo", () => {
    const base = "DEMO-6205-2RSH";
    const coincidencias = catalogo.filter((d) => d.designacion.startsWith(base));
    expect(coincidencias.length).toBeGreaterThanOrEqual(3);
  });

  it("el caso de MOQ tiene MOQ alto y precio unitario bajo", () => {
    const d = buscar("DEMO-MOQ-50");
    expect(d?.moq).toBe(50);
    expect(d?.precio_lista).not.toBeNull();
    expect(d?.precio_lista as number).toBeLessThan(100);
  });

  it("el caso de pack tiene pack de 20", () => {
    expect(buscar("DEMO-PACK-20")?.pack_quantity).toBe(20);
  });

  it("el obsoleto con reemplazo apunta a una designacion vigente del catalogo", () => {
    const d = buscar("DEMO-OBS-CON");
    expect(d?.vigente).toBe(false);
    expect(d?.reemplazado_por).not.toBeNull();
    expect(buscar(d?.reemplazado_por as string)?.vigente).toBe(true);
  });

  it("el obsoleto sin reemplazo no tiene ninguno de los dos campos", () => {
    const d = buscar("DEMO-OBS-SIN");
    expect(d?.vigente).toBe(false);
    expect(d?.reemplazado_por).toBeNull();
    expect(d?.reemplazo_indicado_fabrica).toBeNull();
  });

  it("el reemplazo indicado por fabrica no existe en el catalogo", () => {
    const d = buscar("DEMO-OBS-FAB");
    expect(d?.reemplazado_por).toBeNull();
    expect(d?.reemplazo_indicado_fabrica).not.toBeNull();
    expect(buscar(d?.reemplazo_indicado_fabrica as string)).toBeUndefined();
  });

  it("el caso de ventana es planeado, tiene stock y pertenece a una planta con ventana larga", () => {
    const d = buscar("DEMO-VENTANA");
    expect(d?.lcc).toBe("PLAN");
    expect(d?.vigente).toBe(true);
    expect(stockDe("DEMO-VENTANA")).toBeGreaterThan(0);
    expect(d?.pdiv).toBe("P103");
  });

  it("el caso de nueva creacion esta marcado como tal", () => {
    expect(buscar("DEMO-NUEVA")?.es_nueva_creacion).toBe(true);
  });

  it("el caso de transmision no tiene stock, para que llegue a la consulta al Planner", () => {
    expect(buscar("DEMO-PT-PLANNER")?.segmento).toBe("power_transmission");
    expect(buscar("DEMO-PT-PLANNER")?.lcc).toBe("NP");
    expect(stockDe("DEMO-PT-PLANNER")).toBe(0);
  });
});
```

- [ ] **Paso 2: Ejecutar y ver el fallo**

Ejecuta: `pnpm test casos-curados`
Esperado: FALLA — no existe `./casos-curados`.

- [ ] **Paso 3: Implementar**

`scripts/seed/casos-curados.ts`:

```ts
import type { DesignacionCompleta } from "./designaciones";
import type { FilaInventario } from "./inventario";

export interface CasoCurado {
  clave: string;
  escena: string;
  designacion: DesignacionCompleta;
  /** Existencias a inyectar. Lista vacía = sin stock, deliberadamente. */
  existencias: readonly { almacen: "PS" | "SL" | "XX"; cantidad: number }[];
}

function base(parcial: Partial<DesignacionCompleta> & { designacion: string }): DesignacionCompleta {
  return {
    descripcion: "Caso preparado para la demostración",
    familia: "Rodamiento rígido de bolas",
    segmento: "rodamiento",
    pcc: "C",
    lcc: "PLAN",
    fpc: "1",
    pdiv: "P101",
    moq: 1,
    pack_quantity: 1,
    precio_lista: 250.0,
    vigente: true,
    reemplazado_por: null,
    reemplazo_indicado_fabrica: null,
    es_nueva_creacion: false,
    ...parcial,
  };
}

/**
 * Casos preparados a mano, uno por escena del guion.
 *
 * El prefijo DEMO- está reservado: el generador combinatorio nunca lo produce,
 * así que estos códigos no colisionan y el presentador puede escribirlos con
 * la certeza de que se comportarán igual en cada ensayo y en la presentación.
 */
export const CASOS_CURADOS: readonly CasoCurado[] = [
  // Escena 2 — la designación truncada. Tres variantes comparten prefijo.
  {
    clave: "truncada",
    escena: "2 — validador con designación incompleta",
    designacion: base({
      designacion: "DEMO-6205-2RSH/C3",
      descripcion: "Rodamiento rígido de bolas, 25 mm, sellado ambos lados, juego C3",
    }),
    existencias: [{ almacen: "PS", cantidad: 1200 }, { almacen: "SL", cantidad: 300 }],
  },
  {
    clave: "truncada_alt_1",
    escena: "2 — alternativa cercana",
    designacion: base({
      designacion: "DEMO-6205-2RSH/C4",
      descripcion: "Rodamiento rígido de bolas, 25 mm, sellado ambos lados, juego C4",
    }),
    existencias: [{ almacen: "PS", cantidad: 240 }],
  },
  {
    clave: "truncada_alt_2",
    escena: "2 — alternativa cercana",
    designacion: base({
      designacion: "DEMO-6205-2RSH",
      descripcion: "Rodamiento rígido de bolas, 25 mm, sellado ambos lados, juego normal",
    }),
    existencias: [{ almacen: "PS", cantidad: 860 }],
  },
  // Escena 2 (variante) — MOQ mayor a lo pedido, punto 4.4.
  {
    clave: "moq",
    escena: "2 — aviso de MOQ antes de enviar",
    designacion: base({
      designacion: "DEMO-MOQ-50",
      descripcion: "Rodamiento rígido de bolas, 15 mm, mínimo de orden 50 piezas",
      moq: 50,
      precio_lista: 42.5,
      lcc: "NP",
      pcc: "N",
    }),
    existencias: [],
  },
  // Escena 2 (variante) — pack quantity, punto 4.5a.
  {
    clave: "pack",
    escena: "2 — ajuste por pack quantity",
    designacion: base({
      designacion: "DEMO-PACK-20",
      descripcion: "Rodamiento rígido de bolas, 20 mm, caja de 20 piezas",
      pack_quantity: 20,
      precio_lista: 88.0,
    }),
    existencias: [{ almacen: "PS", cantidad: 600 }],
  },
  // Escena 3 — obsoleto con reemplazo en sistema, punto 4.6 primer sub-caso.
  {
    clave: "obsoleto_con_reemplazo",
    escena: "3 — confirmación guiada de homólogos",
    designacion: base({
      designacion: "DEMO-OBS-CON",
      descripcion: "Rodamiento rígido de bolas, 30 mm, descontinuado",
      pcc: "O",
      vigente: false,
      reemplazado_por: "DEMO-6205-2RSH/C3",
    }),
    existencias: [],
  },
  // Escena 3 — obsoleto sin reemplazo, punto 4.7. El declinado legítimo.
  {
    clave: "obsoleto_sin_reemplazo",
    escena: "3 — declinado legítimo",
    designacion: base({
      designacion: "DEMO-OBS-SIN",
      descripcion: "Rodamiento de rodillos cónicos, 35 mm, descontinuado sin sustituto",
      familia: "Rodamiento de rodillos cónicos",
      pcc: "O",
      vigente: false,
    }),
    existencias: [],
  },
  // Escena 3 — reemplazo que solo indica la fábrica, punto 4.6 segundo sub-caso.
  {
    clave: "obsoleto_reemplazo_fabrica",
    escena: "3 — validar con el Ingeniero de Ventas",
    designacion: base({
      designacion: "DEMO-OBS-FAB",
      descripcion: "Rodamiento de rodillos a rótula, 40 mm, descontinuado",
      familia: "Rodamiento de rodillos a rótula",
      pcc: "O",
      vigente: false,
      reemplazo_indicado_fabrica: "DEMO-OBS-FAB-NS",
    }),
    existencias: [],
  },
  // Escena 4 — el caso clave: existe y hay stock, pero su planta entra en ventana.
  {
    clave: "ventana",
    escena: "4 — ventana de desconexión",
    designacion: base({
      designacion: "DEMO-VENTANA",
      descripcion: "Rodamiento rígido de bolas, 45 mm, planta con ventana amplia",
      pdiv: "P103",
      precio_lista: 615.0,
    }),
    existencias: [{ almacen: "PS", cantidad: 2400 }, { almacen: "SL", cantidad: 800 }],
  },
  // Escena 5 — nueva creación, punto 4.9: +4 semanas de TE.
  {
    clave: "nueva_creacion",
    escena: "5 — estimador con +4 semanas",
    designacion: base({
      designacion: "DEMO-NUEVA",
      descripcion: "Rodamiento de rodillos cilíndricos, 50 mm, de nueva creación",
      familia: "Rodamiento de rodillos cilíndricos",
      lcc: "NP",
      pcc: "N",
      es_nueva_creacion: true,
      fpc: "2",
      precio_lista: null,
    }),
    existencias: [],
  },
  // Punto 4.3 — segmento de transmisión sin stock: se consulta al Planner.
  {
    clave: "transmision_planner",
    escena: "4 — consulta al Planner por segmento",
    designacion: base({
      designacion: "DEMO-PT-PLANNER",
      descripcion: "Componente de transmisión de potencia, sin existencias",
      familia: "Transmisión de potencia",
      segmento: "power_transmission",
      lcc: "NP",
      pcc: "N",
      pdiv: "P106",
    }),
    existencias: [],
  },
] as const;

/**
 * Inyecta los casos en el catálogo y en el inventario. Idempotente: aplicarlo
 * dos veces no duplica nada.
 */
export function aplicarCasosCurados(
  catalogo: DesignacionCompleta[],
  inventario: FilaInventario[],
): void {
  const existentes = new Set(catalogo.map((d) => d.designacion));

  for (const caso of CASOS_CURADOS) {
    if (existentes.has(caso.designacion.designacion)) continue;
    catalogo.push({ ...caso.designacion });
    existentes.add(caso.designacion.designacion);

    for (const e of caso.existencias) {
      inventario.push({
        designacion: caso.designacion.designacion,
        almacen: e.almacen,
        cantidad: e.cantidad,
        pdiv_dueno: caso.designacion.pdiv,
      });
    }
  }
}
```

- [ ] **Paso 4: Ejecutar y verificar**

Ejecuta: `pnpm test casos-curados`
Esperado: PASAN los 14 tests.

- [ ] **Paso 5: Escribir el contexto y commitear**

Crea `docs/superpowers/contexto/plan-2/tarea-9-contexto.md` con la tabla de casos y la escena que cubre cada uno. **Ese documento lo va a leer el presentador antes de ensayar**, así que escríbelo pensando en él, no en el siguiente agente.

```bash
pnpm lint
git add scripts/seed/casos-curados.ts scripts/seed/casos-curados.test.ts docs/superpowers/contexto
git commit -m "Casos curados del guion, uno por escena"
```

---

## Tarea 10: Orquestador y verificación de los datos cargados

**Archivos:**
- Crear: `scripts/seed/index.ts`, `scripts/seed/verificar.ts`
- Modificar: `package.json` (script `seed:verificar` ya existe; apuntarlo bien)
- Crear: `docs/superpowers/contexto/plan-2/tarea-10-contexto.md`

**Interfaces:**
- Consume: todo lo anterior.
- Produce: `pnpm seed` y `pnpm seed:verificar`.

**Orden de siembra obligatorio** (lo imponen las claves foráneas):
`plantas` → `designaciones` → `homologos` → `inventario` → `clientes` → `operadores` → `cotizaciones`.

**Y dentro de la generación:** `resolverObsolescencia` **antes** de serializar las designaciones, y `aplicarCasosCurados` antes que ambas cosas, para que los casos entren en las cadenas.

- [ ] **Paso 1: Implementar el orquestador**

`scripts/seed/index.ts`:

```ts
import { config } from "dotenv";
import { crearAleatorio } from "./aleatorio";
import { cargar, conectar } from "./cargador";
import { CASOS_CURADOS, aplicarCasosCurados } from "./casos-curados";
import { COLUMNAS_CLIENTES, COLUMNAS_OPERADORES, filasClientes, filasOperadores, generarClientes } from "./comercial";
import { COLUMNAS_COTIZACIONES, filasCotizaciones, generarCotizaciones } from "./cotizaciones";
import { COLUMNAS_DESIGNACIONES, filasDesignaciones, generarCatalogo } from "./designaciones";
import { COLUMNAS_HOMOLOGOS, filasHomologos, generarHomologos, resolverObsolescencia } from "./homologos";
import { COLUMNAS_INVENTARIO, filasInventario, generarInventario } from "./inventario";
import { COLUMNAS_PLANTAS, filasPlantas } from "./plantas";

config({ path: ".env.local", quiet: true });

const DESIGNACIONES = 30000;
const CLIENTES = 300;
const POR_DIA_HABIL = 65;

async function main() {
  const semilla = Number(process.env.DEMO_SEED ?? 20260803);
  console.log(`Sembrando con semilla ${semilla}...`);
  const a = crearAleatorio(semilla);

  console.log("  generando catálogo...");
  const catalogo = generarCatalogo(a, DESIGNACIONES);
  const inventario = generarInventario(a, catalogo);

  // Los casos curados entran ANTES de resolver la obsolescencia, para que
  // participen de las cadenas y de los homólogos.
  aplicarCasosCurados(catalogo, inventario);

  // resolverObsolescencia MUTA el catálogo: tiene que correr antes de serializar.
  resolverObsolescencia(a, catalogo);
  const homologos = generarHomologos(a, catalogo);
  const clientes = generarClientes(a, CLIENTES);

  console.log("  generando histórico...");
  const cotizaciones = generarCotizaciones(a, catalogo, inventario, CLIENTES, {
    desde: new Date("2026-02-02T00:00:00Z"),
    hasta: new Date("2026-08-01T00:00:00Z"),
    porDiaHabil: POR_DIA_HABIL,
  });

  const cliente = conectar();
  await cliente.connect();
  try {
    // El orden lo imponen las claves foráneas. TRUNCATE en cascada deja la
    // base limpia sin tocar el esquema ni sesion_demo.
    console.log("  limpiando tablas...");
    await cliente.query(
      "truncate cotizaciones, solicitudes, intenciones_pedido, snapshot_inventario, " +
        "eventos_demo, inventario, homologos, designaciones, clientes, operadores, plantas cascade",
    );

    const pasos: [string, readonly string[], unknown[][]][] = [
      ["plantas", COLUMNAS_PLANTAS, filasPlantas()],
      ["designaciones", COLUMNAS_DESIGNACIONES, filasDesignaciones(catalogo)],
      ["homologos", COLUMNAS_HOMOLOGOS, filasHomologos(homologos)],
      ["inventario", COLUMNAS_INVENTARIO, filasInventario(inventario)],
      ["clientes", COLUMNAS_CLIENTES, filasClientes(clientes)],
      ["operadores", COLUMNAS_OPERADORES, filasOperadores()],
      ["cotizaciones", COLUMNAS_COTIZACIONES, filasCotizaciones(cotizaciones)],
    ];

    for (const [tabla, columnas, filas] of pasos) {
      const inicio = Date.now();
      const n = await cargar(cliente, tabla, columnas, filas);
      console.log(`  ${tabla}: ${n} filas en ${Date.now() - inicio} ms`);
    }

    console.log(`\nListo. ${CASOS_CURADOS.length} casos curados disponibles para el guion.`);
  } finally {
    await cliente.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Paso 2: Ejecutar la siembra completa**

```bash
pnpm seed
```

Esperado: las 7 tablas cargadas sin error, con `designaciones` en torno a 30.011 filas (30.000 generadas más los casos curados) y `cotizaciones` entre 7.000 y 11.000. Anota los tiempos en el informe.

Si `COPY` falla por una restricción, **no relajes la restricción**: corrige el generador. Las restricciones son la fidelidad al procedimiento.

- [ ] **Paso 3: Implementar la verificación**

`scripts/seed/verificar.ts`:

```ts
import { config } from "dotenv";
import { conectar } from "./cargador";
import { CASOS_CURADOS } from "./casos-curados";

config({ path: ".env.local", quiet: true });

const ok = (m: string) => console.log(`  \x1b[32m✓\x1b[0m ${m}`);
const falla = (m: string) => console.log(`  \x1b[31m✗\x1b[0m ${m}`);

async function main() {
  const c = conectar();
  await c.connect();
  let errores = 0;
  const comprobar = (condicion: boolean, mensaje: string) => {
    condicion ? ok(mensaje) : (falla(mensaje), errores++);
  };

  try {
    console.log("\n\x1b[1mVolúmenes\x1b[0m");
    for (const [tabla, minimo] of [
      ["plantas", 18], ["designaciones", 30000], ["homologos", 1000],
      ["inventario", 15000], ["clientes", 300], ["operadores", 8], ["cotizaciones", 7000],
    ] as const) {
      const n = Number((await c.query(`select count(*)::int n from ${tabla}`)).rows[0].n);
      comprobar(n >= minimo, `${tabla}: ${n} filas (mínimo ${minimo})`);
    }

    console.log("\n\x1b[1mCasos curados del guion\x1b[0m");
    for (const caso of CASOS_CURADOS) {
      const r = await c.query("select 1 from designaciones where designacion = $1", [
        caso.designacion.designacion,
      ]);
      comprobar(r.rowCount === 1, `${caso.clave} · ${caso.designacion.designacion}`);
    }

    console.log("\n\x1b[1mBúsqueda difusa\x1b[0m");
    const inicio = Date.now();
    const similares = await c.query(
      "select designacion from designaciones where designacion % $1 order by similarity(designacion, $1) desc limit 5",
      ["DEMO-6205-2RSH"],
    );
    const ms = Date.now() - inicio;
    comprobar(ms < 1000, `trigramas responde en ${ms} ms (límite 1000)`);
    comprobar(similares.rowCount > 0, `devuelve ${similares.rowCount} sugerencias`);

    console.log("\n\x1b[1mPatrones del dashboard\x1b[0m");
    const pico = await c.query(`
      select count(*) filter (where extract(hour from fecha_solicitud) between 12 and 14)::int en_pico,
             count(*)::int total
      from cotizaciones`);
    const proporcion = pico.rows[0].en_pico / pico.rows[0].total;
    comprobar(proporcion > 0.35, `pico en la franja de desconexión: ${(proporcion * 100).toFixed(1)}%`);

    const motivos = await c.query(
      "select count(distinct motivo_declinado)::int n from cotizaciones where motivo_declinado is not null",
    );
    comprobar(Number(motivos.rows[0].n) === 5, `los 5 motivos de declinado están presentes`);

    const sla = await c.query(`
      select avg(extract(epoch from (fecha_respuesta - fecha_solicitud)) / 86400) dias
      from cotizaciones where fecha_respuesta is not null`);
    const dias = Number(sla.rows[0].dias);
    comprobar(dias > 2 && dias < 6, `promedio de respuesta: ${dias.toFixed(2)} días`);

    console.log("\n\x1b[1mCoherencia\x1b[0m");
    const huerfanas = await c.query(`
      select count(*)::int n from cotizaciones c
      where c.resultado = 'cotizada' and (c.te_semanas is null or c.precio is null)`);
    comprobar(Number(huerfanas.rows[0].n) === 0, "ninguna cotizada sin TE ni precio");

    const fabrica = await c.query(`
      select count(*)::int n from designaciones d
      where d.reemplazo_indicado_fabrica is not null
        and exists (select 1 from designaciones x where x.designacion = d.reemplazo_indicado_fabrica)`);
    comprobar(
      Number(fabrica.rows[0].n) === 0,
      "ningún reemplazo indicado por fábrica existe en el catálogo (es su definición)",
    );

    const tresSalidas = await c.query(`
      select count(*) filter (where reemplazado_por is not null)::int en_sistema,
             count(*) filter (where reemplazado_por is null and reemplazo_indicado_fabrica is not null)::int por_fabrica,
             count(*) filter (where reemplazado_por is null and reemplazo_indicado_fabrica is null)::int sin_reemplazo
      from designaciones where vigente = false`);
    const t = tresSalidas.rows[0];
    comprobar(
      t.en_sistema > 0 && t.por_fabrica > 0 && t.sin_reemplazo > 0,
      `las tres salidas del punto 4.6/4.7 están representadas: ${t.en_sistema} / ${t.por_fabrica} / ${t.sin_reemplazo}`,
    );
  } finally {
    await c.end();
  }

  console.log(
    errores === 0
      ? "\n\x1b[32mDatos verificados.\x1b[0m\n"
      : `\n\x1b[31m${errores} comprobación(es) fallida(s).\x1b[0m\n`,
  );
  process.exit(errores === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Paso 4: Ejecutar la verificación**

```bash
pnpm seed:verificar
```

Esperado: todas las comprobaciones en verde. Pega la salida literal en el informe.

- [ ] **Paso 5: Confirmar la reproducibilidad**

Vuelve a ejecutar `pnpm seed` y luego `pnpm seed:verificar`. Los conteos deben ser **idénticos** a la primera ejecución. Si difieren, hay una fuente de aleatoriedad no sembrada: búscala antes de continuar.

- [ ] **Paso 6: Escribir el contexto y commitear**

Crea `docs/superpowers/contexto/plan-2/tarea-10-contexto.md` con el orden de siembra, los tiempos medidos y la salida de la verificación.

```bash
pnpm lint
pnpm test
git add scripts/seed docs/superpowers/contexto package.json
git commit -m "Orquestador de siembra y verificacion de los datos cargados"
```

---

## Verificación final del Plan 2

- [ ] `pnpm test` — todos los tests pasan
- [ ] `pnpm lint` — sin errores
- [ ] `pnpm exec tsc --noEmit` — sin errores de tipos
- [ ] `pnpm build` — compila
- [ ] `pnpm seed` — siembra completa sin errores
- [ ] `pnpm seed:verificar` — todas las comprobaciones en verde
- [ ] Dos ejecuciones consecutivas de `pnpm seed` producen conteos idénticos
- [ ] Existe `docs/superpowers/contexto/plan-2/tarea-N-contexto.md` para las 10 tareas, versionado en git
- [ ] Ninguna designación, cliente o precio coincide con datos reales de SKF

**Entregable:** una base poblada con 30.000 designaciones y ~9.000 cotizaciones, reproducible con semilla fija, con los patrones que el dashboard necesita y los casos curados que el guion exige. El Plan 3 puede construir el validador, el estimador y las pantallas sobre datos reales.

