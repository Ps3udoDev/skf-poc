# Contratos de la Fase 4 — Plan 4A y Plan 4B

**Fecha:** 2026-08-04
**Rama de origen:** `plan-3-motores-y-pantallas`
**Sucede a:** `2026-08-04-estado-tras-plan-3.md`
**Precede a:** Plan 4A (operación) y Plan 4B (evidencia y entrega)

## 1. Qué fija este documento

Las firmas, los tipos y las reglas que 4A y 4B implementan, y contra las que se
revisa el resultado. No es un plan de implementación: no ordena tareas ni
propone pasos. Lo que aquí no esté escrito, el plan lo decide; lo que aquí esté
escrito, el plan lo respeta o cambia este documento primero.

Todo lo que sigue se apoya en código ya existente. Cuando una firma se amplía,
se dice explícitamente qué se conserva.

## 2. División en 4A y 4B

**4A — Operación del CSR.** Todo lo que escribe en la base y todo lo que aplica
reglas del procedimiento: bandeja completa, asignación, confirmación guiada de
homólogos, cola de intenciones de pedido y reconciliación al reabrir la planta.

**4B — Evidencia y entrega.** Todo lo que solo lee y todo lo que no es producto:
dashboard de impacto, indicadores vivos, despliegue a Vercel, ensayo cronometrado
y video de respaldo.

La división es por riesgo. 4A toca datos y reglas de negocio: un error ahí se ve
en sala como una cifra incoherente. 4B no puede corromper nada, pero depende de
que 4A exista.

**4A va primero, y no es preferencia de orden.** Hoy solo se emiten cuatro de
los doce tipos de `tipo_evento`: `busqueda`, `solicitud_generada`,
`solicitud_evitada` y `llamada_modelo`. `calcularIndicadores()` ya sabe calcular
confirmaciones de homólogo, avisos anticipados y tasa de resolución sin
solicitud, pero nadie emite esos eventos todavía. Si 4B se construye primero, el
dashboard de la escena 6 muestra ceros delante de los stakeholders. Las
emisiones que faltan son responsabilidad de 4A (§6).

## 3. Invariantes heredadas

Se mantienen sin excepción, y cualquier revisión de 4A o 4B las verifica:

1. `lib/fuentes` es la única capa que **lee** tablas. Ningún componente ni
   Server Action consulta Supabase por su cuenta.
2. Toda **escritura** del navegador pasa por Server Actions con `service_role`.
   Es el patrón que ya usa `generarSolicitud()`.
3. Ámbar es exclusivo de desconexión; verde, de confirmación; toda designación
   va en monoespaciada.
4. Ninguna estimación se presenta como confirmada. Rango, número de casos y
   compromiso de confirmación son obligatorios en cualquier pantalla nueva.
5. El validador y el chat solo eligen designaciones que existen en el catálogo.
6. El modo es estado de `sesion_demo`, nunca una ruta duplicada.
7. `emitirEvento()` no lanza jamás. Un fallo de métrica no puede tumbar una
   pantalla en mitad de la demostración.
8. Los mocks llevan latencia; buscador y validador no.

## 4. Esquema: la Fase 4 no abre migración

El Plan 1 dejó el esquema preparado. Ninguna pieza de la Fase 4 necesita una
tabla ni una columna nueva:

| Pieza de la Fase 4 | Ya existe en el esquema |
|---|---|
| Cola de pedidos durante ventana | `intenciones_pedido` y el enum `estado_intencion` (`encolada`, `confirmada`, `ajustada`, `escalada`) |
| Asignación de CSR | `solicitudes.csr_asignado` → `operadores(codigo, activo)` |
| Resolución de la solicitud | `solicitudes.atendida_en`, `resultado`, `motivo_declinado` |
| Métricas del dashboard | `eventos_demo` y los doce valores de `tipo_evento` |

Las migraciones vigentes llegan hasta `000008` y **no se editan**. El hueco
`000004` sigue siendo deliberado. Si aparece una necesidad real de esquema, se
abre `000009` y se justifica en el plan; no se toca nada aplicado.

