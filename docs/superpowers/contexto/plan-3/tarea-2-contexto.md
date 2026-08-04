# Tarea 2 — Migración 000008 y la rama 5.2 del procedimiento

## Estado
completa

No cites el hash de tu propio commit: el archivo va dentro de ese commit y no
puedes conocerlo al escribirlo. Para ubicar el trabajo basta con
`git log --oneline -- supabase/migrations/20260804000008_busqueda_y_indices.sql lib/reglas-qms lib/supabase/tipos.ts`.

## Qué entrega esta tarea

Dos piezas independientes que son prerrequisito de tareas posteriores:

1. **Migración `000008`**: dos funciones RPC (`buscar_similares`,
   `buscar_por_prefijo`) que exponen `similarity()` de `pg_trgm` a través de
   PostgREST — necesarias porque PostgREST no expone funciones de extensión
   directamente — y tres índices de consulta inversa
   (`homologos_equivalente`, `inventario_pdiv_dueno`,
   `designaciones_reemplazado_por`) que el Plan 1 dejó anotados como
   ausentes a propósito.
2. **La rama 5.2 del QMS**: `avisoPrecio` en `lib/reglas-qms/tiempos.ts`
   ahora cubre las dos razones por las que una designación puede no tener
   precio en pantalla — 5.3 (FPC 2, sin cambios de comportamiento) y 5.2
   (FPC 1 sin Precio de Lista, nuevo: "se cotiza bajo los parámetros de
   SPQ+"). Nuevo `TipoAviso`: `"precio_bajo_spq"`.

## Decisiones tomadas y por qué

- **Directiva vigente al ejecutar esta tarea: no se escriben tests
  nuevos** (ver `progress.md`, "Directiva del usuario (2026-08-04, a mitad
  de la tarea 2)"). Se omitieron los pasos 4 y 5 del brief (escribir y ver
  fallar el test de la rama 5.2) y no se tocó
  `lib/reglas-qms/tiempos.test.ts`. Se verificó a mano, con grep sobre todo
  el repo, que ningún test existente construye una designación FPC 1 con
  `precioLista: null` y llama a `avisoPrecio` o `evaluarSolicitud` sobre
  ella — así que la regla nueva no tenía ningún test que romper, y no hizo
  falta ajustar ninguna expectativa (el paso 7 del brief anticipaba esa
  posibilidad, pero no se dio). Los 187 tests previos siguen en verde tal
  cual estaban.

- **`lib/reglas-qms/index.ts` sí se tocó**, aunque el brief no lo lista
  como archivo a modificar. El comentario de la línea 114
  (`// 4.9 y 5.3 — avisos que se acumulan...`) y el nombre de variable
  `avisoLpc` quedaban desactualizados en cuanto `avisoPrecio` empezó a
  devolver también el aviso 5.2 por esa misma línea (`avisoPrecio(efectiva)`
  ya se invocaba ahí desde antes, sin cambios de lógica). Se corrigió el
  comentario a `4.9 y 5.2/5.3` y se renombró la variable a
  `avisoDePrecio`. Es un cambio cosmético — mismo comportamiento, mismo
  orden de evaluación — hecho porque dejar un comentario/nombre que
  describe solo la mitad de lo que la función ahora hace habría sido una
  inexactitud introducida por esta misma tarea.

- **Ninguna prueba manual de las funciones RPC requirió `psql`.** Se usó
  un script temporal de Node/`pg` contra `SUPABASE_DB_URL` (creado y
  borrado dentro de `scripts/`, no forma parte del commit) porque no hay
  `psql` disponible en este entorno Windows. Resultados exactos en "Cómo
  verificar" abajo.

- **No se reordenó ni renombró nada de la migración 000008**: es el SQL
  literal del brief, carácter por carácter, incluidos los comentarios en
  español que documentan cada estrategia de búsqueda.

- **`pnpm verificar` fue rojo en el primer intento** (paso 3 "Realtime"
  falló con "sin evento en 15 s") y verde en el reintento inmediato, sin
  ningún cambio de código entre ambos. La tabla que verifica ese paso
  (`sesion_demo`) no la toca esta migración ni ningún archivo de esta
  tarea — es una desconexión transitoria de Realtime, no una regresión de
  esta tarea. Ver "Cómo verificar" para la salida completa de ambos
  intentos.

## Contrato que exponen estos archivos

RPC `buscar_similares` (SQL, expuesta vía PostgREST):
```sql
buscar_similares(consulta text, limite int default 5)
  returns table (designacion text, puntaje real)
```
Estrategia 4 del validador (tarea 7): similitud por trigramas
(`pg_trgm`, operador `%`), orden descendente por puntaje. Umbral 0.3 por
defecto de `pg_trgm`. `security invoker`, otorgada a `anon` y
`authenticated`.

