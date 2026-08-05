# Manual de presentación del POC — pruebas en vivo y qué validar en cada pantalla

Este documento es distinto del [guion cronometrado](guion-cronometrado.md). El guion
dice **qué decir y en qué minuto**. Este manual dice **qué tocar y qué tiene que
aparecer**, pantalla por pantalla, para que puedas hacer la demo como una serie de
pruebas verificables: *«tecleo esto → aquí se ve esto → esta métrica sube → el chat
responde esto»*.

Está pensado para el montaje de dos monitores: el cliente ve el producto en un lado
y el impacto en el otro, mientras tú manejas el panel de control en la pantalla que
nadie proyecta.

---

## 1. Montaje de pantallas

**Monitor 1 — el que se proyecta.** Pantalla dividida en dos ventanas del navegador:

| Mitad | Ruta | Qué muestra |
|---|---|---|
| Izquierda (≈60 %) | `/portal` | *Vista Cliente*: buscador, resultados y burbuja del asistente |
| Derecha (≈40 %) | `/impacto` | Tablero: métricas de la sesión y panel de operación |

El tablero se actualiza solo. No hace falta recargarlo: cada acción del portal se ve
subir en vivo del otro lado. **Ese efecto es la mitad del impacto de la demo** — que
el cliente vea la métrica moverse en el mismo instante en que ocurre la acción.

**Monitor 2 — el que NO se proyecta.** Dos pestañas:

| Pestaña | Ruta | Para qué |
|---|---|---|
| 1 | `/demo` | Panel del presentador: modo, reloj, plantas y escenarios |
| 2 | `/operador` | *Servicio al Cliente*: bandeja, para asomarla cuando toque |

`/operador` sí se proyecta en momentos puntuales (pruebas A y C). Cuando llegue el
momento, muévela al monitor 1 o comparte esa ventana; no la dejes fija ahí, porque
compite con el tablero.

> Si solo tienes un monitor: proyecta `/portal` a pantalla completa y usa
> `Alt+Tab` hacia `/impacto` en los cortes marcados. Funciona, pero se pierde el
> efecto de ver la métrica moverse en tiempo real.

---

## 2. Preparación — cinco minutos antes

1. Abre `/demo` y pulsa **Reiniciar sesión** → *Sí, reiniciar*. Los contadores
   vuelven a cero y desaparecen las solicitudes de ensayos anteriores. El histórico
   sintético de cotizaciones **no** se toca (el SLA sigue teniendo datos).
2. En **Estado de la sesión**, confirma que dice:
   - *Modo activo*: **Situación actual**
   - *Plantas en ventana*: **Ninguna**
   - *Escenario*: **Sin escenario**
   - Los cuatro contadores en **0**
3. Mira el indicador de canal: debe decir **Canal en vivo**. Si dice *sondeo*, la
   demo funciona igual, solo que el tablero tarda hasta ~2 s en reflejar cada acción.
4. En **Reloj simulado**, si el offset no dice *sin desplazamiento*, pulsa
   **Reiniciar reloj**.
5. En **Estado de las plantas**, ninguna fila debe tener la etiqueta **Forzada**. Si
   alguna la tiene, pulsa **Seguir calendario** en esa fila.
6. En `/impacto`, comprueba que **Cumplimiento del SLA** muestra un porcentaje y no
   está vacío. Si está vacío, la siembra no corrió (`pnpm seed`).
7. Anota un número de cotización real del histórico (formato `AAAAQ#####`) para la
   pregunta 3 del chat. Lo necesitas antes de empezar, no en vivo.

**Truco de sala:** el selector **Escenarios del guion** de `/demo` tiene un botón
**Copiar consulta** en cada tarjeta. Copia la designación desde ahí y pégala en el
portal en vez de teclearla. Evita erratas delante del cliente.

---

## 3. Cómo leer cada prueba

Cada prueba tiene siempre el mismo bloque, y ese bloque es la lista de verificación:

- **Preparo** → qué toco en `/demo` (monitor 2)
- **Hago** → qué tecleo o pulso en `/portal` (monitor 1)
- **Valido en el portal** → el texto exacto que debe aparecer
- **Valido en impacto** → qué métrica se mueve y cuánto
- **Valido en Servicio al Cliente** → qué se ve en la bandeja
- **Le pregunto al chat** → la pregunta y qué debe contestar
- **Digo** → la frase que amarra la prueba con el negocio

Si algo de la columna *Valido* no aparece, la prueba no se ejecutó bien. La sección
9 dice cómo recuperarse sin romper el ritmo.

---

## 4. PRUEBA A ⭐ — El antes y el después con la misma captura

**Es la prueba de apertura y la más fácil de entender.** El mismo dato, tecleado dos
veces, con dos resultados opuestos. Dura 2,5 minutos y no necesita explicación
técnica: el contraste habla solo.

### Parte 1 — Situación actual

**Preparo** (`/demo`): en **Escenarios del guion**, tarjeta *Designación truncada* →
**Activar**. Luego, en **Modo de la demostración**, pulsa **Situación actual**.

**Hago** (`/portal`):
1. Designación: `DEMO-6205-2RSH` · Cantidad: `100` → **Consultar**
2. Sobre el resultado, pulsa **Solicitar cotización**

**Valido en el portal:**
- Título del resultado: *«No se encontraron resultados para esa designación.»*
- No hay tarjetas de producto. No hay precio, ni stock, ni tiempo de entrega.
- La única acción disponible es **Solicitar cotización**.
- Tras pulsarlo, franja verde: *«Solicitud generada correctamente: 2026Q…»* —
  **apunta ese número**, lo vas a buscar en la bandeja.

**Valido en impacto:**
- **Solicitudes generadas** pasa de 0 a **1**.
- **Resueltas sin solicitud** se queda en **0 %**.
- **Búsquedas por hora** dibuja su primera barra.

**Valido en Servicio al Cliente** (`/operador`, proyéctala aquí):
- La solicitud aparece en la bandeja con el número que apuntaste.
- Ábrela: en el panel de detalle, *Regla QMS · punto* **4.8** y el mensaje que obliga
  a declinar por designación inválida.
- El campo **CSR asignado** ya viene con un CSR: el reparto fue automático.
- Abajo, en *Resolver*, el desplegable de motivos ya tiene preseleccionable
  **Designación inválida (4.8)**.

**Digo:** «El cliente copió una designación incompleta desde un correo. El sistema
actual no distingue entre un código que no existe y uno que está truncado: genera
trabajo para el CSR que terminará declinado. Y fíjense en el detalle — el sistema ya
sabe, en este momento, que va a terminar declinado por el punto 4.8. Simplemente no
tenía dónde decírselo al cliente.»

### Parte 2 — Con la solución

**Preparo** (`/demo`): **Con la solución**. No toques nada más.

**Hago** (`/portal`): **sin recargar la página**, repite `DEMO-6205-2RSH` · `100` →
**Consultar**. Luego pulsa **Usar esta designación** sobre `DEMO-6205-2RSH/C3`.

**Valido en el portal:**
- Título: *«La designación parece incompleta»* y debajo *«Estas son las completaciones
  más probables del catálogo.»*
- Aparecen **tres tarjetas** de candidatos. En cada una:
  - designación y descripción,
  - los tres almacenes **PS / SL / XX** con sus cantidades,
  - **Cantidad mínima de orden (MOQ)** y **Pack quantity**,
  - un bloque **Regla QMS · punto N** con su explicación,
  - precio y estimación de tiempo de entrega.
- Al pulsar **Usar esta designación**, el botón cambia a **Consulta resuelta**.

**Valido en impacto** — *esta es la parte que hay que señalar con el dedo*:
- **Solicitudes evitadas**: 0 → **1** (es la tarjeta destacada del tablero)
- **Minutos de operador liberados**: 0 → **12**
- **Resueltas sin solicitud**: 0 % → **50 %** (1 evitada de 2 decisiones)
- **Solicitudes generadas** sigue en **1**: no llegó nada nuevo