## 5. Contratos que 4A y 4B consumen sin modificar

Existen, están probados y se usan tal cual:

| Firma | Uso en la Fase 4 |
|---|---|
| `evaluarSolicitud(ctx): EvaluacionQMS` | Clasificación de la bandeja y del detalle |
| `construirContexto(consulta, cantidad)` | Contexto ya resuelto para el motor |
| `validar(consulta, cantidad)` | Captura asistida del portal |
| `construirSugerencia(...)` / `construirVarias(...)` | Candidatos con existencias |
| `estimarTE(codigo, cantidad): Estimacion \| null` | Rango honesto en cola y detalle |
| `homologosDe(codigo): Homologo[]` | Insumo de la confirmación guiada |
| `existenciasDe(codigo)`, `plantaCompleta(pdiv)` | Reconciliación y detalle |
| `leerSesion()`, `useSesion()` | Modo, reloj simulado y estado de plantas |
| `estadoDePlanta(...)`, `ahoraSimulada(offset)` | Ventana vigente |
| `emitirEvento(entrada)` | Toda métrica nueva |
| `indicadoresDeSesion(): Indicadores` | Base del dashboard |
| `consultarInventarioExterno(codigo)` | Fallo simulado durante ventana |

## 6. Contratos nuevos del Plan 4A

### 6.1 `lib/fuentes/solicitudes.ts` (se amplía)

`solicitudesDesde(iniciadaEn)` **se conserva con su firma actual**: la usa
`/operador` hoy y el chat la usará después.

`SolicitudResumen` gana cuatro campos; los existentes no cambian de nombre ni de
tipo:

```ts
export interface SolicitudResumen {
  numero: string;
  designacionTexto: string;
  cantidad: number;
  clasificacionQms: string | null;
  puntoQms: string | null;
  creadaEn: string;
  csrAsignado: string | null;      // código de operador ('CSR 1'), nunca el id
  atendidaEn: string | null;
  resultado: "cotizada" | "declinada" | null;
  motivoDeclinado: MotivoDeclinado | null;
}

export type EstadoSolicitud = "abierta" | "atendida";

export interface FiltroBandeja {
  desde: string;                   // ISO. Siempre sesion.iniciadaEn
  estado?: EstadoSolicitud;
  clasificacion?: RutaQMS;
  csr?: string | null;             // null filtra las no asignadas
}

export async function solicitudesFiltradas(
  filtro: FiltroBandeja,
): Promise<SolicitudResumen[]>;

export async function filaDeSolicitud(
  numero: string,
): Promise<SolicitudResumen | null>;
```

`csrAsignado` expone el **código**, no el id: el id es detalle de esquema y la
tabla `operadores` nunca guarda nombres reales.

### 6.2 `lib/fuentes/operadores.ts` (nuevo)

```ts
export async function cargaPorCsr(desde: string): Promise<CargaCsr[]>;
```

Devuelve todos los operadores —activos e inactivos— con su número de solicitudes
abiertas desde `desde`. Un operador sin solicitudes aparece con `abiertas: 0`; no
se omite, porque es justo el que debe recibir la siguiente.

### 6.3 `lib/operacion/asignacion.ts` (nuevo, puro)

Sin acceso a red ni a base. Se prueba con arreglos en memoria.

```ts
export interface CargaCsr {
  codigo: string;
  abiertas: number;
  activo: boolean;
}

export function elegirCsr(cargas: readonly CargaCsr[]): string | null;
```

Reglas, en orden:

1. Solo se consideran operadores con `activo: true`.
2. Gana el de menor `abiertas`.
3. Empate: menor `codigo` en orden lexicográfico. El desempate es determinista a
   propósito — un `Math.random()` aquí haría irrepetible el ensayo.
4. Sin operadores activos devuelve `null`. La solicitud se crea igual y la
   bandeja la muestra como «Sin asignar». Una solicitud nunca se pierde por no
   haber a quién asignarla.

