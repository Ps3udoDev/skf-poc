# Tarea 8 — Estrategia 6: respaldo con LLM sobre conjunto cerrado

## Estado
completa

No cites el hash de tu propio commit: el archivo va dentro de ese commit y no
puedes conocerlo al escribirlo. Para ubicar el trabajo basta con
`git log --oneline -- lib/ai lib/validador`.

## Qué entrega esta tarea

- `lib/ai/gateway.ts`: configuración del modelo enrutado por Vercel AI
  Gateway (`MODELO_CHAT` desde `CHAT_MODEL` de `.env.local`, con valor por
  defecto, y `modeloConfigurado()` para degradar sin romper cuando no hay
  clave). Marcado `server-only`: la clave del Gateway nunca sale del servidor.
- `lib/validador/respaldo-llm.ts`: `elegirDelConjunto()`, la estrategia 6.
  Recibe el texto del cliente y un conjunto **cerrado** de candidatos que ya
  salieron de la base, y el modelo **elige uno o ninguno** — nunca genera una
  designación. Doble barrera anti-alucinación: el esquema Zod restringe la
  respuesta a un `enum` construido con el propio conjunto (barrera 1) y la
  salida se vuelve a validar contra ese conjunto (barrera 2).
- `lib/validador/cascada.ts`: la estrategia 6 queda enganchada antes del
  `no_encontrada`. Si las cuatro estrategias deterministas fallan, se pide un
  vecindario amplio (`similaresA(normalizada, 12)`) y el modelo elige sobre
  él; el resultado sale como `tipo: "similar"`, `estrategia: "llm"`, con la
  explicación del modelo como mensaje y un solo candidato enriquecido con su
  contexto QMS completo (`construirSugerencia`).

## Decisiones tomadas y por qué

- **Directiva vigente: no se escriben archivos de test.** Se omitieron los
  pasos 2, 3 y 5 del brief (`lib/validador/respaldo-llm.test.ts` y su ciclo
  TDD). En su lugar se verificó con un script temporal desechable
  (`scripts/comprobar-respaldo-llm.mts`, ejecutado con
  `NODE_OPTIONS="--conditions=react-server" pnpm exec tsx`, y **borrado antes
  de terminar**) que ejercitó los cinco comportamientos del test del brief
  con el modelo simulado del propio AI SDK (`MockLanguageModelV3` de
  `ai/test`, sin red), más la llamada real al Gateway y la cascada completa —
  ver "Cómo verificar". Riesgo aceptado explícitamente por la directiva: esta
  capa queda **sin cobertura automatizada propia**.

- **La emisión de métricas del brief quedó fuera: `lib/metricas/emitir` no
  existe todavía.** El brief (paso 6) importa `emitirEvento` de
  `@/lib/metricas/emitir` para registrar un evento `llamada_modelo` cuando la
  estrategia 6 resuelve. Ese módulo pertenece a otra tarea del plan y aún no
  está en el repo al ejecutarse esta. Importarlo habría roto `tsc`, y crearlo
  aquí habría invadido la tarea de otro agente en paralelo. Se dejó un
  comentario `TODO(tarea 6)` en `lib/validador/cascada.ts` marcando el punto
  exacto de enganche. Cuando `lib/metricas/emitir` exista, basta añadir el
  bloque de `emitirEvento` del brief en ese lugar.

- **API de AI SDK v7 verificada contra el paquete instalado (`ai@7.0.48`),
  no escrita de memoria.** La skill `vercel:ai-sdk` que el brief manda cargar
  no está instalada en este entorno; en su lugar se inspeccionaron los tipos
  de `node_modules/ai` y `@ai-sdk/gateway`. Confirmado:
  - `generateObject` se importa de `ai` y acepta `schema` (Zod v4), `system`
    (alias deprecado de `instructions`, aún soportado) y `prompt`.
  - El modelo se pasa como cadena `"proveedor/modelo"`: el tipo
    `LanguageModel` incluye `GatewayModelId` (unión de literales que sí
    contiene `"anthropic/claude-sonnet-5"`), y sin proveedor global
    registrado la cadena la resuelve el proveedor por defecto, que **es** el
    Vercel AI Gateway (lee `AI_GATEWAY_API_KEY` del entorno).
  - El mock oficial vive en la subruta `ai/test` (`MockLanguageModelV3` /
    `MockLanguageModelV4`).

