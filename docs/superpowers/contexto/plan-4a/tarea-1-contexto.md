# Tarea 1 — Elección determinista de CSR

## Estado

completa

No cites el hash de tu propio commit: el archivo va dentro de ese commit y no
puedes conocerlo al escribirlo. Para ubicar el trabajo basta con
`git log --oneline -- lib/operacion`.

## Qué entrega esta tarea

- `lib/operacion/`: módulo de lógica de negocio pura sin red ni base de datos.
  - `asignacion.ts`: interfaz `CargaCsr` (código, solicitudes abiertas, estado
    activo) y función `elegirCsr()` que devuelve el código del operador que
    debe recibir la siguiente solicitud, o `null` si no hay ninguno activo.

## Decisiones tomadas y por qué

- **El desempate es lexicográfico y no aleatorio.** El ensayo cronometrado del
  Plan 4B repite el mismo recorrido varias veces. Si dos CSR con igual carga se
  resolvieran con `Math.random()`, la bandeja mostraría un reparto distinto en
  cada pasada y nadie podría afirmar que el comportamiento es el esperado. La
  regla debe ser determinista y estable. Con códigos de dos dígitos el orden
  lexicográfico pondría "CSR 10" antes que "CSR 2", que no es numéricamente
  ordenado; es aceptable porque la necesidad es estabilidad, no precisión
  numérica. Si algún día llega un requisito de reparto numérico, la lógica se
  parametriza, pero hoy es prematuro.

- **`CargaCsr` vive en `lib/operacion` y no en `lib/fuentes`.** La dependencia
  va de `lib/fuentes` hacia `lib/operacion`, nunca al revés: `lib/fuentes` será
  quien lea la carga de la base de datos y construya `CargaCsr[]` para pasarlo
  a `elegirCsr()`. Esto mantiene el módulo de operación comprobable sin tocar
  Supabase, sin declaraciones de tipo del cliente SQL, y sin mocks de servidor.
  La lógica pura recibe la carga contada y devuelve un código: ese contrato es
  testeable con arreglos en memoria. Si más adelante se cambia la consulta o el
  criterio de carga, solo `lib/fuentes` cambia; la regla de reparto queda
  intacta.

- **Directiva vigente al ejecutar esta tarea: no se escriben archivos de test.**
  Se omitieron los pasos 1, 2 y 4 del brief (`asignacion.test.ts` y el ciclo
  TDD "ver el fallo / implementar / ver pasar"). No existe
  `lib/operacion/asignacion.test.ts`. La verificación se hizo sobre la suite
  existente: `pnpm test` pasa sin cambios (la suite no tenía tests de
  asignación aún) y `pnpm lint` aprueba el código. Los 6 casos de test del
  brief están listos para portarse a Vitest tal cual cuando se retomen los
  tests.

## Contrato que exponen estos archivos

`lib/operacion/asignacion.ts`:

```ts
interface CargaCsr {
  codigo: string;
  abiertas: number;  // solicitudes sin atender
  activo: boolean;
}

function elegirCsr(cargas: readonly CargaCsr[]): string | null
```

`elegirCsr()` devuelve:
- El código del CSR activo con menos solicitudes abiertas.
- Si hay empate en carga, el que tenga código lexicográficamente menor.
- `null` si no hay ningún CSR activo o la lista está vacía.

Contrato de pureza: la función no muta el arreglo recibido ni realiza efectos
secundarios. Todos sus parámetros de entrada están en `cargas: readonly
CargaCsr[]`.

## Qué falta / qué NO hace

- Sin tests automatizados propios — directiva del usuario, ver arriba. Los 6
  casos del brief están listos para portarse a Vitest si la directiva cambia.
- **Consumidor de esta interfaz llega en la Tarea 4B:** `lib/fuentes` importará
  `CargaCsr` y `elegirCsr` para usarlos en la consulta de carga de operadores.
  Aquí existe la regla pura; aún no hay nada que la llame.
- No hay contramedidas contra listas vacías ni valores inválidos en los
  consumidores: `elegirCsr()` maneja sus casos (devuelve `null`), pero quien
  llama debe decidir qué hacer (asignar a "Sin asignar", reintentar,
  etc.). Ese comportamiento viene en las tareas de bandeja.

## Cómo verificar

```bash
pnpm test
```

Test Files 16 passed (16) · Tests 187 passed (187). Mismo número que antes de
esta tarea — la suite existente sigue en verde.

```bash
pnpm lint
```

`Checked 17 files ... No fixes applied.` — el archivo de esta tarea es limpio.
