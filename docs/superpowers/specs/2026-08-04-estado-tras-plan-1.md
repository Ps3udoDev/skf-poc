# Estado tras el Plan 1 — restricciones que hereda el Plan 2

**Fecha:** 2026-08-04
**Rama:** `plan-1-esquema-y-reglas-qms` · 22 commits · 69 tests
**Precede a:** Plan 2 (datos sintéticos) y Plan 3 (motores y pantallas)

Este documento recoge lo que la ejecución del Plan 1 dejó fijado y que condiciona los planes siguientes. Se escribió al cerrar la rama porque el espacio de trabajo de ejecución (`.superpowers/`) se elimina y su contenido no se versiona.

---

## 1. Lo que está entregado y verificado

**Base de datos** — Supabase cloud, Postgres 17.6, proyecto `skf-poc` en `us-east-1`.

12 tablas, todas con RLS activo y política de solo lectura para `anon`. Verificado empíricamente con la llave anónima: lee las 12, no puede escribir en ninguna. Todas las escrituras irán por Server Actions con `service_role`.

Migraciones aplicadas: `000001`, `000002`, `000003`, `000005`, `000006`, `000007`. **El hueco en `000004` es deliberado** — una ronda de arreglo consumió el `005` antes de que se escribiera el `004`, y renumerar habría roto el orden del historial remoto. No lo rellenes.

**Motor de reglas** — `lib/reglas-qms/`, función pura sin dependencias de base de datos. Cubre las 10 rutas del punto 4 del procedimiento QMS Rev. 3, con 69 tests.

**Conexión** — `pnpm verificar` comprueba REST, base de datos, propagación por Realtime y enrutado del modelo por AI Gateway. Correrlo antes de cada sesión de trabajo y antes de cada presentación.

---

## 2. Restricciones que el generador de datos debe respetar

Estas no son recomendaciones: son restricciones `CHECK` activas en la base. Violarlas hace fallar la inserción.

| Restricción | Qué exige |
|---|---|
| `cotizaciones_numero_formato` · `solicitudes_numero_formato` | El número debe casar `^\d{4}Q\d{5}$` |
| `cotizaciones_cantidad_positiva` · `solicitudes_cantidad_positiva` | `cantidad > 0` |
| `clientes_descuento_rango` | `descuento` en `[0, 1]` — es un factor, no un porcentaje |
| `cotizada_tiene_te` | Una cotización `'cotizada'` debe llevar `te_semanas` |
| `cotizada_tiene_precio` | Una cotización `'cotizada'` debe llevar `precio` |
| `declinada_tiene_motivo` | `resultado = 'declinada'` ⟺ `motivo_declinado` no nulo |
| `solicitudes_declinada_tiene_motivo` | Igual, pero admite el estado sin atender (ambos nulos) |
| `plantas_desempeno_te_positivo` | El multiplicador de TE debe ser `> 0` |
| `obsoleto_no_vigente` | `pcc = 'O'` ⟺ `vigente = false` |
| `moq_positivo` · `pack_positivo` | `>= 1` |
| `cantidad_no_negativa` · `snapshot_cantidad_no_negativa` | `>= 0` |
| `intenciones_cantidad_positiva` | `> 0` |
| `homologo_no_reflexivo` | Una designación no es homóloga de sí misma |

---

## 3. Dos columnas que el sembrador debe llenar explícitamente

Ambas tienen valor por defecto, y si el generador no las asigna, **dos ramas del procedimiento quedarán invisibles en la demostración**. Son justamente ramas que hacen ver bien al POC.

**`designaciones.segmento`** — por defecto `'rodamiento'`. Si todas las designaciones quedan como rodamiento, la ruta `consultar_planner` del punto 4.3 (*"se consulta directo con el Planner dependiendo del segmento del producto"*) no se ejerce nunca. Sembrar una proporción con `'power_transmission'`.

**`designaciones.reemplazo_indicado_fabrica`** — por defecto nulo, sin FK a propósito. Es el segundo sub-caso del punto 4.6: el reemplazo que la fábrica indica pero que **no está en el sistema**. Para que se vea, hacen falta designaciones obsoletas con `reemplazado_por` **nulo** y este campo lleno. Es el caso en el que el POC manda validar con el Ingeniero de Ventas en vez de declinar — narrativamente valioso, porque muestra que la solución rescata un caso que hoy se pierde.

---

## 4. El contrato del motor de reglas

Lo que el Plan 3 va a consumir desde `lib/reglas-qms`:

