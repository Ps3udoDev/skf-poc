# Estado tras el Plan 4B — cierre del POC

**Fecha:** 2026-08-05  
**Rama:** `plan-4b-evidencia-y-entrega`  
**Precede a:** despliegue en Vercel (lo ejecuta el usuario), ensayo cronometrado
sobre la URL de producción y, tras la presentación, la Fase 1.

Verificación al cierre: `pnpm lint` limpio (solo el info preexistente de la
deprecación de `biome.json`); `pnpm build` compila y pasa el type-check sin
errores, con las rutas `/portal`, `/operador`, `/impacto`, `/demo` y
`/api/chat` presentes; `pnpm test` — 17 archivos, **198 tests en verde**, el
mismo número que cerró el Plan 4A.

Este documento es el que se lee antes de la Fase 1. Lo que no se ejecutó está
escrito aquí, no omitido: **este entorno no tuvo navegador disponible y aún no
existe URL de producción**, así que todas las verificaciones visuales y el
ensayo sobre el despliegue quedan pendientes con su guion exacto (§5).

## 1. Lo que quedó entregado

Las diez tareas del Plan 4B están completas y commiteadas:

- **SLA en días hábiles** (Tarea 1): módulo puro `lib/reglas-qms/sla.ts` con
  `DIAS_SLA`, `diasHabiles()` y `dentroDelSla()`, extraído de la copia privada
  que usaba el chat. Una sola implementación del SLA en todo el POC.
- **Cumplimiento del SLA sobre el histórico** (Tarea 2): `cumplimientoSla()`
  en `lib/fuentes/cotizaciones.ts`, paginado y memoizado, con respondidas,
  tasa, pendientes y mediana de días hábiles.
- **Franjas de la semana** (Tarea 3): `franjasDeLaSemana()` en
  `lib/estado-fabricas/semana.ts`, calculada día a día para respetar la
  variabilidad determinista de la planta belga, sin conversiones de huso.
- **Panel operativo y Server Actions** (Tarea 4): `resumirOperacion()` puro en
  `lib/metricas/operacion.ts` y las acciones `refrescarIndicadores()` /
  `refrescarPanelOperativo()` en `lib/metricas/acciones.ts`. Los agregados
  nuevos viven fuera de `Indicadores`, que el contrato congela.
- **Realtime, hook y contadores vivos** (Tarea 5): migración `000009` (una
  línea: publicar `eventos_demo` en `supabase_realtime`, aplicada contra la
  base real), hook `useIndicadores()` (Realtime invalida, sondeo de respaldo)
  y los contadores de `/demo` actualizándose solos. El efecto de la migración
  se verificó de punta a punta: un INSERT llegó al canal `anon` en 538 ms.
- **`/impacto` con las métricas de la sesión** (Tarea 6): ruta, `<Tablero>`,
  `<TarjetaMetrica>`, gráfica de búsquedas por hora y la tercera pestaña
  «Impacto» en la barra superior. Verificada con `curl` (HTTP 200 y rótulos);
  la verificación visual sigue pendiente.
- **Panel operativo en `/impacto`** (Tarea 7): carga por CSR, cumplimiento
  del SLA y línea de tiempo semanal de ventanas. Misma salvedad de
  verificación visual.
- **Chat del lado operador** (Tarea 8): herramienta `listarSolicitudes`
  registrada solo para el perfil operador, instrucciones ampliadas y respaldo
  pregrabado de la pregunta del guion. Cierra la escena 5 completa.
- **Entrega documental** (Tarea 9): `README.md` reescrito en español y
  `despliegue.md` con las ocho variables, los pasos de la CLI de Vercel, el
  checklist de humo y el interruptor de sala `CHAT_RESPALDO`.
