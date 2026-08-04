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
