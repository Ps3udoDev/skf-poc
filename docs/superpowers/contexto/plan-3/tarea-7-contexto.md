# Tarea 7 — `lib/validador`: la cascada determinista

## Estado
completa

No cites el hash de tu propio commit: el archivo va dentro de ese commit y no
puedes conocerlo al escribirlo. Para ubicar el trabajo basta con
`git log --oneline -- lib/validador`.

## Qué entrega esta tarea

- `lib/validador/normalizar.ts`: `normalizar()` (mayúsculas, sin acentos,
  espacios, guiones, barras ni puntos) y `variantesConfusion()` (variantes por
  pares de caracteres confundibles O/0, I/1, L/1, S/5, B/8, Z/2, G/6, acotadas
  a `MAX_VARIANTES = 32`).
- `lib/validador/tipos.ts`: `Sugerencia`, `ResultadoValidacion`,
  `TipoResultado`, `Estrategia`.
- `lib/validador/sugerencia.ts`: `construirSugerencia()` y
  `construirVarias()` — enriquecen cada candidato con su contexto QMS completo
  (existencias, planta, `evaluarSolicitud`) para que el aviso de MOQ, el
  redondeo a pack quantity y la advertencia de nueva creación lleguen al
  cliente ANTES de enviar la solicitud.
- `lib/validador/cascada.ts`: `validar()`, las estrategias 1–4 en orden
  (exacta → normalización/confusión → prefijo truncado → trigramas), con
  mensaje propio para el truncamiento ("parece incompleta", distinto de "no
  existe") y cita del punto 4.8 en el no encontrado. **Nunca devuelve un
  código que no exista en la base**: todo candidato sale de `obtenerVarias`,
  `completacionesDe` o `similaresA`, y `construirSugerencia` filtra el que la
  base no resuelva.

## Decisiones tomadas y por qué

- **Directiva vigente al ejecutar esta tarea: no se escriben archivos de
  test.** Se omitieron los pasos 1, 2 y 4 del brief
  (`lib/validador/normalizar.test.ts` y su ciclo TDD) y el paso 7
  (`lib/validador/validador.integracion.test.ts`). No existe ningún
  `*.test.ts` en `lib/validador`. En su lugar se verificó con un script
  temporal desechable (`scripts/comprobar-validador.ts`, ejecutado con
  `pnpm exec tsx` contra la base cloud sembrada por el Plan 2 vía
  `.env.local`, y **borrado antes de terminar**) que ejercitó las diez
  comprobaciones de lógica pura del test unitario del brief y los catorce
  casos del test de integración del brief — ver "Cómo verificar". Riesgo
  aceptado explícitamente por la directiva: esta capa queda **sin cobertura
  automatizada propia**; una regresión futura en la cascada no la va a
  atrapar `pnpm test`.

- **Estrategia 2 reimplementada (2a + 2b): el código literal del brief no
  resolvía ningún caso real.** El brief probaba cada variante con
  `obtenerDesignacion(variante)` — un `eq` literal — sobre la forma
  **normalizada**, que ya no tiene separadores. Pero todo el catálogo
  sembrado (casos curados y generador combinatorio,
  `scripts/seed/nomenclatura.ts:213`) lleva guiones y barras:
  `normalizar("demo 6205 2rsh c3")` es `DEMO62052RSHC3`, que jamás hace `eq`
  con `DEMO-6205-2RSH/C3`. Verificado empíricamente: con el código literal,
  el caso del propio test de integración del brief caía a trigramas y salía
  como `similar`, no como `exacta`. Además eran hasta 32 consultas
  secuenciales — inaceptable para un buscador que la escena 2 necesita
  instantáneo. La versión entregada:
  - **2a**: una sola consulta `obtenerVarias(variantes)` (`.in`), que cubre
    la coincidencia literal de cualquier variante y preserva el orden (la
    primera es la de menos cambios).
  - **2b**: dos embudos por trigramas en paralelo
    (`similaresA(normalizada, 12)` y `similaresA(limpia.toUpperCase(), 12)`
    — la segunda se parece más al formato almacenado y rescata confusiones
    que el umbral de trigramas pierde sobre la forma sin separadores) y se
    acepta **únicamente** el candidato cuya forma normalizada es una de las
    variantes. Los trigramas solo acotan el conjunto; la igualdad
    normalizada es la que decide. La regla anti-alucinación se mantiene
    intacta: el código siempre sale de la base.

- **`variantesConfusion` genera por número de cambios (BFS), no posición por
  posición.** Con el orden posicional del brief el tope de 32 se agotaba en
  las primeras posiciones ambiguas: un código real como `DEMO62052R5HC3`
  tiene 7 caracteres confundibles (la O y los dígitos del propio prefijo
  fijo), el generador se detenía en la quinta posición y nunca producía la
  variante con el caracter realmente confundido — verificado en vivo: la
  confusión S/5 no se resolvía. La versión BFS agota primero todas las
  variantes de un cambio (las más probables), luego las de dos, etc. El
  contrato del test del brief se mantiene: incluye el original, propone
  O↔0 / I↔1 / S↔5, sin duplicados, acotada a `MAX_VARIANTES`.

- **El caso pack quantity del brief tenía una expectativa equivocada, no el
  código.** El test de integración del brief esperaba
  `evaluacion.declinada === false` para `validar("DEMO-PACK-20", 25)`. En la
  base sembrada `DEMO-PACK-20` es LCC=PLAN con 600 piezas en PS
  (`scripts/seed/casos-curados.ts:89-99`): con `cantidadEfectiva = 40 ≤ 600`
  el punto 4.1 manda declinar como `declinar_ya_disponible`
  (`lib/reglas-qms/planeacion.ts:34`), así que `declinada` es `true`. Eso es
  comportamiento correcto del motor del Plan 1 sobre los datos del Plan 2,
  no un defecto del validador. Lo que el caso existe para demostrar —el
  ajuste 25 → 40 con aviso `pack_quantity_ajustado` (4.5a)— sí ocurre y es
  lo que se verificó en el script desechable.

## Contrato que exponen estos archivos

`lib/validador/normalizar.ts`:
```ts
function normalizar(texto: string): string
const MAX_VARIANTES = 32
function variantesConfusion(texto: string): string[]
```
`normalizar` colapsa dos capturas del mismo código con distinta puntuación a
la misma cadena (NFD sin marcas, mayúsculas, sin `[\s\-/.]`).
`variantesConfusion` devuelve el original primero, sin duplicados, a lo sumo
`MAX_VARIANTES` entradas, ordenadas por número de cambios ascendente. Ambas
son puras.

`lib/validador/tipos.ts`:
```ts
type TipoResultado = "exacta" | "truncada" | "similar" | "no_encontrada"
type Estrategia = "exacta" | "normalizacion" | "prefijo" | "trigramas" | "llm" | "ninguna"
interface Sugerencia {
  designacion: Designacion; puntaje: number;
  existencias: Existencia[]; planta: Planta | null; evaluacion: EvaluacionQMS;
}
interface ResultadoValidacion {
  consulta: string; tipo: TipoResultado; estrategia: Estrategia;
  mensaje: string; candidatos: Sugerencia[];
}
```
El valor `"llm"` de `Estrategia` ya existe en el tipo aunque ninguna
estrategia lo produce todavía: lo usa la tarea 8.

`lib/validador/sugerencia.ts`:
```ts
function construirSugerencia(codigo: string, cantidad: number, puntaje: number): Promise<Sugerencia | null>
function construirVarias(codigos: readonly { codigo: string; puntaje: number }[], cantidad: number): Promise<Sugerencia[]>
```
`construirSugerencia` devuelve `null` si la base no resuelve `codigo`
(defensa anti-alucinación: el llamador puede filtrar sin romperse).
`construirVarias` resuelve en paralelo y filtra los `null`.

`lib/validador/cascada.ts`:
```ts
const MAX_SUGERENCIAS = 3
const VECINOS_NORMALIZADOS = 12
function validar(consulta: string, cantidad: number): Promise<ResultadoValidacion>
```
Orden: exacta → normalización (2a literal, 2b trigramas + igualdad
normalizada) → prefijo (`truncada`) → trigramas (`similar`) →
`no_encontrada` con cita del 4.8. Consulta vacía o en blanco:
`no_encontrada`/`ninguna` sin tocar la base. Puntajes: 1 exacta, 0.95
normalización, 0.9 prefijo, el de `similarity()` en trigramas.
**Contrato de errores heredado de `lib/fuentes`:** si Supabase falla, estas
funciones **lanzan** (no devuelven `no_encontrada`); un resultado
`no_encontrada` significa siempre "el catálogo no la tiene", nunca "algo
falló". Quien la llame desde un Server Component o Server Action debe dejar
subir la excepción.

## Qué falta / qué NO hace

- **La estrategia 5 (similitud semántica con pgvector) no existe y es una
  decisión, no un olvido**: exige embeddings y a la escala de este catálogo
  no aporta sobre los trigramas. Reservada para la versión 2.
- **La estrategia 6 (respaldo con LLM sobre conjunto cerrado) llega en la
  tarea 8.** El tipo `Estrategia` ya incluye `"llm"` para no tocar el tipo
  después.
- Sin tests automatizados propios (unitarios ni de integración) — directiva
  del usuario para esta fase, ver "Decisiones".
- `validar` no aplica latencia artificial ni métricas: eso es de las capas
  `app/api/mock/*` y `lib/metricas`. El buscador queda fuera de la latencia
  a propósito (escena 2).
- La estrategia 2b depende del umbral de trigramas de pg_trgm (0.3) para el
  embudo: una captura con varios caracteres confundidos A LA VEZ y
  separadores distintos podría quedar fuera del vecindario y caer a las
  estrategias 3/4 con tipo `similar` en vez de `exacta`. Aceptable para el
  POC; la igualdad normalizada sigue garantizando que lo que 2b resuelve es
  correcto.
- `obtenerVarias` omite silenciosamente códigos no encontrados, así que 2a
  no distingue "ninguna variante existe" de "falló la consulta" — este
  último caso no existe porque `obtenerVarias` lanza ante error de Supabase
  (contrato de la tarea 3).

## Cómo verificar

```bash
./node_modules/.bin/tsc.cmd --noEmit
```
Sin salida — sin errores de tipos.

```bash
pnpm lint
```
`Checked 84 files ... Found 1 info.` — solo el aviso informativo
preexistente de `biome.json` (campo `recommended` deprecado) que ya
reportaron las tareas 1, 2 y 3. `biome check --write lib/validador`
reformateó `tipos.ts` y `cascada.ts` (la unión `Estrategia` en una línea y
un encadenado): ajuste de formato esperado del linter, sin cambio de
comportamiento.

```bash
pnpm test
```
`Test Files 16 passed (16)` · `Tests 187 passed (187)`. Mismo número que
antes de esta tarea — no se agregó ningún test nuevo (directiva vigente).

Verificación funcional: script temporal `scripts/comprobar-validador.ts`
(creado, ejecutado con `pnpm exec tsx scripts/comprobar-validador.ts`
contra la base cloud real vía `.env.local`, y borrado antes de terminar).
Las 26 comprobaciones —las 10 del test unitario del brief y los casos del
test de integración del brief, más la confusión S/5 y la consulta vacía—,
todas en verde:

```
OK   - normalizar: mayúsculas y recorte / quita separadores / quita acentos /
       colapsa capturas / vacía sigue vacía
OK   - variantes: incluye el original / O↔0 / I↔1 y S↔5 / sin duplicados /
       acotadas a MAX_VARIANTES=32
OK   - estrategia 1: validar("DEMO-6205-2RSH/C3", 100) => exacta/exacta,
       candidato con evaluación QMS y existencias
OK   - estrategia 2: validar("demo 6205 2rsh c3", 100) => exacta/normalizacion,
       código DEMO-6205-2RSH/C3
OK   - estrategia 2: validar("DEMO-6205-2R5H/C3", 100) => exacta/normalizacion
       (confusión S/5), código DEMO-6205-2RSH/C3
OK   - estrategia 3: validar("DEMO-6205-2RSH", 100) => truncada/prefijo,
       mensaje "incompleta", 3 completaciones reales con ese prefijo
OK   - estrategia 4: validar("DEMO-6250-2RSH/C3", 100) => similar/trigramas,
       3 candidatos
OK   - anti-alucinación: validar("ZZZZ-QQQQ-9999-NO-EXISTE", 10) =>
       no_encontrada, 0 candidatos, mensaje cita el 4.8
OK   - MOQ: validar("DEMO-MOQ-50", 5) => ruta declinar_moq, punto 4.4
OK   - pack quantity: validar("DEMO-PACK-20", 25) => cantidadEfectiva=40 con
       aviso pack_quantity_ajustado (ruta declinar_ya_disponible por 4.1:
       PLAN con 600 en stock — ver "Decisiones")
OK   - nueva creación: validar("DEMO-NUEVA", 30) => semanasExtraTE=4
OK   - consulta vacía => no_encontrada/ninguna sin consultar la base
===========================
TODAS LAS COMPROBACIONES PASARON
```

Nota: con el código literal del brief, tres de estas comprobaciones
fallaban (las dos de la estrategia 2 y la expectativa `declinada === false`
del pack quantity); los ajustes que las resuelven están descritos en
"Decisiones". No fue necesario `pnpm seed`: los casos curados del Plan 2 ya
estaban presentes.
