# Guion cronometrado — las ocho escenas del POC

Este es el documento que el presentador tiene abierto durante el ensayo y la
presentación. Toma las ocho escenas del §3 de `docs/02_alcance_y_guion_demo.md`
y las convierte en acciones exactas contra la aplicación real. La preparación
técnica (variables, arranque, ensayo previo, contingencias) está en
`guia-demo-plan-3.md` y el despliegue en `despliegue.md`; aquí no se repiten.

Duración total objetivo: **10 a 12 minutos** (suma de los tiempos por escena:
11,5 minutos).

> **Aviso 1 — obligación del presentador, no del software.** La cola de
> pedidos de la escena 4 es la sección 3.3 de la propuesta y **siempre** se
> presenta como sujeta a validación técnica en la Fase 1. Se muestra para que
> se vea a dónde puede llegar, no como algo ya comprometido.

> **Aviso 2 — obligación del presentador, no del software.** Los 12 minutos
> por solicitud evitada que multiplica el tablero de impacto son un
> **supuesto**, no una medición. La aplicación lo declara en pantalla
> (`MINUTOS_POR_SOLICITUD` en `lib/metricas/calculo.ts`); el presentador lo
> dice en voz alta la primera vez que la cifra aparece.

## Convenciones

- **Tres pestañas públicas** en la barra superior: *Vista Cliente*
  (`/portal`), *Servicio al Cliente* (`/operador`) e *Impacto* (`/impacto`).
- **Un panel privado**: `/demo`, nunca se proyecta. Ahí viven el interruptor
  *Situación actual / Con la solución*, el selector de escenarios, el control
  de plantas y el reloj simulado.
- Todas las designaciones se teclean tal cual, con prefijo `DEMO-`.

---

## Escena 0 — Encuadre · 30 segundos

- **Pestaña:** empieza y termina en *Vista Cliente* (`/portal`). No hay cambio.
- **Acciones:** ninguna. Señalar el distintivo **Entorno de demostración ·
  datos simulados** de la barra superior.
- **Frase:** «Lo que van a ver es una simulación construida con datos
  sintéticos y con las reglas de su propio procedimiento de Consultas y
  Cotizaciones, revisión 3. No está conectado a WCL. El objetivo es que vean,
  no que imaginen, cómo se comportaría la solución.»
- **Qué mirar:** el distintivo visible; el indicador de modo en *Situación
  actual*; el indicador de canal de `/demo` en **Canal en vivo** (si está en
  sondeo, funciona igual pero con hasta ~2 s de retraso).
- **Si falla:** si el canal no está suscrito, esperar unos segundos y seguir —
  el respaldo por sondeo cubre la propagación.

## Escena 1 — El estado actual, sin ayuda · 1 minuto

- **Pestaña:** parte de *Vista Cliente*; al final se cambia a *Servicio al
  Cliente*.
- **Acciones, en orden:**
  1. En `/demo`, pulsar **Situación actual** (o elegir el escenario
     *Designación truncada*, que solo carga la consulta).
  2. En `/portal`, teclear designación `DEMO-6205-2RSH` y cantidad `100`.
     Pulsar **Consultar**.
  3. Con el resultado de «no encontrada», pulsar **Solicitar cotización**.
  4. Cambiar a la pestaña *Servicio al Cliente* y abrir la solicitud recién
     llegada.
- **Frase:** «El usuario copió una designación incompleta. El sistema actual
  no distingue entre un código inexistente y uno truncado, así que genera
  trabajo para el CSR que terminará declinado.»
- **Qué mirar:** en el portal, *No se encontraron resultados* y la única
  salida es solicitar cotización; en la bandeja, la solicitud clasificada como
  designación inválida con el punto 4.8 del QMS que obliga a declinar.
- **Si falla:** si la búsqueda devuelve candidatos, el modo quedó en *Con la
  solución* de un ensayo anterior: volver a `/demo` y pulsar *Situación
  actual*. Si la bandeja tiene solicitudes viejas, reiniciar la sesión desde
  `/demo` antes de empezar (no borra el histórico sintético).

## Escena 2 — El mismo caso, con el validador activo · 1,5 minutos

- **Pestaña:** parte de *Vista Cliente*; cierre breve en *Servicio al
  Cliente* para mostrar la bandeja sin esa solicitud.
