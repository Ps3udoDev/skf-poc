# 04 — Datos de demostración: cómo emular una base grande y creíble

El POC vive o muere por la calidad de sus datos. Un catálogo de 20 productos inventados se nota de inmediato; un catálogo de 30.000 designaciones con estructura coherente convence.

---

## 1. Principio rector

**Volumen realista, estructura fiel, contenido sintético.**

- *Volumen realista:* decenas de miles de designaciones, meses de histórico de cotizaciones, cientos de clientes. Cuando el presentador teclea y aparecen resultados desde un catálogo grande, la sensación de sistema real es inmediata.
- *Estructura fiel:* los campos, códigos y clasificaciones son los del procedimiento QMS (PCC, LCC, FPC, MOQ, PDIV, almacenes PS/SL/XX).
- *Contenido sintético:* ningún dato proviene de SKF. Las designaciones siguen patrones públicos de nomenclatura de rodamientos, los precios son generados, los clientes son ficticios.

---

## 2. Modelo de datos

### Tabla `designaciones` (núcleo del POC)

| Campo | Descripción | Valores |
|---|---|---|
| `designacion` | Código del producto | Ej. patrón serie + variantes de sufijo |
| `descripcion` | Descripción técnica | Generada por familia |
| `familia` | Familia de producto | Rodamiento rígido de bolas, cónico, esférico, unidad de rodamiento, sello, transmisión, etc. |
| `pcc` | Product Category Code | `C` planeado, `P` equipo original, `N` bajo orden, `O` obsoleto |
| `lcc` | Local Category Code | `PLAN` o `NP` |
| `fpc` | Finance Product Code | `1` producto de línea, `2` no de línea |
| `pdiv` | Planta que lo fabrica | Códigos ficticios por país (Europa, Bélgica, Asia, América) |
| `com` | País de manufactura | Coherente con la PDIV |
| `moq` | Cantidad mínima de orden | 1, 10, 25, 50, 100 según familia |
| `pack_quantity` | Piezas por caja | 1, 5, 10, 20, 50 |
| `precio_lista` | Precio de lista | Correlacionado con tamaño y familia |
| `vigente` | Si sigue activo | Booleano |
| `reemplazo_de` / `reemplazado_por` | Cadena de obsolescencia | Referencia a otra designación |
| `es_nueva_creacion` | Requiere +4 semanas de TE | Booleano (punto 4.9 del QMS) |

**Distribución sugerida:** ~60% planeados (LCC=PLAN), ~35% no planeados (NP), ~5% obsoletos. De los obsoletos, ~70% con reemplazo y ~30% sin él. Esta mezcla reproduce el árbol de decisión completo del procedimiento.

### Tabla `homologos`

Relaciona designaciones equivalentes o alternativas, con el **motivo** de la equivalencia (mismo dimensional, distinto sellado; mismo desempeño, distinta jaula; reemplazo por obsolescencia) y las **diferencias técnicas** a mostrar en la confirmación guiada. Este campo de diferencias es lo que hace que la escena 3 del demo funcione: sin él, la confirmación es un diálogo vacío.

### Tabla `plantas`

Planta, país, huso horario, **ventana de mantenimiento** (hora de inicio y duración), variabilidad de esa ventana, y si tiene conexión y ruta de embarque habilitada (punto 4.5 del QMS: solo se cotiza con fábricas con las que hay conexión).

Configuración recomendada, siguiendo la minuta: la mayoría de plantas europeas con ventana iniciando alrededor de las 12:30 hora de México y duración de 2 a 2.5 h; Bélgica con inicio variable dentro de una franja conocida pero sin hora fija.

### Tabla `inventario`

Existencias por designación **y por almacén** (`PS` primario, `SL` secundario, `XX` terciario), con la planta dueña del material. Refleja la estructura de consulta escalonada del procedimiento.

### Tabla `cotizaciones` (histórico sintético)

Es la que alimenta el estimador de tiempos de entrega y las métricas del dashboard. Campos: número de cotización con formato `AAAAQ#####`, cliente, designación, cantidad, fecha de solicitud, fecha de respuesta, CSR asignado, **resultado** (cotizada / declinada) y **motivo del declinado** (designación inexistente, MOQ mayor, obsoleto sin reemplazo, ya disponible en WCL, planta sin ruta), TE otorgado y precio.

**Genera al menos 6 meses de histórico a razón de 60–70 solicitudes por día hábil** — el volumen declarado por el cliente. Son aproximadamente 8.000–9.000 registros: suficiente para que las gráficas tengan forma y para que el estimador tenga base estadística.

### Tabla `eventos_demo`

Registro de todo lo que ocurre durante la sesión de demostración: consultas hechas, sugerencias aceptadas, solicitudes evitadas, confirmaciones de homólogo, pedidos encolados. Es la fuente del dashboard en vivo y lo que permite reiniciar la sesión sin tocar el histórico.

### Tablas de apoyo

