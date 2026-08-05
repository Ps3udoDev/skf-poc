# Estado tras el Plan 4A — restricciones que hereda el Plan 4B

**Fecha:** 2026-08-04  
**Rama:** `plan-4a-operacion-del-csr`  
**Precede a:** Plan 4B (`/impacto`, indicadores vivos, despliegue y ensayo)

Verificación al cierre: `pnpm test` — 17 archivos, 198 tests en verde;
`pnpm test:integracion` — 2 tests en verde; `pnpm build` compila y
type-check sin errores; `pnpm lint` limpio (solo el info preexistente de la
deprecación de `biome.json`).

## 1. Lo que quedó entregado

- Operación del CSR completa: elección determinista de CSR por menor carga
  (`lib/operacion/asignacion`), asignación automática al generar una solicitud
  y Server Actions de bandeja (`detalleDeSolicitud`, `asignarSolicitud`,
  `resolverSolicitud` con motivo de declinación derivado del QMS).
- Bandeja del operador con filtros (estado, CSR, ruta QMS) resueltos en la
  fuente `lib/fuentes/solicitudes.ts`, panel de detalle con contexto,
  evaluación QMS, homólogos y estimación de TE.
- Confirmación guiada de homólogos: módulo puro `lib/validador/confirmacion.ts`
  (pasos de diferencia y criterio `ATRIBUTOS_CRITICOS`), componente del portal
  que obliga a marcar cada paso y presenta el resultado como **sujeto a
  validación de Ingeniería de Ventas** —nunca en verde— cuando corresponde, con
  evento `confirmacion_homologo`.
- Cola de intenciones de pedido: fuente `lib/fuentes/intenciones.ts`, encolado
  solo con la planta realmente en ventana, módulo puro
  `lib/operacion/reconciliacion.ts` (MOQ → pack quantity → existencias, sin
  fechas inventadas en las notas) y reconciliación al cerrar la ventana, antes
  de liberar la planta, con eventos `ventana_inicio`, `reconciliacion` y
  `ventana_fin`. La pantalla del cliente se actualiza sin recargar.
- Métricas completas: los doce tipos del enum tienen emisor — `busqueda`,
  `sugerencia_aceptada` (solo si el candidato lo encontró el validador),
  `solicitud_evitada`, `solicitud_generada`, `confirmacion_homologo`,
  `aviso_moq` y `aviso_pack_quantity` (portal en cada búsqueda; bandeja
  deduplicada por solicitud vía `lib/fuentes/eventos.ts`),
  `ventana_inicio`/`ventana_fin`, `intencion_encolada`, `reconciliacion` y
  `llamada_modelo`.

## 2. Restricciones que hereda el Plan 4B

- `lib/fuentes` sigue siendo la única capa que consulta tablas; los eventos de
  lectura también (`hayAvisoDeOperador` vive ahí, no en la Server Action).
- Toda escritura del navegador pasa por Server Actions y `service_role`.
- `emitirEvento` nunca lanza: un fallo de métrica no puede tumbar la demo.
- La deduplicación de avisos es solo de la bandeja (`perfil: "operador"`): en
  el portal cada búsqueda es un aviso cierto y se emite siempre.
- `sugerencia_aceptada` solo se emite con estrategia del validador
  (`normalizacion`, `prefijo`, `trigramas`, `llm`); `exacta` y `ninguna` no
  cuentan. El dashboard de 4B no debe reinterpretar esta regla.
- La reconciliación se ejecuta antes de liberar la planta; 4B no debe
  reordenar esa secuencia al darle visibilidad en `/demo` o `/impacto`.
- Ninguna nota de reconciliación promete fecha ni plazo; el TE en firme sale al
  procesar la cotización.
- Ámbar solo en desconexión; verde solo en confirmación; «sujeto a validación
  de Ingeniería de Ventas» nunca es verde.
- No editar migraciones aplicadas. Las vigentes llegan hasta `000008`; el hueco
  `000004` sigue siendo deliberado. El Plan 4A no añadió ninguna migración.

## 3. Contratos que consumirá el Plan 4B