**Valido en Servicio al Cliente:** vuelve a la bandeja. **Sigue habiendo una sola
solicitud**, la de la parte 1. La consulta de la parte 2 nunca llegó.

**Le pregunto al chat** (burbuja **Asistente**, esquina inferior derecha del portal):

> ¿Cuánto tarda el DEMO-6205-2RSH/C3 si pido 200 piezas?

Debe responder con **las mismas cifras que la tarjeta**: 1.200 piezas en PS, 300 en
SL, precio de lista simulado USD 250,00 y un TE estimado de 8 a 17,5 semanas, con la
aclaración de que **no es un tiempo confirmado**. Contrasta el número del chat con el
que sigue en pantalla en la tarjeta.

En `/impacto`, **Llamadas al modelo** sube a **1**.

**Digo:** «La solicitud nunca llegó a Customer Service. El ciclo completo de la
escena anterior —la solicitud, el reparto, la revisión del CSR, el correo de
declinado— simplemente no ocurrió. Y el asistente no tiene una base de datos
paralela: llama al mismo validador y al mismo estimador que acaba de responder el
portal. Por eso las cifras coinciden.»

---

## 5. PRUEBA B ⭐⭐ — La ventana de desconexión (la prueba estrella)

**Esta es la que cierra la venta.** Es el problema que el cliente ya sabe que tiene y
que hoy no puede resolver: entre 2 y 2,5 horas diarias, en horario pico, en las que
la fábrica no es consultable. Dura 4 minutos. Si solo puedes hacer una prueba, haz
esta.

### Parte 1 — Lo que pasa hoy

**Preparo** (`/demo`): **Escenarios del guion** → *Planta en ventana de
mantenimiento* → **Activar**. Ese clic hace tres cosas de golpe: fuerza la planta
belga `P103` a **En ventana**, alinea el reloj simulado dentro de la ventana y deja
el modo en **Situación actual**.

Verifica antes de seguir, en `/demo`:
- **Estado de las plantas**: la fila `P103` está resaltada con las etiquetas
  **Forzada** y **En ventana**.
- **Estado de la sesión**: *Plantas en ventana* dice **P103**.

**Hago** (`/portal`):
1. `DEMO-VENTANA` · `200` → **Consultar**
2. **Solicitar cotización**
3. Repite la consulta y solicita **una segunda vez** (esto es a propósito: se tienen
   que ver acumulándose)

**Valido en el portal:**
- Antes que nada, aparece una **franja ámbar** cruzando la parte superior de la
  página: *«[Planta] está en ventana de mantenimiento. Restablecimiento estimado a
  las HH:MM (N min).»* — con **cuenta regresiva real**.
- Título del resultado: **«Sistema de planta no disponible»**.
- No hay stock, ni precio, ni tiempo de entrega. Solo el bloque *«Disponibilidad
  temporalmente inaccesible»*.
- Dos solicitudes generadas, cada una con su número.

**Valido en impacto:** **Solicitudes generadas** sube **2**.

**Valido en Servicio al Cliente:** las dos solicitudes acumuladas, repartidas
automáticamente entre CSR distintos. En `/impacto`, el panel **Reparto por CSR**
refleja el cambio en las barras.

**Digo:** «Esto ocurre entre 2 y 2,5 horas todos los días, en su horario pico. En una
ventana real no serían dos solicitudes: serían todas las que entren en ese periodo, y
todas ciegas — el CSR tampoco puede consultar nada hasta que la planta vuelva.»

### Parte 2 — Con la solución

**Preparo** (`/demo`): **Con la solución**. Nada más.

**Hago** (`/portal`): repite `DEMO-VENTANA` · `200` → **Consultar**. Luego pulsa
**Encolar intención de pedido**.

*(Opcional, si quieres enseñar los tres resultados de la reconciliación: encola una
segunda intención con una cantidad por debajo del MOQ.)*

**Valido en el portal** — el punto fino de toda la demo:
- La tarjeta del producto **sí aparece**, pero los tres almacenes PS/SL/XX muestran
  **«—»**, no ceros.
