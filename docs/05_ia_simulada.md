# 05 — Simulación e integración de la IA

Qué componentes usan un modelo de lenguaje real, cuáles se resuelven con lógica determinista, y por qué esa mezcla es la correcta para un POC.

---

## 1. Criterio: IA real donde se ve, determinista donde se mide

| Componente | Enfoque | Razón |
|---|---|---|
| **Chatbot de Servicio al Cliente** | LLM real vía API | El lenguaje natural es irreproducible con reglas; es además el componente que el cliente quiere "sentir" |
| **Buscador/validador de designaciones** | Determinista (búsqueda difusa) + LLM solo como respaldo | Debe ser instantáneo, reproducible y explicable. Un modelo que a veces sugiere distinto arruina el demo |
| **Estimador de tiempos de entrega** | Determinista (estadística sobre el histórico sintético) | Debe dar el mismo número dos veces seguidas. Se presenta como "apoyado en históricos", que es exactamente lo que es |
| **Confirmación guiada de homólogos** | Determinista (relaciones de la base de datos) | La equivalencia entre productos es un dato, no una inferencia |
| **Clasificación de solicitudes en la bandeja** | Determinista (árbol QMS) + LLM para el resumen | El árbol de decisión ya está escrito en el procedimiento; la IA solo redacta el porqué |

**El principio:** en un demo en vivo, la variabilidad es enemiga. Todo lo que el presentador va a mostrar dos veces debe comportarse igual las dos veces. El LLM se reserva para donde su valor —conversación natural— compensa esa variabilidad.

Esto además es honesto: durante la Fase 3 real, varios de estos componentes probablemente sí incorporen modelos entrenados con datos de SKF. En el POC no los hay, y decir "esto usa estadística sobre histórico" es más sólido que fingir un modelo inexistente.

---

## 2. Buscador/validador de designaciones

Es el componente más importante del POC y el que más veces se ve en pantalla.

### Cómo funciona (cascada de estrategias)

1. **Coincidencia exacta.** Si la designación existe tal cual, se resuelve al instante.
2. **Normalización.** Se eliminan espacios, guiones y diferencias de mayúsculas; se corrigen confusiones de caracteres visualmente similares. Muchos "errores" del cliente desaparecen aquí.
3. **Detección de captura incompleta.** Si el texto es prefijo de una o varias designaciones válidas, se trata como truncamiento — el caso del copiado desde Word — y se ofrecen las completaciones. Este caso merece un mensaje propio: *"parece que la designación quedó incompleta"*, no un genérico "no encontrado".
4. **Similitud por trigramas** (`pg_trgm`). Devuelve las designaciones más parecidas ordenadas por puntaje. Resuelve transposiciones y caracteres cambiados.
5. **Similitud semántica sobre la descripción** (opcional, con `pgvector`). Para cuando el cliente describe en vez de designar: *"rodamiento 25 mm sellado por ambos lados"*.
6. **Respaldo con LLM.** Solo si todo lo anterior falla: se le entrega al modelo el texto del cliente y un conjunto acotado de candidatos, y se le pide elegir e interpretar. Nunca se le pide inventar designaciones — solo escoger entre las que existen en el catálogo.

### Qué devuelve además de la sugerencia

No basta con "quizás quisiste decir X". Cada sugerencia debe traer el contexto que hoy obliga a Maritza a investigar:

- clasificación planeado / no planeado (LCC),
- disponibilidad por almacén (PS / SL / XX) y planta dueña,
- MOQ y pack quantity, con aviso si la cantidad pedida los incumple,
- si es obsoleto, su reemplazo,
- si es de nueva creación, la advertencia de las 4 semanas adicionales,
- si su planta no tiene conexión ni ruta de embarque, el aviso de que sería declinada.

> Ese bloque de contexto es lo que convierte un buscador en un asesor. Y es literalmente el trabajo manual que el procedimiento QMS asigna hoy al CSR.

### Regla de oro anti-alucinación

**El validador nunca genera una designación que no exista en la base.** Siempre selecciona de un conjunto cerrado. Si un técnico de SKF pregunta "¿y si se inventa un código?", la respuesta debe ser una arquitectura, no una promesa.

---

## 3. Estimador de tiempos de entrega

Es el componente que ataca el problema prioritario: durante una ventana de desconexión, el cliente no debe quedarse sin respuesta.

### Cómo estimar

Sobre el histórico sintético de cotizaciones, calcular para cada designación (o su familia, si no hay suficientes casos) el tiempo de entrega típico, con:

- **Valor central** (mediana, más robusta que el promedio ante casos extremos),
- **Rango** (percentiles, para expresar incertidumbre honestamente),
- **Nivel de confianza** derivado de la cantidad de casos disponibles: alto si hay muchos registros para esa designación, medio si se infiere de la familia, bajo si es un producto casi sin histórico.

### Ajustes según reglas QMS

Sobre la estimación base se aplican los ajustes del procedimiento: +4 semanas si es de nueva creación, ajuste por planta según su desempeño histórico, consideración del MOQ y del pack quantity en la cantidad efectiva a producir.

### Cómo presentarlo al cliente (crítico)

El mensaje en pantalla debe ser explícito sobre su naturaleza:

> *"Estimado: 4 a 6 semanas · basado en 47 cotizaciones previas de esta designación · confirmación en firme al restablecerse la conexión con la planta, aproximadamente a las 15:00."*