- **Un cast sobre el código literal del brief.** `generateObject` exige
  `model: LanguageModel`, pero el parámetro `modelo` del brief es `unknown` y
  `MODELO_CHAT` es `string`; la expresión `modelo ?? MODELO_CHAT` no es
  asignable sin cast. Se usó `(modelo ?? MODELO_CHAT) as LanguageModel`
  importando el tipo desde `ai`. Es el mismo espíritu de los casts que el
  plan ya acepta en `lib/fuentes`: el contrato público se mantiene igual al
  del brief (`modelo?: unknown`).

- **La consulta que activa la estrategia 6 en vivo:**
  `validar("6 2 0 5 2 R S H 3 C", 100)` → `similar/llm`, candidato
  `6205-2RSH/C3`. Un espacio entre cada carácter deja la captura cruda bajo
  el umbral de pg_trgm (0.3), así que la estrategia 4 no resuelve; la
  transposición `C3 → 3C` impide que la estrategia 2b la acepte (no es una
  variante de confusión ni igualdad normalizada); y la forma normalizada
  `62052RSH3C` sí pasa el umbral para poblar el conjunto cerrado de 10
  candidatos. El modelo eligió `6205-2RSH/C3` y explicó por qué en español.
  Consejo derivado para la demo: una consulta puramente semántica
  ("rodamiento rígido de bolas 25 por 52 por 15 con sellos") **no** activa la
  estrategia 6, porque ni siquiera la forma normalizada supera el umbral de
  trigramas y el conjunto llega vacío (por diseño: sin conjunto cerrado no se
  llama al modelo).

## Contrato que exponen estos archivos

`lib/ai/gateway.ts`:
```ts
const MODELO_CHAT: string
function modeloConfigurado(): boolean
```
`MODELO_CHAT` es `process.env.CHAT_MODEL ?? "anthropic/claude-sonnet-5"`.
`modeloConfigurado()` es `true` si `AI_GATEWAY_API_KEY` está presente. Ambos
viven en un módulo `server-only`: importarlos desde un Client Component rompe
la compilación, a propósito.

`lib/validador/respaldo-llm.ts`:
```ts
function elegirDelConjunto(
  consulta: string,
  candidatos: readonly string[],
  modelo?: unknown,
): Promise<{ codigo: string; explicacion: string } | null>
```
Devuelve `null` —nunca lanza— en todos estos casos: conjunto vacío (no llama
al modelo), Gateway sin configurar (y sin `modelo` explícito), el modelo
declina (`codigo: null`), el modelo devuelve un código fuera del conjunto
(el esquema lo rechaza antes de parsear; la validación posterior es la
segunda barrera) y cualquier fallo del Gateway (se registra con
`console.error` y se degrada). El parámetro `modelo` existe para inyectar un
modelo simulado en pruebas; en producción se omite y se usa `MODELO_CHAT`.

`lib/validador/cascada.ts` (firma sin cambios, comportamiento nuevo):
```ts
function validar(consulta: string, cantidad: number): Promise<ResultadoValidacion>
```
Orden ahora: exacta → normalización → prefijo → trigramas → **llm** →
`no_encontrada`. La rama `llm` devuelve `{ tipo: "similar", estrategia: "llm",
mensaje: <explicación del modelo>, candidatos: [sugerencia] }` con puntaje
fijo `0.5`. Si el Gateway no está configurado o falla, la cascada degrada a
`no_encontrada` exactamente como antes — el validador determinista no depende
del modelo para funcionar. **Nota de restricción:** `cascada.ts` ahora
importa `respaldo-llm.ts` (`server-only`), así que `validar()` queda
restringido al servidor; solo lo invocan Server Actions y rutas, que es donde
ya se ejecutaba.

