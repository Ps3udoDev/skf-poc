# 02 — Alcance del POC y guion de la demostración

---

## 1. Qué es y qué no es este POC

**Es:** una aplicación web navegable, con datos sintéticos realistas, que reproduce el flujo de cotización de SKF y muestra los cuatro componentes propuestos operando sobre él.

**No es:** un MVP, no está integrado a WCL/SPQ+/PinQ, no usa datos reales de SKF, no está listo para operación.

**Duración de construcción sugerida:** 2 a 3 semanas de trabajo enfocado (1–2 personas). Si el tiempo es menor, ver "Recortes por prioridad" al final.

### Alcance funcional

| # | Módulo | Prioridad | Justificación |
|---|---|---|---|
| 1 | Portal de consulta tipo WCL (simulado) | **Imprescindible** | Es el escenario donde ocurre todo; sin él no hay contexto |
| 2 | Buscador/validador inteligente de designaciones | **Imprescindible** | Ataca el ~80% de los casos; es el componente más fácil de "sentir" |
| 3 | Simulador de ventana de desconexión + estimador de TE | **Imprescindible** | Es el problema prioritario declarado por el cliente |
| 4 | Chatbot de Servicio al Cliente | **Imprescindible** | Componente estrella de la propuesta |
| 5 | Dashboard de impacto | **Alta** | Conecta el demo con las métricas de la sección 6 de la propuesta |
| 6 | Confirmación guiada de homólogos / obsoletos | **Alta** | Tercera problemática; se integra dentro del módulo 2 |
| 7 | Cola de pedidos con copia local de inventario | **Media** | Sección 3.3 de la propuesta; alto impacto visual, marcar como "a validar" |
| 8 | Bandeja del operador + asignación automática (sustituto del Excel de 11:30) | **Media** | Quick win no contemplado en la propuesta; sorprende al cliente |
| 9 | Detector de copiado incompleto desde Word | **Baja** | Se resuelve dentro del validador; mencionarlo, no construirlo aparte |

---

## 2. Los dos perfiles del demo

El POC debe poder recorrerse desde dos ángulos, porque en la sala hay dos audiencias:

- **Vista Cliente** (el comprador que usa WCL): busca una designación, consulta precio y TE, genera una cotización. Le interesa no equivocarse y no esperar.
- **Vista Customer Service** (Maritza, Berenice y su coordinador): recibe solicitudes, ve la carga de trabajo, la clasificación automática, el retrabajo evitado. Les interesa dejar de hacer trabajo inútil.

Un selector de perfil en la barra superior permite alternar en vivo. Es el recurso narrativo más potente del demo: *"esto que el cliente acaba de evitar hacer, es esto que Maritza acaba de dejar de recibir."*

---

## 3. Guion de la demostración (10–12 minutos)

Cada escena tiene: **qué se muestra → qué problema evidencia → qué frase la acompaña.**

### Escena 0 — Encuadre (30 seg)

Pantalla de inicio con el distintivo *Entorno de demostración · datos simulados*.

> "Lo que van a ver es una simulación construida con datos sintéticos y con las reglas de su propio procedimiento de Consultas y Cotizaciones, revisión 3. No está conectado a WCL. El objetivo es que vean, no que imaginen, cómo se comportaría la solución."

### Escena 1 — El estado actual, sin ayuda (1 min)

En Vista Cliente, se escribe una designación **mal capturada**, por ejemplo truncada como si se hubiera copiado a medias desde Word (`6205-2RSH/C` en lugar de `6205-2RSH/C3`). El sistema, en **modo "hoy"**, no encuentra nada y ofrece generar una solicitud de cotización.

Se cambia a Vista Customer Service: la solicitud aparece en la bandeja, y al abrirla el procedimiento obliga a declinarla (punto 4.8 del QMS: *si no existe la designación o está incorrecta se declina y se le informa al cliente*).

> **Evidencia:** el ciclo completo de retrabajo — el cliente espera, el operador trabaja, nadie obtiene nada. Aquí se muestra el contador: *"esta solicitud consumió X minutos de operador y no produjo ninguna cotización."*

