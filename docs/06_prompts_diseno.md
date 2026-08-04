# 06 — Prompts de diseño para la UI del POC

Prompts listos para usar con herramientas de generación de interfaz (Claude, v0, Lovable, Figma Make) o con la herramienta que el equipo prefiera. Están escritos para producir un resultado coherente entre pantallas.

---

## 0. Antes de empezar: la identidad visual

**Regla comercial importante:** no clonar la marca SKF. Usar sus colores corporativos exactos y su logotipo en un demo no autorizado puede leerse como apropiación de marca. La estrategia correcta es una **identidad neutra profesional, industrial y sobria**, que se sienta afín al sector sin suplantar la identidad del cliente. Si SKF lo autoriza expresamente, se ajusta después.

**Dirección visual recomendada:**

- Paleta industrial: azul profundo como color principal, gris neutro como base, un ámbar reservado exclusivamente para el estado de desconexión y un verde discreto para confirmaciones. Poco color, usado con intención.
- Tipografía sin serifas, legible en tamaños pequeños: hay muchos códigos alfanuméricos en pantalla y la confusión entre caracteres similares es parte del problema que estamos resolviendo. **Las designaciones siempre en fuente monoespaciada.**
- Densidad de información media-alta: es una herramienta de trabajo, no una landing page. Las pantallas vacías con mucho aire se ven bonitas y transmiten "producto inmaduro".
- Sin ilustraciones decorativas, sin degradados, sin iconografía juguetona.

---

## Prompt 1 — Sistema de diseño base

```
Necesito un sistema de diseño para una aplicación web B2B industrial: un portal
de consulta de productos y cotizaciones para el área de servicio al cliente de
una empresa de componentes mecánicos (rodamientos y transmisión).

Contexto de uso: operadores que pasan 8 horas al día en la herramienta y
compradores industriales que consultan disponibilidad y precio. Densidad de
información alta, muchos códigos alfanuméricos, tablas.

Genera:
- Paleta de color: azul profundo como primario, escala de grises neutros,
  ámbar solo para estados de advertencia/desconexión, verde solo para
  confirmación, rojo solo para error. Define tono claro y oscuro.
- Escala tipográfica: una sans-serif de interfaz legible y una monoespaciada
  para códigos de producto. Define tamaños para título, subtítulo, cuerpo,
  etiqueta y dato tabular.
- Escala de espaciado y radios de borde (sobrios, no redondeados excesivos).
- Componentes base: botón (primario, secundario, sutil), campo de entrada con
  estados, etiqueta de estado (píldora), tarjeta, tabla de datos, alerta,
  y un banner de estado del sistema para la barra superior.

Estilo: sobrio, industrial, profesional. Sin degradados, sin sombras marcadas,
sin decoración. Tecnología: Tailwind CSS + shadcn/ui. Entrégame los tokens de
diseño y los componentes.
```

---

## Prompt 2 — Portal de consulta (Vista Cliente)

```
Diseña la pantalla principal de un portal de autoservicio donde un comprador
industrial consulta disponibilidad, precio y tiempo de entrega de componentes.

Estructura:
- Barra superior con: identificador de la empresa (usa un nombre genérico),
  selector de perfil (Cliente / Servicio al Cliente), y un indicador de estado
  de conexión con las plantas de fabricación.
- Buscador protagonista, centrado y amplio, con sugerencias en vivo mientras
  se escribe. El campo acepta códigos de producto alfanuméricos y también
  descripciones en lenguaje natural.
- Bajo el buscador, resultados en tarjetas que muestren para cada producto:
  el código en fuente monoespaciada, la descripción técnica, una etiqueta de
  clasificación (planeado / no planeado / obsoleto), disponibilidad por
  almacén (primario, secundario, terciario), precio, tiempo de entrega,
  cantidad mínima de orden y piezas por caja.
- Un panel lateral o inferior con el detalle del producto seleccionado y la
  acción de solicitar cotización.

Estado especial a diseñar: cuando el buscador detecta que el código escrito
parece incompleto o tiene un error de captura, debe mostrar un bloque de
sugerencias con las 3 alternativas más cercanas, cada una con su contexto
(clasificación, disponibilidad, mínimo de orden), y un mensaje claro que
distinga "el código parece incompleto" de "el código no existe".

Estilo: industrial sobrio, densidad de información alta, azul profundo y grises.
Tailwind + shadcn/ui. En español.
```

