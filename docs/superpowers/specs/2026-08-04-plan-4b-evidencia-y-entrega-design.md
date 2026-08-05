# Spec del Plan 4B — Evidencia y entrega

**Fecha:** 2026-08-04
**Rama de origen:** `plan-4a-operacion-del-csr`
**Sucede a:** `2026-08-04-estado-tras-plan-4a.md`
**Amplía:** `2026-08-04-contratos-fase-4.md` §7

## 1. Qué fija este documento

El alcance, las firmas y las reglas del último plan del POC. Al cerrarlo, el
guion de las ocho escenas de `docs/02_alcance_y_guion_demo.md` se recorre
completo sobre un despliegue real.

El contrato de la Fase 4 (§7) describía 4B como «dashboard, despliegue y
ensayo». Al revisar el guion contra el código de 4A aparecieron dos huecos que
ese contrato no cubría y que este spec incorpora al alcance:

1. **Escena 5, segunda mitad.** `PanelChat perfil="operador"` ya se monta en
   `/operador`, pero `HERRAMIENTAS(perfil)` devuelve las mismas cinco
   herramientas para los dos perfiles y ninguna lee solicitudes de la sesión.
   La pregunta del guion —*«¿qué solicitudes de hoy son de productos planeados
   con stock suficiente?»*— hoy no tiene con qué responderse. Era deuda
   declarada del Plan 3 que ni 4A ni el contrato recogieron.
2. **Escena 6, panel operativo.** El guion pide carga por CSR, cumplimiento del
   SLA de cuatro días y línea de tiempo semanal de ventanas. §7.2 solo listaba
   lo derivable de `Indicadores`.

Lo que este documento no diga, el plan de implementación lo decide. Lo que sí
diga, el plan lo respeta o cambia este documento primero.

## 2. Punto de partida

4A dejó operativo todo lo que escribe y todo lo que aplica reglas: bandeja con
filtros, asignación determinista, resolución con motivo derivado del QMS,
confirmación guiada de homólogos, cola de intenciones y reconciliación antes de
liberar la planta. Los doce valores de `tipo_evento` tienen emisor real, así que
`/impacto` tendrá cifras distintas de cero desde la primera escena.

4B **solo lee**. No añade una sola escritura de negocio. Es la razón por la que
va al final: no puede corromper nada de lo que 4A construyó.

## 3. Invariantes que 4B respeta

Se heredan del contrato §3 y del estado tras 4A §2, y cualquier revisión de este
plan las verifica:

1. `lib/fuentes` es la única capa que consulta tablas. El panel operativo no
   abre una consulta desde un componente ni desde una Server Action.
2. Toda escritura del navegador pasa por Server Actions con `service_role`. 4B
   no introduce ninguna.
3. Ámbar es exclusivo de desconexión; verde, de confirmación. En `/impacto` esto
   importa más que en ninguna otra pantalla: es la que se proyecta.
4. Ninguna estimación se presenta como confirmada.
5. `emitirEvento()` no lanza jamás.
6. `calcularIndicadores()` e `indicadoresDeSesion()` **no cambian**. Dos
   implementaciones de la misma métrica es cómo se llega a dos cifras distintas
   en dos pantallas durante la presentación.
7. `/demo` no se proyecta nunca. Muestra el reloj simulado, el override de
   plantas y el selector de escenarios; proyectarlo delata que el demo está
   guionado.
8. Toda cifra lleva «sobre datos simulados».

## 4. Esquema: 4B no abre migración

Las migraciones vigentes llegan hasta `000008` y no se editan. El hueco `000004`
sigue siendo deliberado. Nada de 4B necesita tabla ni columna nueva:

| Pieza de 4B | De dónde sale |
|---|---|
| Indicadores vivos | `eventos_demo`, ya poblada con los doce tipos |
| Carga por CSR | `cargaPorCsr(desde)`, ya existe |
| Cumplimiento del SLA | `cotizaciones.fecha_solicitud` / `fecha_respuesta` |
| Línea de tiempo de ventanas | `plantas.ventana_*`, determinista, sin base extra |
| Chat del operador | `solicitudesFiltradas()`, ya existe |

