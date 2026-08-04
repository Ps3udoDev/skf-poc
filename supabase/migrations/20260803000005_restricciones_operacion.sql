-- ============================================================================
-- 005 · Restricciones faltantes sobre operación (ronda de arreglo Tarea 3)
-- ----------------------------------------------------------------------------
-- 20260803000003_operacion.sql ya está aplicada y no se toca. Estas
-- restricciones se agregan aparte porque la siembra sintética del Plan 2
-- (~9.000 cotizaciones) depende de que los rangos estén acotados antes de
-- insertar, y porque el formato de número de cotización es una restricción
-- global del proyecto (AAAAQ#####) que ninguna migración anterior imponía.
-- ============================================================================

-- ── 1. Formato de numero: AAAAQ##### (año de 4 dígitos + Q + consecutivo de 5) ─

alter table cotizaciones
  add constraint cotizaciones_numero_formato
  check (numero ~ '^\d{4}Q\d{5}$');

alter table solicitudes
  add constraint solicitudes_numero_formato
  check (numero ~ '^\d{4}Q\d{5}$');

-- ── 2. Cotas de rango para la siembra sintética ──────────────────────────────

alter table cotizaciones
  add constraint cotizaciones_cantidad_positiva
  check (cantidad > 0);

alter table solicitudes
  add constraint solicitudes_cantidad_positiva
  check (cantidad > 0);

-- Factor de descuento, no porcentaje: vive en [0, 1].
alter table clientes
  add constraint clientes_descuento_rango
  check (descuento >= 0 and descuento <= 1);

-- ── 3. Simetria con cotizaciones.declinada_tiene_motivo ──────────────────────
-- A diferencia de cotizaciones, una solicitud puede seguir sin atender
-- (resultado y motivo_declinado ambos nulos). Solo cuando ya tiene resultado
-- exigimos la bicondicional: declinada <=> motivo_declinado no nulo.
alter table solicitudes
  add constraint solicitudes_declinada_tiene_motivo
  check (
    (resultado is null and motivo_declinado is null)
    or (resultado is not null and (resultado = 'declinada') = (motivo_declinado is not null))
  );

-- ── 4. Comentarios persistidos sobre el formato de numero ───────────────────

comment on column cotizaciones.numero is
  'Formato AAAAQ##### (año de 4 dígitos + Q + consecutivo de 5 dígitos).';

comment on column solicitudes.numero is
  'Formato AAAAQ##### (año de 4 dígitos + Q + consecutivo de 5 dígitos), tal como lo genera el flujo del demo.';