---

## Prompt 3 — Estado de desconexión (la pantalla clave)

```
Diseña los estados de interfaz para cuando el sistema pierde conexión temporal
con una planta de fabricación (ventana diaria de mantenimiento de 2 a 2.5 horas).

Necesito DOS versiones contrastantes de la misma pantalla de resultado de
búsqueda, para presentarlas una junto a la otra:

VERSIÓN A — "Situación actual": el producto simplemente no aparece disponible.
Un mensaje genérico de que no hay información y la única acción posible es
generar una solicitud de cotización. Debe transmitir frustración y callejón
sin salida, sin ser caricaturesca: es una interfaz corporativa normal que
deja al usuario sin opciones.

VERSIÓN B — "Con la solución": la misma búsqueda, pero ahora:
- un banner ámbar discreto en la barra superior indicando que una planta
  específica está en ventana de mantenimiento programado, con la hora
  estimada de restablecimiento y una cuenta regresiva;
- el producto SÍ aparece, con la información al corte de una hora determinada,
  claramente etiquetada como "información al corte de las HH:MM";
- un tiempo de entrega ESTIMADO presentado como rango, con el número de casos
  históricos que lo sustentan y un nivel de confianza visual;
- una acción principal de "reservar intención de pedido", que se enviará
  automáticamente al restablecerse la conexión, y una secundaria de
  "solicitar cotización";
- claridad visual absoluta entre lo estimado y lo confirmado: deben ser
  visualmente inconfundibles.

Estilo: industrial sobrio, ámbar reservado exclusivamente para este estado.
Tailwind + shadcn/ui. En español.
```

---

## Prompt 4 — Confirmación guiada de productos equivalentes

```
Diseña un diálogo de confirmación para cuando un comprador selecciona un
producto que tiene equivalentes o alternativas, o cuando el producto elegido
está descontinuado y tiene un reemplazo.

El problema que resuelve: los usuarios seleccionan rápido y sin leer, y
terminan comprando el producto equivocado.

Requisitos:
- Comparación lado a lado del producto solicitado y la alternativa propuesta.
- Las diferencias técnicas entre ambos deben estar RESALTADAS, no escondidas
  en una lista uniforme. Lo que es igual debe atenuarse; lo que difiere debe
  saltar a la vista.
- En caso de producto descontinuado: una nota de que el reemplazo debe
  validarse técnicamente con el ingeniero de ventas antes de ordenar.
- La confirmación debe requerir una acción deliberada, no un clic reflejo:
  el usuario tiene que elegir explícitamente cuál producto quiere.
- Debe verse profesional y no condescendiente: el usuario es un comprador
  industrial, no un novato.

Estilo: industrial sobrio. Tailwind + shadcn/ui. En español.
```

---

## Prompt 5 — Bandeja del operador (Vista Customer Service)

```
Diseña la pantalla de trabajo de un representante de servicio al cliente que
atiende solicitudes de cotización de productos industriales (60 a 70 al día
en todo el equipo).

Estructura:
- Lista de solicitudes con: número de cotización, cliente, código de producto,
  cantidad, antigüedad de la solicitud y un semáforo contra un acuerdo de
  servicio de 4 días hábiles.
- Cada solicitud viene preclasificada automáticamente con una etiqueta que
  indica la ruta que corresponde según el procedimiento: producto planeado con
  stock suficiente (resoluble de inmediato), producto no planeado (requiere
  consulta a planta), cantidad menor al mínimo de orden, producto descontinuado
  con reemplazo, código inválido o incompleto, planta sin ruta de embarque.
- Filtros rápidos por clasificación y por representante asignado.
- Panel de detalle de la solicitud seleccionada, con el contexto ya recopilado
  (disponibilidad por almacén, clasificación, mínimo de orden, histórico de la
  designación) y las acciones sugeridas.
- Una barra superior con el resumen del día: solicitudes recibidas, resueltas,
  evitadas automáticamente, y la distribución de carga entre representantes.

Estilo: herramienta de trabajo densa y eficiente, tipo panel de control
operativo. Priorizar escaneabilidad sobre estética. Tailwind + shadcn/ui.
En español.
```

---

## Prompt 6 — Chatbot

