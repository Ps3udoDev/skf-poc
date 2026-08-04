# Diseño — POC Servicio al Cliente SKF México (Teams4Soft)

**Fecha:** 2026-08-03
**Estado:** aprobado
**Documentos base:** `docs/00_README.md` … `docs/06_prompts_diseno.md`
**Fuentes primarias:** `docs/fuentes/` (procedimiento QMS Rev. 3, Propuesta Integral por Fases, Roadmap PPTX)

---

## 1. Objetivo

Construir una aplicación web navegable, con datos sintéticos realistas, que le permita a SKF México **ver** —no imaginar— la solución descrita en la Propuesta Integral por Fases, antes de aprobar la Fase 1.

**No es** un MVP. No está integrado a WCL, SPQ+ ni PinQ. No usa datos reales de SKF.

**El criterio de éxito** es narrativo, no funcional: que en 10–12 minutos de demo el equipo de Customer Service se reconozca en la pantalla y los stakeholders entiendan qué compran. El eje de esa narrativa es un interruptor: **modo "hoy" contra modo "con la solución"**, aplicado sobre la misma consulta.

---

## 2. Alcance

### 2.1 Versión 1 (este ciclo)

| # | Módulo | Ruta | Contenido |
|---|---|---|---|
| 1 | Portal tipo WCL | `/portal` | Buscador protagonista, resultados, detalle, selector de perfil |
| 2 | Validador de designaciones | `/api/validador` | Cascada de 6 estrategias. Absorbe el módulo 9 (copiado truncado desde Word) y los avisos de MOQ / pack quantity |
| 3 | Desconexión + estimador de TE | `/api/estimador`, `lib/estado-fabricas` | Calendario de ventanas, override manual, reloj simulado, estimación estadística |
| 4 | Chatbot | `/api/chat` | Streaming, modo cliente / modo operador, tool calling contra la base de datos |
| — | Panel del presentador | `/demo` | No figura entre los 9 módulos del doc 02, pero sin él no hay demostración en vivo |

### 2.2 Contratos para la versión 2

Los 5 módulos restantes se dividen en dos contratos por prioridad, porque tienen dependencias distintas.

**Contrato A — prioridad Alta**
- Módulo 5: Dashboard de impacto (`/dashboard`)
- Módulo 6: Confirmación guiada de homólogos y obsoletos

Depende de: esquema completo de `eventos_demo` y del campo `homologos.diferencias` (jsonb).

**Contrato B — prioridad Media**
- Módulo 7: Cola de pedidos con copia local de inventario (sección 3.3 de la propuesta)
- Módulo 8: Bandeja del operador con asignación automática (sustituto del Excel de las 11:30)

Depende de: tablas `intenciones_pedido` y `snapshot_inventario`, y de las columnas `solicitudes.csr_asignado` y `solicitudes.clasificacion_qms`.

**Regla que hace viable la partición:** la versión 1 crea **todas** las tablas y columnas de ambos contratos, y **emite todos los eventos de métricas**, aunque ninguna pantalla los renderice todavía. Emitir un evento cuesta tres líneas; retro-instrumentar un pipeline de métricas cuesta un refactor. La versión 2 será aditiva.

### 2.3 Fuera de alcance

Integración real con WCL / SPQ+ / PinQ. Autenticación (se usa selector de perfil, sin login). Datos reales de SKF de cualquier tipo. Modelos entrenados con datos del cliente.

---

## 3. Stack

| Capa | Tecnología | Versión |
|---|---|---|
| Framework | Next.js App Router + TypeScript | 16.2 |
| Runtime | React | 19.2 |
| Gestor de paquetes | pnpm | 11.15 |
| Base de datos | Supabase (PostgreSQL) | cloud, sin Docker local |
| Búsqueda difusa | `pg_trgm` + `unaccent` | extensiones nativas |
| UI | Tailwind CSS v4 + shadcn/ui | |
| Gráficos | Recharts | 3.10 |
| IA | AI SDK v7 vía **Vercel AI Gateway** | `anthropic/claude-sonnet-5` |
| Linter / formatter | **Biome** (sin ESLint ni Prettier) | 2.5 |
| Tests | Vitest | 4.1 |
| Semilla de datos | tsx + Faker + `pg` (COPY) | |
| Hosting | Vercel | |

### Desviaciones respecto a `docs/03_arquitectura_y_tecnologias.md`

