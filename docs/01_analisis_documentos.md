# 01 — Análisis de los documentos fuente

Síntesis de los tres insumos entregados y qué obligación impone cada uno al POC.

---

## 1. Procedimiento QMS — Consultas y Cotizaciones (Rev. 3, 13/07/2026)

Es el documento **más valioso de los tres para el POC**: no es una propuesta comercial, es el procedimiento interno certificado que el equipo de Customer Service AFT sigue todos los días. Contiene las reglas de negocio literales que el demo debe respetar para ser creíble.

### Reglas de negocio que el POC debe reproducir

| Regla | Qué implica en el demo |
|---|---|
| **Planeado vs. No Planeado (LCC)** | Planeado = se mantiene en stock, visible en WCL, con precio en lista. No Planeado (LCC="NP") = no hay stock, requiere pedido incancelable y cotización previa. El POC debe distinguir ambos: es la raíz de por qué unas consultas se resuelven solas y otras generan cotización. |
| **PCC (Product Category Code)** | C = tipos planeados, P = equipo original, N = bajo orden, O = obsoletos. Alimenta el catálogo sintético. |
| **Flujo de decisión (punto 4)** | Planeado + monto ≤ stock → se declina la cotización (ya estaba disponible). Planeado + monto > stock → se pide LT al planner. No planeado → se revisa disponibilidad (SPQ+/SAP/Global Availability) → si no hay, se ingresa PINQ a fábrica. Este árbol es el motor lógico del validador. |
| **MOQ (Minimum Order Quantity)** | Si el MOQ es mayor a lo pedido, se declina y se informa. **Oportunidad de demo:** el validador puede avisarlo *antes* de generar la solicitud. |
| **Pack Quantity** | El sistema redondea al pack asignado y se le explica al cliente el cambio de cantidad. Otra validación anticipable. |
| **Obsoletos con y sin reemplazo** | Con reemplazo en sistema → se cotiza indicando el cambio. Sin reemplazo → se declina. Es exactamente el caso de "homólogos" donde el cliente se equivoca. |
| **Designación inexistente o incorrecta** | Hoy **se declina y se informa**. Este es el 80% del problema de Maritza y la justificación directa del buscador/validador. |
| **Designación de nueva creación** | Suma 4 semanas al tiempo de entrega (creación de material + extensión MDG-SAP + precio + seteo en WCL). Detalle que da mucha credibilidad al estimador. |
| **Solo se cotiza con fábricas con conexión y ruta de embarque** | Si el origen es otra fábrica, se declina. Conecta directo con el problema de desconexión. |
| **FPC1 / FPC2** | FPC1 → precio de lista o parámetros SPQ+. FPC2 → se pide LPC a fábrica y SPQ+ calcula. Explica por qué algunos precios tardan. |
| **SLA: ≤ 4 días hábiles promedio de respuesta** | **Métrica oficial del cliente.** El dashboard del POC debe medir contra este número: es el KPI que SKF ya reconoce como propio. |
| **Almacenes PS / SL / XX** | Primario, secundario y terciario, con disponibilidad sujeta a aprobación del supplier. Estructura del inventario sintético. |
| **Asignación manual diaria en Excel antes de las 11:30 am** | Un CSR baja las solicitudes a Excel y las reparte al equipo. **Punto de fricción no explotado aún en la propuesta** — vale la pena mostrarlo automatizado en el POC como "extra" de alto impacto y bajo costo. |
| **Número de cotización `XXXXQXXXXX`** | Formato año + letra + consecutivo. Usarlo en los datos sintéticos. |

### Diccionario de siglas a usar tal cual en la UI

WCL, SPQ+, PinQ/OPI, SAP, MDG Materials, PDIV, PCC, LCC, LPC, FPC, MOQ, TE, SPL, COM, Supplier ID, Package Code.

> **Regla de oro del POC:** hablar el idioma del cliente. Cada etiqueta de pantalla debe usar la sigla que ellos ya usan. Un demo que dice "Producto No Planeado (LCC=NP)" en vez de "producto sin stock" gana credibilidad instantánea.

---

## 2. Propuesta Integral por Fases (Teams4Soft, 27/07/2026)

Define el marco comercial y metodológico. Lo relevante para el POC:

- **Metodología CPMAI** (6 fases, respaldada por PMI). El POC vive *antes* de la Fase 1 o como apoyo visual durante su presentación: sirve para que el cliente **vea** lo que se está proponiendo comprar.
- **Estructura de fases:** Fase 1 levantamiento (6 sem) → Fase 2 diseño (2 sem) → Fase 3 desarrollo MVP (6 sem) → Fase 4 piloto (3 sem) → Fase 5 despliegue (2 sem). Total 19 semanas.
- **Componentes comprometidos** (sección 3): chatbot de Servicio al Cliente con estimador de TE, buscador/validador inteligente de designaciones, confirmación guiada de homólogos, validación de completitud del copiado desde Word.
- **Evolución posible (sección 3.3):** cola de pedidos contra copia local de inventario durante la desconexión, con envío masivo al reactivarse la fábrica. Marcada como *a validar*.
- **Restricción dura:** todo debe ser **capa complementaria**, sin sustituir ni modificar WCL (obligatorio a nivel grupo SKF).
- **Métricas de la sección 6:** las cuatro líneas base están "a cuantificar en la Fase 1". El POC puede mostrarlas ya calculadas sobre datos sintéticos, dejando claro que son ilustrativas.

### Qué le exige al POC

1. Demostrar los cuatro componentes de la sección 3.1, uno por uno.
2. Demostrar la sección 3.3 (cola de pedidos) aunque sea como flujo simulado — es lo que más impresiona y hoy es solo texto.
3. No dar la impresión de que se está tocando WCL: la UI debe leerse como una capa que *envuelve* al portal, no que lo reemplaza.
4. Mostrar el dashboard de métricas con la estructura de la tabla de la sección 6.

---

## 3. Roadmap (PPTX, Teams4Soft)

Tres láminas: portada, línea de tiempo de 19 semanas y **arquitectura de la solución vía API**.

La lámina 3 ya fija la arquitectura conceptual en cuatro capas, y el POC debe **replicar visualmente esa misma arquitectura** para que el cliente reconozca la continuidad entre la propuesta y la demo:

| Capa del roadmap | Equivalente en el POC |
|---|---|
| **1. Fuentes de datos (vía API):** WCL, SPQ+, PinQ, inventario por planta, catálogo de designaciones y homólogos | Base de datos sintética con una tabla por fuente + una capa de "mock API" que simula latencia y caídas |
| **2. Capa complementaria de integración:** API Gateway + detección de estado de conexión con fábricas | Rutas de API del propio POC + un *servicio de estado de fábricas* con interruptor manual para el demo |
| **3. Motor de IA y base de conocimiento:** base de conocimiento, motor de validación/buscador, cola de pedidos con copia local | Catálogo + índice de búsqueda difusa + LLM vía API + tabla de cola de pedidos diferidos |
| **4. Canales y resultados:** chatbot, buscador/validador en el flujo, dashboard de métricas | Las tres pantallas principales del POC |

> Nota de consistencia: el PPTX dice que la Fase 1 se cotiza "por tiempo y esfuerzo (T&M)", mientras que el documento Word dice **precio cerrado**. Conviene alinear ambos antes de presentar; el POC no lo resuelve, pero es un detalle que el cliente puede notar.

---

## 4. Conclusiones del análisis

**Lo que ya está bien resuelto en los documentos:** el marco metodológico, el fraseo comercial, el roadmap y la identificación de problemáticas.

**Lo que le falta a la propuesta y el POC puede aportar:**

1. **Tangibilidad.** Todo está descrito en prosa. Nadie ha visto una pantalla. El POC convierte 20 páginas en 10 minutos de demo.
2. **Aterrizaje de las reglas QMS.** La propuesta no menciona MOQ, pack quantity, FPC ni el árbol de decisión planeado/no planeado. Incorporarlos en el POC demuestra que se leyó el procedimiento interno — señal fortísima de seriedad.
3. **La automatización del Excel de las 11:30 am.** Fricción real, documentada, no atacada. Quick win visible.
4. **La medición contra el SLA de 4 días hábiles.** Es el KPI que el cliente ya tiene; el dashboard debe hablar en esa unidad.

**Riesgo a manejar en la presentación:** que el cliente confunda el POC con el producto terminado y asuma que "ya está hecho". Cada pantalla debe llevar un distintivo visible de *datos simulados / entorno de demostración*, y el guion debe decirlo explícitamente al abrir (ver `02_alcance_y_guion_demo.md`).