## 5. Indicadores vivos

### 5.1 La Server Action

```ts
// lib/metricas/acciones.ts  (nuevo, "use server")
export async function refrescarIndicadores(): Promise<Indicadores>;
```

Envuelve `indicadoresDeSesion()`. El recálculo ocurre siempre en el servidor; el
cliente nunca reimplementa `calcularIndicadores()`.

### 5.2 El hook

```ts
// components/metricas/uso-indicadores.ts  (nuevo, "use client")
export function useIndicadores(inicial: Indicadores): {
  indicadores: Indicadores;
  estadoCanal: EstadoCanal;
};
```

El canal de Realtime sobre `eventos_demo` **solo invalida**: al recibir un
INSERT, el hook llama a `refrescarIndicadores()`. No transporta el evento ni lo
suma en el cliente.

Se reutiliza el patrón de `ProveedorSesion`, sin excepción:

- Suscripción temprana, al montar, no al primer cambio. El Plan 1 midió un
  arranque en frío de Realtime superior a 15 s tras inactividad; ese arranque
  tiene que ocurrir mientras el presentador todavía está hablando.
- Respaldo por sondeo con `debeSondear(estado, msDesdeApertura)` y
  `MS_INTERVALO_SONDEO` de `lib/sesion-demo/sondeo.ts`. No se abre un mecanismo
  de sincronización nuevo ni se duplican esas constantes.
- Los INSERT llegan en ráfaga —una búsqueda puede emitir `busqueda`,
  `aviso_moq` y `aviso_pack_quantity` casi a la vez—, así que el hook agrupa:
  tras un INSERT espera un margen breve antes de refrescar y descarta los
  refrescos encolados en ese margen. Sin eso, la escena 2 dispara tres consultas
  idénticas seguidas.

Es un hook y no un segundo proveedor global porque lo consumen dos pantallas y
ninguna otra: `/impacto` y `/demo`. `EstadoSesion` de `/demo` pasa a usarlo, lo
que cierra de paso la deuda del Plan 3 —«los contadores de `/demo` son
fotografía inicial»— sin envolver la aplicación entera en otro contexto.

## 6. Panel operativo

`Indicadores` no crece. Los agregados operativos viven aparte, con su propio
tipo y su propia acción, porque ampliarlo obligaría a tocar
`calcularIndicadores()`, que el contrato congela.

### 6.1 `lib/reglas-qms/sla.ts` (nuevo, puro — extracción)

`lib/ai/herramientas.ts:19` ya tiene una función privada `diasHabiles()` que
usa `consultarCotizacion` para responder contra el SLA. Se extrae aquí y
herramientas.ts pasa a importarla. No se escribe una segunda implementación: dos
formas de contar días hábiles darían dos respuestas distintas a la misma
pregunta según se la hagan al chat o al dashboard.

```ts
/**
 * KPI declarado por SKF, no un punto del procedimiento: «≤ 4 días hábiles
 * promedio de respuesta» (`docs/01_analisis_documentos.md`). El dashboard mide
 * en la unidad que el cliente ya reconoce como suya.
 */
export const DIAS_SLA = 4;

export function diasHabiles(desde: string | Date, hasta?: string | Date): number;
export function dentroDelSla(solicitud: string, respuesta: string): boolean;
```

Sábados y domingos se excluyen; los festivos locales no, porque SKF todavía no
confirmó cómo los trata. El panel lo declara en pantalla.

### 6.2 `lib/fuentes/cotizaciones.ts` (se amplía)

Lo existente —`historicoDe`, `historicoDeFamilia`, `obtenerCotizacion`— no
cambia.

```ts
export interface CumplimientoSla {
  respondidas: number;
  dentroDelSla: number;
  tasa: number;              // 0..1; 0 cuando no hay respondidas, nunca NaN
  pendientes: number;        // sin fecha_respuesta
  medianaDiasHabiles: number;
}

export async function cumplimientoSla(): Promise<CumplimientoSla>;
```

