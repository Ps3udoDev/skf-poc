# Tarea 10 — Ensayo cronometrado y verificaciones heredadas

## Estado

Completada **con verificaciones de navegador y de producción pendientes**.
Este entorno no tiene navegador disponible y aún no existe URL de producción
(el despliegue en Vercel lo ejecuta el usuario después), así que los pasos 3 y
4 del plan no fueron ejecutables aquí: quedan documentados con su guion
exacto, no fingidos. Pendientes, en detalle:

1. Las verificaciones visuales heredadas del Plan 4A (tareas 6, 7, 9, 12, 13
   y 14): todas requieren navegador. Sus guiones están en la sección
   «Verificación manual pendiente» de cada contexto en
   `docs/superpowers/contexto/plan-4a/`, y consolidadas en el §5 del documento
   de cierre.
2. Las verificaciones visuales del propio Plan 4B (tareas 6, 7 y 8):
   `/impacto` actualizándose sin recargar y el chat del operador.
3. Las dos mediciones de deuda del Plan 3 (ensayo visual con dos ventanas;
   arranque en frío de Realtime, que además exige 20 minutos de espera).
4. El checklist de humo post-deploy y el recorrido cronometrado de las ocho
   escenas sobre la URL de producción, que todavía no existe.
5. La repetición de las dos consultas SQL tras ese recorrido, para cerrar el
   conteo de los doce tipos y la no duplicación con datos reales.

## Qué entrega esta tarea

- `docs/superpowers/presentacion/guion-cronometrado.md`: las ocho escenas del
  §3 de `docs/02_alcance_y_guion_demo.md` con tiempo objetivo (0: 30 s ·
  1: 1 min · 2: 1,5 min · 3: 1 min · 4: 3 min · 5: 2 min · 6: 2 min ·
  7: 1 min), pestaña de partida y de cambio, acciones exactas contrastadas
  contra el código, frase de acompañamiento del guion original, qué mirar en
  pantalla y qué hacer si falla, con los dos avisos obligatorios destacados
  (la cola de pedidos siempre sujeta a validación técnica en la Fase 1; los 12
  minutos por solicitud evitada son un supuesto).
- Enlace al guion nuevo desde `docs/superpowers/presentacion/guia-demo-plan-3.md`
  (nota al inicio: el guion cronometrado es el recorrido vigente; la guía
  queda como referencia de preparación y contingencias).
- `docs/superpowers/specs/2026-08-05-estado-tras-plan-4b.md`: documento de
  cierre del POC con la misma estructura que el del Plan 4A —entregado,
  restricciones vigentes, deuda consciente encabezada por la ausencia total
  de tests en la Fase 4, resultados reales de las consultas SQL, lista
  explícita de verificaciones pendientes y supuestos abiertos con SKF—.

## Decisiones tomadas y por qué

### Designación y cantidad del guion: el plan dice `DEMO-6205-2RSH/C` y 200; el código curado dice `DEMO-6205-2RSH` y 100

El Paso 1 del plan menciona entre paréntesis teclear `DEMO-6205-2RSH/C`,
cantidad 200. Contrastado contra el código: el escenario curado de las
escenas 1 y 2 (`lib/sesion-demo/escenarios.ts`, clave `truncada`) precarga
`DEMO-6205-2RSH` con cantidad 100, que es también el valor de
`guia-demo-plan-3.md`. La cantidad 200 del plan corresponde a `DEMO-VENTANA`
(escena 4, cantidadSugerida 200) y a la primera pregunta del chat (escena 5:
«…si pido 200 piezas?», respaldada por la respuesta pregrabada de
`lib/ai/respaldo.ts`). `DEMO-6205-2RSH/C` es un prefijo truncado igualmente
válido de `DEMO-6205-2RSH/C3` —el catálogo solo contiene `/C3`, `/C4` y `/W64`
(`scripts/seed/casos-curados.ts`)— y produciría el mismo recorrido; de hecho
`despliegue.md` lo usa en su checklist de humo. El guion cronometrado usa los
valores del escenario curado y deja la equivalencia anotada en su anexo.

### La pregunta 3 del chat usa un número real del histórico, no el literal del guion original

El guion original pone «¿En qué va mi cotización 2026Q00847?». Los números de
cotización se generan con formato `AAAAQ#####`
(`scripts/seed/cotizaciones.ts`), así que el literal cumple el formato, pero
su existencia concreta depende de la siembra. El guion cronometrado manda
anotar un número real del histórico (sembrado con `DEMO_SEED=20260803`) antes
de presentar.

### El respaldo pregrabado cubre exactamente las cuatro preguntas de la escena 5

`lib/ai/respaldo.ts` tiene cuatro ramas: TE de `DEMO-6205-2RSH/C3` para 200
piezas, equivalente sellado por ambos lados, estado de una cotización, y
solicitudes planeadas con stock del operador. El guion advierte que ante
cualquier otra pregunta el respaldo informa que el asistente no está
disponible: no se improvisa fuera de esas cuatro.

