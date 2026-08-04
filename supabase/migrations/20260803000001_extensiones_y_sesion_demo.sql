-- ============================================================================
-- 001 · Extensiones base y estado de la sesión de demostración
-- ----------------------------------------------------------------------------
-- Diseño: docs/superpowers/specs/2026-08-03-poc-skf-design.md §5
--
-- El panel del presentador (/demo) se opera desde una segunda pantalla y debe
-- controlar en vivo lo que se ve en la pantalla proyectada. Por eso el estado
-- del demo vive en la base y no en el navegador: se propaga por Realtime,
-- sobrevive a un refresh accidental y permite operar desde otra máquina.
-- ============================================================================

-- Búsqueda difusa de designaciones (§8, cascada del validador, estrategia 4).
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

-- ── Estado de la sesión ──────────────────────────────────────────────────────

create type modo_demo as enum ('hoy', 'solucion');

create table sesion_demo (
  id                smallint primary key default 1,

  -- El eje narrativo de toda la presentación: modo "hoy" contra "con solución".
  modo              modo_demo   not null default 'hoy',

  -- {planta_id: 'online' | 'ventana' | 'reactivando'}
  -- Override manual del presentador sobre el calendario de ventanas.
  plantas_override  jsonb       not null default '{}'::jsonb,

  -- Offset contra la hora real, NO una hora absoluta: así el reloj simulado
  -- sigue corriendo solo después de cada salto que da el presentador.
  reloj_offset_min  integer     not null default 0,

  -- Escenario precargado activo (docs/04_datos_demo.md §4).
  escenario_activo  text,

  -- Marca de reinicio. Los contadores del dashboard leen únicamente eventos
  -- posteriores a esta fecha, de modo que reiniciar la sesión entre dos
  -- presentaciones del mismo día no borra el histórico sintético.
  iniciada_en       timestamptz not null default now(),

  actualizado_en    timestamptz not null default now(),

  -- Fila única: el POC tiene una sola sesión de demostración activa.
  constraint sesion_demo_fila_unica check (id = 1)
);

comment on table sesion_demo is
  'Estado de la sesión de demostración. Fila única, escrita por /demo con service role y leída por el resto de la app vía Realtime.';

create or replace function tocar_actualizado_en()
returns trigger
language plpgsql
as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;

create trigger sesion_demo_actualizado_en
  before update on sesion_demo
  for each row execute function tocar_actualizado_en();

insert into sesion_demo (id) values (1);

-- ── Acceso ───────────────────────────────────────────────────────────────────
-- Lectura pública: el portal, la bandeja y el dashboard necesitan conocer el
-- modo activo. La escritura queda reservada a las Server Actions de /demo, que
-- usan la clave service_role y por tanto no pasan por RLS.

alter table sesion_demo enable row level security;

create policy "lectura publica del estado del demo"
  on sesion_demo for select
  to anon, authenticated
  using (true);

-- ── Realtime ─────────────────────────────────────────────────────────────────
-- Sin esto el interruptor del presentador no se propaga a la pantalla proyectada.

alter publication supabase_realtime add table sesion_demo;
alter table sesion_demo replica identity full;