`CargaCsr` se define aquí; `lib/fuentes/operadores.ts` importa el tipo. La
dependencia va de fuentes hacia operación y no al revés, para que el módulo puro
siga siendo comprobable sin tocar Supabase.

### 6.4 `lib/fuentes/intenciones.ts` (nuevo)

```ts
export type EstadoIntencion = "encolada" | "confirmada" | "ajustada" | "escalada";

export interface Intencion {
  id: number;
  designacion: string;
  cantidad: number;
  pdiv: string;
  encoladaEn: string;
  estado: EstadoIntencion;
  resueltaEn: string | null;
  nota: string | null;
}

export async function intencionesDe(
  pdiv: string,
  estado?: EstadoIntencion,
): Promise<Intencion[]>;

export async function intencionesDesde(iniciadaEn: string): Promise<Intencion[]>;
```

Solo lectura. Encolar y reconciliar son escrituras y viven en Server Actions
(§6.7).

### 6.5 `lib/operacion/reconciliacion.ts` (nuevo, puro)

Decide qué pasa con cada intención cuando la planta vuelve. Sin acceso a base:
recibe el inventario ya resuelto.

```ts
export interface EntradaReconciliacion {
  intencion: Intencion;
  existencias: Existencia[];
  moq: number;
  packQuantity: number;
}

export interface ResultadoReconciliacion {
  estado: Exclude<EstadoIntencion, "encolada">;
  cantidadFinal: number;
  nota: string;
  punto: string | null;            // punto del QMS que justifica el ajuste
}

export function reconciliar(entrada: EntradaReconciliacion): ResultadoReconciliacion;
```

Reglas, en orden:

1. Cantidad por debajo del MOQ → `escalada`, punto `4.4`. La nota indica el MOQ
   y que un CSR contactará al cliente.
2. Cantidad que no es múltiplo del pack quantity → `ajustada`, punto `4.5a`,
   `cantidadFinal` redondeada hacia arriba con `redondearAPack()`. Se reutiliza
   la función existente; no se reimplementa la regla.
3. Existencias suficientes para `cantidadFinal` → `confirmada`. La nota nombra el
   almacén y la cantidad disponible.
4. Existencias insuficientes → `escalada`, sin punto. La nota dice que requiere
   consulta a fábrica.

**Ninguna nota contiene una fecha.** La reconciliación confirma disponibilidad,
no plazo: el TE en firme sigue saliendo al procesar la cotización. Esto es la
invariante 3.4 aplicada al caso más tentador de romperla.

### 6.6 `lib/validador/confirmacion.ts` (nuevo, puro)

```ts
export interface PasoConfirmacion {
  atributo: string;
  valorOrigen: string;
  valorEquivalente: string;
  requiereValidacion: boolean;
}

export interface Confirmacion {
  origen: string;
  equivalente: string;
  motivo: string;
  pasos: PasoConfirmacion[];
  requiereIngenieriaVentas: boolean;
  punto: "4.6";
}

export function construirConfirmacion(homologo: Homologo): Confirmacion;
```

Convierte las `diferencias: DiferenciaTecnica[]` que ya trae `homologosDe()` en
pasos que el cliente debe reconocer uno por uno. `requiereIngenieriaVentas` es
verdadero cuando hay al menos un paso con `requiereValidacion`.

La UI no permite continuar sin marcar cada paso, y cuando `requiereIngenieriaVentas`
es verdadero el resultado se presenta como sujeto a validación de Ingeniería de
Ventas, nunca como equivalencia confirmada. Es el punto 4.6 y es también la
diferencia entre el POC y un buscador que sugiere piezas incompatibles.

### 6.7 Server Actions de 4A

En `app/(operador)/acciones.ts` (nuevo):

```ts
export async function asignarSolicitud(numero: string, csr: string | null): Promise<void>;
export async function resolverSolicitud(
  numero: string,
  resultado: "cotizada" | "declinada",
  motivo?: MotivoDeclinado,
): Promise<void>;
```