- **Acciones, en orden:**
  1. En `/demo`, pulsar **Con la solución**.
  2. En `/portal` (sin recargar), repetir `DEMO-6205-2RSH`, cantidad `100`,
     **Consultar**.
  3. Con el aviso *La designación parece incompleta* y los candidatos, pulsar
     **Usar esta designación** sobre `DEMO-6205-2RSH/C3`.
  4. Variante rápida (30 s, si hay tiempo): `DEMO-MOQ-50`, cantidad `5` → el
     aviso de MOQ sale **antes** de enviar (punto 4.4).
  5. Cambiar a *Servicio al Cliente*: no llegó ninguna solicitud nueva.
- **Frase:** «La solicitud nunca llegó a Customer Service. El contador marca
  una solicitud evitada — y el ciclo completo de retrabajo de la escena
  anterior simplemente no ocurrió.»
- **Qué mirar:** los tres candidatos con descripción, PCC/LCC, disponibilidad
  PS/SL/XX, MOQ y pack quantity; el precio y el TE al instante tras elegir;
  el contador de solicitudes evitadas en `/demo` subiendo a 1.
- **Si falla:** si el contador no sube, la sesión no se reinició y ya contaba
  evitadas de un ensayo: no pasa nada, decir la cifra relativa. La ruta
  alterna es el escenario *Designación truncada* del selector de `/demo`, que
  precarga la consulta.

## Escena 3 — Homólogos y obsoletos · 1 minuto

- **Pestaña:** *Vista Cliente*, sin cambio.
- **Acciones, en orden:**
  1. En `/demo`, elegir el escenario *Obsoleto con reemplazo* (deja el modo en
     *Con la solución*).
  2. En `/portal`, teclear `DEMO-OBS-CON`, cantidad `50`, **Consultar**.
  3. Pulsar **Ver equivalencias registradas** y abrir el reemplazo
     `DEMO-6205-2RSH/C3`.
  4. Marcar los dos pasos de la confirmación guiada (*Sellado* y *Juego
     interno*) — el botón no se habilita hasta marcar ambos — y aceptar.
- **Frase:** «Aquí es donde hoy el cliente poco observador elige mal y genera
  un pedido con el producto incorrecto. La confirmación explícita rompe el
  automatismo.»
- **Qué mirar:** las diferencias técnicas resaltadas paso a paso y el
  resultado en azul primario con el texto **sujeto a validación de Ingeniería
  de Ventas** — nunca en verde (punto 4.6).
- **Si falla:** si el resultado sale sin los pasos, no es un obsoleto con
  reemplazo: verificar que se tecleó `DEMO-OBS-CON` y no otra variante. Las
  variantes `DEMO-OBS-SIN` (punto 4.7, declinado legítimo) y `DEMO-OBS-FAB`
  (reemplazo no dado de alta) quedan como material de preguntas, no del
  recorrido principal.

## Escena 4 — La ventana de desconexión · 3 minutos · momento clave

- **Pestaña:** parte de *Vista Cliente*; se asoma a *Servicio al Cliente* a
  la mitad; vuelve a *Vista Cliente* para el cierre.
- **Acciones, en orden:**
  1. En `/demo`, elegir el escenario *Planta en ventana de mantenimiento*:
     fuerza `P103` (la planta belga) a *En ventana* y alinea el reloj.
  2. **Modo hoy** (el escenario lo deja así): en `/portal`, teclear
     `DEMO-VENTANA`, cantidad `200`, **Consultar** → *Sistema de planta no
     disponible*, sin inventario, precio ni TE. Pulsar **Solicitar
     cotización**. Repetir una segunda vez para que se vean **varias
     solicitudes acumulándose**.
  3. Cambiar a *Servicio al Cliente* y mostrar las solicitudes acumuladas
     durante la ventana.
- **Frase:** «Esto ocurre entre 2 y 2.5 horas todos los días, en su horario
  pico.»