- `eventos_demo` poblado con los doce tipos y sus `detalle`: avisos del portal
  llevan `{ modo, cantidad, ... }`; los de la bandeja `{ numero, cantidad, ... }`;
  `reconciliacion` lleva `estado`, `cantidadFinal` y `punto`.
- `indicadoresDeSesion()` y `emitirEvento()` de `lib/metricas` para el
  dashboard de impacto.
- `hayAvisoDeOperador(tipo, numero)` de `lib/fuentes` para cualquier emisor
  nuevo con `perfil: "operador"`.
- `intencionesDe(pdiv, estado?)`, `intencionesDesde(iniciadaEn)` y
  `ESTADOS_INTENCION` para mostrar la cola y su resultado.
- `fijarEstadoPlanta(pdiv, estado | null)` y `cerrarVentanaEnCurso(pdiv)` como
  controles del presentador; ambos ya emiten sus eventos.
- `elegirCsr(cargas)` y `cargaPorCsr(iniciadaEn)` para cualquier panel de carga
  del equipo.
- `reconciliar(entrada)` de `lib/operacion/reconciliacion` y
  `construirConfirmacion(homologo)` de `lib/validador/confirmacion`, ambos
  puros y sin base de datos.
- `registrarSolicitudEvitada(codigo, estrategia?)` con la firma ampliada; los
  llamadores sin estrategia siguen compilando.

## 4. Deuda consciente

- **En todo el Plan 4A no se generaron tests** —ni unitarios ni de integración—
  por directiva del usuario. La suite sigue en 198 tests, los mismos del Plan
  3; los escenarios que el plan prevía fijar (reconciliación, confirmación de
  homólogos, asignación) están enumerados en los contextos de las tareas 8 y 11
  para cuando se retome la cobertura.
- **Verificaciones manuales con navegador pendientes** de las tareas 6, 7, 9,
  12, 13 y 14 —incluido el conteo SQL de los doce tipos de evento y la no
  duplicación de avisos de la bandeja—. Los guiones exactos están en la sección
  «Verificación manual pendiente» de cada contexto en
  `docs/superpowers/contexto/plan-4a/`.
- El número de solicitud se genera con reintento ante colisión, no con
  secuencia de base; suficiente para la demo, no para producción.
- Biome informa que `linter.recommended` está deprecado; no afecta el lint.

## 5. Supuestos abiertos con SKF

- **Criterio de `ATRIBUTOS_CRITICOS` (Tarea 8).** El procedimiento (punto 4.6)
  pide que el cliente revise el reemplazo con su Ingeniero de Ventas, pero no
  enumera qué diferencias disparan esa validación. El POC fija el criterio:
  exige validación lo que cambia el ajuste montado o el envolvente de operación
  (`juego interno`, `temperatura máxima`, `velocidad límite`); las diferencias
  de construcción o suministro (`sellado`, `jaula`, `lubricación`) se muestran
  pero no la exigen. Pendiente de confirmar con SKF.
- **Consecuencia del orden de reglas de la reconciliación (Tarea 11).** Las
  reglas se aplican con retorno inmediato —MOQ (4.4) → pack quantity (4.5a) →
  existencias—, igual que `evaluarSolicitud`. Por eso una intención ajustada
  por pack quantity **no** se contrasta contra existencias: su nota no promete
  disponibilidad y anuncia que un CSR la confirma al procesar la cotización.
  Si SKF prefiere que el ajuste también verifique stock, el orden cambia.
- Se mantienen abiertos los supuestos heredados del Plan 3: interpretación de
  los puntos duplicados 4.5, 12 minutos liberados por solicitud evitada, SLA de
  cuatro días hábiles y medición de tiempos reales antes de convertir cifras
  del POC en compromisos.

## 6. Próximo alcance

El Plan 4B arranca desde aquí: `/impacto` con indicadores vivos sobre
`eventos_demo`, despliegue a Vercel, ensayo cronometrado del guion completo y
video de respaldo. No debe reimplementar emisores de eventos ni tocar la
secuencia de reconciliación.