- **Guion cronometrado y cierre** (Tarea 10, esta):
  `docs/superpowers/presentacion/guion-cronometrado.md` con las ocho escenas,
  tiempos, acciones exactas contrastadas contra el código y los dos avisos
  obligatorios del presentador; las verificaciones heredadas del Plan 4A
  ejecutadas en lo que este entorno permite (las dos consultas SQL, §4); y
  este documento.

## 2. Restricciones vigentes

Se mantienen todas las del Plan 4A, sin excepción nueva ni relajada:

- `lib/fuentes` es la única capa que consulta tablas; toda escritura del
  navegador pasa por Server Actions y `service_role`.
- `emitirEvento()` nunca lanza; 4B no añadió emisores ni escrituras de
  negocio — su única migración (`000009`) es la línea de publicación de
  Realtime. Las migraciones vigentes llegan a `000009`; el hueco `000004`
  sigue siendo deliberado.
- `calcularIndicadores()` e `indicadoresDeSesion()` no se modificaron.
- Ámbar solo en desconexión; verde solo en confirmación; la tasa de SLA alta
  no es verde. Toda cifra lleva su leyenda de datos simulados.
- `MINUTOS_POR_SOLICITUD = 12` se declara en pantalla como supuesto, leyendo
  la constante, nunca repitiendo el número a mano.
- La cola de pedidos (sección 3.3 de la propuesta) se presenta siempre como
  sujeta a validación técnica en la Fase 1.
- `/demo` no se proyecta nunca; `/impacto` no muestra la fontanería del demo
  (por eso `<IndicadorCanal>` se retiró del tablero en la Tarea 6, decisión
  del usuario sobre el Paso 4 del brief).

## 3. Deuda consciente

- **En toda la Fase 4 (planes 4A y 4B) no se generaron tests** —ni unitarios
  ni de integración— por directiva explícita del usuario. La suite sigue en
  198 tests, los mismos del Plan 3. Los módulos puros nuevos de 4B
  (`diasHabiles`, `franjasDeLaSemana`, `resumirOperacion`) y los escenarios
  de 4A (reconciliación, confirmación de homólogos, asignación) están
  enumerados en los contextos de las tareas para cuando se retome la
  cobertura.
- **Ninguna verificación de navegador de la Fase 4 se ha ejecutado todavía.**
  Los guiones exactos están en los contextos de cada tarea y consolidados en
  el §5 de este documento.
- **El despliegue no existe todavía.** Lo ejecuta el usuario con su cuenta de
  Vercel siguiendo `despliegue.md`; hasta entonces no hay URL de producción
  ni checklist de humo verificado.
- **Las dos mediciones de deuda del Plan 3 siguen sin número:** el ensayo
  visual con dos ventanas y el arranque en frío de Realtime requieren
  navegador y, la segunda, veinte minutos de espera. Guiones en el §5.
- El número de solicitud se genera con reintento ante colisión, no con
  secuencia de base; suficiente para la demo, no para producción.
- Biome informa que `linter.recommended` está deprecado; no afecta el lint.

## 4. Resultados reales de las verificaciones ejecutadas

Las dos consultas SQL del Plan 4A se ejecutaron contra la base real de
Supabase el 2026-08-05, con un script de un solo uso de **solo lectura**
(borrado tras su uso, conforme a la prohibición de escrituras del Plan 4B).

### Conteo de los doce tipos de evento de la sesión

```sql
select tipo, count(*)
from eventos_demo
where ocurrido_en >= (select iniciada_en from sesion_demo where id = 1)
group by tipo
order by tipo;
```

Resultado real:

| tipo | count |
|---|---:|
| `llamada_modelo` | 1 |

**Un solo tipo presente; faltan once de los doce.** No es un fallo de los
emisores: el recorrido completo del guion no se ha ejecutado en este entorno
porque requiere navegador. La sesión actual (`sesion_demo.id = 1`, iniciada
2026-08-04T23:12:12Z, modo `solucion`) solo ha visto una llamada al modelo.
Los tipos ausentes y la escena del recorrido que los produce (emisores entre
paréntesis):