- Un bloque ámbar: **«Inventario en vivo no disponible»** — *«[Planta] está
  desconectada. No mostramos existencias sin confirmar; el precio, el contexto QMS y
  el TE histórico siguen disponibles como orientación.»*
- El precio y el TE estimado **sí están**, con su leyenda de estimación no confirmada.
- Tras encolar, aparece la sección **Intenciones de pedido registradas** con la fila
  en estado **En cola** (ámbar).

**Detente aquí un segundo y señala la diferencia**, porque es sutil y es la clave:
en el modo actual el sistema decía *no hay nada*; ahora dice *sé que existe, sé
cuánto cuesta, sé cuánto tarda históricamente, y sé exactamente por qué no puedo
confirmarte el stock ahora mismo*. Un «no sé» honesto y acotado en vez de un
callejón sin salida.

### Parte 3 — La ventana se cierra

**Hago** (`/demo`):
1. **+30 min** (acerca el fin de la ventana; se ve en el reloj grande)
2. **Cerrar la ventana en curso (P103)**

**Valido en el portal** — **sin recargar la página**:
- La franja ámbar superior **desaparece**.
- La fila de la cola pasa de **En cola** a su resultado: **Confirmada** (verde),
  **Ajustada** (cantidad redondeada al pack) o **Escalada** (por MOQ, punto 4.4).
- Ninguna nota promete una fecha de entrega.

**Valido en impacto:** el panel **Ventanas de desconexión de la semana** muestra la
tabla por planta con las franjas ámbar de los próximos siete días y, arriba, el total
de **horas de fábrica no consultable**. Es la cifra que dimensiona el problema
completo, más allá de la ventana que acaban de ver.

**Digo:** «El mismo periodo produjo dos solicitudes en el modo actual y ninguna
intervención humana en el modo con solución. Multiplíquenlo por las [N] horas
semanales que ven ahí a la derecha. Ese es el número que justifica el proyecto
entero.»

**Advertencia obligatoria — dila en voz alta, no la saltes:** «Esta última parte, la
cola de intenciones, es la sección 3.3 de la propuesta y está marcada como sujeta a
validación técnica en la Fase 1. La mostramos para que vean a dónde puede llegar, no
como algo ya comprometido.»

---

## 6. PRUEBA C — El error que hoy nadie atrapa (obsoletos)

Dura 1,5 minutos. Es la prueba que más credibilidad da, porque incluye el caso en el
que la respuesta correcta es **no**.

**Preparo** (`/demo`): *Obsoleto con reemplazo* → **Activar** (deja el modo en *Con
la solución*).

**Hago** (`/portal`):
1. `DEMO-OBS-CON` · `50` → **Consultar**
2. **Ver equivalencias registradas**
3. Abre el reemplazo `DEMO-6205-2RSH/C3`
4. Marca los **dos pasos** de la confirmación guiada (*Sellado* y *Juego interno*) y
   acepta

**Valido en el portal:**
- Las diferencias técnicas salen **paso a paso**, no en un párrafo.
- **El botón de aceptar no se habilita hasta marcar los dos pasos.** Intenta pulsarlo
  antes, a propósito: que el cliente vea que el sistema no te deja avanzar en
  automático.
- El resultado sale en **azul primario**, nunca en verde, con el texto **sujeto a
  validación de Ingeniería de Ventas** (punto 4.6).

**Valido en impacto:** **Errores de homólogo prevenidos** sube a **1**.

**Digo:** «Aquí es donde hoy el cliente poco observador acepta el reemplazo sin mirar
y genera un pedido con el producto equivocado. La confirmación explícita rompe el
automatismo: el sistema te obliga a leer qué cambia antes de dejarte seguir. Y fíjense
en el color — no es verde. No estamos confirmando nada; estamos documentando que el
cliente vio la diferencia. La confirmación en firme sigue siendo de Ingeniería de
Ventas.»