### Escena 2 — El mismo caso, con el validador activo (1.5 min)

Se activa el **modo "con la solución"** (interruptor visible en la barra superior — este contraste es el eje del demo).

Se escribe la misma designación truncada. Ahora el buscador:
- detecta que la captura parece incompleta,
- sugiere las 3 designaciones válidas más cercanas con su descripción,
- muestra para cada una: PCC/LCC (planeado o no planeado), disponibilidad por almacén (PS/SL/XX), MOQ y pack quantity.

El cliente elige la correcta y **ve el precio y el TE al instante, sin generar cotización**.

> **Evidencia:** la solicitud nunca llegó a Customer Service. Se cambia a Vista CS y la bandeja está vacía. El contador marca *"1 solicitud evitada"*.

Variante rápida para mostrar el resto del árbol QMS: pedir 5 piezas de una designación con MOQ de 50 → el validador lo advierte **antes** de enviar (hoy eso llega a Maritza y termina declinado, punto 4.4).

### Escena 3 — Homólogos y obsoletos (1 min)

Se busca una designación **obsoleta con reemplazo**. El sistema no la deja pasar en silencio: muestra una confirmación guiada de dos opciones, con las diferencias técnicas resaltadas y una advertencia de que el reemplazo debe validarse con el Ingeniero de Ventas (punto 4.6 del QMS).

> **Evidencia:** aquí es donde hoy el cliente "poco observador" elige mal y genera un pedido con el producto incorrecto. La confirmación explícita rompe el automatismo.

### Escena 4 — La ventana de desconexión (3 min) ⭐ **momento clave**

El presentador activa el interruptor **"Simular desconexión con fábrica"** (por ejemplo, planta de Bélgica). Un banner discreto indica el estado.

**Primero en modo "hoy":** el cliente consulta un producto que sí existe y sí tiene stock, pero como la fábrica está desconectada el portal no muestra disponibilidad. El cliente hace lo único que puede: genera una solicitud de cotización. Se cambia a Vista CS y se ven **varias solicitudes acumulándose** durante la ventana. Al restablecerse la conexión, todas resultan innecesarias.

> "Esto ocurre entre 2 y 2.5 horas todos los días, en su horario pico."

**Luego en modo "con la solución":** misma consulta, misma desconexión. Ahora:
- el sistema **sabe** que la fábrica está en ventana de mantenimiento (no que el producto no existe),
- muestra al cliente un **tiempo de entrega estimado** basado en el histórico de esa designación con esa planta, con su rango de confianza y la leyenda de que se confirmará al reactivarse,
- ofrece **reservar la intención de pedido** contra la copia local de inventario (sección 3.3 de la propuesta) en lugar de generar una cotización.

Se avanza el reloj simulado hasta el fin de la ventana: la cola se envía en lote, y las intenciones se confirman o se ajustan automáticamente. La bandeja de Customer Service muestra **solo las que realmente requerían intervención humana**.

> **Evidencia:** el mismo periodo de 2 horas produjo N solicitudes en el modo actual y 1 en el modo con solución. Es el número que justifica el proyecto entero.

**Advertencia obligatoria del presentador:** *"esta última parte, la cola de pedidos, es la sección 3.3 de la propuesta y está marcada como sujeta a validación técnica en la Fase 1. La mostramos para que vean a dónde puede llegar, no como algo ya comprometido."*

### Escena 5 — El chatbot (2 min)

Desde el portal, el cliente abre el chat y pregunta en lenguaje natural:
- *"¿Cuánto tarda el 6205-2RSH/C3 si pido 200 piezas?"* → responde con TE, precio y disponibilidad por almacén.
- *"Necesito un rodamiento equivalente al 6205 pero sellado por ambos lados"* → sugiere designaciones desde la base de conocimiento.
- *"¿En qué va mi cotización 2026Q00847?"* → devuelve estado y días transcurridos contra el SLA de 4 días hábiles.

