# Tarea 13 — Chatbot

## Estado
completa

Para ubicar el trabajo usa `git log --oneline -- lib/ai app/api/chat components/chat`.

## Qué entrega esta tarea

Entrega un panel de chat compartido por cliente y operador, streaming por AI SDK
v7, cinco herramientas contra los mismos motores del portal, prompts separados,
recuperación del procedimiento QMS, límite de conversación y respaldo
pregrabado para el guion.

## Decisiones tomadas y por qué

- La skill `vercel:ai-sdk` exigida por el plan no estaba instalada. Se usaron
  directamente los tipos y la documentación local de `ai@7.0.48` y
  `@ai-sdk/react@4.0.51`: `DefaultChatTransport`, `sendMessage`,
  `convertToModelMessages`, `streamText`, `toUIMessageStream` y
  `createUIMessageStreamResponse`.
- `HERRAMIENTAS(perfil)` crea las mismas cinco herramientas para ambos perfiles
  y solo filtra el resultado sensible de cotización en modo cliente.
- `buscarDesignacion` también devuelve TE y homólogos de cada candidato; así la
  tarjeta del chat puede mostrar cifras provenientes de motores, no del modelo.
- Se reforzó el prompt después del ensayo real: si se pregunta por TE, precio o
  disponibilidad, el modelo debe comunicar cada dato devuelto aunque la regla
  4.1 diga que no hace falta cotización. También se prohíbe ofrecer acciones sin
  herramienta.
- El respaldo usa el mismo protocolo de UI streaming, por lo que `useChat` no
  necesita una ruta ni un renderer alternativos.
- No se crearon ni ejecutaron tests Vitest por directiva explícita del usuario.

## Contrato que exponen estos archivos

```ts
const INSTRUCCIONES_CLIENTE: string;
const INSTRUCCIONES_OPERADOR: string;
const FRAGMENTOS_QMS: readonly FragmentoQMS[];
function buscarFragmento(consulta: string, limite?: number): FragmentoQMS[];
function HERRAMIENTAS(perfil: "cliente" | "operador"): ToolSet;
function respuestaPregrabada(pregunta: string): string | null;
function dentroDelLimite(mensajes: number): boolean;
function limiteDeMensajes(): number;
function PanelChat(props: { perfil: "cliente" | "operador" }): JSX.Element;
```

`POST /api/chat` recibe `{ messages: UIMessage[], perfil: "cliente" |
"operador" }` y devuelve un UI message stream. Con `CHAT_RESPALDO=true` o sin
`AI_GATEWAY_API_KEY`, responde desde el respaldo sin llamar al modelo.

## Qué cubre el respaldo pregrabado

- TE, precio y disponibilidad de `DEMO-6205-2RSH/C3` para 200 piezas.
- Consulta de equivalente sellado por ambos lados.
- Consulta de estado por número de cotización: informa honestamente que sin red
  no puede leer un estado vigente y ofrece CSR.
- Regla para solicitudes de productos planeados con stock suficiente (4.1), sin
  inventar filas de bandeja.

Fuera de esas cuatro intenciones devuelve `null`; la ruta muestra que el
asistente no está disponible y ofrece buscador o CSR.

## Qué falta / qué NO hace

- El respaldo no inventa el estado de una cotización ni una lista actual de
  solicitudes.
- El chatbot no crea pedidos ni solicitudes: no existe herramienta autorizada
  para esas escrituras.
- La pregunta del operador sobre “qué solicitudes de hoy” puede explicar el
  punto 4.1, pero listar y filtrar la bandeja completa pertenece al Plan 4.
- No se verificó visualmente el drawer por indisponibilidad del conector de
  navegador; sí se verificó ruta, streaming, tool calling y build.

## Cómo verificar

```powershell
.\node_modules\.bin\tsc.cmd --noEmit
pnpm.cmd lint
pnpm.cmd build
```

Esperado: sin errores y `/api/chat` dinámica.

Se envió por HTTP la pregunta:

`Cuanto tarda el DEMO-6205-2RSH/C3 si pido 200 piezas?`

Resultado real: HTTP `200`, `text/event-stream`; `buscarDesignacion` devolvió
precio USD 250, PS 1200, SL 300 y TE estimado 8–17,5 semanas basado en 39 casos
de familia. La ruta emitió texto incremental y terminó con `[DONE]`.