`resolverSolicitud` rechaza `motivo` cuando el resultado es `cotizada`. Cuando
es `declinada` y no se pasa `motivo`, lo deriva de la clasificación con
`motivoDeclinado(ruta)` — el mapeo entre `RutaQMS` y el enum SQL ya existe en
`lib/reglas-qms/motivos.ts` y no se reimplementa aquí. Si la ruta no declina y
tampoco se pasó motivo, la acción falla en vez de escribir una declinación sin
justificación; la restricción `declinada_tiene_motivo` de la base lo exige de
todos modos.

Escribe `atendida_en` con la hora real, no con la simulada: el reloj simulado
gobierna las ventanas de fábrica, no la auditoría.

En `app/(portal)/portal/acciones.ts` (se amplía; lo existente no cambia):

```ts
export async function encolarIntencion(
  codigo: string,
  cantidad: number,
): Promise<{ id: number; pdiv: string }>;

export async function confirmarHomologo(
  origen: string,
  equivalente: string,
  cantidad: number,
): Promise<{ designacion: string; requiereIngenieriaVentas: boolean }>;
```

`encolarIntencion` solo procede si la planta de la designación está en `ventana`;
fuera de ventana devuelve error, porque encolar con la planta viva sería resolver
un problema que no existe.

`generarSolicitud()` gana un paso interno: tras insertar, resuelve
`elegirCsr(await cargaPorCsr(sesion.iniciadaEn))` y escribe `csr_asignado`. La
firma pública no cambia.

En `lib/sesion-demo/acciones.ts`, `cerrarVentanaEnCurso(pdiv)` **conserva su
firma** y gana la reconciliación: antes de limpiar el override, reconcilia toda
intención `encolada` de esa planta, escribe `estado`, `resuelta_en` y `nota`, y
emite un evento por intención. El orden importa — si el override se limpiara
primero, la pantalla del cliente se refrescaría con la planta viva y la cola
todavía sin resolver.

### 6.8 Eventos que 4A empieza a emitir

Todos los tipos ya existen en el enum `tipo_evento`. Ninguno requiere migración.

| Evento | Quién lo emite | Cuándo |
|---|---|---|
| `sugerencia_aceptada` | Portal | El cliente toma un candidato del validador |
| `confirmacion_homologo` | `confirmarHomologo` | Se completan todos los pasos |
| `aviso_moq` | Portal y bandeja | Se muestra un aviso de MOQ (punto 4.4) |
| `aviso_pack_quantity` | Portal y bandeja | Se muestra un ajuste de pack (4.5a) |
| `intencion_encolada` | `encolarIntencion` | Una intención entra a la cola |
| `reconciliacion` | `cerrarVentanaEnCurso` | Una por intención, con `detalle: { estado, cantidadFinal, punto }` |
| `ventana_inicio` / `ventana_fin` | `fijarEstadoPlanta` y `cerrarVentanaEnCurso` | Cambia el estado de una planta |

El evento se emite donde ocurre el hecho, no donde se pinta. Un aviso que el
usuario nunca vio no es un aviso anticipado.

### 6.9 Pantallas de 4A

- `/operador`: filtros por estado, clasificación QMS y CSR; panel de detalle con
  la evaluación completa, el contexto, los homólogos y la estimación; asignar y
  resolver desde el detalle. La composición del detalle ocurre en la Server
  Action llamando a los motores existentes — la fuente devuelve la fila, no el
  detalle compuesto.
- `/portal`: durante una ventana, la opción de encolar la intención junto al TE
  estimado, y el resultado de la reconciliación cuando la planta vuelve. La cola
  usa ámbar; el resultado confirmado, verde.
- Confirmación guiada de homólogo en el detalle de designación, con sus pasos.

## 7. Contratos nuevos del Plan 4B

### 7.1 Indicadores vivos

`indicadoresDeSesion()` y `calcularIndicadores()` **no cambian**. Se añade el
refresco:

```ts
// lib/metricas/acciones.ts (Server Action)
export async function refrescarIndicadores(): Promise<Indicadores>;
```