Mide el **histórico sintético completo**, no la sesión: la sesión no produce
cotizaciones respondidas, y un panel de SLA en cero no dice nada sobre la
operación que el POC retrata. En pantalla se rotula como «operación simulada
acumulada», distinto del resto de cifras, que sí son de la sesión.

**Trampa a evitar:** PostgREST corta en 1000 filas por defecto y el histórico
ronda las 9000. Una lectura sin paginar mediría en silencio solo la primera
página y daría una tasa plausible pero falsa. La fuente pagina con `.range()`
sobre `fecha_solicitud, fecha_respuesta` —dos columnas, nada más— hasta agotar
la tabla, con un tope de páginas que evita un bucle infinito si la base creciera.

### 6.3 `lib/estado-fabricas/semana.ts` (nuevo, puro)

```ts
export interface FranjaVentana {
  pdiv: string;
  dia: number;               // 0 = domingo, como Date.getDay()
  inicioMin: number;         // minutos del día en huso de México
  duracionMin: number;
}

export function franjasDeLaSemana(
  plantas: readonly PlantaCompleta[],
  desde: Date,
): FranjaVentana[];
```

Reutiliza `inicioDeVentana(planta, momento)`, que ya resuelve la variabilidad de
la planta belga de forma determinista a partir de la fecha y el PDIV. La lógica
de reloj se queda en `lib/estado-fabricas`; el módulo de métricas no la toca.

`ventanaInicioMin` ya está expresado en minutos del día en huso de México
—`estadoDePlanta` lo compara directamente contra `minutosDelDia(momento)`—, así
que aquí **no se convierten husos**. Convertirlos movería el banner de la escena
4 respecto del dashboard.

### 6.4 `lib/metricas/operacion.ts` (nuevo, puro)

```ts
export interface EntradaOperacion {
  cargas: readonly CargaCsr[];
  sinAsignar: number;
  sla: CumplimientoSla;
  franjas: readonly FranjaVentana[];
}

export interface PanelOperativo {
  cargas: CargaCsr[];              // activos primero, luego por carga y código
  sinAsignar: number;
  sla: CumplimientoSla;
  franjas: FranjaVentana[];
  minutosVentanaSemana: number;    // suma de todas las franjas
}

export function resumirOperacion(entrada: EntradaOperacion): PanelOperativo;
```

Sin acceso a red ni a base: recibe todo resuelto. El orden de `cargas` es
determinista por la misma razón que lo es `elegirCsr()` —un ensayo tiene que
poder repetirse—: activos primero, dentro de cada grupo por `abiertas`
descendente y, a igualdad, por `codigo` lexicográfico.

`sinAsignar` lo cuenta la acción de §6.5 con `solicitudesFiltradas({ desde, csr:
null })` y lo pasa ya resuelto, para que este módulo siga sin tocar Supabase. Es
la cifra que hace visible el caso «no había CSR activo a quien asignar» que 4A
dejó explícitamente vivo.

### 6.5 La Server Action del panel

```ts
// lib/metricas/acciones.ts
export async function refrescarPanelOperativo(): Promise<PanelOperativo>;
```

Compone `cargaPorCsr(sesion.iniciadaEn)`, `cumplimientoSla()`,
`franjasDeLaSemana(await todasLasPlantas(), ahora)` y `solicitudesFiltradas()`,
y llama a `resumirOperacion()`. La composición ocurre en la acción, como el
detalle de la bandeja en 4A: la fuente devuelve datos, no pantallas.

El panel operativo se refresca con el mismo hook y el mismo canal que los
indicadores, no con uno propio.

## 7. `/impacto`

Ruta nueva de solo lectura, pensada para proyectarse. Tercera pestaña en
`BarraSuperior` junto a Vista Cliente y Servicio al Cliente; `/demo` sigue sin
enlace, como hoy.

Contenido, en este orden:

