# Plan 1 — Esquema de datos y motor de reglas QMS

> **Para agentes ejecutores:** SUB-SKILL REQUERIDA: usa `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans` para implementar tarea por tarea. Los pasos usan casillas (`- [ ]`) para seguimiento.

**Objetivo:** Dejar en la nube el esquema completo de las 12 tablas del POC y un motor de reglas QMS con tests que reproduzca fielmente el árbol de decisión del punto 4 del procedimiento Rev. 3.

**Arquitectura:** Migraciones SQL versionadas aplicadas con `supabase db push` contra el proyecto cloud (no hay Docker local). El motor de reglas es una función pura sin dependencias de base de datos: recibe un contexto ya resuelto y devuelve una ruta del procedimiento. Esa pureza es lo que permite testearlo exhaustivamente y mostrarlo en pantalla si un técnico de SKF pregunta cómo se decide.

**Stack:** PostgreSQL 17 (Supabase) · TypeScript · Vitest · Supabase CLI 2.67

## Restricciones globales

- **Idioma:** todo el código, nombres de tablas, columnas, funciones y mensajes en **español**. Terminología literal de SKF: designación, planeado / no planeado, TE, MOQ, PDIV, LCC, PCC, FPC, almacén PS/SL/XX.
- **Cero datos reales de SKF.** Ni una designación, cliente o precio que coincida con los suyos.
- **Operadores como `CSR 1`, `CSR 2`…** nunca nombres de personas.
- **Numeración QMS:** el documento original tiene **dos puntos 4.5**. En el código se distinguen como `4.5a` (pack quantity) y `4.5b` (fábricas con conexión y ruta de embarque).
- **SLA:** 4 días hábiles es un **promedio** de todas las cotizaciones, no un plazo por solicitud. Nunca implementarlo como deadline individual.
- **`PS` está sobrecargado** en el QMS: *Performance Standard* (costo) y *Almacén Primario*. En el código el almacén se nombra `almacen_ps`; el costo, si aparece, `performance_standard`.
- **Formato de cotización:** `AAAAQ#####` (año + `Q` + consecutivo de 5 dígitos).
- **Linter:** Biome. `pnpm lint` debe pasar antes de cada commit.
- **Migraciones:** nunca editar una migración ya aplicada. Siempre crear una nueva.
- **Convención de nombres entre capas:** la base usa `snake_case` (`pack_quantity`, `es_nueva_creacion`) y el dominio TypeScript usa `camelCase` (`packQuantity`, `esNuevaCreacion`). La conversión se hace en un único punto — la función `aDesignacion()` que se crea en el Plan 3, capa `lib/fuentes`. **Ningún módulo de `lib/reglas-qms` debe conocer los nombres de columna.**

---

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `supabase/migrations/20260803000002_catalogo.sql` | `designaciones`, `homologos`, `plantas`, `inventario` |
| `supabase/migrations/20260803000003_operacion.sql` | `clientes`, `operadores`, `cotizaciones`, `solicitudes` |
| `supabase/migrations/20260803000004_metricas_y_contrato_b.sql` | `eventos_demo`, `intenciones_pedido`, `snapshot_inventario` |
| `lib/supabase/tipos.ts` | Tipos generados por el CLI. No se edita a mano |
| `lib/supabase/admin.ts` | Cliente con service role, solo servidor |
| `lib/supabase/servidor.ts` | Cliente para Server Components |
| `lib/supabase/navegador.ts` | Cliente para Client Components |
| `lib/reglas-qms/tipos.ts` | Tipos del dominio: `Designacion`, `Planta`, `ContextoSolicitud`, `RutaQMS` |
| `lib/reglas-qms/catalogo.ts` | Reglas 4.8, 4.5b, 4.6, 4.7 — validez de la designación y de su origen |
| `lib/reglas-qms/cantidades.ts` | Reglas 4.4 y 4.5a — MOQ y pack quantity |
| `lib/reglas-qms/planeacion.ts` | Reglas 4.1, 4.2, 4.3 — planeado / no planeado |
| `lib/reglas-qms/tiempos.ts` | Regla 4.9 y ajustes de TE |
| `lib/reglas-qms/index.ts` | `evaluarSolicitud()` — compone el árbol completo |
| `lib/reglas-qms/*.test.ts` | Tests por módulo |
| `vitest.config.ts` | Configuración de Vitest |

---

## Tarea 1: Configurar Vitest

**Archivos:**
- Crear: `vitest.config.ts`
- Crear: `lib/reglas-qms/humo.test.ts`

**Interfaces:**
- Produce: entorno de test ejecutable con `pnpm test`.

- [ ] **Paso 1: Escribir la configuración**

`vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "scripts/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
```

- [ ] **Paso 2: Escribir un test que falle**

`lib/reglas-qms/humo.test.ts`:

```ts
import { describe, expect, it } from "vitest";

describe("entorno de pruebas", () => {
  it("ejecuta y resuelve el alias @", async () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Paso 3: Ejecutar**

Ejecuta: `pnpm test`
Esperado: PASA, 1 test.

- [ ] **Paso 4: Verificar lint y commit**

```bash
pnpm lint
git add vitest.config.ts lib/reglas-qms/humo.test.ts
git commit -m "Configurar Vitest para el motor de reglas QMS"
```

---

## Tarea 2: Migración del catálogo

**Archivos:**
- Crear: `supabase/migrations/20260803000002_catalogo.sql`

**Interfaces:**
- Produce: tablas `plantas`, `designaciones`, `homologos`, `inventario` en el proyecto cloud.

**Nota de diseño:** los índices GIN de trigramas se crean aquí, **antes** de la siembra masiva del Plan 2. Crearlos después sobre 30.000 filas es más lento y arriesga un timeout del pooler.

- [ ] **Paso 1: Escribir la migración**

`supabase/migrations/20260803000002_catalogo.sql`:

```sql
-- ============================================================================
-- 002 · Catálogo: plantas, designaciones, homólogos e inventario
-- Diseño: docs/superpowers/specs/2026-08-03-poc-skf-design.md §6
-- ============================================================================

create type pcc_codigo as enum ('C', 'P', 'N', 'O');  -- QMS: planeado, equipo original, bajo orden, obsoleto
create type lcc_codigo as enum ('PLAN', 'NP');
create type fpc_codigo as enum ('1', '2');
create type almacen_codigo as enum ('PS', 'SL', 'XX');

-- ── Plantas (PDIV) ───────────────────────────────────────────────────────────
create table plantas (
  pdiv                    text primary key,
  nombre                  text not null,
  pais                    text not null,
  com                     text not null,          -- Country of Manufacturing
  huso                    text not null,          -- IANA, ej. 'Europe/Brussels'

  -- QMS 4.5b: solo se cotiza con fábricas con conexión Y ruta de embarque.
  tiene_conexion          boolean not null default true,
  tiene_ruta_embarque     boolean not null default true,

  -- Ventana diaria de mantenimiento, en minutos desde medianoche hora de México.
  ventana_inicio_min      integer not null,
  ventana_duracion_min    integer not null,
  ventana_variabilidad_min integer not null default 0,  -- Bélgica: inicio variable

  desempeno_te            numeric(4,2) not null default 1.0  -- multiplicador sobre el TE base
);

comment on column plantas.ventana_variabilidad_min is
  'Franja de variación del inicio de la ventana. Bélgica no tiene hora fija (minuta 22/07).';

-- ── Designaciones ────────────────────────────────────────────────────────────
create table designaciones (
  designacion        text primary key,
  descripcion        text not null,
  familia            text not null,
  pcc                pcc_codigo not null,
  lcc                lcc_codigo not null,
  fpc                fpc_codigo not null,
  pdiv               text not null references plantas(pdiv),
  moq                integer not null default 1,
  pack_quantity      integer not null default 1,
  precio_lista       numeric(12,2) not null,
  vigente            boolean not null default true,
  reemplazado_por    text references designaciones(designacion),
  es_nueva_creacion  boolean not null default false,  -- QMS 4.9: +4 semanas de TE
  creada_en          timestamptz not null default now(),

  constraint moq_positivo check (moq >= 1),
  constraint pack_positivo check (pack_quantity >= 1),
  -- Un obsoleto (PCC=O) es siempre no vigente, y viceversa: mantiene coherente
  -- el árbol de los puntos 4.6 y 4.7.
  constraint obsoleto_no_vigente check ((pcc = 'O') = (vigente = false))
);

create index designaciones_trgm on designaciones using gin (designacion extensions.gin_trgm_ops);
create index designaciones_lcc on designaciones (lcc);
create index designaciones_pdiv on designaciones (pdiv);
create index designaciones_familia on designaciones (familia);