| Tipo ausente | Lo produce | Emisor |
|---|---|---|
| `busqueda` | Toda búsqueda del portal (escenas 1–4) | `app/(portal)/portal/acciones.ts` |
| `sugerencia_aceptada` | Escena 2, *Usar esta designación* | `app/(portal)/portal/acciones.ts` |
| `solicitud_evitada` | Escena 2 | `app/(portal)/portal/acciones.ts` |
| `solicitud_generada` | Escenas 1 y 4 (modo hoy) | `app/(portal)/portal/acciones.ts` |
| `confirmacion_homologo` | Escena 3 | `app/(portal)/portal/acciones.ts` |
| `aviso_moq` | Escena 2, variante MOQ; bandeja | `app/(portal)/portal/acciones.ts`, `app/(operador)/acciones.ts` |
| `aviso_pack_quantity` | Escena 2, variante pack; bandeja | idem |
| `ventana_inicio` / `ventana_fin` | Escena 4, forzar y cerrar la ventana | `lib/sesion-demo/acciones.ts` |
| `intencion_encolada` | Escena 4 (modo solución) | `app/(portal)/portal/acciones.ts` |
| `reconciliacion` | Escena 4, al cerrar la ventana | `lib/sesion-demo/acciones.ts` |

Es decir: quedan por recorrer las escenas 1 a 4 completas (y la 5 en su
parte del portal). El conteo se repite tras el ensayo sobre producción;
el esperado sigue siendo los doce tipos con al menos un registro.

### No duplicación de avisos de la bandeja

```sql
select tipo, detalle->>'numero' as numero, count(*)
from eventos_demo
where perfil = 'operador' and tipo in ('aviso_moq', 'aviso_pack_quantity')
group by 1, 2 having count(*) > 1;
```

Resultado real: **cero filas**, como se esperaba. Salvedad honesta: en la
sesión actual no hay todavía ningún aviso de operador (no se ha recorrido la
bandeja), así que el resultado es cero por vacío, no por deduplicación
demostrada. La consulta se repite tras el recorrido completo, cuando haya
avisos que puedan duplicarse.

## 5. Verificaciones pendientes (con su guion exacto)

Nada de lo siguiente se ha ejecutado; todo requiere navegador y, en los dos
últimos grupos, la URL de producción.

### Heredadas del Plan 4A (guiones completos en `docs/superpowers/contexto/plan-4a/`)

- **Tarea 6 — filtros de la bandeja:** en `/operador`, columnas CSR y Estado
  visibles; *Abiertas* mantiene las solicitudes; filtrar por un CSR deja solo
  las suyas; *Sin asignar* deja la tabla vacía con `?csr=sin-asignar` en la
  URL; recargar conserva el filtro; *Limpiar* devuelve a `/operador`.
- **Tarea 7 — detalle y resolución:** el panel muestra regla QMS, punto,
  existencias y estimación; cambiar el CSR actualiza la tabla sin recargar;
  *Marcar como cotizada* pasa a *Cotizada* con hora; *Declinar* sin motivo en
  una ruta `declinar_designacion_invalida` guarda `designacion_invalida`; en
  una ruta que no declina, exige motivo y no escribe; el filtro *Atendidas*
  muestra las resueltas.
- **Tarea 9 — confirmación guiada:** buscar `DEMO-OBS-CON`; los dos pasos
  (*Sellado*, *Juego interno*) bloquean el botón hasta marcar ambos; el
  resultado sale en azul primario «sujeto a validación de Ingeniería de
  Ventas», nunca verde; el evento `confirmacion_homologo` lleva
  `requiereIngenieriaVentas: true`.
- **Tarea 12 — encolado:** forzar `P103` a ventana; `DEMO-VENTANA` en modo
  solución muestra el aviso ámbar y *Encolar intención de pedido*; al pulsar,
  fila *En cola* en ámbar; con la planta viva el botón desaparece y encolar
  devuelve el error «no está en ventana»; evento `intencion_encolada` en la
  base.
