# Tarea 13 — Reconciliación al reabrir la planta y eventos de ventana

## Estado

completa

No cites el hash de tu propio commit: el archivo va dentro de ese commit y no
puedes conocerlo al escribirlo. Para ubicar el trabajo basta con
`git log --oneline -- lib/sesion-demo/acciones.ts`.

## Qué entrega esta tarea

- `lib/sesion-demo/acciones.ts`:
  - Nueva función interna `reconciliarIntenciones(pdiv)` (no exportada):
    resuelve en serie las intenciones `encolada` de una planta contra el
    catálogo y las existencias, actualiza `intenciones_pedido` y emite un
    evento `reconciliacion` por intención.
  - `fijarEstadoPlanta(pdiv, estado)` conserva su firma y ahora emite
    `ventana_inicio` / `ventana_fin` al cruzar la frontera de `ventana`,
    comparando el estado antes y después de escribir el override.
  - `cerrarVentanaEnCurso(pdiv)` conserva su firma y ahora reconcilia la cola
    **antes** de liberar la planta (`fijarEstadoPlanta(pdiv, "online")`).

## Decisiones tomadas y por qué

- **Reconciliar antes de liberar, en ese orden.** Si el override se limpiara
  primero, la pantalla del cliente se refrescaría por Realtime con la planta
  viva y la cola todavía en `encolada` — la incoherencia exacta que la escena
  4 existe para desmentir.

- **Reconciliación secuencial, no `Promise.all`.** Son pocas intenciones y
  cada una emite su evento; en serie, el orden de los eventos en
  `eventos_demo` coincide con el orden de la cola en pantalla.

- **Los eventos de ventana se emiten DESPUÉS de escribir el override.** La
  pantalla del presentador no espera a la métrica y `emitirEvento` no lanza
  jamás. El estado anterior se calcula con el override viejo y el nuevo con el
  override ya escrito, ambos sobre el mismo `momento` simulado, así que el
  cruce `ventana` ↔ no-`ventana` también detecta los cambios por calendario
  (override `null`), no solo los forzados.

- **Si falta la designación del catálogo, la intención se queda `encolada`.**
  La clave foránea lo impide, pero si pasara no hay decisión honesta posible:
  mejor no inventar un resultado.

- **Sin desviaciones de los snippets del plan.** Las tres funciones se
  escribieron tal cual las dicta el plan sobre las versiones preexistentes
  (que ya usaban `actualizar` y `leerSesion`); Biome solo compactó el import
  de `@/lib/fuentes` a una línea.

- **Sin tests nuevos** — directiva del usuario: no se crean archivos de test
  en este plan.

## Contrato que exponen estos archivos

```ts
// lib/sesion-demo/acciones.ts (firmas conservadas)
export async function fijarEstadoPlanta(
  pdiv: string,
  estado: EstadoPlanta | null, // null = volver al calendario
): Promise<void>;
// Efectos nuevos: emite `ventana_inicio` al entrar en ventana y
// `ventana_fin` al salir, comparando estado anterior/posterior con el reloj
// simulado. Sin evento si la planta no existe.

export async function cerrarVentanaEnCurso(pdiv: string): Promise<void>;
// Efecto nuevo: reconcilia la cola `encolada` de la planta (actualiza
// `intenciones_pedido` + evento `reconciliacion` por intención) y DESPUÉS
// fuerza la planta a `online` (lo que emite `ventana_fin`).
```

- Consume `intencionesDe`, `obtenerDesignacion`, `existenciasDe`,
  `plantaCompleta` de `@/lib/fuentes`; `reconciliar` de
  `@/lib/operacion/reconciliacion`; `estadoDePlanta`, `ahoraSimulada` de
  `@/lib/estado-fabricas`; `emitirEvento`; `clienteAdmin`.
- Todas las escrituras (`sesion_demo`, `intenciones_pedido`,
  `eventos_demo`) van por `clienteAdmin` dentro de Server Actions; ninguna
  migración nueva.

## Qué falta / qué NO hace

- **No hay trigger ni canal nuevo**: la pantalla del cliente se entera del
  resultado por el refresco de sesión que montó la Tarea 12.
- **No emite los eventos que faltan en el portal/operador** (`aviso_moq`,
  `sugerencia_aceptada`, deduplicación de avisos): eso es la Tarea 14.

## Cómo verificar

```bash
pnpm test
```

Salida: `Test Files 17 passed (17)`, `Tests 198 passed (198)` — la suite
completa sigue en verde.

```bash
pnpm build
```

Compila y type-check sin errores (`✓ Compiled successfully`).

```bash
pnpm lint
```

`Checked 144 files ... Found 1 info.` (el info es la deprecación preexistente
de `biome.json`, ajena a esta tarea).

## Verificación manual pendiente

No se pudo ejecutar la verificación con navegador (entorno sin sesión
interactiva). Cuando se retome, el guion del plan (paso 2 de la Tarea 13) es:

1. En `/demo`, forzar `P103` a *ventana*.
2. En `/portal`, encolar **tres** intenciones: una por debajo del MOQ, una no
   múltiplo del pack quantity y una limpia con existencias suficientes.
3. En `/demo`, pulsar *Cerrar la ventana en curso*.
4. En `/portal`, sin recargar, la cola muestra *Escalada* (punto 4.4),
   *Ajustada* (cantidad redondeada) y *Confirmada* en verde con el almacén.
5. Ninguna nota contiene fecha ni plazo.
6. SQL:

```sql
select tipo, pdiv, detalle
from eventos_demo
where tipo in ('reconciliacion', 'ventana_inicio', 'ventana_fin')
order by ocurrido_en desc
limit 10;
```

Esperado: un `reconciliacion` por intención con `estado`, `cantidadFinal` y
`punto`; un `ventana_inicio` al forzar la ventana y un `ventana_fin` al
cerrarla.