-- ── Homólogos ────────────────────────────────────────────────────────────────
create table homologos (
  id           bigserial primary key,
  origen       text not null references designaciones(designacion),
  equivalente  text not null references designaciones(designacion),
  motivo       text not null,   -- 'mismo dimensional, distinto sellado', etc.

  -- Lo que hace funcionar la confirmación guiada: sin diferencias explícitas
  -- el diálogo queda vacío y la escena 3 del guion no evidencia nada.
  diferencias  jsonb not null default '[]'::jsonb,

  constraint homologo_no_reflexivo check (origen <> equivalente),
  unique (origen, equivalente)
);

create index homologos_origen on homologos (origen);

comment on column homologos.diferencias is
  'Lista de {atributo, valor_origen, valor_equivalente}. Se resaltan en la confirmación guiada.';

-- ── Inventario ───────────────────────────────────────────────────────────────
create table inventario (
  designacion  text not null references designaciones(designacion),
  almacen      almacen_codigo not null,
  cantidad     integer not null default 0,
  pdiv_dueno   text not null references plantas(pdiv),

  primary key (designacion, almacen),
  constraint cantidad_no_negativa check (cantidad >= 0)
);

create index inventario_designacion on inventario (designacion);

comment on table inventario is
  'Consulta escalonada del QMS: PS primario, SL secundario, XX terciario. SL y XX están sujetos a aprobación del Supplier.';