- `evaluarSolicitud(ctx: ContextoSolicitud): EvaluacionQMS` — el árbol completo. Función pura: recibe el contexto ya resuelto, nunca consulta la base.
- `MOTIVO_POR_RUTA` y `motivoDeclinado(ruta)` — el puente tipado entre `RutaQMS` y el enum `motivo_declinado` de la base. Úsalo para persistir en `solicitudes.motivo_declinado`; no dupliques ese mapeo. Está tipado contra el enum generado, así que cualquier deriva futura rompe la compilación.
- Los módulos por regla (`catalogo`, `cantidades`, `planeacion`, `tiempos`) se reexportan desde el índice.

**Invariante que el cargador debe respetar.** `ContextoSolicitud.reemplazo` debe venir resuelto por quien construye el contexto. Si `designacion.reemplazadoPor` no es nulo, `ctx.reemplazo` tiene que traer esa designación cargada; si se pasa `null` teniendo `reemplazadoPor`, el motor declinará por 4.7 aunque la base diga que sí hay reemplazo. Ese cargado ocurrirá en `lib/fuentes` (`aDesignacion()`), el único punto donde se convierte `snake_case` de la base a `camelCase` del dominio.

---

## 5. Deuda consciente

Ninguno de estos bloquea el Plan 2. Están registrados para que nadie los "descubra" y los arregle a ciegas.

- **Índices redundantes:** `inventario_designacion` se solapa con el prefijo de la PK `(designacion, almacen)`, y `homologos_origen` con el `unique (origen, equivalente)`. Eliminarlos cuesta otra migración y no gana nada a estos volúmenes. **No los re-añadas creyendo que faltan.**
- **Índices ausentes:** `homologos.equivalente`, `inventario.pdiv_dueno` y `designaciones.reemplazado_por` harán seq scan en consultas inversas. Añadirlos en el Plan 3, cuando existan los patrones de consulta reales.
- **Los índices se crean con la tabla, no después de la carga masiva**, contra la nota del diseño original. Es deliberado: evita el timeout del pooler al construir el GIN de trigramas sobre 30.000 filas. Que el Plan 2 mida y decida si conviene invertirlo.
- **`eventos_demo.designacion` y `.pdiv` son texto libre sin FK.** Es diseño, no deuda: el punto 4.8 exige poder registrar búsquedas de designaciones que no existen.
- **La regla del punto 5.2 "FPC 1 sin precio → se cotiza bajo parámetros de SPQ+"** no está modelada. Ahora que `precio_lista` es nullable, es una rama real del procedimiento sin implementar. Decidirla en el Plan 3.
- **`motivoDeclinado` usa `ruta in MOTIVO_POR_RUTA`**, que recorre la cadena de prototipos. Hoy es inalcanzable, pero `Object.hasOwn` sería más robusto.
- **La cabecera del archivo `20260803000006_metricas_y_contrato_b.sql` dice `004`.** No se corrige porque la migración ya está aplicada y no se editan migraciones aplicadas.
- **`README.md` sigue siendo el boilerplate de `create-next-app`, en inglés.** El repo es un entregable comercial y su restricción global es "todo en español". Reescribirlo antes de compartir la URL.

---

## 6. Supuestos abiertos con SKF

Los ocho supuestos de interpretación del procedimiento están al final de `docs/superpowers/plans/2026-08-03-plan-1-esquema-y-reglas-qms.md`. Conviene llevarlos a la Fase 1 como preguntas concretas: son puntos donde el QMS admite más de una lectura y el POC eligió una.

---

## 7. Notas de entorno

- **No hay Docker.** No existe stack local de Supabase; todo va contra la nube.
- **La conexión directa `db.<ref>.supabase.co` no resuelve** — es IPv6 y falla desde redes domésticas. Usar siempre el pooler (`SUPABASE_DB_URL` en `.env.local` ya apunta ahí).
- **Vitest usa `pool: "threads"`** fijado en la configuración. El pool `forks` por defecto cae con `Fatal process out of memory` en esta máquina bajo presión de memoria.
- **`pnpm test` es hermético**: no toca la red. Los tests que sí golpean Supabase viven en `*.integracion.test.ts` y se corren con `pnpm test:integracion`. Esa separación existe para que la suite no se ponga roja la mañana de una presentación si el proyecto está suspendido por inactividad.
- **El disco se llenó una vez durante la ejecución** y abortó la escritura de un informe. Vigilar el espacio antes de sesiones largas.