```
Diseña el componente de chat de asistencia para el portal descrito, en dos
presentaciones: como panel lateral desplegable dentro del portal, y como
pantalla completa.

Requisitos:
- Mensajes con formato enriquecido: el asistente debe poder responder con
  tarjetas de producto embebidas (código, disponibilidad, precio, tiempo de
  entrega), no solo texto plano.
- Distinción visual clara entre información confirmada e información estimada
  dentro de las respuestas.
- Indicador de escritura y respuesta en streaming.
- Sugerencias de preguntas iniciales para orientar al usuario.
- Cuando el asistente cita una regla del procedimiento interno, debe mostrarse
  la referencia de forma discreta pero visible.
- Dos variantes de tono según el perfil: cliente externo y operador interno.

Estilo: sobrio, integrado al resto de la interfaz, sin elementos juguetones ni
avatares caricaturescos. Tailwind + shadcn/ui. En español.
```

---

## Prompt 7 — Dashboard de impacto

```
Diseña un tablero de indicadores para medir el impacto de una solución que
reduce solicitudes de cotización innecesarias en un área de servicio al cliente.

Indicadores principales (tarjetas destacadas en la parte superior):
- Solicitudes innecesarias evitadas durante ventanas de desconexión con plantas
- Tiempo de operador liberado por corrección automática de códigos mal escritos
- Errores de selección de producto equivalente prevenidos
- Porcentaje de solicitudes resueltas al primer intento

Cada tarjeta muestra el valor actual, la comparación contra una línea base y
la tendencia.

Gráficos:
- Solicitudes por hora del día, con las ventanas de mantenimiento de plantas
  sombreadas sobre el eje temporal: el pico debe verse coincidir con las
  ventanas. Este es el gráfico más importante del tablero.
- Distribución de motivos de rechazo de solicitudes.
- Cumplimiento del acuerdo de servicio de 4 días hábiles, en el tiempo.
- Carga de trabajo distribuida por representante.
- Línea de tiempo semanal de ventanas de mantenimiento por planta.

Elemento obligatorio: un distintivo permanente y visible que indique que los
datos mostrados son simulados, en un entorno de demostración. Debe ser claro
sin dominar la pantalla.

Estilo: tablero ejecutivo sobrio, legible en proyección a distancia (los
números principales deben leerse desde el fondo de una sala de juntas).
Tailwind + shadcn/ui + Recharts. En español.
```

---

## Prompt 8 — Panel de control del presentador

```
Diseña una pantalla de control interna para el presentador de una demostración
en vivo (no la ve el cliente; se opera desde una segunda pantalla).

Controles necesarios:
- Interruptor principal entre dos modos: "situación actual" y "con la solución".
  Debe ser el elemento más prominente de la pantalla.
- Interruptores individuales para forzar el estado de desconexión de cada
  planta, con indicación de su ventana programada.
- Control de un reloj simulado: avanzar 30 minutos, 1 hora, o cerrar la
  ventana de mantenimiento en curso.
- Selector de escenarios precargados, cada uno con nombre descriptivo, que
  prepara el sistema para una escena concreta de la demostración.
- Botón de reinicio de la sesión, con confirmación.
- Estado actual del sistema en un vistazo: modo activo, plantas conectadas,
  hora simulada, contadores de la sesión.

Estilo: utilitario, alto contraste, botones grandes y etiquetas inequívocas.
Debe poder operarse sin dudar mientras se habla frente a una audiencia.
Tailwind + shadcn/ui. En español.
```

---

## Recomendaciones de uso de los prompts

1. **Ejecutar el prompt 1 primero** y fijar los tokens resultantes. Todos los demás prompts deben ejecutarse indicando que usen ese sistema de diseño, o las pantallas no se verán como una sola aplicación.
2. **Iterar sobre la pantalla del prompt 3 más que sobre ninguna otra.** Es el momento decisivo de la presentación; merece el doble de tiempo de pulido.
3. **Revisar densidad.** Las herramientas de generación tienden a producir interfaces aireadas tipo producto de consumo. Para este caso hay que empujar deliberadamente hacia más información por pantalla.
4. **Probar en proyección.** Lo que se ve bien en un monitor a 30 cm puede ser ilegible en una sala de juntas. Verificar tamaños de fuente y contraste con la pantalla real donde se presentará.
5. **Todo en español**, con la terminología de SKF: designación, tiempo de entrega, producto planeado / no planeado, cantidad mínima de orden, almacén primario/secundario/terciario, cotización.