### El script de las consultas SQL se borró tras su uso

Se escribió `scripts/tmp-tarea-10-verificacion.ts` (cliente `pg` contra el
pooler, solo dos `select`), se ejecutó y se borró. No queda en el árbol ni en
el commit, cumpliendo la prohibición de escrituras del Plan 4B (solo lectura)
y la instrucción de no dejar scripts temporales.

## Contrato que exponen estos archivos

No hay código nuevo. Los artefactos son documentales:

- `docs/superpowers/presentacion/guion-cronometrado.md` — el recorrido
  vigente de presentación; consume los escenarios de
  `lib/sesion-demo/escenarios.ts` y los controles de `/demo`.
- `docs/superpowers/specs/2026-08-05-estado-tras-plan-4b.md` — el documento
  que se lee antes de la Fase 1.

## Qué falta / qué NO hace

- **No ejecuta ninguna verificación de navegador.** Ninguna de las tareas de
  la Fase 4 (4A ni 4B) ha podido verificarse visualmente en este entorno; no
  se da por hecha ninguna.
- **No ejecuta el recorrido cronometrado** sobre producción: la URL no
  existe. El guion está listo para ese ensayo, no marcado como ensayado.
- **No graba el video de respaldo** (pendiente tras el ensayo sobre
  producción).
- **No cierra el conteo de los doce tipos de evento:** el resultado real de
  hoy muestra un solo tipo (`llamada_modelo: 1`) porque el recorrido completo
  no se ha ejecutado. La consulta se repite tras el ensayo.
- **No toca código, migraciones ni la base** (más allá de los dos `select`).
- **No cierra la rama:** el merge a `main` (Paso 7 del plan) lo hace el
  usuario.

## Cómo verificar

```bash
pnpm lint   # limpio, salvo el info preexistente de biome.json
pnpm build  # compila y pasa type-check; /portal, /operador, /impacto, /demo, /api/chat
pnpm test   # 17 archivos, 198 tests en verde
```

Resultados reales al ejecutarlos en esta tarea: lint limpio (1 info, la
deprecación preexistente), build sin errores, **198 tests en verde**.

Resultados reales de las consultas SQL (base real de Supabase, 2026-08-05,
solo lectura; sesión `id = 1` iniciada 2026-08-04T23:12:12Z, modo `solucion`):

- Conteo de tipos de evento de la sesión: **1 tipo distinto** —
  `llamada_modelo: 1`. Faltan once de los doce (`busqueda`,
  `sugerencia_aceptada`, `solicitud_evitada`, `solicitud_generada`,
  `confirmacion_homologo`, `aviso_moq`, `aviso_pack_quantity`,
  `ventana_inicio`, `ventana_fin`, `intencion_encolada`, `reconciliacion`).
  Causa: el recorrido completo no se ha ejecutado en este entorno (requiere
  navegador). La tabla tipo → escena → emisor está en el §4 del documento de
  cierre.
- No duplicación de avisos de la bandeja: **cero filas**, como se esperaba —
  con la salvedad de que aún no hay avisos de operador en la sesión, así que
  es cero por vacío; se repite tras el recorrido.

## Verificación manual pendiente

Toda la verificación de navegador y de producción. Guiones exactos:

1. **Plan 4A, tareas 6/7/9/12/13/14:** sección «Verificación manual pendiente»
   de `docs/superpowers/contexto/plan-4a/tarea-{6,7,9,12,13,14}-contexto.md`.
   El recorrido de la tarea 14 es ahora `guion-cronometrado.md`.
2. **Plan 4B, tareas 6/7/8:** sección «Verificación manual pendiente» de
   `docs/superpowers/contexto/plan-4b/tarea-{6,7,8}-contexto.md` (`/impacto`
   vivo sin recargar; chat del operador y pasada con `CHAT_RESPALDO=true`).
3. **Mediciones del Plan 3:** (a) `/portal` y `/demo` lado a lado, cambiar
   modo y estado de una planta desde `/demo`, cronometrar el reflejo en
   `/portal`; (b) aplicación cerrada 20 minutos, abrirla y cronometrar hasta
   que el indicador de canal marque suscrito.
4. **Producción (cuando el usuario despliegue):** checklist de humo de
   `docs/superpowers/presentacion/despliegue.md` (seis casillas) y recorrido
   cronometrado de las ocho escenas con `guion-cronometrado.md`, anotando las
   que se pasen de su tiempo objetivo; al terminar, repetir las dos consultas
   SQL del §4 del documento de cierre.

Todo esto está consolidado también en el §5 de
`docs/superpowers/specs/2026-08-05-estado-tras-plan-4b.md`.