- **Acciones, continuación:**
  4. En `/demo`, pulsar **Con la solución**. De vuelta en `/portal`, repetir
     `DEMO-VENTANA`, cantidad `200`, **Consultar**.
  5. Mostrar el aviso ámbar: el sistema sabe que la planta está en ventana,
     no que el producto no existe; PS/SL/XX aparecen sin cantidades, con el
     TE estimado del histórico y su leyenda de estimación no confirmada.
  6. Pulsar **Encolar intención de pedido**. Encolar una segunda con cantidad
     por debajo del MOQ si se quiere ver *Escalada* en la reconciliación.
  7. En `/demo`, pulsar **+30 min** para acercar el fin de la ventana y luego
     **Cerrar la ventana en curso**.
  8. En `/portal`, sin recargar, la cola muestra el resultado por fila:
     *Confirmada* en verde, *Ajustada* (cantidad redondeada al pack) o
     *Escalada* (punto 4.4). Ninguna nota promete fecha.
- **Frase de cierre:** «El mismo periodo produjo N solicitudes en el modo
  actual y una sola intervención humana en el modo con solución. Es el número
  que justifica el proyecto entero.»
- **Advertencia obligatoria (avisar en voz alta):** «Esta última parte, la
  cola de pedidos, es la sección 3.3 de la propuesta y está marcada como
  sujeta a validación técnica en la Fase 1. La mostramos para que vean a dónde
  puede llegar, no como algo ya comprometido.»
- **Qué mirar:** la franja ámbar con cuenta regresiva; la cola en ámbar *En
  cola* pasando a su resultado sin recargar; en `/demo`, los eventos de
  ventana y reconciliación en los contadores de la sesión.
- **Si falla:** si el portal no refleja la ventana, el override no entró:
  mirar en `/demo` que `P103` diga *Forzada · En ventana* y repetir *Forzar
  ventana*. Si el reloj quedó desplazado del ensayo, pulsar el reinicio del
  reloj en `/demo` antes de empezar. La ruta alterna es fijar `P103` a mano
  con *Forzar ventana* sin usar el selector de escenarios.

## Escena 5 — El chatbot · 2 minutos

- **Pestaña:** parte de *Vista Cliente*; a la mitad cambia a *Servicio al
  Cliente*.
- **Acciones, en orden:**
  1. En `/portal`, abrir la burbuja **Asistente** (esquina inferior).
  2. Pregunta 1: «¿Cuánto tarda el DEMO-6205-2RSH/C3 si pido 200 piezas?»
     → TE estimado de 8 a 17,5 semanas, precio de lista simulado USD 250,00,
     disponibilidad PS 1.200 y SL 300, con la aclaración de que el TE no está
     confirmado.
  3. Pregunta 2: «Necesito un rodamiento equivalente al DEMO-6205-2RSH/C3
     sellado por ambos lados» → sugiere designaciones del catálogo y remite a
     Ingeniería de Ventas (punto 4.6).
  4. Pregunta 3: «¿En qué va mi cotización <número>?» usando un número real
     del histórico (formato `AAAAQ#####`; anotar uno antes de presentar,
     sembrado con `DEMO_SEED=20260803`) → estado y días transcurridos contra
     el SLA de 4 días hábiles.
  5. Cambiar a *Servicio al Cliente*, abrir el mismo asistente y preguntar:
     «¿Qué solicitudes de hoy son de productos planeados con stock
     suficiente?» → lista las solicitudes reales de la bandeja con su
     clasificación QMS y cuáles permite declinar el punto 4.1.
- **Frase:** «El mismo motor sirve a los dos lados del mostrador: no tiene
  una base paralela ni redacta cifras de memoria; llama al mismo validador,
  estimador y procedimiento que usa el portal.»
- **Qué mirar:** la respuesta en streaming; que las cifras coinciden con las
  del portal para la misma designación; que en el perfil operador lista
  números de solicitud reales y nunca nombres de personas (códigos `CSR 1`,
  `CSR 2`…).
- **Si falla (interruptor `CHAT_RESPALDO`):** si el Gateway no responde o la
  red cae, el chat pasa a las respuestas pregrabadas. En local: poner
  `CHAT_RESPALDO=true` en `.env.local` y reiniciar `pnpm dev`. En producción:
  actualizar la variable en Vercel y volver a desplegar (pasos exactos en
  `despliegue.md`, sección *Interruptor de sala*). El respaldo cubre
  exactamente las cuatro preguntas de esta escena (las tres del cliente y la
  del operador); ante cualquier otra pregunta informa que el asistente no
  está disponible — no improvisar fuera de esas cuatro. Al terminar, devolver
  `CHAT_RESPALDO` a `false`.

