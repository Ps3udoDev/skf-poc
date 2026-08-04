# Tarea 9 — `lib/estimador`: tiempo de entrega con incertidumbre honesta

## Estado
completa

No cites el hash de tu propio commit: el archivo va dentro de ese commit y no
puedes conocerlo al escribirlo. Para ubicar el trabajo basta con
`git log --oneline -- lib/estimador components/estimador`.

## Qué entrega esta tarea

- `lib/estimador/calculo.ts`: motor puro de estimación de tiempo de entrega —
  percentiles por interpolación lineal, mediana robusta, rango por percentiles
  25/75, nivel de confianza por tamaño y origen de la muestra, y ajustes del
  procedimiento (multiplicador de desempeño de planta y semanas extra del punto
  4.9). Todo redondeado a medias semanas: un TE de "5.37 semanas" es precisión
  que el dato no sostiene.
- `lib/estimador/estimador.ts`: `estimarTE(codigo, cantidad)`, que encadena el
  histórico de la designación y, si no alcanza, el de su familia; nunca inventa
  un rango (devuelve `null` si no hay casos de ninguna de las dos).
- `components/estimador/estimacion-te.tsx`: `<EstimacionTE>`, el **único**
  punto de render de una estimación en toda la aplicación, con los tres
  elementos obligatorios (rango, base, compromiso de confirmación) no
  configurables.

## Decisiones tomadas y por qué

- **Directiva vigente al ejecutar esta tarea: no se escriben archivos de
  test.** Se omitieron los pasos 1, 2, 4 (test unitario de `calculo.ts`, verlo
  fallar, verlo pasar) y el paso 6 (`estimador.integracion.test.ts`) del brief.
  No existe `lib/estimador/calculo.test.ts` ni
  `lib/estimador/estimador.integracion.test.ts`. En su lugar se verificó con
  un script temporal desechable (`scripts/comprobar-estimador.ts`, ejecutado
  con `pnpm exec tsx` contra la base cloud sembrada del Plan 2 vía
  `.env.local`, y **borrado antes de terminar**) que reprodujo los 16 casos del
  `calculo.test.ts` del brief y los 4 casos del test de integración, todos en
  verde (ver "Cómo verificar"). Esto deja el estimador **sin cobertura
  automatizada propia**: riesgo aceptado explícitamente por la directiva, no
  descubierto aquí. Ninguna regresión futura en los percentiles, el redondeo a
  medias semanas o el encadenamiento designación → familia la va a atrapar
  `pnpm test`.

- **Los dos imports del brief desde `./calculo` se fusionaron en uno solo.**
  El brief escribe `estimador.ts` con dos sentencias `import` separadas desde
  el mismo módulo (`import { ... } from "./calculo"` y `import {
  CASOS_CONFIANZA_MEDIA } from "./calculo"`); Biome las marca como fusibles.
  Se escribió una sola sentencia con los cuatro nombres. Sin cambio de
  comportamiento.