`clientes` (con tipo AFT / OEM / usuario final y su nivel de descuento), `operadores` (CSR ficticios con su carga), `solicitudes` (las generadas durante el demo, separadas del histórico).

---

## 3. Cómo generar los datos

### Estrategia

Un script de siembra ejecutado una sola vez, con **semilla fija** para que los datos sean reproducibles: si hay que reconstruir la base antes de la presentación, sale idéntica.

**Fases del script:**

1. **Plantas y almacenes** (decenas de registros, definidos a mano por su importancia narrativa).
2. **Catálogo de designaciones** (20.000–50.000): generado combinatoriamente a partir de familias, series numéricas y sufijos técnicos. La clave está en que los sufijos sigan patrones reales de nomenclatura de rodamientos, porque de ahí nace la verosimilitud de los errores de tipeo.
3. **Cadenas de homólogos y obsolescencia:** para un subconjunto del catálogo, generar familias de equivalencia con sus diferencias técnicas descritas.
4. **Inventario:** existencias por almacén, con la regla de que los planeados tienen stock frecuente y los no planeados casi nunca — es justamente lo que dispara la cotización.
5. **Histórico de cotizaciones:** el paso más delicado (ver abajo).
6. **Clientes y operadores.**

### El histórico debe tener los patrones que queremos demostrar

Un histórico aleatorio no sirve: el dashboard debe poder *encontrar* los problemas que la propuesta describe. Sembrar deliberadamente:

- **Pico de solicitudes en la franja de desconexión.** Una proporción notable de las solicitudes diarias concentradas entre las 12:30 y las 15:00, con motivo de declinado "ya estaba disponible". Este patrón es el que hace que la gráfica del dashboard cuente la historia sola.
- **~80% de un subconjunto marcado como designación mal ingresada**, coherente con lo reportado sobre la carga de Maritza.
- **Errores de tipeo verosímiles:** caracteres transpuestos, sufijo faltante (el caso del copiado truncado desde Word), confusión de caracteres visualmente similares, espacios y guiones de más o de menos, uso de solo los primeros dígitos de la serie.
- **Distribución de tiempos de respuesta alrededor del SLA de 4 días hábiles**, con una cola de casos que lo exceden — para que la métrica de cumplimiento tenga algo que mostrar.
- **Estacionalidad ligera** (menos volumen en fin de mes o en periodos vacacionales) para que las series de tiempo no se vean planas y artificiales.

### Herramientas

- **Faker** para nombres de clientes, fechas y textos de apoyo.
- **Generación combinatoria propia** para las designaciones: es más controlable que un generador genérico y produce familias coherentes.
- **Carga por lotes** a Supabase (inserción masiva por bloques, no registro por registro).
- **Índices** sobre `designacion` (trigrama), `lcc`, `pdiv` y `fecha_solicitud` antes de sembrar el histórico grande, o creación posterior si la carga resulta lenta.

---

## 4. El conjunto de casos de demostración

Además del volumen, hace falta un puñado de **casos curados a mano** que se comportan exactamente como el guion necesita. Sin ellos, el presentador queda a merced del azar en vivo.

Preparar un caso para cada escena:

| Caso | Qué debe tener |
|---|---|
| Designación truncada | Un código cuyo sufijo faltante produzca 3 sugerencias claras y distinguibles |
| MOQ superior a lo pedido | Designación con MOQ alto y precio unitario bajo, para que se entienda el absurdo de declinar |
| Pack quantity | Designación con pack de 20 donde el cliente pide 25 |
| Obsoleto con reemplazo | Con diferencias técnicas concretas y visibles entre original y reemplazo |
| Obsoleto sin reemplazo | Para mostrar el declinado legítimo (no todo se puede salvar, y eso da credibilidad) |
| Producto planeado con stock | El caso de la escena 4: existe y hay stock, pero la planta está en ventana |
| Cotización en curso | Un número de cotización con historial, para preguntarle al chatbot por su estado |
| Nueva creación | Para mostrar el +4 semanas de TE del punto 4.9 |

> Guardar estos casos como escenarios precargados en el panel de demo, accesibles con un clic. Si la presentación se acorta a 5 minutos, se salta directo al que más importa.

---

## 5. Verificación antes de presentar

Lista de comprobación sobre los datos:

- [ ] Buscar cada caso curado y confirmar que responde como dicta el guion.
- [ ] La búsqueda difusa devuelve resultados en menos de un segundo con el catálogo completo.
- [ ] La gráfica de solicitudes por hora muestra visiblemente el pico en la franja de desconexión.
- [ ] Ninguna designación, cliente o precio coincide con datos reales de SKF.
- [ ] Los números del dashboard son internamente consistentes (las solicitudes evitadas no superan a las generadas).
- [ ] El reinicio de sesión de demo deja los contadores en cero sin borrar el histórico.
- [ ] Snapshot de la base guardado, para restaurar si algo se corrompe durante una presentación.