## Escena 6 — Tablero de impacto · 2 minutos

- **Pestaña:** se cambia a *Impacto* (`/impacto`) y ahí termina.
- **Acciones:**
  1. Abrir la pestaña *Impacto*.
  2. Recorrer los cuatro indicadores de la sesión: solicitudes evitadas,
     minutos de operador liberados, errores de homólogos prevenidos y
     cotizaciones innecesarias evitadas durante la ventana.
  3. Bajar al panel operativo: carga por CSR (el sustituto del Excel de las
     11:30), cumplimiento del SLA de cuatro días hábiles y las ventanas de
     desconexión de la semana por planta.
  4. Si se quiere mostrar el tablero *vivo*: provocar un evento desde otra
     ventana (una búsqueda en `/portal`) y ver el contador subir sin recargar.
- **Frase:** «Estos números son ilustrativos, calculados sobre datos
  simulados. El propósito de la Fase 1 es exactamente sustituirlos por sus
  números reales — y este tablero es donde vivirán.»
- **Aviso obligatorio (avisar en voz alta):** los minutos liberados usan el
  supuesto de 12 minutos por solicitud evitada, declarado en la propia
  pantalla; no es una medición de su operación.
- **Qué mirar:** toda cifra con su leyenda (*sobre datos simulados* en lo de
  la sesión, *operación simulada acumulada* en el SLA); cifras distintas de
  cero si el recorrido se hizo completo; la tasa de SLA **no** se pinta en
  verde aunque sea alta.
- **Si falla:** si un contador está en cero, la escena que lo alimenta no se
  ejecutó en esta sesión — señalarlo como tal, no improvisar la cifra. Si el
  tablero no se actualiza solo, el respaldo por sondeo lo refresca en unos
  segundos; esperar, no recargar.

## Escena 7 — Cierre y amarre con la propuesta · 1 minuto

- **Pestaña:** *Impacto* (o la lámina de cierre de la presentación, fuera de
  la aplicación).
- **Acciones:** ninguna en la aplicación. Superponer lo visto con las fases
  del roadmap.
- **Frase:** «Esto que vieron es a dónde llegamos en la Fase 3; para llegar
  bien, necesitamos la Fase 1. Los números del tablero son ilustrativos y la
  cola de pedidos está sujeta a validación técnica: exactamente las dos cosas
  que la Fase 1 convierte en compromisos medidos.»
- **Qué mirar:** que quedan claras las dos advertencias del encabezado de
  este documento antes de abrir el turno de preguntas.
- **Si falla:** no aplica — la escena es cierre verbal. Si piden ver algo ya
  mostrado, volver a la pestaña correspondiente sin rehacer el recorrido.

---

## Anexo — correspondencia con los casos curados

El selector de escenarios de `/demo` (`lib/sesion-demo/escenarios.ts`)
precarga estas consultas; son los valores contrastados contra la base
sembrada:

| Escena | Escenario de `/demo` | Consulta | Cantidad |
|---|---|---|---:|
| 1 y 2 | Designación truncada | `DEMO-6205-2RSH` | 100 |
| 2, variante MOQ | MOQ superior a lo pedido | `DEMO-MOQ-50` | 5 |
| 2, variante pack | Pack quantity | `DEMO-PACK-20` | 25 |
| 3 | Obsoleto con reemplazo | `DEMO-OBS-CON` | 50 |
| 4 | Planta en ventana de mantenimiento | `DEMO-VENTANA` | 200 |
| 5 | (chat, sin escenario) | `DEMO-6205-2RSH/C3` | 200 |

Nota: el plan 4B menciona `DEMO-6205-2RSH/C` como captura truncada de las
escenas 1 y 2; también funciona como prefijo incompleto de
`DEMO-6205-2RSH/C3` y produce el mismo recorrido. Se usa `DEMO-6205-2RSH`
porque es el valor del escenario curado y el de la guía de ensayo. La
cantidad 200 del plan corresponde a `DEMO-VENTANA` (escena 4) y a la primera
pregunta del chat (escena 5).