**Variante de credibilidad (30 s, muy recomendable).** Activa *Obsoleto sin
reemplazo* y consulta `DEMO-OBS-SIN` · `50`. El sistema **declina**, por el punto 4.7.
Di: «No todo se puede salvar. Cuando el procedimiento dice que se declina, el sistema
declina. No estamos vendiéndoles una herramienta que dice que sí a todo.» Esta frase
compra más confianza que cualquier métrica del tablero.

---

## 7. PRUEBA D — El asistente en los dos lados del mostrador

Dura 2 minutos. Es la prueba que responde a la pregunta que el cliente ya se está
haciendo: *«¿y esto se inventa las cifras?»*.

### Lado cliente (`/portal`, burbuja **Asistente**)

Al abrirlo verás tres preguntas sugeridas: **púlsalas en vez de teclear**, es más
rápido y no hay riesgo de errata.

| # | Pregunta | Qué debe contestar |
|---|---|---|
| 1 | ¿Cuánto tarda el DEMO-6205-2RSH/C3 si pido 200 piezas? | Stock PS 1.200 / SL 300, precio USD 250,00, TE de 8 a 17,5 semanas, con la aclaración de que el TE no está confirmado |
| 2 | Necesito un equivalente al DEMO-6205-2RSH/C3 sellado por ambos lados | Sugiere designaciones **del catálogo** y remite a Ingeniería de Ventas (punto 4.6) |
| 3 | ¿En qué va mi cotización `AAAAQ#####`? | Estado y días transcurridos contra el SLA de 4 días hábiles |

Para la 3 usa el número que anotaste en la preparación. **No improvises un número**:
si no existe, el asistente lo dirá correctamente pero pierdes el efecto.

**Valido:** la respuesta llega en *streaming*, palabra por palabra. Y sobre todo: las
cifras de la pregunta 1 **coinciden exactamente** con las que siguen en pantalla en
la tarjeta del portal. Es el momento de decirlo en voz alta.

### Lado operador (`/operador`, mismo asistente)

> ¿Qué solicitudes de productos planeados con stock suficiente se pueden declinar?

**Valido:**
- Lista **las solicitudes reales de la bandeja de esta sesión**, con su número.
- Cada una con su clasificación QMS resuelta.
- Cita el **punto 4.1** como base para declinar.
- **Nunca menciona nombres de personas**: los CSR aparecen como códigos (`CSR 1`,
  `CSR 2`…).

**Valido en impacto:** **Llamadas al modelo** sube una unidad por cada pregunta, en
los dos perfiles.

**Digo:** «Es el mismo motor a los dos lados del mostrador. No tiene una base
paralela ni redacta cifras de memoria: llama al mismo validador, al mismo estimador y
al mismo procedimiento que usa el portal. Por eso puede citarles el punto exacto del
QMS, y por eso las cifras no se contradicen entre pantallas.»

---

## 8. PRUEBA E — Las variantes rápidas (30 segundos cada una)

Guárdalas para el turno de preguntas o para rellenar si vas sobrado de tiempo. Todas
se activan igual: escenario → **Activar** → consultar en el portal.

| Escenario en `/demo` | Consulta | Cant. | Qué demuestra | Métrica que mueve |
|---|---|---:|---|---|
| MOQ superior a lo pedido | `DEMO-MOQ-50` | 5 | El aviso de MOQ sale **antes** de enviar (4.4). Hoy esa solicitud llega y termina declinada. | **Avisos anticipados** +1 |
| Pack quantity | `DEMO-PACK-20` | 25 | Ajusta la cantidad a 40 en vez de declinar (4.5a) | **Avisos anticipados** +1 |
| Designación de nueva creación | `DEMO-NUEVA` | 30 | +4 semanas por creación de material: extensión en MDG-SAP, precio en SAP y seteo en WCL (4.9) | — |
| Reemplazo indicado por fábrica | `DEMO-OBS-FAB` | 50 | El reemplazo existe pero no está dado de alta. Hoy este caso se pierde. (4.6) | — |
| Transmisión de potencia | `DEMO-PT-PLANNER` | 40 | Por segmento va al Planner vía PT Inquery, no por PINQ a fábrica (4.3) | — |