- **Tarea 13 — reconciliación:** tres intenciones (bajo MOQ, no múltiplo de
  pack, limpia); al *Cerrar la ventana en curso*, la cola muestra sin recargar
  *Escalada*, *Ajustada* y *Confirmada* en verde; ninguna nota promete fecha;
  eventos `reconciliacion` con `estado`, `cantidadFinal` y `punto`.
- **Tarea 14 — los doce eventos en vivo:** recorrido completo de las escenas
  (su guion es ahora `guion-cronometrado.md`) y repetición de las dos
  consultas SQL del §4.

### Del Plan 4B

- **Tareas 6 y 7 — `/impacto` en navegador:** provocar un evento desde
  `/portal` (aceptar un candidato) y ver el contador subir en `/impacto` sin
  recargar; provocar una asignación y ver el panel operativo reflejarla;
  adelantar el reloj en `/demo` y confirmar que la línea de tiempo semanal se
  mantiene coherente. Guiones exactos en
  `docs/superpowers/contexto/plan-4b/tarea-6-contexto.md` y
  `tarea-7-contexto.md`.
- **Tarea 8 — chat del operador en navegador:** las preguntas del guion
  contra `/operador` y la comprobación de que el perfil cliente no lista
  solicitudes; la pasada con `CHAT_RESPALDO=true`. Guion en
  `tarea-8-contexto.md`.

### Mediciones de deuda del Plan 3

- **Ensayo visual con dos ventanas:** abrir `/portal` y `/demo` lado a lado,
  cambiar el modo y el estado de una planta desde `/demo` y cronometrar
  cuánto tarda `/portal` en reflejarlo. Anotar el número.
- **Arranque en frío de Realtime:** dejar la aplicación cerrada veinte
  minutos, abrirla y cronometrar desde la carga hasta que el indicador de
  canal marca suscrito. Es el dato que decide si el presentador debe abrir la
  pantalla antes de empezar a hablar.

### Sobre la URL de producción (cuando exista)

- **Checklist de humo post-deploy:** las seis casillas de
  `docs/superpowers/presentacion/despliegue.md`.
- **Recorrido cronometrado de las ocho escenas:** con
  `guion-cronometrado.md` sobre la URL de producción, anotando las escenas
  que se pasen de su tiempo objetivo, y repitiendo las dos consultas SQL del
  §4 para cerrar el conteo de los doce tipos y la no duplicación con datos
  reales del recorrido.

## 6. Supuestos abiertos con SKF

Se mantienen todos los del cierre del Plan 4A, sin cambios:

- El criterio de `ATRIBUTOS_CRITICOS` para exigir validación de Ingeniería de
  Ventas (punto 4.6) es una decisión del POC, pendiente de confirmar.
- El orden de reglas de la reconciliación (MOQ → pack quantity → existencias,
  con retorno inmediato) hace que una intención ajustada por pack no se
  contraste contra existencias; si SKF lo prefiere distinto, el orden cambia.
- Los supuestos heredados del Plan 3: interpretación de los puntos duplicados
  4.5, **12 minutos liberados por solicitud evitada (supuesto, no medición)**,
  SLA de cuatro días hábiles, y la medición de tiempos reales antes de
  convertir cifras del POC en compromisos.
- La cola de pedidos (sección 3.3) sigue sujeta a validación técnica en la
  Fase 1, tal como se declara en cada presentación.

## 7. Próximo alcance

1. El usuario despliega a Vercel siguiendo `despliegue.md` y comparte la URL.
2. Con navegador disponible: checklist de humo, verificaciones del §5, las
   dos mediciones del Plan 3 y el recorrido cronometrado completo, repitiendo
   las dos consultas SQL al final.
3. Grabar el video de respaldo que cubre las ocho escenas.
4. Presentar. La Fase 1 empieza leyendo este documento.