## Qué falta / qué NO hace

- **El evento `llamada_modelo` en `eventos_demo` no se emite todavía**:
  falta `lib/metricas/emitir` (otra tarea). El punto de enganche está marcado
  con `TODO(tarea 6)` en `cascada.ts`.
- Sin tests automatizados propios — directiva del usuario, ver "Decisiones".
- La estrategia 5 (similitud semántica con pgvector) sigue sin existir, por
  decisión del plan.
- `elegirDelConjunto` no reintenta ni fija `temperature` ni límites de
  tokens: valores por defecto del AI SDK. Si el Gateway tarda demasiado en
  vivo, el buscador espera; no hay `AbortSignal` propio (el brief no lo pide).
- El texto libre del usuario se envía al Gateway dentro del prompt. Es un
  dato de consulta de catálogo, no información sensible, pero conviene
  mencionarlo en la demo si preguntan qué sale del perímetro.

## Cómo verificar

```bash
./node_modules/.bin/tsc.cmd --noEmit
```
Sin salida — sin errores de tipos. (Al inicio de esta tarea había un error en
`lib/sesion-demo/acciones.ts`, archivo de otra tarea en curso en paralelo; el
agente correspondiente lo corrigió mientras tanto. Los archivos de esta tarea
nunca tuvieron errores de tipos.)

```bash
pnpm lint
```
`Checked 95 files ... Found 1 info.` — solo el aviso informativo
preexistente de `biome.json` (campo `recommended` deprecado), igual que en
las tareas anteriores.

```bash
pnpm test
```
`Test Files 16 passed (16)` · `Tests 187 passed (187)`. Mismo número que
antes de esta tarea — no se agregó ningún test nuevo (directiva vigente). Los
tests existentes no tocan la cascada (su cobertura era de integración y se
omitió en la tarea 7 por la misma directiva).

Verificación funcional: script temporal `scripts/comprobar-respaldo-llm.mts`
(creado, ejecutado y **borrado antes de terminar**). Requiere la condición
`react-server` para que `server-only` resuelva a su archivo vacío fuera de
Next:

```bash
NODE_OPTIONS="--conditions=react-server" pnpm exec tsx scripts/comprobar-respaldo-llm.mts
```

Salida obtenida (con `AI_GATEWAY_API_KEY` y `CHAT_MODEL` presentes en
`.env.local`):

```
OK   - elección dentro del conjunto (recibido: DEMO-6205-2RSH/C3)
OK   - descarta un código fuera del conjunto (barrera 2)
OK   - null cuando el modelo declina elegir
OK   - no llama al modelo con el conjunto vacío
OK   - null si el modelo falla, sin propagar el error
MODELO_CHAT = anthropic/claude-sonnet-5
modeloConfigurado() = true
Respuesta en vivo del Gateway: { codigo: 'DEMO-6205-2RSH/C3', explicacion: '…' }
OK   - el Gateway elige DEMO-6205-2RSH/C3 en vivo
validar("6 2 0 5 2 R S H 3 C") => tipo=similar estrategia=llm candidatos=1
  mensaje (explicación del modelo): El usuario escribió '6 2 0 5 2 R S H 3 C'
  que, al eliminar espacios, … coincide con la designación 6205-2RSH/C3 …
OK   - la estrategia 6 devolvió similar/llm con 1 candidato (6205-2RSH/C3)
OK   - regresión: "DEMO-6250-2RSH/C3" sigue en trigramas
OK   - regresión: caso inexistente no se rompe (no_encontrada/ninguna)
TODAS LAS COMPROBACIONES PASARON
```

Las cinco primeras comprobaciones usan `MockLanguageModelV3` de `ai/test`
(sin red) y reproducen los cinco tests del brief. La sexta es la llamada real
al Gateway con el modelo configurado. Las dos últimas confirman que la
estrategia 6 no desplaza a las deterministas: los casos que antes resolvían
por trigramas siguen resolviendo por trigramas, y el caso inexistente sigue
siendo `no_encontrada`.
