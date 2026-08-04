-- ============================================================================
-- 008 · Búsqueda difusa expuesta a la aplicación e índices de consulta inversa
-- ----------------------------------------------------------------------------
-- PostgREST no expone similarity() de pg_trgm. Sin estas funciones el validador
-- tendría que traerse el catálogo al navegador o filtrar con ilike, que no
-- resuelve transposiciones de caracteres — justamente el error de captura que
-- la escena 2 del guion tiene que corregir en vivo.
--
-- Los tres índices son los que el Plan 1 dejó anotados como ausentes a
-- propósito, para añadirlos cuando existieran los patrones de consulta reales.
-- Ya existen: el validador resuelve reemplazos, la confirmación guiada recorre
-- homólogos en sentido inverso y el estado de fábricas agrupa por planta dueña.
-- ============================================================================

-- Estrategia 4 de la cascada: similitud por trigramas.
create or replace function buscar_similares(consulta text, limite int default 5)
returns table (designacion text, puntaje real)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select d.designacion, similarity(d.designacion, consulta) as puntaje
  from designaciones d
  where d.designacion % consulta
  order by similarity(d.designacion, consulta) desc, d.designacion
  limit greatest(limite, 1);
$$;

comment on function buscar_similares is
  'Estrategia 4 del validador. Devuelve las designaciones más parecidas por trigramas, ordenadas por puntaje. El umbral es el de pg_trgm (0.3 por defecto).';

-- Estrategia 3: captura incompleta. El texto es prefijo de designaciones
-- válidas — el caso del copiado truncado desde Word.
create or replace function buscar_por_prefijo(prefijo text, limite int default 5)
returns table (designacion text)
language sql
stable
security invoker
set search_path = public
as $$
  select d.designacion
  from designaciones d
  where d.designacion like prefijo || '%'
    and d.designacion <> prefijo
  order by length(d.designacion), d.designacion
  limit greatest(limite, 1);
$$;

comment on function buscar_por_prefijo is
  'Estrategia 3 del validador: detección de captura incompleta. Excluye la coincidencia exacta, que ya resolvió la estrategia 1.';

grant execute on function buscar_similares(text, int) to anon, authenticated;
grant execute on function buscar_por_prefijo(text, int) to anon, authenticated;

-- ── Índices de consulta inversa ──────────────────────────────────────────────
-- No re-añadir inventario_designacion ni homologos_origen: son redundantes
-- conocidos y están documentados como deuda consciente.

create index if not exists homologos_equivalente on homologos (equivalente);
create index if not exists inventario_pdiv_dueno on inventario (pdiv_dueno);
create index if not exists designaciones_reemplazado_por on designaciones (reemplazado_por);
