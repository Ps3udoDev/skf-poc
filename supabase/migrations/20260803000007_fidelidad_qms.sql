-- ============================================================================
-- 007 · Fidelidad al QMS Rev. 3 (ronda de revisión final de la rama)
-- ----------------------------------------------------------------------------
-- Las migraciones 000001–000006 ya están aplicadas y no se tocan. Esta ronda
-- corrige tres discrepancias entre el esquema y el texto literal del
-- procedimiento "Consultas y Cotizaciones" Rev. 3, más cuatro restricciones
-- menores. Se hace ahora, con las tablas vacías, porque el Plan 2 siembra
-- ~30.000 designaciones y ~9.000 cotizaciones: cualquier cambio de columna
-- posterior obligaría a una re-siembra completa.
-- ============================================================================

-- ── 1. Punto 4.6, segundo sub-caso: el reemplazo que solo indica la fábrica ──
-- Texto literal: "En caso de que el producto sea obsoleto y tenga reemplazo, si
-- el reemplazo está en sistema se cotiza indicando al cliente el cambio; si no
-- está en sistema, pero la fábrica lo indica se cotiza y se le pide al cliente
-- que revise con su Ing. de Ventas si dicho reemplazo cumple con sus
-- necesidades técnicas."
--
-- Son DOS sub-casos. `reemplazado_por` (FK a designaciones) solo puede
-- representar el primero: obliga a que el reemplazo exista en el catálogo. El
-- segundo era inalcanzable con datos reales y caía en el 4.7, que manda lo
-- contrario.

alter table designaciones
  add column reemplazo_indicado_fabrica text;

comment on column designaciones.reemplazo_indicado_fabrica is
  'Punto 4.6, SEGUNDO sub-caso: el código de reemplazo que la fábrica indica pero que NO está dado de alta en sistema. Deliberadamente sin clave foránea a designaciones: por definición ese código no está en el catálogo, y una FK haría el sub-caso inalcanzable. El primer sub-caso (reemplazo en sistema) lo cubre reemplazado_por. Cuando este campo no es nulo se cotiza y se pide al cliente validar con su Ing. de Ventas.';

-- ── 2. Punto 4.3: la rama del Planner según el segmento del producto ────────
-- Texto literal: "Si no se tiene disponibilidad se ingresa la PINQ a fábrica o
-- se consulta directo con el Planner dependiendo del segmento del producto."
--
-- El propio QMS respalda la distinción en sus definiciones: "PT Inquery:
-- Herramienta vía Internet que se utiliza para las solicitudes de TE y PS de
-- las designaciones de Power Transmission", frente a "OPI/PINQ Operational
-- Inquiry" para el resto.

create type segmento_producto as enum ('rodamiento', 'power_transmission');

alter table designaciones
  add column segmento segmento_producto not null default 'rodamiento';

comment on column designaciones.segmento is
  'Punto 4.3: sin disponibilidad, "se ingresa la PINQ a fábrica o se consulta directo con el Planner dependiendo del segmento del producto". power_transmission usa PT Inquery y va al Planner; el resto va por OPI/PINQ a fábrica.';

create index designaciones_segmento on designaciones (segmento);

-- ── 3. El FPC 2 no tiene Precio de Lista ────────────────────────────────────
-- El QMS define "FPC 2: No son productos de Línea. Tipos con PS en función del
-- volumen de venta y producción de la planta" — su precio sale del LPC de
-- fábrica, no de la Lista de Precios. Y el punto 5.2 contempla explícitamente
-- para FPC 1 el caso "si no tenemos precio se cotiza bajo los parámetros de
-- SPQ+". Un NOT NULL obligaba a inventar un precio para ambos casos.

alter table designaciones
  alter column precio_lista drop not null;

comment on column designaciones.precio_lista is
  'Nulo cuando la designación no tiene Precio de Lista publicado: es la norma en FPC 2 (no son productos de Línea) y ocurre también en FPC 1 según el punto 5.2 ("si no tenemos precio se cotiza bajo los parámetros de SPQ+").';

-- ── 4. Restricciones menores de integridad ──────────────────────────────────

-- Un multiplicador de desempeño <= 0 rompería el estimador de TE en silencio:
-- devolvería cero o semanas negativas sin que nada fallara.
alter table plantas
  add constraint plantas_desempeno_te_positivo
  check (desempeno_te > 0);

-- Contraparte de cotizada_tiene_te: una cotización cerrada como 'cotizada' sin
-- precio no es una cotización.
alter table cotizaciones
  add constraint cotizada_tiene_precio
  check (resultado <> 'cotizada' or precio is not null);

-- Mismas cotas que inventario.cantidad_no_negativa y
-- cotizaciones.cantidad_positiva, que las migraciones 002 y 005 sí imponían.
alter table snapshot_inventario
  add constraint snapshot_cantidad_no_negativa
  check (cantidad >= 0);

alter table intenciones_pedido
  add constraint intenciones_cantidad_positiva
  check (cantidad > 0);