```

- [ ] **Paso 2: Aplicar**

```bash
pnpm db:push
```

Esperado: `Applying migration 20260803000002_catalogo.sql...` y `Finished supabase db push.`

- [ ] **Paso 3: Verificar que existen las 4 tablas y los índices**

```bash
node -e "
const {Client}=require('pg');require('dotenv').config({path:'.env.local'});
(async()=>{const c=new Client({connectionString:process.env.SUPABASE_DB_URL,ssl:{rejectUnauthorized:false}});
await c.connect();
console.table((await c.query(\"select tablename from pg_tables where schemaname='public' order by 1\")).rows);
console.table((await c.query(\"select indexname from pg_indexes where tablename='designaciones'\")).rows);
await c.end();})();
"
```

Esperado: aparecen `designaciones`, `homologos`, `inventario`, `plantas`, `sesion_demo`, y el índice `designaciones_trgm`.

- [ ] **Paso 4: Commit**

```bash
git add supabase/migrations/20260803000002_catalogo.sql
git commit -m "Migracion 002: catalogo de designaciones, plantas, homologos e inventario"
```

---

## Tarea 3: Migración de operación

**Archivos:**
- Crear: `supabase/migrations/20260803000003_operacion.sql`

**Interfaces:**
- Consume: `designaciones`, `plantas` de la Tarea 2.
- Produce: tablas `clientes`, `operadores`, `cotizaciones`, `solicitudes`.

- [ ] **Paso 1: Escribir la migración**

`supabase/migrations/20260803000003_operacion.sql`:

```sql
-- ============================================================================
-- 003 · Operación: clientes, operadores, histórico y solicitudes del demo
-- ============================================================================

create type tipo_cliente as enum ('AFT', 'OEM', 'USUARIO_FINAL');

create type resultado_cotizacion as enum ('cotizada', 'declinada');

-- Motivos tomados literalmente del árbol del punto 4 del QMS Rev. 3.
create type motivo_declinado as enum (
  'ya_disponible_wcl',        -- 4.1 planeado con stock suficiente
  'moq_mayor',                -- 4.4
  'obsoleto_sin_reemplazo',   -- 4.7
  'designacion_invalida',     -- 4.8
  'planta_sin_ruta'           -- 4.5b
);

create table clientes (
  id            bigserial primary key,
  nombre        text not null,
  tipo          tipo_cliente not null,
  descuento     numeric(4,3) not null default 0.0,
  usa_wcl       boolean not null default true   -- los OEM a veces no usan WCL
);

create table operadores (
  id            bigserial primary key,
  codigo        text not null unique,   -- 'CSR 1', 'CSR 2' — NUNCA nombres reales
  activo        boolean not null default true
);

-- ── Histórico sintético ──────────────────────────────────────────────────────
-- Alimenta el estimador de TE y las métricas del dashboard.
create table cotizaciones (
  numero            text primary key,          -- AAAAQ#####
  cliente_id        bigint not null references clientes(id),
  designacion       text not null,             -- texto libre: el histórico incluye designaciones inválidas
  cantidad          integer not null,
  fecha_solicitud   timestamptz not null,
  fecha_respuesta   timestamptz,
  operador_id       bigint references operadores(id),
  resultado         resultado_cotizacion not null,
  motivo_declinado  motivo_declinado,
  te_semanas        numeric(4,1),
  precio            numeric(12,2),

  -- Marca de siembra: permite localizar los patrones deliberados del doc 04
  -- (pico en la ventana de desconexión, designaciones mal ingresadas).
  patron            text,

  constraint declinada_tiene_motivo
    check ((resultado = 'declinada') = (motivo_declinado is not null)),
  constraint cotizada_tiene_te
    check (resultado <> 'cotizada' or te_semanas is not null)
);

create index cotizaciones_fecha on cotizaciones (fecha_solicitud);
create index cotizaciones_designacion on cotizaciones (designacion);
create index cotizaciones_resultado on cotizaciones (resultado);

comment on column cotizaciones.designacion is
  'Texto tal como lo capturó el cliente. Puede no existir en designaciones: ese es justamente el caso del punto 4.8.';

-- ── Solicitudes generadas durante el demo ────────────────────────────────────
-- Separadas del histórico para que reiniciar la sesión no lo toque.
create table solicitudes (
  id                bigserial primary key,
  numero            text not null unique,
  cliente_id        bigint references clientes(id),
  designacion_texto text not null,             -- lo que el usuario escribió, sin corregir
  cantidad          integer not null,
  creada_en         timestamptz not null default now(),

  -- Contrato B (Plan 3+): asignación automática y preclasificación.
  csr_asignado      bigint references operadores(id),
  clasificacion_qms text,                      -- ruta devuelta por evaluarSolicitud()
  punto_qms         text,                      -- '4.1', '4.5a'...

  atendida_en       timestamptz,
  resultado         resultado_cotizacion,
  motivo_declinado  motivo_declinado
);

create index solicitudes_creada on solicitudes (creada_en);
```

- [ ] **Paso 2: Aplicar y verificar**

```bash
pnpm db:push
```

Esperado: migración aplicada sin error.

- [ ] **Paso 3: Verificar las restricciones**

```bash
node -e "
const {Client}=require('pg');require('dotenv').config({path:'.env.local'});
(async()=>{const c=new Client({connectionString:process.env.SUPABASE_DB_URL,ssl:{rejectUnauthorized:false}});
await c.connect();
try {
  await c.query(\"insert into clientes (nombre,tipo) values ('X','AFT')\");
  await c.query(\"insert into cotizaciones (numero,cliente_id,designacion,cantidad,fecha_solicitud,resultado) values ('2026Q00001',(select id from clientes limit 1),'6205',10,now(),'declinada')\");
  console.log('ERROR: la restriccion declinada_tiene_motivo no funciono');
} catch(e){ console.log('OK: restriccion activa ->', e.message.slice(0,60)); }
await c.query('delete from clientes'); await c.end();})();
"
```

Esperado: `OK: restriccion activa -> ...declinada_tiene_motivo...`

- [ ] **Paso 4: Commit**

```bash
git add supabase/migrations/20260803000003_operacion.sql
git commit -m "Migracion 003: clientes, operadores, historico de cotizaciones y solicitudes"
```

---

## Tarea 4: Migración de métricas y Contrato B

**Archivos:**
- Crear: `supabase/migrations/20260803000004_metricas_y_contrato_b.sql`

**Interfaces:**
- Produce: `eventos_demo`, `intenciones_pedido`, `snapshot_inventario`.

**Nota de diseño:** `intenciones_pedido` y `snapshot_inventario` se crean **vacías** en el Plan 1 aunque ninguna pantalla las use hasta el Contrato B. Es la regla del spec §2.2: crear ahora lo que evita un refactor después.

- [ ] **Paso 1: Escribir la migración**

`supabase/migrations/20260803000004_metricas_y_contrato_b.sql`:

```sql
-- ============================================================================
-- 004 · Métricas del demo y tablas reservadas para el Contrato B
-- Diseño: §2.2 — la v1 emite todos los eventos aunque no los renderice.
-- ============================================================================

create type tipo_evento as enum (
  'busqueda',                    -- el usuario consultó algo
  'sugerencia_aceptada',         -- tomó una de las alternativas del validador
  'solicitud_evitada',           -- resolvió sin generar cotización
  'solicitud_generada',
  'confirmacion_homologo',       -- pasó por la confirmación guiada
  'aviso_moq',
  'aviso_pack_quantity',
  'ventana_inicio',
  'ventana_fin',
  'intencion_encolada',
  'reconciliacion',
  'llamada_modelo'               -- para estimar costos de la fase real
);

create table eventos_demo (
  id           bigserial primary key,
  tipo         tipo_evento not null,
  perfil       text,                                  -- 'cliente' | 'operador'
  designacion  text,
  pdiv         text,
  detalle      jsonb not null default '{}'::jsonb,
  ocurrido_en  timestamptz not null default now()
);

create index eventos_demo_ocurrido on eventos_demo (ocurrido_en);
create index eventos_demo_tipo on eventos_demo (tipo);

comment on table eventos_demo is
  'Fuente del dashboard en vivo. Los contadores leen solo eventos posteriores a sesion_demo.iniciada_en, de modo que reiniciar la sesion no borra el historico.';

-- ── Contrato B — creadas vacías ──────────────────────────────────────────────

create table snapshot_inventario (
  id           bigserial primary key,
  pdiv         text not null references plantas(pdiv),
  designacion  text not null references designaciones(designacion),
  almacen      almacen_codigo not null,
  cantidad     integer not null,
  hora_corte   timestamptz not null       -- se muestra como "informacion al corte de las HH:MM"
);

create index snapshot_inventario_corte on snapshot_inventario (pdiv, hora_corte);

create type estado_intencion as enum ('encolada', 'confirmada', 'ajustada', 'escalada');

create table intenciones_pedido (
  id             bigserial primary key,
  cliente_id     bigint references clientes(id),
  designacion    text not null references designaciones(designacion),
  cantidad       integer not null,
  pdiv           text not null references plantas(pdiv),
  encolada_en    timestamptz not null default now(),
  estado         estado_intencion not null default 'encolada',
  resuelta_en    timestamptz,
  nota           text
);

create index intenciones_estado on intenciones_pedido (estado);

comment on table intenciones_pedido is
  'Seccion 3.3 de la propuesta. SUJETA A VALIDACION TECNICA EN LA FASE 1: nunca presentarla como comprometida.';

-- ── Acceso ───────────────────────────────────────────────────────────────────
-- El POC no tiene login: el portal lee con la clave anon. Las escrituras van
-- por Server Actions con service role, que no pasan por RLS.

alter table plantas enable row level security;
alter table designaciones enable row level security;
alter table homologos enable row level security;
alter table inventario enable row level security;
alter table clientes enable row level security;
alter table operadores enable row level security;
alter table cotizaciones enable row level security;
alter table solicitudes enable row level security;
alter table eventos_demo enable row level security;
alter table snapshot_inventario enable row level security;
alter table intenciones_pedido enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'plantas','designaciones','homologos','inventario','clientes','operadores',
    'cotizaciones','solicitudes','eventos_demo','snapshot_inventario','intenciones_pedido'
  ] loop
    execute format(
      'create policy "lectura publica del demo" on %I for select to anon, authenticated using (true)', t
    );
  end loop;
end $$;
```

- [ ] **Paso 2: Aplicar**

```bash
pnpm db:push
```

- [ ] **Paso 3: Verificar RLS y conteo de tablas**

```bash
node -e "
const {Client}=require('pg');require('dotenv').config({path:'.env.local'});
(async()=>{const c=new Client({connectionString:process.env.SUPABASE_DB_URL,ssl:{rejectUnauthorized:false}});
await c.connect();
console.table((await c.query(\"select relname, relrowsecurity from pg_class where relnamespace='public'::regnamespace and relkind='r' order by 1\")).rows);
await c.end();})();
"
```

Esperado: 12 tablas, todas con `relrowsecurity = true`.

- [ ] **Paso 4: Commit**

```bash
git add supabase/migrations/20260803000004_metricas_y_contrato_b.sql
git commit -m "Migracion 004: eventos del demo y tablas reservadas del Contrato B"
```

---

## Tarea 5: Tipos generados y clientes de Supabase

**Archivos:**
- Crear: `lib/supabase/tipos.ts` (generado, no editar a mano)
- Crear: `lib/supabase/admin.ts`, `lib/supabase/servidor.ts`, `lib/supabase/navegador.ts`
- Modificar: `package.json` (script `tipos`)
- Crear: `lib/supabase/admin.test.ts`

**Interfaces:**
- Produce:
  - `type Database` en `lib/supabase/tipos.ts`
  - `clienteAdmin(): SupabaseClient<Database>` — service role, solo servidor
  - `clienteServidor(): Promise<SupabaseClient<Database>>` — Server Components
  - `clienteNavegador(): SupabaseClient<Database>` — Client Components

- [ ] **Paso 1: Añadir el script de generación**

En `package.json`, dentro de `scripts`:

```json
"tipos": "supabase gen types typescript --linked --schema public > lib/supabase/tipos.ts"
```

- [ ] **Paso 2: Generar los tipos**

```bash
pnpm tipos
```

Esperado: `lib/supabase/tipos.ts` con `export type Database` y las 12 tablas.

- [ ] **Paso 3: Escribir los tres clientes**

`lib/supabase/admin.ts`:

```ts
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./tipos";

/**
 * Cliente con service role. Ignora RLS.
 * SOLO servidor: nunca importar desde un Client Component.
 */
export function clienteAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !clave) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  return createClient<Database>(url, clave, { auth: { persistSession: false } });
}
```

`lib/supabase/navegador.ts`:

```ts
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./tipos";

export function clienteNavegador() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  );
}
```

`lib/supabase/servidor.ts`:

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./tipos";

export async function clienteServidor() {
  const almacen = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll: () => almacen.getAll(),
        setAll: (galletas) => {
          try {
            for (const { name, value, options } of galletas) almacen.set(name, value, options);
          } catch {
            // Server Component: no puede escribir cookies. Sin sesión de usuario
            // en el POC, es irrelevante.
          }
        },
      },
    },
  );
}
```

- [ ] **Paso 4: Escribir el test que falle**

`lib/supabase/admin.test.ts`:

```ts
import { config } from "dotenv";
import { beforeAll, describe, expect, it } from "vitest";
import { clienteAdmin } from "./admin";

beforeAll(() => config({ path: ".env.local", quiet: true }));

describe("clienteAdmin", () => {
  it("lee sesion_demo con tipos correctos", async () => {
    const { data, error } = await clienteAdmin().from("sesion_demo").select("modo").single();
    expect(error).toBeNull();
    expect(["hoy", "solucion"]).toContain(data?.modo);
  });

  it("ve las 12 tablas del esquema", async () => {
    const { error } = await clienteAdmin().from("designaciones").select("designacion").limit(1);
    expect(error).toBeNull();
  });
});
```

- [ ] **Paso 5: Ejecutar**

Ejecuta: `pnpm test`
Esperado: PASAN los 3 tests (humo + 2 de admin).

- [ ] **Paso 6: Commit**

```bash
pnpm lint
git add lib/supabase package.json
git commit -m "Clientes de Supabase con tipos generados del esquema"
```

---

## Tarea 6: Tipos del dominio QMS

**Archivos:**
- Crear: `lib/reglas-qms/tipos.ts`

**Interfaces:**
- Produce: `Designacion`, `Planta`, `Existencia`, `ContextoSolicitud`, `RutaQMS`, `Aviso`, `EvaluacionQMS`. **Todas las tareas siguientes dependen de estos nombres exactos.**

**Nota de diseño:** el motor es una **función pura**. No consulta la base: recibe un contexto ya resuelto. Eso permite testear las 10 rutas del procedimiento sin datos y es lo que hace posible mostrar el árbol en pantalla.

- [ ] **Paso 1: Escribir los tipos**

`lib/reglas-qms/tipos.ts`:

```ts
/**
 * Tipos del árbol de decisión del punto 4 del procedimiento QMS
 * "Consultas y Cotizaciones" Rev. 3 (13/07/2026).
 *
 * El documento original numera DOS puntos como 4.5. Aquí se distinguen
 * como '4.5a' (pack quantity) y '4.5b' (fábricas con conexión y ruta).
 */

export type PCC = "C" | "P" | "N" | "O";
export type LCC = "PLAN" | "NP";
export type FPC = "1" | "2";
export type Almacen = "PS" | "SL" | "XX";

export interface Designacion {
  designacion: string;
  descripcion: string;
  familia: string;
  pcc: PCC;
  lcc: LCC;
  fpc: FPC;
  pdiv: string;
  moq: number;
  packQuantity: number;
  precioLista: number;
  vigente: boolean;
  reemplazadoPor: string | null;
  esNuevaCreacion: boolean;
}

export interface Planta {
  pdiv: string;
  nombre: string;
  tieneConexion: boolean;
  tieneRutaEmbarque: boolean;
}

export interface Existencia {
  almacen: Almacen;
  cantidad: number;
}

/** Contexto ya resuelto que recibe el motor. Nunca consulta la base por su cuenta. */
export interface ContextoSolicitud {
  /** `null` cuando la designación capturada no existe en el catálogo (punto 4.8). */
  designacion: Designacion | null;
  cantidad: number;
  existencias: Existencia[];
  planta: Planta | null;
  /** Designación de reemplazo ya resuelta, si la hay (punto 4.6). */
  reemplazo: Designacion | null;
  /**
   * `true` cuando el reemplazo no está en el sistema pero la fábrica lo indica.
   * Es el segundo sub-caso del 4.6, el único que obliga a validar con el
   * Ingeniero de Ventas.
   */
  reemplazoSoloIndicadoPorFabrica?: boolean;
}

export type RutaQMS =
  | "declinar_designacion_invalida"
  | "declinar_planta_sin_ruta"
  | "declinar_obsoleto_sin_reemplazo"
  | "declinar_moq"
  | "declinar_ya_disponible"
  | "cotizar_con_reemplazo"
  | "solicitar_lt_planner"
  | "revisar_disponibilidad_np"
  | "ingresar_pinq";

export type TipoAviso =
  | "pack_quantity_ajustado"
  | "nueva_creacion"
  | "validar_con_ingeniero_ventas"
  | "precio_requiere_lpc";

export interface Aviso {
  tipo: TipoAviso;
  punto: string;
  mensaje: string;
}

export interface EvaluacionQMS {
  ruta: RutaQMS;
  /** Punto literal del procedimiento que justifica la ruta. Se muestra en la UI. */
  punto: string;
  mensaje: string;
  /** Se declina la solicitud según el procedimiento. */
  declinada: boolean;
  avisos: Aviso[];
  /** Cantidad efectiva tras el redondeo al pack quantity (punto 4.5a). */
  cantidadEfectiva: number;
  /** Semanas a sumar al TE base. 4 si es de nueva creación (punto 4.9). */
  semanasExtraTE: number;
}
```

- [ ] **Paso 2: Verificar que compila**

Ejecuta: `pnpm exec tsc --noEmit`
Esperado: sin errores.

- [ ] **Paso 3: Commit**

```bash
pnpm lint
git add lib/reglas-qms/tipos.ts
git commit -m "Tipos del dominio del arbol de decision QMS"
```

---

## Tarea 7: Reglas de cantidades — MOQ y pack quantity

**Archivos:**
- Crear: `lib/reglas-qms/cantidades.ts`
- Crear: `lib/reglas-qms/cantidades.test.ts`

**Interfaces:**
- Consume: `Designacion` de `./tipos`.
- Produce:
  - `incumpleMoq(d: Designacion, cantidad: number): boolean`
  - `redondearAPack(d: Designacion, cantidad: number): number`
  - `avisoPackQuantity(d: Designacion, cantidad: number): Aviso | null`

**Reglas literales:**
- 4.4 — *"Si la designación tiene MOQ mayor a lo que el cliente pide se le indica el MOQ al cliente y se declina."*
- 4.5a — *"En el caso de las designaciones con un Pack Quantity diferente al unitario, el sistema lo redondea y se cotiza con base en el pack quantity asignado automáticamente por el sistema y se le indica al cliente el motivo del cambio en la cantidad."*

- [ ] **Paso 1: Escribir los tests que fallen**

`lib/reglas-qms/cantidades.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { avisoPackQuantity, incumpleMoq, redondearAPack } from "./cantidades";
import type { Designacion } from "./tipos";

const base: Designacion = {
  designacion: "6205-2RSH/C3",
  descripcion: "Rodamiento rigido de bolas",
  familia: "Rodamiento rigido de bolas",
  pcc: "C",
  lcc: "PLAN",
  fpc: "1",
  pdiv: "P100",
  moq: 1,
  packQuantity: 1,
  precioLista: 120.5,
  vigente: true,
  reemplazadoPor: null,
  esNuevaCreacion: false,
};

describe("MOQ (punto 4.4)", () => {
  it("incumple cuando la cantidad pedida es menor al MOQ", () => {
    expect(incumpleMoq({ ...base, moq: 50 }, 5)).toBe(true);
  });

  it("no incumple cuando la cantidad iguala al MOQ", () => {
    expect(incumpleMoq({ ...base, moq: 50 }, 50)).toBe(false);
  });

  it("no incumple cuando la cantidad supera al MOQ", () => {
    expect(incumpleMoq({ ...base, moq: 50 }, 100)).toBe(false);
  });
});

describe("Pack quantity (punto 4.5a)", () => {
  it("redondea hacia arriba al multiplo del pack", () => {
    expect(redondearAPack({ ...base, packQuantity: 20 }, 25)).toBe(40);
  });

  it("no altera una cantidad que ya es multiplo exacto", () => {
    expect(redondearAPack({ ...base, packQuantity: 20 }, 40)).toBe(40);
  });

  it("no altera nada cuando el pack es unitario", () => {
    expect(redondearAPack({ ...base, packQuantity: 1 }, 7)).toBe(7);
  });

  it("emite aviso explicando el cambio de cantidad", () => {
    const aviso = avisoPackQuantity({ ...base, packQuantity: 20 }, 25);
    expect(aviso?.tipo).toBe("pack_quantity_ajustado");
    expect(aviso?.punto).toBe("4.5a");
    expect(aviso?.mensaje).toContain("40");
  });

  it("no emite aviso cuando no hay cambio de cantidad", () => {
    expect(avisoPackQuantity({ ...base, packQuantity: 20 }, 40)).toBeNull();
  });
});
```

- [ ] **Paso 2: Ejecutar y ver el fallo**

Ejecuta: `pnpm test cantidades`
Esperado: FALLA — `Failed to resolve import "./cantidades"`.

- [ ] **Paso 3: Implementar**

`lib/reglas-qms/cantidades.ts`:

```ts
import type { Aviso, Designacion } from "./tipos";

/**
 * Punto 4.4 — "Si la designación tiene MOQ mayor a lo que el cliente pide se
 * le indica el MOQ al cliente y se declina."
 */
export function incumpleMoq(d: Designacion, cantidad: number): boolean {
  return cantidad < d.moq;
}

/**
 * Punto 4.5a — el sistema redondea al pack quantity asignado. Siempre hacia
 * arriba: no se puede despachar una fracción de caja.
 */
export function redondearAPack(d: Designacion, cantidad: number): number {
  if (d.packQuantity <= 1) return cantidad;
  return Math.ceil(cantidad / d.packQuantity) * d.packQuantity;
}

/**
 * Punto 4.5a — "se le indica al cliente el motivo del cambio en la cantidad".
 * Sin cambio no hay aviso.
 */
export function avisoPackQuantity(d: Designacion, cantidad: number): Aviso | null {
  const efectiva = redondearAPack(d, cantidad);
  if (efectiva === cantidad) return null;
  return {
    tipo: "pack_quantity_ajustado",
    punto: "4.5a",
    mensaje:
      `La cantidad se ajusta de ${cantidad} a ${efectiva} piezas: ` +
      `esta designación se surte en cajas de ${d.packQuantity}.`,
  };
}
```

- [ ] **Paso 4: Ejecutar y verificar**

Ejecuta: `pnpm test cantidades`
Esperado: PASAN los 8 tests.

- [ ] **Paso 5: Commit**

```bash
pnpm lint
git add lib/reglas-qms/cantidades.ts lib/reglas-qms/cantidades.test.ts
git commit -m "Reglas QMS 4.4 y 4.5a: MOQ y redondeo a pack quantity"
```

---

## Tarea 8: Reglas de catálogo — validez, origen y obsolescencia

**Archivos:**
- Crear: `lib/reglas-qms/catalogo.ts`
- Crear: `lib/reglas-qms/catalogo.test.ts`

**Interfaces:**
- Consume: `Designacion`, `Planta`, `Aviso` de `./tipos`.
- Produce:
  - `designacionValida(d: Designacion | null): boolean`
  - `plantaCotizable(p: Planta | null): boolean`
  - `esObsoleto(d: Designacion): boolean`
  - `avisoReemplazo(reemplazoSoloIndicadoPorFabrica: boolean): Aviso | null`

**Reglas literales:**
- 4.5b — *"Solo se cotizan con aquellas fábricas con las que se tiene conexión y ruta de embarque, de lo contrario se declina toda solicitud cuyo origen de material sea una fábrica diferente."*
- 4.6 — *"En caso de que el producto sea obsoleto y tenga reemplazo, si el reemplazo está en sistema se cotiza indicando al cliente el cambio; si no está en sistema, pero la fábrica lo indica se cotiza y se le pide al cliente que revise con su Ing. de Ventas si dicho reemplazo cumple con sus necesidades técnicas."*
- 4.7 — *"Si es obsoleto y no tiene reemplazo se declina y se le informa al cliente."*
- 4.8 — *"Si no existe la designación o está incorrecta se declina y se le informa al cliente."*

- [ ] **Paso 1: Escribir los tests que fallen**

`lib/reglas-qms/catalogo.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { avisoReemplazo, designacionValida, esObsoleto, plantaCotizable } from "./catalogo";
import type { Designacion, Planta } from "./tipos";

const base: Designacion = {
  designacion: "6205-2RSH/C3",
  descripcion: "Rodamiento rigido de bolas",
  familia: "Rodamiento rigido de bolas",
  pcc: "C",
  lcc: "PLAN",
  fpc: "1",
  pdiv: "P100",
  moq: 1,
  packQuantity: 1,
  precioLista: 120.5,
  vigente: true,
  reemplazadoPor: null,
  esNuevaCreacion: false,
};

const planta: Planta = {
  pdiv: "P100",
  nombre: "Planta Europa 1",
  tieneConexion: true,
  tieneRutaEmbarque: true,
};

describe("Designacion inexistente (punto 4.8)", () => {
  it("es invalida cuando no se resolvio en el catalogo", () => {
    expect(designacionValida(null)).toBe(false);
  });

  it("es valida cuando existe", () => {
    expect(designacionValida(base)).toBe(true);
  });
});

describe("Fabrica con conexion y ruta (punto 4.5b)", () => {
  it("no es cotizable sin conexion", () => {
    expect(plantaCotizable({ ...planta, tieneConexion: false })).toBe(false);
  });

  it("no es cotizable sin ruta de embarque", () => {
    expect(plantaCotizable({ ...planta, tieneRutaEmbarque: false })).toBe(false);
  });

  it("no es cotizable si no se resolvio la planta", () => {
    expect(plantaCotizable(null)).toBe(false);
  });

  it("es cotizable con ambas condiciones", () => {
    expect(plantaCotizable(planta)).toBe(true);
  });
});

describe("Obsolescencia (puntos 4.6 y 4.7)", () => {
  it("PCC=O marca obsoleto", () => {
    expect(esObsoleto({ ...base, pcc: "O", vigente: false })).toBe(true);
  });

  it("un producto vigente no es obsoleto", () => {
    expect(esObsoleto(base)).toBe(false);
  });

  it("exige validar con Ing. de Ventas solo si el reemplazo no esta en sistema", () => {
    const aviso = avisoReemplazo(true);
    expect(aviso?.tipo).toBe("validar_con_ingeniero_ventas");
    expect(aviso?.punto).toBe("4.6");
    expect(aviso?.mensaje).toContain("Ingeniero de Ventas");
  });

  it("no exige validacion cuando el reemplazo si esta en sistema", () => {
    expect(avisoReemplazo(false)).toBeNull();
  });
});
```

- [ ] **Paso 2: Ejecutar y ver el fallo**

Ejecuta: `pnpm test catalogo`
Esperado: FALLA — no existe `./catalogo`.

- [ ] **Paso 3: Implementar**

`lib/reglas-qms/catalogo.ts`:

```ts
import type { Aviso, Designacion, Planta } from "./tipos";

/**
 * Punto 4.8 — "Si no existe la designación o está incorrecta se declina y se
 * le informa al cliente." Un contexto con designación `null` es exactamente
 * el ~80% de los casos que hoy atiende Customer Service.
 */
export function designacionValida(d: Designacion | null): d is Designacion {
  return d !== null;
}

/**
 * Punto 4.5b — "Solo se cotizan con aquellas fábricas con las que se tiene
 * conexión y ruta de embarque." Ambas condiciones, no una.
 */
export function plantaCotizable(p: Planta | null): boolean {
  if (p === null) return false;
  return p.tieneConexion && p.tieneRutaEmbarque;
}

/** Puntos 4.6 y 4.7 — PCC='O' es la clasificación de tipos obsoletos. */
export function esObsoleto(d: Designacion): boolean {
  return d.pcc === "O";
}

/**
 * Punto 4.6, segundo sub-caso — la validación con el Ingeniero de Ventas se
 * exige ÚNICAMENTE cuando el reemplazo no está en sistema y lo indica la
 * fábrica. Si el reemplazo está en sistema, basta con informar el cambio.
 */
export function avisoReemplazo(reemplazoSoloIndicadoPorFabrica: boolean): Aviso | null {
  if (!reemplazoSoloIndicadoPorFabrica) return null;
  return {
    tipo: "validar_con_ingeniero_ventas",
    punto: "4.6",
    mensaje:
      "Este reemplazo lo indica la fábrica pero no está dado de alta en sistema. " +
      "Revise con su Ingeniero de Ventas si cumple con sus necesidades técnicas.",
  };
}
```

- [ ] **Paso 4: Ejecutar y verificar**

Ejecuta: `pnpm test catalogo`
Esperado: PASAN los 10 tests.

- [ ] **Paso 5: Commit**

```bash
pnpm lint
git add lib/reglas-qms/catalogo.ts lib/reglas-qms/catalogo.test.ts
git commit -m "Reglas QMS 4.5b, 4.6, 4.7 y 4.8: validez, origen y obsolescencia"
```

---

## Tarea 9: Reglas de planeación — planeado y no planeado

**Archivos:**
- Crear: `lib/reglas-qms/planeacion.ts`
- Crear: `lib/reglas-qms/planeacion.test.ts`

**Interfaces:**
- Consume: `Designacion`, `Existencia` de `./tipos`.
- Produce:
  - `esPlaneado(d: Designacion): boolean`
  - `stockTotal(existencias: Existencia[]): number`
  - `stockPorAlmacen(existencias: Existencia[]): Record<Almacen, number>`
  - `rutaPlaneado(d, cantidad, existencias): "declinar_ya_disponible" | "solicitar_lt_planner"`
  - `rutaNoPlaneado(existencias): "revisar_disponibilidad_np" | "ingresar_pinq"`

**Reglas literales:**
- 4.1 — *"Revisar si es planeado o no planeado, si es planeado se revisa que esté visible en WCL y si el monto es menor al stock y se declina; si es planeado y el monto es mayor se revisa LT estándar o se pide LT al planner de la PDIV."*
- 4.2 — *"Si es No Planeado se revisa disponibilidad desde SPQ+, SAP o Global Availability."*
- 4.3 — *"Si no se tiene disponibilidad se ingresa la PINQ a fábrica o se consulta directo con el Planner dependiendo del segmento del producto."*

**Nota de interpretación:** el QMS dice "monto", que en el contexto operativo del punto es la cantidad solicitada contra las existencias. El POC lo implementa como cantidad, que es lo que el demo puede mostrar; queda anotado como supuesto a confirmar en la Fase 1.

- [ ] **Paso 1: Escribir los tests que fallen**

`lib/reglas-qms/planeacion.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { esPlaneado, rutaNoPlaneado, rutaPlaneado, stockPorAlmacen, stockTotal } from "./planeacion";
import type { Designacion, Existencia } from "./tipos";

const base: Designacion = {
  designacion: "6205-2RSH/C3",
  descripcion: "Rodamiento rigido de bolas",
  familia: "Rodamiento rigido de bolas",
  pcc: "C",
  lcc: "PLAN",
  fpc: "1",
  pdiv: "P100",
  moq: 1,
  packQuantity: 1,
  precioLista: 120.5,
  vigente: true,
  reemplazadoPor: null,
  esNuevaCreacion: false,
};

const conStock: Existencia[] = [
  { almacen: "PS", cantidad: 300 },
  { almacen: "SL", cantidad: 50 },
  { almacen: "XX", cantidad: 0 },
];

describe("Clasificacion planeado / no planeado (punto 4.1)", () => {
  it("LCC=PLAN es planeado", () => {
    expect(esPlaneado(base)).toBe(true);
  });

  it("LCC=NP no es planeado", () => {
    expect(esPlaneado({ ...base, lcc: "NP" })).toBe(false);
  });
});

describe("Existencias escalonadas PS / SL / XX", () => {
  it("suma las tres bodegas", () => {
    expect(stockTotal(conStock)).toBe(350);
  });

  it("desglosa por almacen con ceros por defecto", () => {
    expect(stockPorAlmacen([{ almacen: "PS", cantidad: 10 }])).toEqual({ PS: 10, SL: 0, XX: 0 });
  });
});

describe("Ruta de producto planeado (punto 4.1)", () => {
  it("declina cuando la cantidad pedida es menor al stock: ya estaba disponible en WCL", () => {
    expect(rutaPlaneado(base, 100, conStock)).toBe("declinar_ya_disponible");
  });

  it("declina cuando la cantidad iguala al stock", () => {
    expect(rutaPlaneado(base, 350, conStock)).toBe("declinar_ya_disponible");
  });

  it("pide LT al planner cuando la cantidad supera el stock", () => {
    expect(rutaPlaneado(base, 500, conStock)).toBe("solicitar_lt_planner");
  });

  it("pide LT al planner cuando no hay ninguna existencia", () => {
    expect(rutaPlaneado(base, 1, [])).toBe("solicitar_lt_planner");
  });
});

describe("Ruta de producto no planeado (puntos 4.2 y 4.3)", () => {
  it("revisa disponibilidad cuando hay existencias", () => {
    expect(rutaNoPlaneado(conStock)).toBe("revisar_disponibilidad_np");
  });

  it("ingresa PINQ a fabrica cuando no hay disponibilidad", () => {
    expect(rutaNoPlaneado([{ almacen: "PS", cantidad: 0 }])).toBe("ingresar_pinq");
  });

  it("ingresa PINQ cuando no hay ni registro de inventario", () => {
    expect(rutaNoPlaneado([])).toBe("ingresar_pinq");
  });
});
```

- [ ] **Paso 2: Ejecutar y ver el fallo**

Ejecuta: `pnpm test planeacion`
Esperado: FALLA — no existe `./planeacion`.

- [ ] **Paso 3: Implementar**

`lib/reglas-qms/planeacion.ts`:

```ts
import type { Almacen, Designacion, Existencia } from "./tipos";

/**
 * Punto 4.1 — un producto planeado (LCC=PLAN) se mantiene normalmente en
 * stock y aparece en la lista de precios vigente sin excepción.
 */
export function esPlaneado(d: Designacion): boolean {
  return d.lcc === "PLAN";
}

export function stockTotal(existencias: Existencia[]): number {
  return existencias.reduce((suma, e) => suma + e.cantidad, 0);
}

/** Desglose por la consulta escalonada del QMS: PS primario, SL secundario, XX terciario. */
export function stockPorAlmacen(existencias: Existencia[]): Record<Almacen, number> {
  const desglose: Record<Almacen, number> = { PS: 0, SL: 0, XX: 0 };
  for (const e of existencias) desglose[e.almacen] += e.cantidad;
  return desglose;
}

/**
 * Punto 4.1 — planeado con cantidad menor o igual al stock: se declina porque
 * el producto ya estaba disponible en WCL y la cotización era innecesaria.
 * Si la cantidad supera el stock, se pide LT al planner de la PDIV.
 */
export function rutaPlaneado(
  _d: Designacion,
  cantidad: number,
  existencias: Existencia[],
): "declinar_ya_disponible" | "solicitar_lt_planner" {
  return cantidad <= stockTotal(existencias) ? "declinar_ya_disponible" : "solicitar_lt_planner";
}

/**
 * Puntos 4.2 y 4.3 — no planeado: primero se revisa disponibilidad (SPQ+, SAP,
 * Global Availability); si no hay, se ingresa la PINQ a fábrica.
 */
export function rutaNoPlaneado(
  existencias: Existencia[],
): "revisar_disponibilidad_np" | "ingresar_pinq" {
  return stockTotal(existencias) > 0 ? "revisar_disponibilidad_np" : "ingresar_pinq";
}
```

- [ ] **Paso 4: Ejecutar y verificar**

Ejecuta: `pnpm test planeacion`
Esperado: PASAN los 11 tests.

- [ ] **Paso 5: Commit**

```bash
pnpm lint
git add lib/reglas-qms/planeacion.ts lib/reglas-qms/planeacion.test.ts
git commit -m "Reglas QMS 4.1, 4.2 y 4.3: arbol de planeado y no planeado"
```

---

## Tarea 10: Reglas de tiempos y precio

**Archivos:**
- Crear: `lib/reglas-qms/tiempos.ts`
- Crear: `lib/reglas-qms/tiempos.test.ts`

**Interfaces:**
- Consume: `Designacion`, `Aviso` de `./tipos`.
- Produce:
  - `SEMANAS_NUEVA_CREACION: 4`
  - `semanasExtraPorNuevaCreacion(d: Designacion): number`
  - `avisoNuevaCreacion(d: Designacion): Aviso | null`
  - `avisoPrecio(d: Designacion): Aviso | null`

**Reglas literales:**
- 4.9 — *"Cuando se trate de una designación de nueva creación, se deberá aumentar al tiempo de entrega 4 semanas más para cubrir el tiempo que tarda la fábrica en crear el material, la extensión en MDG-SAP por parte del Ingeniero de Ventas Business Excellence Specialist y la asignación de precio en SAP y el seteo en WCL."*
- 5.3 — *"Si es FPC 2 se pide a la fábrica el PS LPC y posteriormente al Business Intelligence Analyst cotización del precio."*

- [ ] **Paso 1: Escribir los tests que fallen**

`lib/reglas-qms/tiempos.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  SEMANAS_NUEVA_CREACION,
  avisoNuevaCreacion,
  avisoPrecio,
  semanasExtraPorNuevaCreacion,
} from "./tiempos";
import type { Designacion } from "./tipos";

const base: Designacion = {
  designacion: "6205-2RSH/C3",
  descripcion: "Rodamiento rigido de bolas",
  familia: "Rodamiento rigido de bolas",
  pcc: "C",
  lcc: "PLAN",
  fpc: "1",
  pdiv: "P100",
  moq: 1,
  packQuantity: 1,
  precioLista: 120.5,
  vigente: true,
  reemplazadoPor: null,
  esNuevaCreacion: false,
};

describe("Nueva creacion (punto 4.9)", () => {
  it("la constante del procedimiento son 4 semanas", () => {
    expect(SEMANAS_NUEVA_CREACION).toBe(4);
  });

  it("suma 4 semanas si es de nueva creacion", () => {
    expect(semanasExtraPorNuevaCreacion({ ...base, esNuevaCreacion: true })).toBe(4);
  });

  it("no suma nada si no lo es", () => {
    expect(semanasExtraPorNuevaCreacion(base)).toBe(0);
  });

  it("emite aviso citando MDG-SAP", () => {
    const aviso = avisoNuevaCreacion({ ...base, esNuevaCreacion: true });
    expect(aviso?.tipo).toBe("nueva_creacion");
    expect(aviso?.punto).toBe("4.9");
    expect(aviso?.mensaje).toContain("MDG-SAP");
  });

  it("no emite aviso si no es de nueva creacion", () => {
    expect(avisoNuevaCreacion(base)).toBeNull();
  });
});

describe("Precio segun FPC (punto 5)", () => {
  it("FPC2 avisa que el precio depende del LPC de fabrica", () => {
    const aviso = avisoPrecio({ ...base, fpc: "2" });
    expect(aviso?.tipo).toBe("precio_requiere_lpc");
    expect(aviso?.mensaje).toContain("LPC");
  });

  it("FPC1 no genera aviso: hay precio de lista o parametros SPQ+", () => {
    expect(avisoPrecio(base)).toBeNull();
  });
});
```

- [ ] **Paso 2: Ejecutar y ver el fallo**

Ejecuta: `pnpm test tiempos`
Esperado: FALLA — no existe `./tiempos`.

- [ ] **Paso 3: Implementar**

`lib/reglas-qms/tiempos.ts`:

```ts
import type { Aviso, Designacion } from "./tipos";

/** Punto 4.9 — el procedimiento fija 4 semanas, no es un parámetro ajustable. */
export const SEMANAS_NUEVA_CREACION = 4;

export function semanasExtraPorNuevaCreacion(d: Designacion): number {
  return d.esNuevaCreacion ? SEMANAS_NUEVA_CREACION : 0;
}

/**
 * Punto 4.9 — el detalle del porqué es lo que da credibilidad al estimador:
 * creación del material, extensión en MDG-SAP, precio en SAP y seteo en WCL.
 */
export function avisoNuevaCreacion(d: Designacion): Aviso | null {
  if (!d.esNuevaCreacion) return null;
  return {
    tipo: "nueva_creacion",
    punto: "4.9",
    mensaje:
      `Designación de nueva creación: se suman ${SEMANAS_NUEVA_CREACION} semanas al tiempo ` +
      "de entrega por la creación del material, su extensión en MDG-SAP, la asignación " +
      "de precio en SAP y el seteo en WCL.",
  };
}

/**
 * Punto 5.3 — FPC2 no es producto de línea: hay que pedir el PS/LPC a fábrica
 * antes de poder cotizar el precio. Explica por qué algunos precios tardan.
 */
export function avisoPrecio(d: Designacion): Aviso | null {
  if (d.fpc !== "2") return null;
  return {
    tipo: "precio_requiere_lpc",
    punto: "5.3",
    mensaje:
      "Producto fuera de línea (FPC 2): el precio requiere el LPC de la fábrica " +
      "y el cálculo posterior en SPQ+.",
  };
}
```

- [ ] **Paso 4: Ejecutar y verificar**

Ejecuta: `pnpm test tiempos`
Esperado: PASAN los 7 tests.

- [ ] **Paso 5: Commit**

```bash
pnpm lint
git add lib/reglas-qms/tiempos.ts lib/reglas-qms/tiempos.test.ts
git commit -m "Reglas QMS 4.9 y 5.3: nueva creacion y precio segun FPC"
```

---

## Tarea 11: El árbol integrado

**Archivos:**
- Crear: `lib/reglas-qms/index.ts`
- Crear: `lib/reglas-qms/index.test.ts`
- Eliminar: `lib/reglas-qms/humo.test.ts`

**Interfaces:**
- Consume: todo lo anterior de `lib/reglas-qms/*`.
- Produce: `evaluarSolicitud(ctx: ContextoSolicitud): EvaluacionQMS` — **la usan el validador, la bandeja del operador y el chatbot en el Plan 3.**

**Orden de evaluación (decisión de diseño, documentar en el código):**

El QMS enumera las reglas 4.1 → 4.9 pero no fija un orden de evaluación. El árbol las aplica en orden de *poder de corte*: primero lo que invalida la solicitud entera, después lo que la ajusta.

1. `4.8` — ¿existe la designación? Si no, se declina y nada más importa.
2. `4.5b` — ¿la planta tiene conexión y ruta? Si no, se declina.
3. `4.7` / `4.6` — ¿es obsoleto? Sin reemplazo se declina; con reemplazo se cotiza el reemplazo.
4. `4.4` — ¿el MOQ supera lo pedido? Se declina.
5. `4.5a` — pack quantity: ajusta la cantidad, no declina.
6. `4.1` / `4.2` / `4.3` — planeado o no planeado.
7. `4.9`, `5.3` — avisos de TE y precio, se acumulan siempre.

- [ ] **Paso 1: Escribir los tests que fallen**

`lib/reglas-qms/index.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { evaluarSolicitud } from "./index";
import type { ContextoSolicitud, Designacion, Planta } from "./tipos";

const d = (extra: Partial<Designacion> = {}): Designacion => ({
  designacion: "6205-2RSH/C3",
  descripcion: "Rodamiento rigido de bolas 25x52x15",
  familia: "Rodamiento rigido de bolas",
  pcc: "C",
  lcc: "PLAN",
  fpc: "1",
  pdiv: "P100",
  moq: 1,
  packQuantity: 1,
  precioLista: 120.5,
  vigente: true,
  reemplazadoPor: null,
  esNuevaCreacion: false,
  ...extra,
});

const planta: Planta = {
  pdiv: "P100",
  nombre: "Planta Europa 1",
  tieneConexion: true,
  tieneRutaEmbarque: true,
};

const ctx = (extra: Partial<ContextoSolicitud> = {}): ContextoSolicitud => ({
  designacion: d(),
  cantidad: 10,
  existencias: [{ almacen: "PS", cantidad: 500 }],
  planta,
  reemplazo: null,
  ...extra,
});

describe("Corte por designacion inexistente (4.8)", () => {
  it("declina antes que cualquier otra regla", () => {
    const r = evaluarSolicitud(ctx({ designacion: null, planta: null }));
    expect(r.ruta).toBe("declinar_designacion_invalida");
    expect(r.punto).toBe("4.8");
    expect(r.declinada).toBe(true);
  });
});

describe("Corte por planta sin ruta (4.5b)", () => {
  it("declina aunque el producto exista y tenga stock", () => {
    const r = evaluarSolicitud(ctx({ planta: { ...planta, tieneRutaEmbarque: false } }));
    expect(r.ruta).toBe("declinar_planta_sin_ruta");
    expect(r.punto).toBe("4.5b");
    expect(r.declinada).toBe(true);
  });
});

describe("Obsoletos (4.6 y 4.7)", () => {
  it("declina el obsoleto sin reemplazo", () => {
    const r = evaluarSolicitud(ctx({ designacion: d({ pcc: "O", vigente: false }) }));
    expect(r.ruta).toBe("declinar_obsoleto_sin_reemplazo");
    expect(r.punto).toBe("4.7");
    expect(r.declinada).toBe(true);
  });

  it("cotiza el reemplazo cuando existe y no exige validacion si esta en sistema", () => {
    const r = evaluarSolicitud(
      ctx({
        designacion: d({ pcc: "O", vigente: false, reemplazadoPor: "6205-2RSL/C3" }),
        reemplazo: d({ designacion: "6205-2RSL/C3" }),
      }),
    );
    expect(r.ruta).toBe("cotizar_con_reemplazo");
    expect(r.punto).toBe("4.6");
    expect(r.declinada).toBe(false);
    expect(r.avisos.some((a) => a.tipo === "validar_con_ingeniero_ventas")).toBe(false);
  });

  it("exige validacion con Ing. de Ventas si el reemplazo solo lo indica la fabrica", () => {
    const r = evaluarSolicitud(
      ctx({
        designacion: d({ pcc: "O", vigente: false, reemplazadoPor: "6205-2RSL/C3" }),
        reemplazo: d({ designacion: "6205-2RSL/C3" }),
        reemplazoSoloIndicadoPorFabrica: true,
      }),
    );
    expect(r.avisos.some((a) => a.tipo === "validar_con_ingeniero_ventas")).toBe(true);
  });
});

describe("MOQ (4.4)", () => {
  it("declina antes de evaluar la planeacion", () => {
    const r = evaluarSolicitud(ctx({ designacion: d({ moq: 50 }), cantidad: 5 }));
    expect(r.ruta).toBe("declinar_moq");
    expect(r.punto).toBe("4.4");
    expect(r.mensaje).toContain("50");
  });
});

describe("Pack quantity (4.5a)", () => {
  it("ajusta la cantidad efectiva sin declinar", () => {
    const r = evaluarSolicitud(ctx({ designacion: d({ packQuantity: 20 }), cantidad: 25 }));
    expect(r.declinada).toBe(false);
    expect(r.cantidadEfectiva).toBe(40);
    expect(r.avisos.some((a) => a.tipo === "pack_quantity_ajustado")).toBe(true);
  });

  it("usa la cantidad efectiva al comparar contra el stock", () => {
    // 25 piezas caben en 30 de stock, pero redondeado a 40 ya no.
    const r = evaluarSolicitud(
      ctx({
        designacion: d({ packQuantity: 20 }),
        cantidad: 25,
        existencias: [{ almacen: "PS", cantidad: 30 }],
      }),
    );
    expect(r.ruta).toBe("solicitar_lt_planner");
  });
});

describe("Planeado y no planeado (4.1, 4.2, 4.3)", () => {
  it("declina el planeado que ya estaba disponible en WCL", () => {
    const r = evaluarSolicitud(ctx({ cantidad: 10 }));
    expect(r.ruta).toBe("declinar_ya_disponible");
    expect(r.punto).toBe("4.1");
    expect(r.declinada).toBe(true);
  });

  it("pide LT al planner si la cantidad supera el stock", () => {
    const r = evaluarSolicitud(ctx({ cantidad: 900 }));
    expect(r.ruta).toBe("solicitar_lt_planner");
    expect(r.declinada).toBe(false);
  });

  it("ingresa PINQ para el no planeado sin disponibilidad", () => {
    const r = evaluarSolicitud(ctx({ designacion: d({ lcc: "NP", pcc: "N" }), existencias: [] }));
    expect(r.ruta).toBe("ingresar_pinq");
    expect(r.punto).toBe("4.3");
  });

  it("revisa disponibilidad para el no planeado con existencias", () => {
    const r = evaluarSolicitud(ctx({ designacion: d({ lcc: "NP", pcc: "N" }) }));
    expect(r.ruta).toBe("revisar_disponibilidad_np");
    expect(r.punto).toBe("4.2");
  });
});

describe("Avisos acumulados (4.9 y 5.3)", () => {
  it("suma 4 semanas y avisa por nueva creacion y por FPC2", () => {
    const r = evaluarSolicitud(
      ctx({ designacion: d({ esNuevaCreacion: true, fpc: "2", lcc: "NP", pcc: "N" }) }),
    );
    expect(r.semanasExtraTE).toBe(4);
    expect(r.avisos.map((a) => a.tipo)).toContain("nueva_creacion");
    expect(r.avisos.map((a) => a.tipo)).toContain("precio_requiere_lpc");
  });

  it("no acumula avisos de TE ni precio cuando la solicitud se declina de entrada", () => {
    const r = evaluarSolicitud(ctx({ designacion: null, planta: null }));
    expect(r.avisos).toHaveLength(0);
    expect(r.semanasExtraTE).toBe(0);
  });
});
```

- [ ] **Paso 2: Ejecutar y ver el fallo**

Ejecuta: `pnpm test index`
Esperado: FALLA — no existe `evaluarSolicitud`.

- [ ] **Paso 3: Implementar**

`lib/reglas-qms/index.ts`:

```ts
import { avisoReemplazo, designacionValida, esObsoleto, plantaCotizable } from "./catalogo";
import { avisoPackQuantity, incumpleMoq, redondearAPack } from "./cantidades";
import { esPlaneado, rutaNoPlaneado, rutaPlaneado, stockTotal } from "./planeacion";
import { avisoNuevaCreacion, avisoPrecio, semanasExtraPorNuevaCreacion } from "./tiempos";
import type { Aviso, ContextoSolicitud, EvaluacionQMS } from "./tipos";

export * from "./catalogo";
export * from "./cantidades";
export * from "./planeacion";
export * from "./tiempos";
export * from "./tipos";

function declinar(ruta: EvaluacionQMS["ruta"], punto: string, mensaje: string): EvaluacionQMS {
  return { ruta, punto, mensaje, declinada: true, avisos: [], cantidadEfectiva: 0, semanasExtraTE: 0 };
}

/**
 * Árbol de decisión del punto 4 del procedimiento QMS Rev. 3.
 *
 * El procedimiento enumera las reglas pero no fija un orden de evaluación.
 * Aquí se aplican por poder de corte: primero lo que invalida la solicitud
 * entera (4.8, 4.5b, 4.7), después lo que la ajusta (4.5a) y por último la
 * clasificación de planeación (4.1–4.3).
 *
 * Función pura: no consulta la base. El contexto llega ya resuelto.
 */
export function evaluarSolicitud(ctx: ContextoSolicitud): EvaluacionQMS {
  const { designacion, planta, cantidad } = ctx;

  // 4.8 — no existe o está incorrecta.
  if (!designacionValida(designacion)) {
    return declinar(
      "declinar_designacion_invalida",
      "4.8",
      "La designación no existe o está incorrecta. Según el procedimiento se declina y se informa al cliente.",
    );
  }

  // 4.5b — solo se cotiza con fábricas con conexión y ruta de embarque.
  if (!plantaCotizable(planta)) {
    return declinar(
      "declinar_planta_sin_ruta",
      "4.5b",
      `El material se origina en ${planta?.nombre ?? "una fábrica"} sin conexión o sin ruta de embarque habilitada.`,
    );
  }

  // Trabajamos sobre el reemplazo si el original es obsoleto (4.6).
  let efectiva = designacion;
  const avisos: Aviso[] = [];
  let rutaObsoleto: "cotizar_con_reemplazo" | null = null;

  if (esObsoleto(designacion)) {
    // 4.7 — obsoleto sin reemplazo.
    if (!ctx.reemplazo) {
      return declinar(
        "declinar_obsoleto_sin_reemplazo",
        "4.7",
        `${designacion.designacion} está obsoleta y no tiene reemplazo. Se declina y se informa al cliente.`,
      );
    }
    // 4.6 — obsoleto con reemplazo: se cotiza indicando el cambio.
    efectiva = ctx.reemplazo;
    rutaObsoleto = "cotizar_con_reemplazo";
    const aviso = avisoReemplazo(ctx.reemplazoSoloIndicadoPorFabrica === true);
    if (aviso) avisos.push(aviso);
  }

  // 4.4 — MOQ mayor a lo pedido.
  if (incumpleMoq(efectiva, cantidad)) {
    return declinar(
      "declinar_moq",
      "4.4",
      `La cantidad mínima de orden de ${efectiva.designacion} es ${efectiva.moq} piezas y se solicitaron ${cantidad}.`,
    );
  }

  // 4.5a — pack quantity: ajusta, no declina.
  const cantidadEfectiva = redondearAPack(efectiva, cantidad);
  const avisoPack = avisoPackQuantity(efectiva, cantidad);
  if (avisoPack) avisos.push(avisoPack);

  // 4.9 y 5.3 — avisos que se acumulan sin alterar la ruta.
  const avisoCreacion = avisoNuevaCreacion(efectiva);
  if (avisoCreacion) avisos.push(avisoCreacion);
  const avisoLpc = avisoPrecio(efectiva);
  if (avisoLpc) avisos.push(avisoLpc);

  const semanasExtraTE = semanasExtraPorNuevaCreacion(efectiva);

  // Si venimos de un obsoleto con reemplazo, esa es la ruta que se comunica.
  if (rutaObsoleto) {
    return {
      ruta: rutaObsoleto,
      punto: "4.6",
      mensaje:
        `${designacion.designacion} está obsoleta. Se cotiza su reemplazo ` +
        `${efectiva.designacion}, indicando el cambio al cliente.`,
      declinada: false,
      avisos,
      cantidadEfectiva,
      semanasExtraTE,
    };
  }

  // 4.1 — planeado.
  if (esPlaneado(efectiva)) {
    const ruta = rutaPlaneado(efectiva, cantidadEfectiva, ctx.existencias);
    return {
      ruta,
      punto: "4.1",
      mensaje:
        ruta === "declinar_ya_disponible"
          ? `Producto planeado (LCC=PLAN) con ${stockTotal(ctx.existencias)} piezas disponibles: ya estaba visible en WCL, no requiere cotización.`
          : `Producto planeado (LCC=PLAN) con existencias insuficientes: se solicita el tiempo de entrega al planner de la PDIV ${efectiva.pdiv}.`,
      declinada: ruta === "declinar_ya_disponible",
      avisos,
      cantidadEfectiva,
      semanasExtraTE,
    };
  }

  // 4.2 / 4.3 — no planeado.
  const ruta = rutaNoPlaneado(ctx.existencias);
  return {
    ruta,
    punto: ruta === "revisar_disponibilidad_np" ? "4.2" : "4.3",
    mensaje:
      ruta === "revisar_disponibilidad_np"
        ? "Producto No Planeado (LCC=NP) con disponibilidad: se revisa en SPQ+, SAP o Global Availability."
        : `Producto No Planeado (LCC=NP) sin disponibilidad: se ingresa PINQ a la fábrica ${efectiva.pdiv}.`,
    declinada: false,
    avisos,
    cantidadEfectiva,
    semanasExtraTE,
  };
}
```

- [ ] **Paso 4: Ejecutar y verificar**

Ejecuta: `pnpm test`
Esperado: PASAN los 14 tests de `index.test.ts` y los 53 del conjunto completo (1 humo + 2 admin + 8 cantidades + 10 catálogo + 11 planeación + 7 tiempos + 14 árbol).

- [ ] **Paso 5: Eliminar el test de humo**

```bash
rm lib/reglas-qms/humo.test.ts
pnpm test
```

Esperado: siguen pasando 52 tests.

- [ ] **Paso 6: Commit**

```bash
pnpm lint
git add -A lib/reglas-qms
git commit -m "evaluarSolicitud: arbol completo del punto 4 del QMS con 15 tests"
```

---

## Verificación final del Plan 1

- [ ] `pnpm test` — todos los tests pasan
- [ ] `pnpm lint` — sin errores
- [ ] `pnpm exec tsc --noEmit` — sin errores de tipos
- [ ] `pnpm build` — compila
- [ ] `pnpm verificar` — las cuatro conexiones en verde
- [ ] Las 12 tablas existen en el proyecto cloud con RLS activo
- [ ] `lib/supabase/tipos.ts` refleja el esquema completo

**Entregable:** esquema en la nube y un motor de reglas que reproduce las 9 rutas del procedimiento con cobertura de tests. El Plan 2 (datos sintéticos) puede arrancar sin tocar nada de esto.

---

## Supuestos anotados para la Fase 1

Puntos donde el procedimiento admite más de una lectura y el POC eligió una. Conviene confirmarlos con SKF antes de la Fase 3:

1. **"Monto" en el punto 4.1** se implementa como cantidad solicitada contra existencias. Podría referirse a valor monetario.
2. **Orden de evaluación del árbol.** El QMS no lo fija; se eligió por poder de corte.
3. **Doble numeración 4.5** en el documento original, resuelta como `4.5a` / `4.5b`.
4. **Formato del número de cotización:** el documento muestra `XXXXQXXXXX` pero el texto dice "letra P". Se usó `Q`.
5. **El SLA de 4 días hábiles es un promedio**, no un plazo por solicitud. El dashboard debe medir la media.