1. **Las cuatro métricas de la sección 6 de la propuesta**, todas derivadas de
   `Indicadores` sin cálculos nuevos: solicitudes evitadas, minutos de operador
   liberados, confirmaciones de homólogo y avisos anticipados, más la tasa de
   resolución sin solicitud y las solicitudes generadas como contraste.
2. **Búsquedas por hora**, con Recharts, ya instalado.
3. **Panel operativo**: carga por CSR, cumplimiento del SLA y línea de tiempo
   semanal de ventanas.

Reglas de presentación, todas verificables mirando la pantalla:

- `MINUTOS_POR_SOLICITUD = 12` se declara **en pantalla** como supuesto, no como
  medición. La constante ya existe en `lib/metricas/calculo.ts`; el texto la lee
  de ahí en vez de repetir el número.
- La línea de tiempo de ventanas es lo único ámbar de la pantalla. Ni el SLA ni
  la carga por CSR usan ámbar aunque estén en mal estado: ámbar significa
  desconexión y nada más.
- Verde solo en lo confirmado: confirmaciones de homólogo e intenciones
  confirmadas. Una tasa de SLA alta no es verde.
- Cada bloque lleva su leyenda: «sobre datos simulados» en los de la sesión,
  «operación simulada acumulada» en el de SLA, que no es de la sesión.
- Cero se muestra como cero. No hay estado vacío decorativo: si el presentador
  abre `/impacto` antes de la escena 2, tiene que verse que aún no ha pasado
  nada.

## 8. Chat del lado operador

### 8.1 La sexta herramienta

```ts
// lib/ai/herramientas.ts (se amplía; las cinco existentes no cambian)
listarSolicitudes: tool({ ... })
```

Se registra **solo cuando `perfil === "operador"`**. `HERRAMIENTAS(perfil)` ya
recibe el perfil y hoy no lo usa; esta es la primera diferencia real entre los
dos lados del mostrador.

Entrada: `estado?`, `clasificacion?`, `csr?`. Lee por `solicitudesFiltradas({
desde: sesion.iniciadaEn, ... })` y devuelve la clasificación QMS y el punto que
4A ya calculó y guardó. El chat **no reevalúa el procedimiento**: si lo hiciera,
la bandeja y el chat podrían clasificar la misma solicitud de dos formas
distintas delante del cliente.

No escribe nada. §8 del contrato prohíbe escrituras comerciales desde el chat:
asignar y resolver siguen siendo acciones de pantalla con confirmación
explícita.

### 8.2 El respaldo pregrabado

`lib/ai/respaldo.ts` gana la respuesta de la pregunta del guion, para que el
interruptor `CHAT_RESPALDO=true` cubra también esta escena. Un respaldo que
cubre siete de las ocho escenas no es un respaldo: es una escena que se cae en
sala si falla la red.

### 8.3 Instrucciones

`INSTRUCCIONES_OPERADOR` menciona la herramienta nueva y mantiene la restricción
vigente de no exponer costos internos, márgenes ni información de otras cuentas.

## 9. Entrega

### 9.1 README

Se reescribe en español, sin el boilerplate de `create-next-app` que sigue
vigente: qué es el POC, cómo se levanta, qué variables necesita, cómo se siembra
la base y cómo se corre el guion. Deuda declarada desde el Plan 3.

### 9.2 Despliegue

La CLI de Vercel no está instalada y la cuenta es del usuario, así que 4B deja
todo listo y el despliegue lo ejecuta él:

- Configuración de proyecto y variables de entorno documentadas una por una,
  alineadas con `.env.example`, distinguiendo las que se exponen al navegador de
  las que no. `SUPABASE_SERVICE_ROLE_KEY` nunca puede quedar como
  `NEXT_PUBLIC_*`.
- `CHAT_RESPALDO` disponible como interruptor de sala en producción.
- Checklist de humo post-deploy: `/portal` busca y valida, `/operador` filtra y
  asigna, `/demo` cambia modo y planta, `/impacto` refleja el cambio sin
  recargar, y el chat responde en los dos perfiles.

### 9.3 Ensayo y video

