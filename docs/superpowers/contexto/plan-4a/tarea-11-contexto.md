# Tarea 11 — Reconciliación de la cola (módulo puro)

## Estado

completa

No cites el hash de tu propio commit: el archivo va dentro de ese commit y no
puedes conocerlo al escribirlo. Para ubicar el trabajo basta con
`git log --oneline -- lib/operacion/reconciliacion.ts`.

## Qué entrega esta tarea

- `lib/reglas-qms/cantidades.ts`: las firmas de `incumpleMoq`,
  `redondearAPack` y `avisoPackQuantity` se ensanchan de `Designacion` a
  `Pick<Designacion, "moq">` / `Pick<Designacion, "packQuantity">`. Cuerpos
  sin cambios.
- `lib/operacion/reconciliacion.ts` (nuevo): módulo puro con
  `EntradaReconciliacion`, `ResultadoReconciliacion` y `reconciliar(entrada)`.

## Decisiones tomadas y por qué

- **Ensanchar firmas en vez de reimplementar la regla.** El contrato de
  `reconciliar` recibe `moq` y `packQuantity` sueltos, no una `Designacion`.
  `incumpleMoq` y `redondearAPack` pedían la designación entera aunque solo
  usan un campo. `Pick<Designacion, ...>` es un cambio compatible —una
  `Designacion` completa sigue siendo asignable, ningún llamador existente se
  tocó— y evita la única alternativa: copiar el redondeo del punto 4.5a a un
  segundo archivo. Dos implementaciones de la misma regla es cómo se llega a
  dos cantidades distintas en dos pantallas.

- **Las reglas se aplican en orden y con retorno inmediato**, igual que
  `evaluarSolicitud`: (1) MOQ (punto 4.4) → escalada; (2) pack quantity
  (punto 4.5a) → ajustada; (3) existencias → confirmada o escalada.
  Consecuencia deliberada: una intención ajustada por pack quantity **no** se
  contrasta contra existencias, y por eso su nota no promete disponibilidad —
  solo anuncia que un CSR la confirma al procesar la cotización.

- **Ninguna nota lleva fecha ni plazo.** La reconciliación confirma
  disponibilidad, no tiempo de entrega: el TE en firme sigue saliendo al
  procesar la cotización. Es la invariante de honestidad aplicada al caso más
  tentador de romperla — el cliente acaba de esperar una ventana y quiere una
  fecha. (El plan prevé un test que vigila esta invariante; no se creó por la
  directiva de no añadir tests, y la verificación queda pendiente abajo.)

- **Módulo puro: no toca la base.** Recibe el inventario ya resuelto por
  `existenciasDe()` (en orden PS, SL, XX) y devuelve estado, cantidad final,
  nota y punto QMS. La escritura del resultado es la Server Action de la
  Tarea 13.

- **Sin desviaciones de los snippets del plan.** Ambos archivos se escribieron
  tal cual los dicta el plan; Biome no exigió reformateo.

- **Sin tests nuevos** — directiva del usuario: no se crean archivos de test
  en este plan. Se saltaron los pasos 2, 3 y 4 del plan
  (`cantidades.test.ts` «firmas parciales» y `reconciliacion.test.ts`).

## Contrato que exponen estos archivos

```ts
// lib/reglas-qms/cantidades.ts (firmas ensanchadas)
export function incumpleMoq(d: Pick<Designacion, "moq">, cantidad: number): boolean;
export function redondearAPack(d: Pick<Designacion, "packQuantity">, cantidad: number): number;
export function avisoPackQuantity(
  d: Pick<Designacion, "packQuantity">,
  cantidad: number,
): Aviso | null;
```

```ts
// lib/operacion/reconciliacion.ts
export interface EntradaReconciliacion {
  intencion: Intencion;
  /** Ya resueltas por `existenciasDe()`, en orden PS, SL, XX. */
  existencias: Existencia[];
  moq: number;
  packQuantity: number;
}

export interface ResultadoReconciliacion {
  estado: Exclude<EstadoIntencion, "encolada">; // "confirmada" | "ajustada" | "escalada"
  cantidadFinal: number;
  nota: string;
  /** Punto del QMS que justifica el ajuste, o `null` si no lo hay. */
  punto: string | null;
}

export function reconciliar(entrada: EntradaReconciliacion): ResultadoReconciliacion;
```

- Consume `incumpleMoq` y `redondearAPack` de `@/lib/reglas-qms`; los tipos
  `Intencion` / `EstadoIntencion` de `@/lib/fuentes/intenciones` y
  `Existencia` de `@/lib/reglas-qms` llegan como imports de solo tipos.
- Orden de reglas con retorno inmediato: 4.4 (MOQ) → 4.5a (pack) →
  existencias. Una intención ajustada por pack quantity no se contrasta contra
  existencias; su nota no promete disponibilidad.

## Qué falta / qué NO hace

- **No escribe en la base**: marcar la intención como resuelta con el
  resultado es la Server Action de la Tarea 13; encolar sigue siendo la
  Tarea 12.
- **Sin tests propios** (directiva del usuario): los diez escenarios del plan
  (MOQ, pack, confirmación, suma de almacenes, escaladas, precedencia MOQ >
  pack, ausencia de fechas en notas y las dos firmas parciales) quedan como
  verificación pendiente abajo.

## Cómo verificar

```bash
pnpm test
```

Salida: `Test Files 17 passed (17)`, `Tests 198 passed (198)` — la suite
completa sigue en verde; el ensanchamiento de firmas **no** rompió ningún
test de `lib/reglas-qms` (la señal de que el `Pick<...>` se hizo bien).

```bash
pnpm build
```

Compila y type-check sin errores.

```bash
pnpm lint
```

`Checked 142 files ... No fixes applied. Found 1 info.` (el info es la
deprecación preexistente de `biome.json`, ajena a esta tarea).

## Verificación manual pendiente

Sin tests nuevos por directiva; cuando se retome la cobertura, los escenarios
del plan que deben quedar fijados son:

1. `reconciliar` con cantidad < MOQ → `escalada`, punto `4.4`, conserva la
   cantidad pedida, la nota cita el MOQ.
2. Cantidad que no es múltiplo del pack → `ajustada`, punto `4.5a`, redondeo
   hacia arriba (30 con pack 25 → 50).
3. Existencias que cubren → `confirmada`, punto `null`, la nota nombra el
   almacén principal y el total disponible; la suma de varios almacenes
   decide.
4. Existencias insuficientes o ausentes → `escalada` sin punto, la nota habla
   de consulta a fábrica.
5. MOQ gana sobre pack quantity (se evalúa primero).
6. Ninguna nota de los cuatro caminos contiene fecha, semana, días, plazo ni
   entrega.
7. `redondearAPack({ packQuantity: 25 }, 30) === 50` e
   `incumpleMoq({ moq: 100 }, 40) === true` con objetos parciales.