1. **Proveedor de IA: Vercel AI Gateway, no la API de Anthropic directa.** Impacto arquitectónico nulo — es el proveedor en la capa del AI SDK. El modelo queda en `CHAT_MODEL`, cambiable sin tocar código.
2. **Biome en lugar de ESLint/Prettier.** Decisión del equipo.
3. **Sin `pgvector` en la versión 1.** El doc 03 ya lo marca como opcional. A la escala del procedimiento QMS (un documento), la recuperación por full-text search o la inclusión directa en el contexto del modelo son suficientes. Añadir embeddings es complejidad sin ganancia medible; si la versión 2 lo requiere, se agrega entonces.
4. **Sin Supabase local.** Docker no está instalado en el entorno de desarrollo. Se trabaja contra el proyecto cloud vía `supabase link` + `supabase db push`. Las migraciones se escriben a mano en `supabase/migrations/`.

---

## 4. Arquitectura

Replica intencionalmente las cuatro capas de la lámina 3 del Roadmap, para que el cliente reconozca la correspondencia entre lo que se propuso y lo que se demuestra.

```
app/
  (portal)/            → Vista Cliente (tipo WCL)
  (operador)/          → Vista Customer Service
  (dashboard)/         → Contrato A — ruta reservada
  demo/                → Panel del presentador
  api/
    mock/wcl/          → Precio y tiempo de entrega
    mock/spq/          → Alta y consulta de solicitudes
    mock/pinq/         → Consulta de soporte a planta
    mock/inventario/   → Disponibilidad por almacén (falla en ventana)
    validador/         → Validación y sugerencia de designaciones
    estimador/         → Tiempo de entrega estimado
    chat/              → Chatbot con streaming

lib/
  reglas-qms/          → Árbol de decisión del punto 4 del procedimiento
  estado-fabricas/     → Calendario de ventanas, override, reloj simulado
  fuentes/             → ÚNICA capa que consulta las tablas mock
  metricas/            → Emisión de eventos y cálculo de indicadores
  supabase/            → Clientes server / browser / service-role
  ai/                  → Configuración del Gateway, herramientas, prompts

supabase/migrations/   → Migraciones SQL versionadas
scripts/seed/          → Generación de datos sintéticos
docs/fuentes/          → Documentos originales del cliente
```

### 4.1 Aislamiento de las fuentes

**Ningún componente de la aplicación consulta las tablas mock directamente.** Todo pasa por `lib/fuentes/*`, y las rutas `/api/mock/*` envuelven esas funciones con el comportamiento de sistema externo.

Esto no es purismo: cuando llegue la Fase 3, sustituir cada mock por la API real de WCL/SPQ+/PinQ debe ser cambiar una implementación, no reescribir la aplicación. Poder decírselo al cliente durante el demo es un argumento comercial.

### 4.2 Latencia artificial selectiva

Los documentos piden 200–800 ms de latencia en los mocks. Se aplica **exclusivamente a las llamadas que simulan sistemas externos** (inventario, precio WCL, PinQ) y **nunca** al buscador ni al validador.

La razón es narrativa: en pantalla debe verse que los sistemas corporativos tardan y que la capa complementaria responde al instante. Meterle latencia al buscador destruiría el momento de la escena 2 del guion.

### 4.3 Fallo controlado durante las ventanas

El mock de inventario de una planta responde con error o vacío cuando esa planta está en ventana de mantenimiento. Ese es el mecanismo que hace funcionar toda la escena 4, que es el momento clave de la presentación.

---

## 5. Estado de la sesión de demo

El panel del presentador se opera desde una segunda pantalla o una segunda laptop, controlando lo que se ve en la pantalla proyectada. Eso descarta el estado en cliente: se resuelve con una tabla en Supabase y suscripción por Realtime.

### Tabla `sesion_demo` (una sola fila)

| Campo | Tipo | Propósito |
|---|---|---|
| `modo` | `'hoy' \| 'solucion'` | El eje narrativo de toda la presentación |
| `plantas_override` | jsonb | `{planta_id: 'online' \| 'ventana' \| 'reactivando'}` |
| `reloj_offset_min` | int | Offset contra la hora real, **no** una hora absoluta: así el reloj simulado sigue corriendo solo tras cada salto |
| `escenario_activo` | text | Escenarios precargados del doc 04, sección 4 |
| `iniciada_en` | timestamptz | Marca de reinicio. Los contadores leen únicamente eventos posteriores a esta fecha, de modo que reiniciar la sesión no borra el histórico |

`/demo` escribe mediante Server Actions con la clave de service role. Portal, operador y dashboard se suscriben por Realtime.

Beneficios: se opera desde otra máquina, se sobrevive a un refresh accidental en mitad de la presentación, y queda registro auditable de la sesión.

`zustand` se reserva para estado efímero de interfaz (panel abierto, filtros de tabla). Nunca para el estado del demo.

---

## 6. Modelo de datos

### Tablas de la versión 1