Guion cronometrado de las ocho escenas, con el tiempo objetivo de cada una y la
acción exacta del presentador —qué se teclea, qué interruptor se toca y en qué
pestaña—. El video de respaldo lo graba el usuario sobre ese guion.

## 10. Verificación

**No se generan tests**, por directiva del usuario, igual que en 4A. La
verificación de 4B es:

1. `pnpm build`, `pnpm lint` y los 198 tests existentes en verde. 4B no puede
   romper lo que ya pasaba.
2. **Ejecución** —no solo redacción— de las verificaciones manuales pendientes
   de las tareas 6, 7, 9, 12, 13 y 14 de 4A, cuyos guiones están en
   `docs/superpowers/contexto/plan-4a/`. Incluye el conteo SQL de los doce tipos
   de evento y la no duplicación de avisos de la bandeja.
3. Las dos mediciones de deuda del Plan 3: ensayo visual con dos ventanas del
   navegador abiertas, y arranque en frío de Realtime tras veinte minutos de
   inactividad.
4. Recorrido completo de las ocho escenas sobre el despliegue.

Que las verificaciones estén escritas no es que estén hechas. El plan las trata
como tareas con resultado, no como documentación.

## 11. Fuera de alcance

Se mantiene lo del contrato §8 y se añade lo que este spec descartó:

- Integración real con WCL, SPQ+ o PinQ. Materia de las Fases 2–3.
- Autenticación y multiusuario. El POC no tiene login.
- Escrituras comerciales desde el chat.
- Tema oscuro.
- Reimplementar cualquier motor del Plan 3 o emisor de eventos del Plan 4A.
- Reordenar la secuencia de reconciliación al darle visibilidad en `/impacto`.
- Tests, en cualquier forma.

## 12. Criterios de aceptación por escena

| Escena | Criterio |
|---|---|
| 5 — Chatbot | Desde `/operador`, el chat lista las solicitudes de la sesión con su clasificación QMS y señala cuáles permite declinar el punto 4.1, sin reevaluar el procedimiento; con `CHAT_RESPALDO=true` la escena sigue corriendo |
| 6 — Dashboard | `/impacto` muestra cifras distintas de cero para todo lo ocurrido en la sesión, se actualiza al ocurrir un evento nuevo sin recargar, declara los 12 minutos como supuesto, y el panel operativo muestra carga por CSR, SLA y ventanas de la semana |
| 7 — Cierre | El recorrido completo corre sobre el despliegue de Vercel, con checklist de humo verificado y guion cronometrado listo para grabar el video |
| Todas | Ámbar solo en desconexión, verde solo en confirmación, y ninguna cifra sin su leyenda de datos simulados |

## 13. Deuda que 4B deja abierta a propósito

- **Cero cobertura de tests en toda la Fase 4.** Los módulos puros que 4B añade
  —`diasHabiles`, `franjasDeLaSemana`, `resumirOperacion`— son exactamente el
  tipo de código que un test fija en dos minutos. Queda enumerado aquí para
  cuando se retome la cobertura, junto con los de 4A (reconciliación,
  confirmación de homólogos, asignación).
- El número de solicitud sigue generándose con reintento ante colisión, no con
  secuencia de base.
- Biome informa que `linter.recommended` está deprecado; no afecta al lint.
- El histórico de SLA es sintético y no distingue festivos.

## 14. Supuestos abiertos con SKF

Ninguna pieza de 4B los da por resueltos, y `/impacto` los rotula en pantalla
donde aplica:

- Los 12 minutos liberados por solicitud evitada.
- Si el SLA de cotización se mide en cuatro días hábiles y cómo trata los
  festivos locales.
- El criterio de `ATRIBUTOS_CRITICOS` que 4A fijó para exigir validación de
  Ingeniería de Ventas.
- El orden de reglas de la reconciliación: una intención ajustada por pack
  quantity no se contrasta contra existencias.
- La interpretación de los puntos duplicados 4.5 y las rutas de Planner/PINQ.
- Los tiempos reales de Realtime, de las APIs corporativas y de la operación del
  CSR, antes de convertir cualquier cifra del POC en compromiso.
