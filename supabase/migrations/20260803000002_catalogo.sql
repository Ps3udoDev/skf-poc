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
