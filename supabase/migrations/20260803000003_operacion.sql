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