RPC `buscar_por_prefijo` (SQL, expuesta vía PostgREST):
```sql
buscar_por_prefijo(prefijo text, limite int default 5)
  returns table (designacion text)
```
Estrategia 3 del validador (tarea 7): detección de captura incompleta
(coincidencia por prefijo, excluye la coincidencia exacta). `security
invoker`, otorgada a `anon` y `authenticated`.

Ambas quedan tipadas en `lib/supabase/tipos.ts` bajo
`Database["public"]["Functions"]`:
```ts
buscar_por_prefijo: {
  Args: { limite?: number; prefijo: string }
  Returns: { designacion: string }[]
}
buscar_similares: {
  Args: { consulta: string; limite?: number }
  Returns: { designacion: string; puntaje: number }[]
}
```
Se invocan con `supabase.rpc("buscar_similares", { consulta, limite })` /
`supabase.rpc("buscar_por_prefijo", { prefijo, limite })`.

`lib/reglas-qms/tiempos.ts`:
```ts
export function avisoPrecio(d: Designacion): Aviso | null
```
Cubre 5.3 (FPC 2 → `{ tipo: "precio_requiere_lpc", punto: "5.3" }`,
mensaje cita LPC) y 5.2 (FPC 1 con `precioLista === null` →
`{ tipo: "precio_bajo_spq", punto: "5.2" }`, mensaje contiene "SPQ+").
FPC 1 con precio publicado → `null`. Firma sin cambios respecto a la
versión anterior; el comportamiento se amplió.

`lib/reglas-qms/tipos.ts`: `TipoAviso` ahora incluye `"precio_bajo_spq"`
junto a los cuatro valores previos.

## Qué falta / qué NO hace

- No hay test unitario nuevo para la rama 5.2 (directiva del usuario,
  registrada en `progress.md`). El motor de reglas QMS queda sin
  cobertura propia para ese caso — riesgo aceptado y ya documentado a
  nivel de plan, no reintroducido aquí.
- No se tocó `precio_requiere_lpc` (5.3): mismo tipo, mismo punto, mismo
  mensaje que antes.
- No se re-agregaron `inventario_designacion` ni `homologos_origen`
  (deuda consciente, restricción global).
- No se generó ningún dato de prueba nuevo: las comprobaciones del paso 3
  usan designaciones ya sembradas por el Plan 2 (`DEMO-6205-2RSH/C3`,
  `/C4`, `/W64`).

## Cómo verificar

```bash
pnpm db:push
```
Salida: solo pidió confirmar y aplicó `20260804000008_busqueda_y_indices.sql`
(`Finished supabase db push.`). Ninguna otra migración pendiente — el
estado remoto coincidía con lo que este plan supone.

```bash
pnpm tipos
```
Reescribió `lib/supabase/tipos.ts`; diff mínimo, solo la sección
`Functions` (antes `[_ in never]: never`, ahora las dos funciones con la
forma de arriba).

```bash
pnpm verificar
```
Primer intento: 3/4 en verde, "Realtime" falló (`sin evento en 15 s`).
Reintento inmediato, sin tocar código: 4/4 en verde
(`UPDATE propagado en 546 ms · modo recibido "solucion"`). Ver
"Decisiones tomadas y por qué" — no relacionado con esta migración.

Consultas SQL de comprobación (paso 3 del brief), ejecutadas contra
`SUPABASE_DB_URL` con un script temporal de `pg`:

```sql
select * from buscar_similares('6205-2RSH/C', 5);
```
```
designacion          | puntaje
6205-2RSH            | 0.833333
6205-2RSH/C3         | 0.785714
62205-2RSH           | 0.642857
62205-2RSH/C3        | 0.625
DEMO-6205-2RSH/C3    | 0.578947
```
Orden descendente por puntaje, tal como espera el brief.

```sql
select * from buscar_por_prefijo('DEMO-6205-2RSH', 5);
```
```
designacion
DEMO-6205-2RSH/C3
DEMO-6205-2RSH/C4
DEMO-6205-2RSH/W64
```
Las tres completaciones exactas que el brief anticipaba, sembradas por el
Plan 2.

```bash
pnpm test
```
`Test Files 16 passed (16)` · `Tests 187 passed (187)`. Mismo número que
antes de esta tarea — no se agregó ningún test.

```bash
pnpm lint
```
`Checked 65 files in 64ms. No fixes applied. Found 1 info.` — mismo aviso
informativo preexistente de `biome.json` (campo `recommended` deprecado)
que ya reportó la Tarea 1, no relacionado con este cambio.

```bash
./node_modules/.bin/tsc.cmd --noEmit
```
Sin salida — sin errores de tipos.
