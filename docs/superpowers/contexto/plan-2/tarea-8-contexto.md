# Tarea 8 — Histórico de cotizaciones

## Estado
completa

No cites el hash de tu propio commit: el archivo va dentro de ese commit y no
puedes conocerlo al escribirlo. Para ubicar el trabajo usa:
`git log --oneline -- scripts/seed/cotizaciones.ts scripts/seed/cotizaciones.test.ts`.

## Qué entrega esta tarea

Entrega un generador determinista de histórico de cotizaciones sobre días hábiles, con volumen diario, solicitudes, respuestas, resultados, precios, tiempos de entrega y motivos de declinado coherentes con las restricciones de la base. El histórico no es ruido uniforme: siembra deliberadamente los problemas que el dashboard y el guion deben poder mostrar.

También entrega un deformador de designaciones con errores de captura verosímiles, el orden de las doce columnas y su serialización para carga masiva.

## Decisiones tomadas y por qué

Los cinco patrones exigidos por el plan quedan representados así:

| Patrón | Cómo se siembra | Escena o uso en el guion |
|---|---|---|
| Pico en la ventana de desconexión | Una parte alta del tráfico se concentra entre 12:30 y 15:00; los `PLAN` con stock pueden declinarse como `ya_disponible_wcl` y etiquetarse `ventana_desconexion`. | Da al dashboard el gráfico que explica el problema y sustenta la escena 4, donde una ventana de planta interfiere con una consulta válida. |
| Designaciones mal ingresadas | 16% de las solicitudes intenta deformar el código y se declina como `designacion_invalida`, con patrón `designacion_mal_ingresada` cuando no prevalece otra etiqueta. | Sustenta la escena 2 y el punto 4.8: búsqueda/truncamiento frente a una captura inválida o ambigua. |
| Respuesta alrededor del SLA | 88% recibe una demora entre 0.5 y 5.5 días y 12% una cola entre 6.5 y 14 días. | Permite al dashboard mostrar un promedio cercano a cuatro días con una cola que lo excede; el SLA se presenta como promedio, no como plazo individual. |
| Cierre de mes OEM | Los últimos cinco días hábiles identificados de cada mes reciben `patron: "cierre_mes_oem"` y el volumen diario baja al 75%. | Representa la asignación especial al equipo OEM y aporta contexto operacional al cierre de mes. |
| Estacionalidad ligera | Fuera del cierre, el volumen diario oscila entre 85% y 115% de `porDiaHabil`; durante cierre usa 75%. | Evita una serie artificialmente plana y hace creíble la lectura histórica del dashboard. |

- El intento de entrar en la franja de pico se ajustó de `0.45` a `0.55`, y la probabilidad de declinar por disponibilidad WCL dentro del pico se ajustó de `0.72` a `0.92`. La primera corrida produjo solo **40.36%** de `ya_disponible_wcl` entre las declinadas de la franja, por debajo del umbral narrativo `> 50%`. Se ajustó el generador, no el test, porque el umbral expresa lo que el dashboard necesita contar.
- El tráfico fuera del pico se sortea en toda la jornada de 08:00 a 18:00, por lo que también puede caer naturalmente dentro de 12:30–15:00. Esa superposición es deliberada: durante una ventana siguen existiendo consultas legítimas.
- La precedencia de evaluación es: designación inválida, disponibilidad WCL durante el pico, obsoleto sin reemplazo, planta sin ruta/conexión y, si todavía estaba cotizada, MOQ mayor que la cantidad. Esto garantiza un único `motivo_declinado`.
- Las plantas `P110` y `P204` representan los casos no cotizables por falta de ruta o conexión y producen `planta_sin_ruta`.
- La cantidad se elige entre tres bandas ponderadas: 1–9 con peso 45, 10–99 con peso 40 y 100–2.000 con peso 15. Siempre es positiva.
- Las cotizadas reciben `te_semanas` entre 1 y 26 y precio: se usa `precio_lista` cuando existe o un valor sintético entre 40 y 9.000. Las declinadas reciben motivo y dejan `te_semanas` y `precio` nulos.
- Los IDs de operador se construyen **antes** de filtrar: `OPERADORES.map((operador, indice) => ({ ..., id: indice + 1 })).filter(activo)`. Así se conservan los IDs reales de inserción `1–6` y `8`; nunca se renumera la lista filtrada ni se asigna el ID 7 de `CSR 7`, que está inactivo.
- El número usa `AAAAQ#####`, con el año UTC de la solicitud y un consecutivo que comienza en 1 por llamada. Esto satisface el `CHECK` para el volumen previsto y no repite números dentro de una ejecución.
- `deformar` intenta hasta doce veces truncar, transponer, confundir caracteres visualmente similares, agregar/quitar guion o conservar solo un prefijo. Si ningún intento cambia el valor, aplica un respaldo determinista no vacío terminado en `X`.
- Todas las operaciones de calendario usan métodos UTC (`getUTCDay`, `setUTCDate`, `setUTCHours`, `getUTCFullYear`). `desde` es inclusiva y `hasta` exclusiva; sábados y domingos UTC no generan solicitudes.
- Las horas 08:00–18:00 y 12:30–15:00 se almacenan directamente como horas UTC aunque semánticamente el plan las describe como jornada y pico de México. No se realiza conversión de zona horaria ni ajuste por horario estacional.
- La demora de respuesta se suma como duración exacta en milisegundos (`diasRespuesta * 86400000`). Por tanto son **días calendario de 24 horas**, no un avance que salte fines de semana o feriados, aunque el indicador narrativo se compare con el promedio SLA de días hábiles.
- El patrón de cierre tiene precedencia en el campo `patron`: en esos días, una designación inválida o una ventana puede conservar `cierre_mes_oem` como etiqueta, aunque su `motivo_declinado` sí refleje la causa. `patron` admite una sola etiqueta.
- El paso 4 del plan dice 19 tests, pero su bloque original contiene 21. Se añadió un test para impedir asignar operadores inactivos y verificar sus IDs reales de inserción; el total implementado y verificado es **22 tests**.

