# Tarea 8 — Confirmación guiada de homólogos (módulo puro)

## Estado

completa

No cites el hash de tu propio commit: el archivo va dentro de ese commit y no
puedes conocerlo al escribirlo. Para ubicar el trabajo basta con
`git log --oneline -- lib/validador/confirmacion.ts`.

## Qué entrega esta tarea

- `lib/validador/confirmacion.ts` (nuevo): módulo puro que convierte las
  `diferencias` de un `Homologo` en pasos de confirmación (`PasoConfirmacion`)
  y calcula si la equivalencia exige validación de Ingeniería de Ventas. Importa
  el tipo `Homologo` solo como tipo, sin arrastrar el cliente de Supabase.

## Decisiones tomadas y por qué

- **SUPUESTO ABIERTO CON SKF — criterio de `ATRIBUTOS_CRITICOS`.** El
  procedimiento (punto 4.6) pide que el cliente revise el reemplazo con su
  Ingeniero de Ventas, pero no enumera qué diferencias disparan esa validación.
  El POC fija el criterio: una diferencia exige validación cuando cambia el
  ajuste montado o el envolvente de operación —`juego interno`,
  `temperatura máxima`, `velocidad límite`—; las de construcción o suministro
  (`sellado`, `jaula`, `lubricación`) se muestran pero no la exigen. Es un
  supuesto del POC, no una regla del QMS: queda abierto a corrección de un
  ingeniero de SKF, junto a los supuestos del §10 del spec. El caso curado de
  la escena 3 (`DEMO-OBS-CON` → `DEMO-6205-2RSH/C3`) trae *Sellado* y
  *Juego interno*, así que cae del lado que sí exige validación.

- **La comparación de atributos normaliza acentos, mayúsculas y espacios.** El
  dato viene de siembra y puede variar en forma (`TEMPERATURA MÁXIMA`); la
  clave se calcula con `normalize("NFD")` + quitar marcas diacríticas
  (U+0300–U+036F) + minúsculas + `trim`.

- **Adaptación mínima al snippet del plan: formato.** Biome requiere la cadena
  de métodos de `clave()` en una sola línea (cabe en el ancho de 100); sin
  cambio de lógica.

- **Sin tests nuevos** — directiva del usuario: se omiten los pasos 1 y 2 del
  plan (`confirmacion.test.ts`); solo se implementa el módulo. La lógica
  cubierta por esos tests queda verificada de forma manual/estática en esta
  tarea y pendiente de cobertura automatizada si se revierte la directiva.

## Contrato que exponen estos archivos

```ts
// lib/validador/confirmacion.ts
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

export function construirConfirmacion(homologo: Homologo): Confirmacion
```

- Conserva el orden de `diferencias`; `requiereIngenieriaVentas` es verdadero
  si algún paso requiere validación; sin diferencias no hay pasos ni
  validación pendiente; siempre cita el punto `"4.6"`.

## Qué falta / qué NO hace

- **Sin archivo de test** (directiva del usuario): los 6 tests del paso 1 del
  plan no se crearon.
- **Sin verificación en navegador** (ver abajo).
- El módulo no consulta nada, no decide si el homólogo es válido y no escribe:
  la UI (Tarea 9) es la que impide continuar sin marcar cada paso.

## Cómo verificar

```bash
pnpm test
```

Salida: `Test Files 17 passed (17)`, `Tests 198 passed (198)` — la suite
sigue en verde.

```bash
pnpm lint
```

`Checked 141 files ... Found 1 info.` (el info es la deprecación preexistente
de `biome.json`, ajena a esta tarea).

## Verificación manual pendiente

No se pudo correr `pnpm dev` + navegador en este entorno. La verificación del
flujo completo de confirmación guiada forma parte de la Tarea 9 (ver
`tarea-9-contexto.md`).