El recálculo ocurre siempre en el servidor. El cliente nunca reimplementa
`calcularIndicadores()`: dos implementaciones de la misma métrica es cómo se
llega a dos cifras distintas en dos pantallas durante la presentación.

El canal de Realtime sobre `eventos_demo` solo **invalida**: al recibir un
INSERT, la pantalla llama a `refrescarIndicadores()`. Se reutiliza el patrón de
`lib/sesion-demo/sondeo.ts`, con el mismo sondeo de respaldo cuando el canal no
está suscrito. No se abre un mecanismo de sincronización nuevo.

### 7.2 `/impacto` (ruta nueva)

Pantalla de solo lectura, pensada para proyectarse. `/demo` sigue siendo el panel
del presentador y no se proyecta nunca: muestra el reloj simulado, el override de
plantas y el selector de escenarios, y proyectarlo delata que el demo está
guionado.

Contenido, todo derivado de `Indicadores` sin cálculos nuevos:

- Solicitudes evitadas, solicitudes generadas y tasa de resolución sin solicitud.
- Minutos de operador liberados, siempre con `MINUTOS_POR_SOLICITUD = 12`
  declarado en pantalla como supuesto.
- Confirmaciones de homólogo y avisos anticipados.
- Búsquedas por hora, con Recharts, ya instalado.

Toda cifra lleva «sobre datos simulados», como en `/demo` y `/operador`. Ámbar
solo aparece en lo que trate de desconexión; verde, solo en confirmación.

### 7.3 Entrega

- Despliegue a Vercel con las variables ya declaradas en `.env.example`, y
  `CHAT_RESPALDO` disponible como interruptor de sala.
- Ensayo cronometrado de las ocho escenas y video de respaldo que las cubra
  todas, para presentar sin red.
- `README.md` en español, sin boilerplate.
- Las dos mediciones de deuda del Plan 3: ensayo visual con dos ventanas abiertas
  y arranque en frío de Realtime tras veinte minutos de inactividad.

## 8. Fuera de alcance de la Fase 4

- Integración real con WCL, SPQ+ o PinQ. Sigue siendo materia de las Fases 2–3
  de la propuesta.
- Autenticación y multiusuario real. El POC no tiene login.
- Escrituras comerciales desde el chat. El chat consulta; encolar, asignar y
  resolver son acciones de pantalla con confirmación explícita.
- Tema oscuro.
- Cualquier reimplementación de los motores del Plan 3.

## 9. Criterios de aceptación por escena

| Escena | Cierra en | Criterio |
|---|---|---|
| 3 — Homólogos y obsoletos | 4A | El cliente recorre los pasos de diferencia técnica y el resultado se marca como sujeto a Ingeniería de Ventas cuando corresponde; se emite `confirmacion_homologo` |
| 4 — Ventana de desconexión | 4A | Con la planta en ventana se encola una intención con TE estimado; al reabrir desde `/demo`, la cola queda confirmada, ajustada o escalada, con su punto del QMS y sin ninguna fecha inventada |
| 6 — Dashboard | 4B | `/impacto` muestra cifras distintas de cero para todo lo ocurrido en la sesión y se actualiza al ocurrir un evento nuevo, sin recargar |
| 7 — Cierre | 4B | El recorrido completo corre sobre el despliegue de Vercel y existe video de respaldo de las ocho escenas |

## 10. Supuestos abiertos con SKF

Se arrastran del Plan 3 y ninguna pieza de la Fase 4 los da por resueltos:

- La interpretación de los puntos duplicados 4.5 y las rutas de Planner/PINQ por
  segmento.
- Los 12 minutos liberados por solicitud evitada, que el dashboard muestra en
  pantalla como supuesto y no como medición.
- Si el SLA de cotización se mide en cuatro días hábiles y cómo trata los
  festivos locales.
- La terminología y la exposición de precio de lista en el perfil cliente.
- Los tiempos reales de Realtime, de las APIs corporativas y de la operación del
  CSR, antes de convertir cualquier cifra del POC en compromiso.
