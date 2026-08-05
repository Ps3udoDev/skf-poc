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