- **`<EstimacionTE>` es el único lugar de la aplicación donde se renderiza una
  estimación, y ninguna pantalla debe formatear el rango por su cuenta.**
  Motivo: presentar una estimación como tiempo confirmado sería un problema
  comercial serio para SKF frente a sus clientes. Si el rango, la base ("basado
  en N cotizaciones previas de…") y el compromiso de confirmación son
  configurables o se maquetan por pantalla, tarde o temprano una pantalla los
  omite por descuido. Al concentrar el render en un solo componente sin props
  para ocultarlos, la honestidad de la estimación es una propiedad del sistema,
  no de la disciplina de cada pantalla. El componente tampoco acepta
  `className` ni variantes precisamente para que no se le pueda quitar piezas.

- **Las clases Tailwind del brief (`border-borde`, `bg-fondo-sutil`,
  `text-texto-tenue`, `text-texto`) existen en el tema** (`app/globals.css`,
  bloque `@theme inline`) y ya las usan los componentes de `components/marco`.
  No hubo que adaptar nada de la presentación.

## Contrato que exponen estos archivos

`lib/estimador/calculo.ts` (puro, sin dependencias externas):
```ts
type BaseEstimacion = "designacion" | "familia" | "global";
type Confianza = "alta" | "media" | "baja";

interface Estimacion {
  semanasMin: number;
  mediana: number;
  semanasMax: number;
  casos: number;
  base: BaseEstimacion;
  confianza: Confianza;
}

const CASOS_CONFIANZA_ALTA = 30;
const CASOS_CONFIANZA_MEDIA = 8;

function percentil(valores: readonly number[], p: number): number;
function estimarDesdeCasos(casos: readonly number[], base: BaseEstimacion): Estimacion | null;
function ajustarPorProcedimiento(
  estimacion: Estimacion,
  ajustes: { desempenoTe: number; semanasExtra: number },
): Estimacion;
```
Notas para quien lo consuma:
- `percentil` no requiere la lista ordenada (la ordena internamente); devuelve
  `NaN` con lista vacía.
- `estimarDesdeCasos` devuelve `null` sin casos: jamás se inventa un rango sin
  base. Todos los valores salen redondeados a medias semanas.
- La confianza es `"alta"` solo con base `"designacion"` y ≥ 30 casos; base
  `"familia"` da como máximo `"media"` por muchos casos que haya (la
  incertidumbre no está en el tamaño de la muestra sino en que la muestra no es
  de este producto); base `"global"` da siempre `"baja"`.
- `ajustarPorProcedimiento` multiplica primero por `desempenoTe` y **después**
  suma `semanasExtra` (las 4 semanas del punto 4.9 son trámite administrativo,
  no fabricación, así que el desempeño de la planta no las afecta). Conserva
  `base`, `casos` y `confianza`.

`lib/estimador/estimador.ts` (consulta la base a través de `lib/fuentes`):
```ts
function estimarTE(codigo: string, cantidad: number): Promise<Estimacion | null>;
```
Devuelve `null` si la designación no existe en el catálogo o si no hay
histórico suficiente ni propio ni de la familia — la pantalla debe decir que no
hay base histórica suficiente, no mostrar nada parecido a un rango. Escala hacia
atrás: histórico propio; si tiene menos de `CASOS_CONFIANZA_MEDIA` (8) casos,
también consulta el de la familia y lo prefiere **solo si aporta más casos que
el propio**. Aplica `desempenoTe` de la planta de la designación (1 si la
planta no existe) y `semanasExtraTE` de `evaluarSolicitud`. Es determinista:
dos llamadas con los mismos argumentos devuelven el mismo objeto. Hereda el
contrato de errores de `lib/fuentes`: ante un fallo de Supabase **lanza**, un
`null` solo significa "no hay base para estimar".

`components/estimador/estimacion-te.tsx`:
```tsx
function EstimacionTE(props: {
  estimacion: Estimacion;
  horaConfirmacion?: string;
}): JSX.Element;
```
Renderiza siempre, sin opción de omitirlos: (1) el rango `semanasMin a
semanasMax semanas` con la insignia de confianza, (2) la base ("Basado en N
cotizaciones previas de…"), (3) el compromiso de confirmación — con
`horaConfirmacion` menciona el restablecimiento de la conexión con la planta a
esa hora; sin ella, la confirmación al procesar la cotización. **Ninguna
pantalla debe formatear una `Estimacion` por su cuenta**: usar este componente
es la única vía.

## Qué falta / qué NO hace

- Sin tests automatizados propios (unitarios ni de integración) — directiva del
  usuario para esta fase, ver "Decisiones". El brief pedía
  `lib/estimador/calculo.test.ts` (16 tests) y
  `lib/estimador/estimador.integracion.test.ts` (4 tests); ambos omitidos y
  verificados por script desechable.
- No usa la base `"global"` (histórico del catálogo entero): el tipo la admite y
  el componente tiene su texto, pero `estimarTE` solo escala designación →
  familia, tal como el brief.
- `estimarTE` no decide si la solicitud se cotiza o se declina: solo aplica el
  `semanasExtraTE` que `evaluarSolicitud` calcule. Una solicitud declinada con
  histórico seguiría devolviendo una estimación; la decisión de mostrarla o no
  es de la pantalla que orquesta (el brief no pide filtrarla aquí).
- `<EstimacionTE>` es un componente de servidor sin estado: no formatea fechas,
  no traduce `horaConfirmacion` (la recibe ya en texto) y no tiene modo
  compacto ni variante.

## Cómo verificar

```bash
./node_modules/.bin/tsc.cmd --noEmit
```
Sin salida — sin errores de tipos.

```bash
pnpm lint
```
Limpio en los archivos de esta tarea (`biome check lib/estimador
components/estimador` → `Checked 3 files. No fixes applied.`). Al ejecutarse
sobre todo el repo pueden aparecer avisos en archivos de **otras tareas en
paralelo** (p. ej. `lib/validador/tipos.ts`, `scripts/comprobar-validador.ts`);
no son de esta tarea y no se tocaron. El aviso informativo de `biome.json`
sobre `recommended` es preexistente.

```bash
pnpm test
```
`Test Files 16 passed (16)` · `Tests 187 passed (187)`. Mismo número que antes
de esta tarea — no se agregó ningún test nuevo (directiva vigente).

Script temporal `scripts/comprobar-estimador.ts` (creado, ejecutado con
`pnpm exec tsx scripts/comprobar-estimador.ts` contra la base cloud real vía
`.env.local`, y **borrado antes de cerrar la tarea**). Los 16 casos del
`calculo.test.ts` del brief más los 4 del test de integración, todos en verde:

```
== Cálculo puro (equivale al calculo.test.ts del brief) ==
  OK   - mediana de lista impar es el elemento central
  OK   - mediana de lista par interpola
  OK   - extremos devuelven mínimo y máximo
  OK   - lista de un elemento devuelve ese elemento
  OK   - sin casos no se inventa estimación
  OK   - la mediana no se arrastra por un caso extremo
  OK   - el rango sale de los percentiles 25 y 75 (4 < 5.5 < 7.5)
  OK   - registra cuántos casos sustentan la estimación
  OK   - confianza alta con muchos casos propios
  OK   - confianza media con pocos casos propios
  OK   - confianza baja con muy pocos casos
  OK   - la familia nunca da confianza alta
  OK   - el desempeño de la planta multiplica el rango (mediana=6)
  OK   - las 4 semanas de nueva creación se suman después del multiplicador (mediana=8, min=8)
  OK   - el ajuste conserva la base y el número de casos
  OK   - redondea a medias semanas (mediana=5.5)
  OK   - nunca produce un rango invertido (4 <= 4.5 <= 5)

== Contra la base sembrada (equivale al estimador.integracion.test.ts del brief) ==
  OK   - caso curado con rango coherente (8–17.5 sem, mediana 12.5, 39 casos, base=familia, confianza=media)
  OK   - la nueva creación arrastra sus 4 semanas del punto 4.9 (min=10.5, base=familia)
  OK   - una designación inexistente no produce estimación
  OK   - dos llamadas seguidas devuelven exactamente lo mismo ({"semanasMin":9,"mediana":14.5,"semanasMax":20,"casos":39,"base":"familia","confianza":"media"})

===========================
TODAS LAS COMPROBACIONES PASARON
```

No fue necesario `pnpm seed`: los casos curados del Plan 2
(`DEMO-6205-2RSH/C3`, `DEMO-NUEVA`, `DEMO-VENTANA`) ya estaban sembrados.