Luego, desde la Vista Customer Service, el mismo motor responde al operador: *"¿qué solicitudes de hoy son de productos planeados con stock suficiente?"* → lista las que el procedimiento permite declinar de inmediato (punto 4.1).

> **Evidencia:** el mismo motor sirve a los dos lados del mostrador, tal como dice la sección 3.2 de la propuesta ("comparten un mismo motor de IA").

### Escena 6 — Dashboard de impacto (2 min)

Panel con las cuatro métricas de la sección 6 de la propuesta, calculadas sobre la sesión de demo y sobre los datos sintéticos acumulados:

1. Cotizaciones innecesarias generadas durante ventanas de desconexión → **evitadas**
2. Tiempo de operador dedicado a corregir/rechazar designaciones → **liberado**
3. Errores de selección entre homólogos → **prevenidos**
4. Solicitudes que no se resuelven al primer intento (de las 60–70 diarias) → **reducción**

Más un panel operativo: distribución de carga por CSR (el sustituto del Excel de las 11:30), cumplimiento del SLA de 4 días y ventanas de desconexión por planta en una línea de tiempo semanal.

> "Estos números son ilustrativos, calculados sobre datos simulados. El propósito de la Fase 1 es exactamente sustituirlos por sus números reales — y este tablero es donde vivirán."

### Escena 7 — Cierre y amarre con la propuesta (1 min)

Una lámina final que superpone lo que se acaba de ver con las fases del roadmap: *esto que vieron es a dónde llegamos en la Fase 3; para llegar bien, necesitamos la Fase 1.*

---

## 4. Cómo se evidencia cada problemática (tabla resumen)

| Problemática (minuta 22/07) | Cómo se evidencia en el POC | Métrica visible |
|---|---|---|
| Ventanas de desconexión → cotizaciones innecesarias | Interruptor de desconexión + comparación modo hoy / modo solución sobre la misma consulta | Solicitudes generadas en la ventana: N vs. 1 |
| Designaciones mal ingresadas (~80%) | Búsqueda con designación truncada, con y sin validador; recorrido hasta el declinado en la bandeja de CS | Solicitudes evitadas · minutos de operador liberados |
| Selección errónea de homólogos | Confirmación guiada al elegir entre alternativas y en obsoletos con reemplazo | Confirmaciones forzadas · errores prevenidos |
| Copiado incompleto desde Word | Detección de captura truncada dentro del validador (mismo flujo de la escena 2) | Incluido en "solicitudes evitadas" |
| MOQ / pack quantity (extra del QMS) | Aviso anticipado antes de enviar la solicitud | Declinados evitados |
| Reparto manual en Excel a las 11:30 (extra) | Asignación automática y balanceada en la bandeja del operador | Carga por CSR · hora de disponibilidad del reparto |

---

## 5. Reglas de honestidad del demo

Estas reglas protegen la credibilidad del equipo y evitan un problema serio en Fase 1:

1. **Distintivo permanente** de *datos simulados* en toda la aplicación.
2. **Nada de números inventados presentados como reales.** Toda cifra del dashboard lleva la leyenda "sobre datos simulados".
3. **La sección 3.3 (cola de pedidos) siempre se presenta como sujeta a validación técnica.**
4. **No prometer integración.** Si preguntan "¿ya está conectado a WCL?", la respuesta es no, y que precisamente confirmar cómo conectarse es objetivo de la Fase 1.
5. **Los tiempos de entrega estimados del demo son ilustrativos**, generados de un histórico sintético, no un modelo entrenado con datos de SKF.

---

## 6. Recortes por prioridad (si hay menos tiempo)

- **Versión mínima viable del demo (≈1 semana):** portal simulado + validador + interruptor de desconexión con estimador + contador simple. Con esto solo ya se cubren los dos problemas prioritarios.
- **Se sacrifica primero:** cola de pedidos (escena 4b), bandeja del operador con asignación automática, y el chatbot del lado operador.
- **Nunca se sacrifica:** el contraste modo hoy / modo solución. Sin ese contraste el demo pierde toda su fuerza argumentativa.