| Tabla | Contenido | Volumen objetivo |
|---|---|---|
| `designaciones` | Catálogo. Campos del QMS: `pcc`, `lcc`, `fpc`, `pdiv`, `com`, `moq`, `pack_quantity`, `precio_lista`, `vigente`, `reemplazo_de`, `reemplazado_por`, `es_nueva_creacion` | 30.000 |
| `homologos` | Equivalencias con `motivo` y `diferencias` (jsonb) | ~4.000 relaciones |
| `plantas` | País, huso, ventana de mantenimiento, variabilidad, conexión y ruta de embarque | ~20 |
| `inventario` | Existencias por designación y almacén (`PS` / `SL` / `XX`) | ~45.000 |
| `cotizaciones` | Histórico sintético, formato `AAAAQ#####`, con resultado y motivo de declinado | ~9.000 |
| `clientes` | Tipo AFT / OEM / usuario final, nivel de descuento | ~300 |
| `operadores` | CSR ficticios (`CSR 1`, `CSR 2`… — nunca nombres reales) | ~8 |
| `solicitudes` | Las generadas durante el demo, separadas del histórico | crece en sesión |
| `eventos_demo` | Registro de todo lo ocurrido en la sesión. Fuente del dashboard | crece en sesión |
| `sesion_demo` | Estado del demo (sección 5) | 1 fila |

### Tablas creadas vacías para el Contrato B

`intenciones_pedido`, `snapshot_inventario`.

### Índices

GIN con `pg_trgm` sobre `designaciones.designacion`. B-tree sobre `lcc`, `pdiv` y `cotizaciones.fecha_solicitud`. Los índices se crean **después** de la carga masiva del histórico.

### Distribuciones (doc 04)

~60% planeados (`LCC=PLAN`), ~35% no planeados (`NP`), ~5% obsoletos. De los obsoletos, ~70% con reemplazo. Esta mezcla reproduce el árbol de decisión completo del procedimiento.

### Patrones sembrados deliberadamente

Un histórico aleatorio no sirve: el dashboard debe poder *encontrar* los problemas que la propuesta describe.

- Pico de solicitudes entre las 12:30 y las 15:00, con motivo de declinado "ya estaba disponible en WCL".
- Subconjunto marcado como designación mal ingresada, en proporción coherente con el ~80% reportado.
- Errores de tipeo verosímiles: caracteres transpuestos, sufijo faltante (copiado truncado desde Word), confusión de caracteres visualmente similares, guiones y espacios de más o de menos.
- Tiempos de respuesta distribuidos alrededor del SLA de 4 días hábiles, con una cola que lo excede.
- Estacionalidad ligera, para que las series temporales no se vean planas.

### Siembra

Semilla fija (`DEMO_SEED`) para reproducibilidad: si hay que reconstruir la base antes de la presentación, sale idéntica. Carga por `COPY` vía `pg` contra el pooler de sesión, no por la API REST — la diferencia a 30.000 filas es de minutos contra horas.

### Casos curados

Además del volumen, un conjunto de casos preparados a mano que se comportan exactamente como el guion necesita, accesibles con un clic desde `/demo`: designación truncada, MOQ superior a lo pedido, pack quantity, obsoleto con reemplazo, obsoleto sin reemplazo, planeado con stock en planta desconectada, cotización en curso, nueva creación.

---

## 7. Reglas QMS

`lib/reglas-qms` es una traducción fiel del árbol de decisión del punto 4 del procedimiento. Es lo único del proyecto que se testea con rigor (Vitest), porque es donde vive la credibilidad del POC y porque debe poder mostrarse en pantalla si un técnico de SKF pregunta cómo se decide.

Reglas a implementar: planeado con monto menor o igual al stock (se declina, ya estaba disponible), planeado con monto mayor al stock (se pide LT al planner), no planeado (se revisa disponibilidad y se ingresa PINQ), MOQ mayor a lo pedido (se declina), redondeo a pack quantity, obsoleto con reemplazo (se cotiza indicando el cambio), obsoleto sin reemplazo (se declina), designación inexistente o incorrecta (se declina), designación de nueva creación (+4 semanas), planta sin conexión ni ruta de embarque (se declina), FPC1 contra FPC2.

**Terminología:** toda etiqueta de pantalla usa la sigla que SKF ya usa. "Producto No Planeado (LCC=NP)", no "producto sin stock".

---

## 8. Capa de IA

### Validador — determinista con respaldo de LLM

Cascada de estrategias, en orden:

1. Coincidencia exacta.
2. Normalización: espacios, guiones, mayúsculas, caracteres visualmente similares.
3. Detección de captura incompleta: si el texto es prefijo de designaciones válidas, se trata como truncamiento y se ofrecen las completaciones, con un mensaje propio — *"parece que la designación quedó incompleta"*, distinto de "no encontrado".
4. Similitud por trigramas (`pg_trgm`).
5. *(Reservado para v2: similitud semántica sobre la descripción.)*
6. Respaldo con LLM, solo si todo lo anterior falla: se le entrega el texto del cliente y un conjunto **cerrado** de candidatos, y se le pide elegir e interpretar.