## Contrato que exponen estos archivos

`scripts/seed/cotizaciones.ts` exporta:

```ts
export type MotivoDeclinado =
  | "ya_disponible_wcl"
  | "moq_mayor"
  | "obsoleto_sin_reemplazo"
  | "designacion_invalida"
  | "planta_sin_ruta";

export interface Cotizacion {
  numero: string;
  cliente_id: number;
  designacion: string;
  cantidad: number;
  fecha_solicitud: Date;
  fecha_respuesta: Date | null;
  operador_id: number | null;
  resultado: "cotizada" | "declinada";
  motivo_declinado: MotivoDeclinado | null;
  te_semanas: number | null;
  precio: number | null;
  patron: string | null;
}

export interface OpcionesHistorico {
  desde: Date;
  hasta: Date;
  porDiaHabil: number;
}

export function deformar(
  a: Aleatorio,
  designacion: string,
): string;

export function generarCotizaciones(
  a: Aleatorio,
  catalogo: readonly DesignacionCompleta[],
  inventario: readonly FilaInventario[],
  numClientes: number,
  opciones: OpcionesHistorico,
): Cotizacion[];

export const COLUMNAS_COTIZACIONES = [
  "numero",
  "cliente_id",
  "designacion",
  "cantidad",
  "fecha_solicitud",
  "fecha_respuesta",
  "operador_id",
  "resultado",
  "motivo_declinado",
  "te_semanas",
  "precio",
  "patron",
] as const;

export function filasCotizaciones(
  cotizaciones: readonly Cotizacion[],
): unknown[][];
```

`generarCotizaciones` no muta catálogo ni inventario. Agrega todas las filas de inventario por designación para decidir disponibilidad y genera una cotización por cada iteración del volumen diario calculado.

`filasCotizaciones` devuelve una fila de doce posiciones por cotización, exactamente en el orden de `COLUMNAS_COTIZACIONES`. Conserva los objetos `Date`; el cargador común es responsable de convertirlos a ISO durante `COPY`.

## Qué falta / qué NO hace

- No inserta datos en la base ni valida claves foráneas mediante una conexión. Presupone un catálogo no vacío, al menos un cliente y operadores activos.
- No valida `numClientes`, `porDiaHabil` ni el orden de las fechas. Valores fuera del uso previsto pueden producir rangos inválidos, cero filas o errores en el muestreo.
- `hasta` es exclusiva. El generador no incluye ese día aunque sea hábil.
- Solo excluye sábados y domingos UTC; no conoce feriados mexicanos ni calendarios corporativos.
- El cierre de mes se calcula sobre los días presentes en el intervalo recibido. Si el intervalo termina a mitad de mes, los últimos cinco días disponibles de ese mes parcial pueden marcarse como cierre aunque no sean los últimos del mes calendario real.
- La demora de respuesta no avanza por un calendario hábil y puede atravesar fines de semana. `fecha_respuesta` se genera siempre en esta implementación, aunque el tipo permita `null`.
- No convierte las horas descritas como hora de México a UTC. Los minutos de jornada y pico se escriben como hora UTC literal.
- No garantiza que toda deformación sea ajena al catálogo: el test exige que más de 90% de las inválidas no existan, pero una deformación puede coincidir accidentalmente con otra designación.
- El consecutivo se reinicia en cada llamada, por lo que combinar históricos generados por llamadas separadas puede duplicar números. Tampoco se protege el formato si una sola llamada supera 99.999 cotizaciones: `padStart(5)` no trunca un consecutivo de seis dígitos.
- `patron` guarda como máximo una etiqueta y prioriza `cierre_mes_oem`; no es una lista exhaustiva de todos los patrones que coincidieron en una fila.
- No existe un campo de equipo OEM en `Cotizacion`; el cierre se representa mediante `patron: "cierre_mes_oem"` y la reducción de volumen, no mediante una asignación diferenciada de operador.
- El histórico no modela festivos, pausas fuera de jornada, reaperturas, cambios de operador, estados intermedios ni múltiples respuestas.

## Cómo verificar

Ejecutar los tests específicos:

```powershell
pnpm.cmd test cotizaciones
```

Resultado real: `Test Files 1 passed (1)` y `Tests 22 passed (22)`. El plan dice 19 por error; su bloque original tiene 21 y se agregó un test de operadores activos, para un total de 22.

Ejecutar toda la suite:

```powershell
pnpm.cmd test
```

Resultado real acumulado antes del formateo final de los dos archivos: `Test Files 15 passed (15)` y `Tests 172 passed (172)`.

Verificar tipos:

```powershell
.\node_modules\.bin\tsc.cmd --noEmit
```

Resultado real: finaliza sin errores.

Verificar formato y lint:

```powershell
pnpm.cmd lint
```

Resultado real después de formatear `scripts/seed/cotizaciones.ts` y `scripts/seed/cotizaciones.test.ts`: código de salida 0 y 45 archivos revisados. Solo aparece el aviso informativo preexistente sobre `linter.recommended` deprecado en `biome.json`; no hay errores de esta tarea.
