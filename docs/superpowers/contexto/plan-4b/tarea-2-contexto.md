# Tarea 2 — Cumplimiento del SLA sobre el histórico

## Estado
completa

## Qué entrega esta tarea

Se añade `cumplimientoSla()` al final de `lib/fuentes/cotizaciones.ts`. Consulta la tabla `cotizaciones` completa (paginada) y devuelve:

- `respondidas`: cotizaciones con `fecha_respuesta` no nula.
- `dentroDelSla`: cuántas de esas respondieron en `DIAS_SLA` días hábiles o menos.
- `tasa`: `dentroDelSla / respondidas`, en `0..1`; `0` cuando no hay respondidas.
- `pendientes`: cotizaciones sin `fecha_respuesta`.
- `medianaDiasHabiles`: mediana de días hábiles de respuesta sobre las respondidas.

Las tres funciones existentes del archivo (`historicoDe`, `historicoDeFamilia`, `obtenerCotizacion`) no cambian.

## Decisiones tomadas y por qué

1. **Mide el histórico completo, no la sesión.** `solicitudes` y `cotizaciones` son tablas distintas y el demo en vivo solo escribe en `solicitudes`: ninguna cotización que se cree durante la sesión llega nunca a `cotizaciones`. Un SLA filtrado por `sesion.iniciadaEn` daría siempre cero — no porque el SLA se incumpla, sino porque la tabla que se mide nunca recibe filas nuevas. Por eso `cumplimientoSla()` no toma parámetros de sesión: mide el histórico sintético entero, y en pantalla se rotula como «operación simulada acumulada» para distinguirlo del resto de cifras del demo, que sí son de la sesión en curso.

2. **Se pagina con `.range()` y se memoiza.** PostgREST corta las respuestas en 1000 filas por defecto; el histórico ronda las (verificado: 7921) filas, muy por encima del corte. Una lectura sin paginar habría medido en silencio solo la primera página ordenada por `fecha_solicitud` y devuelto una tasa plausible pero falsa — el peor tipo de error para una cifra que se proyecta delante del cliente. Se pagina en bloques de `FILAS_POR_PAGINA = 1000` hasta `PAGINAS_MAXIMAS = 20` (margen amplio sobre las ~8 páginas reales) o hasta que un lote vuelva incompleto. El resultado se memoiza en `memoria` porque nada del demo escribe en `cotizaciones`: el histórico es inmutable durante la presentación, y sin memoización el sondeo de respaldo de `/impacto` (cada dos segundos) repaginaría miles de filas en cada tick. `reiniciarSesion()` no invalida `memoria` porque no toca el histórico — solo la sesión simulada.

## Contrato que exponen estos archivos

```ts
// lib/fuentes/cotizaciones.ts
export interface CumplimientoSla {
  respondidas: number;
  dentroDelSla: number;
  tasa: number; // 0..1
  pendientes: number;
  medianaDiasHabiles: number;
}

export function cumplimientoSla(): Promise<CumplimientoSla>;
```

Consume `DIAS_SLA` y `diasHabiles` de `@/lib/reglas-qms` (Tarea 1); no reimplementa el cálculo de días hábiles. Usa `clienteLectura()` y `lanzarSiError()` siguiendo el patrón del resto del archivo.

## Qué falta / qué NO hace

- No expone ninguna forma de invalidar `memoria` en caliente: es deliberado (ver decisión 2), pero significa que si alguna vez el demo empezara a escribir en `cotizaciones`, esta función quedaría desactualizada hasta el próximo reinicio del proceso.
- No filtra por rango de fechas ni por planta: mide la tabla `cotizaciones` entera, sin segmentar.
- No hay tests nuevos (directiva explícita del usuario para todo el Plan 4B).
- No consume esta función ningún componente de UI todavía: esa integración (probablemente `/impacto`) es de una tarea posterior del Plan 4B.

## Cómo verificar

```bash
pnpm lint
pnpm build
pnpm test
```

Esperado: lint limpio (salvo el info preexistente sobre `linter.recommended` en `biome.json`), build sin errores de tipo, 198 tests en verde.

Para revalidar la paginación contra la base:

```bash
pnpm exec tsx -e "
import { config } from 'dotenv'; config({ path: '.env.local' });
import('./lib/fuentes/cotizaciones').then(({ cumplimientoSla }) => cumplimientoSla().then((r) => console.log(r)));
"
```

`respondidas + pendientes` debe coincidir con el conteo SQL total de `cotizaciones` y ser mayor que 1000. Si `respondidas` sale exactamente 1000, la paginación no está funcionando.

## Verificación manual pendiente

Ninguna: la comprobación contra la base de datos real ya se ejecutó como parte de esta tarea (ver reporte de la Tarea 2). Resultado obtenido:

- `cumplimientoSla()`: `{ respondidas: 7921, dentroDelSla: 6981, tasa: 0.8813281151369776, pendientes: 0, medianaDiasHabiles: 2 }`
- Conteo SQL directo sobre `cotizaciones` (vía `count: 'exact', head: true` con los mismos filtros que el `SELECT` sugerido por el brief): `{ total: 7921, respondidas: 7921, pendientes: 0 }`

Los dos números de `respondidas` coinciden (7921) y superan ampliamente el corte de 1000 filas de PostgREST, confirmando que la paginación agota la tabla y no se queda en la primera página. La tabla no tiene cotizaciones pendientes en este histórico sintético (`pendientes: 0` en ambos lados), lo cual es consistente pero no fue verificado como invariante — es simplemente el estado actual de los datos sembrados.