La más vistosa de las cinco es **MOQ**: es instantánea, el cliente la entiende sin
contexto y muestra que el sistema evita el retrabajo *antes* de generarlo.

---

## 9. Tabla maestra — qué acción mueve qué métrica

Esta tabla es tu red de seguridad. Si una métrica no se mueve, aquí ves qué acción
faltó. Sirve también para responder «¿y de dónde sale ese número?» sin dudar.

| Acción en la app | Métrica en `/impacto` | Cuánto |
|---|---|---|
| **Consultar** (cualquier búsqueda) | Búsquedas por hora | +1 barra en la hora actual |
| **Solicitar cotización** | Solicitudes generadas | +1 |
| **Usar esta designación** | Solicitudes evitadas **y** Minutos de operador liberados | +1 y **+12 min** |
| Búsqueda que cae en MOQ o pack quantity | Avisos anticipados | +1 por candidato afectado |
| Aceptar la confirmación guiada de homólogo | Errores de homólogo prevenidos | +1 |
| Cualquier pregunta al asistente (los dos perfiles) | Llamadas al modelo | +1 |
| Cualquier combinación de las dos primeras | Resueltas sin solicitud | evitadas ÷ (evitadas + generadas) |
| Generar una solicitud | Reparto por CSR | +1 en la barra del CSR asignado |
| Forzar o cerrar una ventana desde `/demo` | Ventanas de desconexión de la semana | recalcula las franjas |

**Los 12 minutos son un supuesto declarado, no una medición.** La propia tarjeta del
tablero lo dice en su nota al pie. Dilo en voz alta **la primera vez** que la cifra
aparezca en pantalla —en la prueba A— y no tendrás que defenderlo después.

Dos paneles del tablero **no** dependen de lo que hagas en la sesión:

- **Cumplimiento del SLA** — sale del histórico sintético acumulado, no de la sesión.
  Su leyenda lo dice: *«Operación simulada acumulada, no la sesión.»* Por eso tiene
  números desde el minuto cero. Nota: la tasa **no se pinta en verde** aunque sea
  alta, a propósito.
- **Ventanas de desconexión de la semana** — es el calendario de las plantas.

---

## 10. Verificación final antes de abrir el turno de preguntas

Si hiciste el recorrido completo (A, B, C, D), el tablero debe tener **todas** estas
cifras distintas de cero. Es la foto que conviene dejar proyectada mientras hablan:

- [ ] Solicitudes evitadas ≥ 1
- [ ] Minutos de operador liberados ≥ 12
- [ ] Errores de homólogo prevenidos ≥ 1
- [ ] Solicitudes generadas ≥ 3
- [ ] Resueltas sin solicitud con un porcentaje visible
- [ ] Llamadas al modelo ≥ 4
- [ ] Búsquedas por hora con barras dibujadas
- [ ] Reparto por CSR con barras repartidas entre varios CSR
- [ ] Cumplimiento del SLA con su tasa
- [ ] Ventanas de la semana con las franjas ámbar

**Si un contador está en cero, la prueba que lo alimenta no se ejecutó.** Dilo tal
cual —«esa métrica está en cero porque no llegamos a hacer esa parte»— y no
improvises una cifra. La honestidad sobre los números es el argumento central de la
Fase 1; contradecirla en la demo sale caro.

---

## 11. Si algo falla