**Regla anti-alucinación:** el validador nunca genera una designación que no exista en la base. Siempre selecciona de un conjunto cerrado.

Cada sugerencia devuelve el contexto que hoy obliga al CSR a investigar: clasificación LCC, disponibilidad por almacén y planta dueña, MOQ y pack quantity con aviso si la cantidad los incumple, reemplazo si es obsoleto, advertencia de +4 semanas si es de nueva creación, y aviso de declinado si la planta no tiene ruta de embarque.

### Estimador — determinista

Mediana y percentiles sobre el histórico sintético, por designación o por familia si no hay casos suficientes. Nivel de confianza derivado de la cantidad de registros disponibles. Ajustes del procedimiento: +4 semanas por nueva creación, ajuste por desempeño histórico de la planta, consideración de MOQ y pack quantity.

**Presentación obligatoria en pantalla**, con tres elementos: el rango (nunca un número falsamente preciso), la base (cuántos casos lo sustentan) y el compromiso de confirmación. Presentar una estimación como tiempo confirmado sería un problema comercial serio para SKF frente a sus clientes; el diseño debe hacer imposible esa confusión.

### Chatbot — LLM real vía Gateway

**El modelo no consulta la base directamente: usa tool calling** contra las mismas funciones del validador, el estimador y la consulta de inventario y cotizaciones. Ningún número sale del modelo; los números salen de Postgres. Esto elimina la clase de error más peligrosa en un demo comercial — un precio o un tiempo inventado.

Dos modos: **cliente** (tono de servicio, sin exponer costos internos ni información de otras cuentas) y **operador** (acceso a la bandeja, a las reglas del procedimiento y a la clasificación de solicitudes).

Base de conocimiento: el catálogo (las mismas funciones que usa el validador, cumpliendo la sección 3.2 de la propuesta — un solo motor para ambos canales) y el procedimiento QMS fragmentado, para que el chatbot responda dudas de procedimiento con la regla real de SKF.

Respuesta en streaming. Respaldo pregrabado para las preguntas del guion, activable con `CHAT_RESPALDO=true`, por si falla la red o el Gateway en la sala del cliente. Límite de mensajes por sesión (`CHAT_LIMITE_MENSAJES`).

---

## 9. Reglas de honestidad del demo

Estas reglas protegen la credibilidad del equipo y evitan un problema serio en la Fase 1. Son requisitos del producto, no recomendaciones.

1. Distintivo permanente de *entorno de demostración · datos simulados* en toda la aplicación.
2. Ninguna cifra del dashboard se presenta sin la leyenda "sobre datos simulados".
3. La cola de pedidos (Contrato B) siempre se presenta como sujeta a validación técnica en la Fase 1.
4. Cero datos reales de SKF: ni una designación, ni un cliente, ni un precio.
5. Operadores como `CSR 1`, `CSR 2` — nunca nombres de personas reales. Que aparezca el nombre de alguien en una bandeja simulada puede leerse como señalamiento.
6. No clonar la identidad visual de SKF. Identidad neutra industrial: azul profundo, grises, ámbar reservado exclusivamente al estado de desconexión, verde solo para confirmación. Designaciones siempre en fuente monoespaciada.
7. Las claves de API viven solo del lado servidor.

---

## 10. Riesgos

| Riesgo | Mitigación |
|---|---|
| El cliente confunde el POC con producto terminado | Distintivo permanente y encuadre explícito en la escena 0 del guion |
| Falla la red o el Gateway durante la presentación | Respaldo pregrabado del chat, más video de respaldo del recorrido completo (5–8 min) |
| El interruptor del panel no reacciona en la proyección | Estado en Supabase + Realtime (sección 5), verificado en ensayo previo |
| La búsqueda difusa se siente lenta con el catálogo completo | Índice GIN creado antes de la siembra del histórico; latencia artificial excluida del buscador |
| Sobrealcance | Los 4 imprescindibles primero; el resto en dos contratos ya definidos |

---

## 11. Verificación antes de presentar

- [ ] Cada caso curado responde exactamente como dicta el guion.
- [ ] La búsqueda difusa devuelve resultados en menos de un segundo con el catálogo completo.
- [ ] La gráfica de solicitudes por hora muestra visiblemente el pico en la franja de desconexión.
- [ ] Ninguna designación, cliente o precio coincide con datos reales de SKF.
- [ ] Los números del dashboard son internamente consistentes.
- [ ] El reinicio de sesión deja los contadores en cero sin borrar el histórico.
- [ ] Snapshot de la base guardado, para restaurar entre presentaciones.
- [ ] Video de respaldo grabado.
- [ ] Legibilidad verificada en la pantalla real de la sala.
