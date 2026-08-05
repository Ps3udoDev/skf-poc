-- ============================================================================
-- 010 · Numeración propia para las solicitudes del demo: AAAAS#####
-- ----------------------------------------------------------------------------
-- Hasta aquí `solicitudes` y `cotizaciones` compartían el formato AAAAQ#####
-- (migración 005). Son dos tablas distintas —el histórico sintético inmutable
-- y lo que nace durante la sesión— y el prefijo común tenía dos consecuencias
-- malas:
--
--   1. Un cliente que recibía «2026Q56310» del portal y preguntaba por él en el
--      chat obtenía «no existe»: la herramienta consultarCotizacion lee
--      `cotizaciones`, donde ese número efectivamente no está.
--   2. `generarSolicitud()` sortea 5 dígitos y solo comprueba unicidad DENTRO
--      de `solicitudes`. Un número podía coincidir con el de una cotización
--      sembrada del mismo año, y entonces el chat habría respondido con los
--      datos de otro cliente y otra designación sin forma de notarlo.
--
-- Cambiar el prefijo elimina la ambigüedad de raíz y hace imposible la colisión
-- por construcción.
-- ============================================================================

-- ── 1. Soltar la restricción vieja ──────────────────────────────────────────
-- Va PRIMERO: el CHECK de la migración 005 solo admite Q, así que renumerar con
-- él puesto falla en la primera fila.
alter table solicitudes
  drop constraint solicitudes_numero_formato;

-- ── 2. Renumerar lo que exista ──────────────────────────────────────────────
-- `solicitudes` es dato de sesión (reiniciarSesion() la vacía), pero se
-- reescribe en vez de borrarse. La sustitución del quinto carácter es biyectiva
-- sobre el conjunto, así que no puede introducir duplicados.
update solicitudes
  set numero = overlay(numero placing 'S' from 5 for 1)
  where numero ~ '^\d{4}Q\d{5}$';

-- ── 3. Imponer el formato nuevo ─────────────────────────────────────────────
alter table solicitudes
  add constraint solicitudes_numero_formato
  check (numero ~ '^\d{4}S\d{5}$');

-- `cotizaciones` conserva AAAAQ#####: el histórico no se toca.

comment on column solicitudes.numero is
  'Formato AAAAS##### (año de 4 dígitos + S + consecutivo de 5 dígitos). La S '
  'lo distingue del número de cotización del histórico (AAAAQ#####): son tablas '
  'distintas y el prefijo compartido permitía colisiones silenciosas.';