| Síntoma | Causa casi segura | Salida |
|---|---|---|
| La búsqueda devuelve candidatos cuando esperabas «no encontrado» | El modo quedó en *Con la solución* de un ensayo | `/demo` → **Situación actual** |
| El contador de evitadas no sube | No pulsaste **Usar esta designación**, solo consultaste | Pulsa el botón; es el que registra la evitada |
| El portal no muestra la ventana de mantenimiento | El override de planta no entró | `/demo` → verifica que `P103` diga **Forzada · En ventana**; si no, **Forzar ventana** en esa fila |
| La cola no cambia de estado al cerrar la ventana | El clic de **Cerrar la ventana en curso** no llegó | El botón muestra entre paréntesis las plantas afectadas; si sale vacío, la planta ya no estaba en ventana |
| El tablero no se actualiza solo | El canal en vivo cayó a sondeo | Espera unos segundos: el respaldo lo refresca. **No recargues** en mitad de una escena |
| La bandeja tiene solicitudes que no reconoces | Sesión anterior sin reiniciar | `/demo` → **Reiniciar sesión** (no borra el histórico) |
| El reloj está desplazado y las ventanas no cuadran | Offset acumulado de un ensayo | `/demo` → **Reiniciar reloj** |
| El asistente no responde o da error | El Gateway no contesta | Interruptor `CHAT_RESPALDO=true` — ver abajo |

**Interruptor de sala del chat.** Con `CHAT_RESPALDO=true` el asistente pasa a
respuestas pregrabadas. Cubre **exactamente** las cuatro preguntas de la prueba D
(las tres del cliente y la del operador); ante cualquier otra informa que no está
disponible. **No improvises preguntas fuera de esas cuatro con el respaldo activo.**
En local: edita `.env.local` y reinicia `pnpm dev`. En producción: cambia la variable
en Vercel y vuelve a desplegar — pasos exactos en [despliegue.md](despliegue.md),
sección *Interruptor de sala*. Devuélvelo a `false` al terminar.

---

## 12. Las dos frases que no puedes olvidar

Van en este orden y en estos momentos. Son obligación tuya, no del software:

1. **La primera vez que aparezcan los minutos liberados** (prueba A, parte 2): «Los
   12 minutos por solicitud evitada son un supuesto del POC, declarado en la propia
   pantalla. No es una medición de su operación — confirmarlo con sus números reales
   es justamente uno de los objetivos de la Fase 1.»

2. **Al terminar la cola de intenciones** (prueba B, parte 3): «Esta parte es la
   sección 3.3 de la propuesta y está sujeta a validación técnica en la Fase 1. La
   mostramos para que vean a dónde puede llegar, no como algo ya comprometido.»

Y el cierre que las convierte en argumento en vez de disculpa:

> «Todo lo que vieron corre sobre datos sintéticos y las reglas de su propio
> procedimiento de Consultas y Cotizaciones, revisión 3. Los números del tablero son
> ilustrativos y la cola de pedidos está sujeta a validación: exactamente las dos
> cosas que la Fase 1 convierte en compromisos medidos. Este tablero es donde van a
> vivir sus números reales.»

---

## Anexo — chuleta de una página

Para tener al lado del teclado.

```
MONITOR 1 (proyectado)   →  /portal  |  /impacto
MONITOR 2 (privado)      →  /demo    |  /operador

ANTES:  /demo → Reiniciar sesión → modo "Situación actual" → sin plantas forzadas

A ⭐  Truncada        DEMO-6205-2RSH   100   hoy → solución
      hoy:      "No se encontraron resultados" → Solicitar cotización
      solución: 3 candidatos → Usar esta designación   [evitadas +1, minutos +12]

B ⭐⭐ Ventana        DEMO-VENTANA     200   hoy → solución → cerrar ventana
      hoy:      "Sistema de planta no disponible" → 2 solicitudes
      solución: stock en "—" + precio + TE → Encolar intención
      /demo:    +30 min → Cerrar la ventana en curso → la cola se resuelve sola

C    Obsoleto        DEMO-OBS-CON      50   solución
      Ver equivalencias → marcar 2 pasos → azul, NO verde   [homólogos +1]
      Variante credibilidad: DEMO-OBS-SIN → declina (4.7)

D    Chat            3 preguntas cliente + 1 operador       [modelo +1 c/u]
      Contrastar cifras del chat con las de la tarjeta en pantalla

E    Rápidas         DEMO-MOQ-50 (5) · DEMO-PACK-20 (25) · DEMO-NUEVA (30)

DECIR SIEMPRE: (1) los 12 min son supuesto   (2) la cola es sección 3.3, sujeta
               a validación técnica en Fase 1
```
