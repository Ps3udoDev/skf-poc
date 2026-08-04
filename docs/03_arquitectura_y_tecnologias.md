# 03 — Arquitectura y tecnologías del POC

Decisiones de stack, justificadas. Sin código: qué se usa, por qué, y cómo se organiza.

---

## 1. Decisión de framework: Next.js, no Astro

| Criterio | Next.js (App Router) | Astro |
|---|---|---|
| Interactividad intensa (chat, búsqueda en vivo, interruptores de estado) | Nativo, es su terreno | Requiere islas y un framework cliente igual |
| Rutas de API en el mismo proyecto (mock de WCL/SPQ+/PinQ, endpoint del chatbot) | Incluido | Posible pero menos directo |
| Streaming de respuestas del LLM | Soporte de primera clase | Se puede, con más fricción |
| Dominio del equipo | Ya es el stack habitual del equipo | Curva adicional |
| Despliegue | Vercel, cero configuración | También, pero sin ventaja |

**Veredicto: Next.js (App Router, TypeScript).** Astro sería la elección correcta si el POC fuera un sitio de contenido; aquí el 90% del valor está en interacción en tiempo real. Elegir la herramienta que el equipo ya domina también reduce el riesgo de entrega: el POC tiene fecha, no margen para aprender un framework.

---

## 2. Stack completo

| Capa | Tecnología | Notas |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | Server Components para la carga de datos, Client Components para la interacción |
| Base de datos | **Supabase (PostgreSQL)** | Postgres gestionado, con API automática y buenas capacidades de búsqueda de texto |
| Búsqueda difusa de designaciones | **Extensiones `pg_trgm` + `unaccent` de PostgreSQL** | Similitud por trigramas; resuelve errores de tipeo y capturas truncadas sin necesidad de servicio externo |
| Búsqueda semántica (opcional) | **`pgvector` en Supabase** | Para el chatbot: recuperar fragmentos del catálogo y del procedimiento QMS por significado |
| UI | **shadcn/ui + Tailwind CSS** | Componentes accesibles, rápidos de componer, estéticamente neutros y personalizables a la identidad SKF |
| Gráficos del dashboard | **Recharts** | Suficiente para barras, líneas y comparativos; no requiere licencias |
| Estado de la sesión de demo | **Zustand** (o contexto de React) | El "modo hoy / modo solución", el estado de las plantas y el reloj simulado son estado global del demo |
| IA | **API de Anthropic (Claude)** para el chatbot | Ver `05_ia_simulada.md` para el detalle de qué es IA real y qué es simulación determinista |
| Generación de datos | **Scripts de Node/TypeScript + Faker** | Ejecutados una sola vez para poblar la base; ver `04_datos_demo.md` |
| Hosting | **Vercel** | Despliegue por push, URL compartible con el cliente, entorno de vista previa |
| Autenticación | **Supabase Auth con usuarios pregrabados**, o simplemente un selector de perfil sin login | Para un POC, el login es fricción innecesaria en el demo — mejor un selector de perfil |

### Alternativas consideradas y descartadas

- **SQLite / archivos JSON locales:** más rápido de montar, pero pierde la búsqueda difusa nativa y complica el despliegue compartible. Supabase da además una URL que el cliente puede abrir por su cuenta después de la reunión, lo cual tiene valor comercial.
- **Un servicio de búsqueda dedicado (Algolia, Typesense, Elastic):** técnicamente mejor para búsqueda, pero es infraestructura extra y costo para un POC. `pg_trgm` es suficiente para un catálogo sintético de decenas de miles de registros.
- **Un framework de agentes complejo:** innecesario. El chatbot del POC es un caso de recuperación + generación bien acotado.

---

## 3. Arquitectura del POC (espejo del roadmap)

La estructura replica intencionalmente las cuatro capas de la lámina 3 del PPTX, para que el cliente reconozca la correspondencia.

```
CAPA 4 — Canales
  Portal cliente (tipo WCL)  ·  Bandeja Customer Service  ·  Chatbot  ·  Dashboard
        ▲                              ▲                      ▲            ▲
CAPA 3 — Motor de IA y base de conocimiento
  Validador de designaciones  ·  Estimador de TE  ·  Motor de chat  ·  Cola de pedidos
        ▲                              ▲                      ▲
CAPA 2 — Capa complementaria de integración (simulada)
  "Gateway" interno  ·  Servicio de estado de fábricas  ·  Registro de eventos/métricas
        ▲
CAPA 1 — Fuentes de datos (simuladas como si fueran APIs externas)
  mock-WCL  ·  mock-SPQ+  ·  mock-PinQ  ·  mock-Inventario  ·  Catálogo y homólogos
        ▲
  Base de datos Supabase (datos sintéticos)
```

### Detalle importante: los mocks se comportan como APIs externas

Aunque todo viva en la misma base de datos, la capa 1 debe implementarse como **rutas de API separadas que simulan sistemas externos**, con dos comportamientos deliberados:

1. **Latencia artificial** (200–800 ms aleatorios), para que se sienta como un sistema corporativo real y no instantáneo.
2. **Fallo controlado durante las ventanas de desconexión:** el mock de inventario de una planta responde con error o con vacío cuando esa planta está en ventana. Este es el mecanismo que hace funcionar toda la escena 4 del demo.

Esta separación no es puritanismo arquitectónico: cuando llegue la Fase 3, sustituir cada mock por la API real de WCL/SPQ+/PinQ debe ser cambiar una implementación, no reescribir la aplicación. Y poder decírselo al cliente en el demo es un argumento fuerte.

---

## 4. El servicio de estado de fábricas (pieza central)

Es el componente que más rendimiento narrativo da por línea de código. Responsabilidades:

- Mantener un **calendario de ventanas de mantenimiento por planta** (Europa concentrada, Bélgica con horario variable entre las 3.5 y 5.5 h, ventanas de 2 a 2.5 h, según la minuta).
- Exponer el estado actual de cada planta: `en línea` / `en ventana de mantenimiento` / `reactivándose`.
- Permitir **override manual desde el panel de demo**: el presentador fuerza una desconexión en vivo. Sin esto, el demo dependería de la hora del día.
- Emitir los eventos que alimentan el dashboard: inicio de ventana, solicitudes generadas durante la ventana, fin de ventana, reconciliación.

Complemento necesario: un **reloj simulado** que el presentador puede adelantar para mostrar el fin de la ventana y el envío en lote de la cola de pedidos sin esperar dos horas reales.

---

## 5. Panel de control del demo (oculto al cliente, visible para el presentador)

Una pantalla de administración con:

- Interruptor **modo hoy / modo con solución** (el eje de toda la narrativa).
- Interruptores de desconexión por planta.
- Control del reloj simulado (avanzar 30 min / 1 h / cerrar ventana).
- Botón de **reinicio de la sesión de demo**: devuelve contadores y bandeja al estado inicial. Imprescindible si se presenta dos veces el mismo día.
- Selector de escenario precargado (para saltar directo a una escena si el tiempo se acorta).

> Recomendación operativa: que este panel viva en una ruta aparte, abierta en una segunda pestaña o en la laptop del presentador, no en la pantalla proyectada.

---

## 6. Estructura de la aplicación

```
/app
  /portal              → Vista Cliente (tipo WCL): búsqueda, resultado, solicitud
  /operador            → Vista Customer Service: bandeja, asignación, detalle
  /dashboard           → Métricas de impacto y panel operativo
  /demo                → Panel de control del presentador
  /api
    /mock/wcl          → Consulta de precio y TE
    /mock/spq          → Alta y consulta de solicitudes de cotización
    /mock/pinq         → Consulta de soporte a planta
    /mock/inventario   → Disponibilidad por almacén (falla en ventana)
    /validador         → Validación y sugerencia de designaciones
    /estimador         → Tiempo de entrega estimado
    /chat              → Chatbot (streaming)
/lib
  /reglas-qms          → Árbol de decisión del procedimiento (planeado/no planeado, MOQ, pack, obsoletos)
  /estado-fabricas     → Calendario, estado y override manual
  /metricas            → Registro de eventos y cálculo de indicadores
/scripts
  /seed                → Generación de datos sintéticos
```

**La carpeta `reglas-qms` es la que da credibilidad al POC.** Debe ser una traducción fiel del árbol de decisión del punto 4 del procedimiento, y conviene poder mostrarla en pantalla si algún técnico de SKF pregunta cómo se decide.

---

## 7. Entornos y despliegue

- **Local:** desarrollo con base Supabase de desarrollo.
- **Vista previa (Vercel):** una URL por rama, para revisión interna de Wagner y Germán antes de la presentación.
- **Demo (producción):** rama estable, con datos sintéticos ya sembrados y snapshot de respaldo para restaurar entre presentaciones.

**Contingencia obligatoria:** grabar un **video de respaldo del recorrido completo** (5–8 min). Si falla la red o la API del LLM en la sala del cliente, el demo no se cae. Esto no es opcional en una presentación comercial.

---

## 8. Consideraciones de seguridad y datos

- **Cero datos reales de SKF.** Ni un nombre de cliente real, ni un precio real. Todo sintético. Esto evita cualquier problema de confidencialidad antes de que exista un acuerdo.
- Las claves de API (LLM, Supabase) solo del lado servidor, nunca expuestas al cliente del navegador.
- Si se usan nombres de personas en el demo (Maritza, Berenice como operadores), pedir autorización o usar nombres genéricos tipo "CSR 1", "CSR 2". Que aparezca su nombre en una bandeja simulada puede leerse como señalamiento — mejor evitarlo o consensuarlo antes.
- El acceso público a la URL del demo debe protegerse con una contraseña simple si se comparte fuera de la reunión.