Tres elementos indispensables: **el rango** (no un número falso de preciso), **la base** (cuántos casos lo sustentan) y **el compromiso de confirmación** (esto es una estimación, no una oferta). Presentar una estimación como si fuera un tiempo confirmado sería un problema comercial serio para SKF frente a sus clientes; el diseño debe hacer imposible esa confusión.

---

## 4. Chatbot de Servicio al Cliente

### Arquitectura: recuperación + generación

El modelo **no responde de memoria**. Cada consulta sigue el ciclo:

1. Interpretar la intención del usuario (consulta de precio y TE, búsqueda de equivalente, estado de una cotización, duda de procedimiento).
2. Recuperar el dato correspondiente de la base de datos mediante las mismas funciones que usa el resto del POC (validador, estimador, consulta de inventario, consulta de cotización).
3. Entregar al modelo únicamente los datos recuperados y pedirle que redacte la respuesta.

**Ningún número sale del modelo: los números salen de la base de datos.** El modelo solo redacta y conversa. Esto elimina la clase de error más peligrosa en un demo comercial — un precio o un tiempo inventado.

### Base de conocimiento

Dos cuerpos de información recuperables:

- **Catálogo de designaciones y homólogos** (la misma base que usa el validador, tal como exige la sección 3.2 de la propuesta: un solo motor para ambos canales).
- **El procedimiento QMS de Consultas y Cotizaciones**, fragmentado y disponible para consulta. Esto permite que el chatbot responda a los operadores preguntas de procedimiento: *"¿qué hago si el MOQ es mayor a lo que pide el cliente?"* — y que responda con la regla real de SKF, no con una invención. Alto impacto: es capacitación integrada al flujo de trabajo.

### Los dos modos del chatbot

| Modo | Usuario | Comportamiento |
|---|---|---|
| **Cliente** | Comprador en el portal | Tono de servicio, sin exponer costos internos ni márgenes, sin revelar información de otras cuentas. Durante una desconexión, ofrece TE estimado y opción de encolar el pedido |
| **Operador** | CSR de Customer Service | Acceso a la bandeja, a las reglas del procedimiento y a la clasificación de solicitudes. Puede responder "¿qué solicitudes de hoy puedo declinar según el punto 4.1?" |

### Instrucciones que debe llevar el sistema

Puntos que la configuración del chatbot debe fijar con claridad:

- Nunca inventar designaciones, precios ni tiempos: usar exclusivamente lo recuperado.
- Cuando no haya dato, decirlo y ofrecer la alternativa (generar solicitud, escalar a un CSR).
- Distinguir siempre entre **estimado** y **confirmado**.
- Usar la terminología de SKF (WCL, SPQ+, designación, planeado/no planeado, MOQ, TE).
- Responder en español, con concisión — el usuario está en medio de una compra, no leyendo un manual.
- No prometer plazos ni condiciones comerciales que no vengan del sistema.

### Consideraciones técnicas

- **Streaming de la respuesta:** el texto aparece progresivamente. Un chat que tarda 4 segundos en silencio se siente roto; el mismo tiempo con texto fluyendo se siente vivo.
- **Respaldo ante caída de la API:** un conjunto de respuestas pregrabadas para las preguntas del guion. Si la red del cliente falla en la sala, el chat sigue respondiendo. Combinado con el video de respaldo, elimina el riesgo de una demo fallida.
- **Historial de conversación:** mantener el contexto dentro de la sesión, para que las preguntas de seguimiento funcionen ("¿y si pido 500?").

---

## 5. Cola de pedidos durante la desconexión (sección 3.3 de la propuesta)

Es una simulación de flujo, no un componente de IA, pero es el que más impresiona.

**Flujo a demostrar:**

1. Poco antes del inicio de la ventana, el sistema toma una **copia local del inventario** de esa planta (marcada con su hora de corte).
2. Durante la ventana, el cliente consulta contra esa copia, ve disponibilidad **con la advertencia de que es información al corte de las HH:MM** y puede **reservar su intención de pedido** en lugar de generar una cotización.
3. Al reactivarse la planta, las intenciones se envían en lote.
4. **Reconciliación:** cada intención se confirma, se ajusta (si cambió el stock o el precio) o se convierte en solicitud de cotización si ya no procede. El cliente recibe la notificación del resultado.
5. La bandeja de Customer Service recibe **solo** las que requieren intervención humana.

**Lo que debe quedar visible en pantalla:** el contador de intenciones encoladas, el momento del envío en lote y el desglose de la reconciliación (confirmadas / ajustadas / escaladas). Ese desglose es la prueba de que el mecanismo no es magia: parte se resuelve sola, parte no, y eso está bien.

**Advertencia obligatoria del presentador:** este mecanismo está marcado en la propuesta como sujeto a validación técnica en la Fase 1. Depende de la frescura de los datos de inventario al cierre, de si WCL permite esa lectura complementaria, de si la fábrica puede absorber un lote de solicitudes al reactivarse y de la lógica de reconciliación. Presentarlo como resuelto sería crear una expectativa que la Fase 1 podría desmentir.

---

## 6. Costos y límites

- El único costo recurrente es el consumo de la API del modelo, y en un POC con uso de demostración es marginal.
- Fijar un límite de peticiones por sesión para evitar sorpresas si la URL se comparte.
- Registrar cada llamada al modelo en el registro de eventos: sirve para el dashboard y para estimar costos de la fase real.
- Si se necesita reducir dependencia de la API, el respaldo pregrabado del punto 4 puede cubrir el 100% del guion.
