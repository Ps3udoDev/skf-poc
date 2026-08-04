# Tarea 10 — Los mocks de los sistemas externos

## Estado
completa

## Corrección posterior — escena 4

- El comportamiento del sistema externo de inventario quedó centralizado en
  `lib/mock/inventario.ts`. Tanto `GET /api/mock/inventario` como el portal en
  modo `hoy` consumen ahora la misma función; así no pueden divergir cuando una
  planta entra en ventana.
- Para `DEMO-VENTANA` con `P103` en mantenimiento, la consulta externa devuelve
  `planta_en_ventana` y la ruta HTTP conserva su respuesta 503.
- La corrección se verificó funcionalmente contra la sesión demo y después se
  restauraron su modo, reloj, overrides y escenario originales.

No cites el hash de tu propio commit: el archivo va dentro de ese commit y no
puedes conocerlo al escribirlo. Para ubicar el trabajo basta con
`git log --oneline -- lib/mock app/api/mock`.

## Qué entrega esta tarea

- `lib/mock/latencia.ts`: la latencia artificial de 200–800 ms que simula el
  tiempo de respuesta de un sistema corporativo externo.
- Cuatro route handlers bajo `app/api/mock/` que envuelven `lib/fuentes` con el
  comportamiento de un sistema externo: `inventario` (disponibilidad por
  almacén, **falla con 503 cuando su planta está en ventana** — el mecanismo de
  la escena 4), `wcl` (precio de lista, precio neto con descuento del cliente y
  estimación de TE), `pinq` (acuse de consulta de soporte a planta, con el
  canal según el segmento del punto 4.3) y `spq` (alta y consulta de
  solicitudes, preclasificadas con `evaluarSolicitud`).

## Decisiones tomadas y por qué

- **Directiva vigente al ejecutar esta tarea: no se escriben archivos de
  test.** Se omitieron los pasos 1, 2 y 4 del brief (`lib/mock/latencia.test.ts`
  y el ciclo TDD "ver el fallo / ver pasar"). No existe
  `lib/mock/latencia.test.ts`. Los 3 casos del test del brief (rango 200–800,
  constantes exactas, sin espera bajo Vitest) se verificaron en el script
  desechable — incluida la espera real fuera de Vitest, medida en 427 ms.
  Riesgo aceptado explícitamente por la directiva: la latencia queda sin
  cobertura automatizada; los casos del brief están listos para portarse a
  Vitest tal cual cuando se retomen los tests.

- **Qué rutas llevan latencia y cuáles no (lo pide el paso 8 del brief):**
  las cuatro rutas de `app/api/mock/*` llevan 200–800 ms porque simulan
  sistemas corporativos (inventario de planta, WCL, PinQ, SPQ+). **El buscador
  y el validador NUNCA llevan latencia**: en pantalla tiene que verse que los
  sistemas corporativos tardan y que la capa complementaria responde al
  instante; meterle latencia al buscador destruiría el momento de la escena 2.
  Es lo primero que alguien "arreglaría" por consistencia sin saber que rompe
  la narrativa — no lo hagas.

- **El paso 7 del brief (curl contra `pnpm dev`) no se ejecutó tal cual**: el
  orquestador prohíbe levantar `pnpm dev`/`pnpm build` en esta ola (hay otro
  agente sobre el mismo repo). Se sustituyó por un script temporal desechable
  (`scripts/comprobar-mocks.mts`, ejecutado con
  `NODE_OPTIONS="--conditions=react-server" pnpm exec tsx` contra la base cloud
  vía `.env.local`, **borrado antes de terminar**) que importa los route
  handlers y los invoca directamente como funciones con `Request` sintéticas.
  La condición `react-server` es necesaria porque el mock de SPQ+ importa
  `clienteAdmin`, marcado con `server-only`. La extensión `.mts` es necesaria
  porque `tsx` compila `.ts` como CJS y el script usa `await` de primer nivel.
  Tiempos observados (latencia artificial + consulta real): inventario 1177 ms,
  WCL 1266 ms, PinQ 966 ms, alta SPQ+ 632 ms — todos dentro de lo esperado
  (200–800 ms de latencia más la consulta a Supabase cloud).

- **Desviación acotada a "toda consulta a datos vía `lib/fuentes`":** dos
  accesos no pasan por la capa de fuentes porque la Tarea 3 no expone función
  para ellos y crearla modificaría archivos ajenos a esta tarea:
  1. `wcl/route.ts` lee `clientes.descuento` con `clienteLectura` (clave
     anónima) cuando se pasa `clienteId`.
  2. `spq/route.ts` lee y escribe `solicitudes`: la escritura va con
     `clienteAdmin` (`service_role`, como toda escritura del POC) y la consulta
     por número con `clienteLectura`.
  Ambas tablas son de operación del demo, no del catálogo; el espíritu de la
  regla (que la sustitución de WCL/SPQ+/PinQ reales en Fase 3 sea cambiar una
  implementación) se mantiene: toda la lógica de estas rutas está aquí, en el
  envoltorio, no regada por las pantallas.

- **`numeroDeSolicitud()` se duplica a propósito** en `spq/route.ts` (la misma
  función de 4 líneas que la Tarea 11 define en
  `app/(portal)/portal/acciones.ts`): esa acción es de otra tarea de la misma
  ola y puede no existir al ejecutarse esta; importar una Server Action
  (`"use server"`) desde un route handler tampoco es deseable. El formato
  `AAAAQ#####` lo exige el CHECK `solicitudes_numero_formato` de la migración
  `000005`.

- **El mock de inventario es literal al brief**, sin ningún ajuste. El resto
  sigue su esqueleto: `dynamic = "force-dynamic"`, validación de parámetros
  (400), `await latenciaArtificial()`, 404 de dominio, y solo entonces la
  respuesta.

- **`avisoPrecio` solo se devuelve cuando `precioLista` es nulo** (aunque la
  función de `lib/reglas-qms` también devolvería el aviso 5.3 para un FPC 2 con
  precio): el brief pide el aviso "en vez de un precio inventado", y con precio
  publicado el aviso no aplica a esta respuesta.

## Contrato que exponen estos archivos

`lib/mock/latencia.ts`:
```ts
const MS_LATENCIA_MIN: 200
const MS_LATENCIA_MAX: 800
function calcularLatencia(): number                 // entero uniforme en [200, 800]
function latenciaArtificial(): Promise<void>        // no espera bajo Vitest (NODE_ENV=test o VITEST)
```

Cuatro rutas HTTP, todas `force-dynamic`, todas con latencia artificial:

`GET /api/mock/inventario?designacion=<código>`
- 400 sin `designacion`; 404 si no existe o su planta no existe.
- **503 con `{ error, pdiv, estado: "ventana" }` cuando la planta de la
  designación está en ventana** (calendario + overrides de la sesión, a la hora
  simulada). Es el único mock que falla.
- 200: `{ designacion, pdiv, estado, existencias: Existencia[] }` (orden
  PS → SL → XX, de `existenciasDe`).

`GET /api/mock/wcl?designacion=<código>&cantidad=<n>[&clienteId=<id>]`
- 400 sin `designacion` o con `cantidad` no entera positiva; 404 si no existe.
- 200: `{ designacion, cantidad, precioLista, precioNeto, avisoPrecio, estimacion }`.
  `precioNeto` es `precioLista × (1 − descuento)` redondeado a centavos, solo si
  se pasa `clienteId` y el cliente existe; `null` en cualquier otro caso.
  `avisoPrecio` es el `Aviso` del punto 5.2/5.3 cuando `precioLista` es nulo
  (nunca un precio inventado); `null` cuando hay precio. `estimacion` es la
  `Estimacion` de `estimarTE` o `null` si no hay base histórica.

`GET /api/mock/pinq?designacion=<código>&cantidad=<n>`
- 400 / 404 como WCL (`cantidad` es obligatoria).
- 200: `{ numeroPinq, designacion, cantidad, pdiv, planta, canal, destino,
  registradaEn }`. `canal` es `"PT Inquery"` con destino al Planner de la PDIV
  para `segmento = "power_transmission"`, y `"OPI/PINQ"` con destino a la
  fábrica para el resto (punto 4.3). `numeroPinq` es simulado
  (`PINQ-<año>-<5 dígitos>`), solo verosímil en pantalla: no se persiste.

`POST /api/mock/spq` — cuerpo JSON `{ designacion: string, cantidad: number }`
- 400 con cuerpo inválido o campos faltantes.
- 201: da de alta en `solicitudes` con `service_role`, preclasificada con
  `evaluarSolicitud` (`clasificacion_qms` = ruta, `punto_qms` = punto).
  Responde `{ numero, designacion, cantidad, clasificacionQms, puntoQms,
  declinada, mensaje }`. El `numero` cumple el CHECK `AAAAQ#####`.

`GET /api/mock/spq?numero=<AAAAQ#####>`
- 400 sin `numero`; 404 si no existe.
- 200: `{ numero, designacion, cantidad, clasificacionQms, puntoQms, estado,
  resultado, motivoDeclinado, creadaEn }`, donde `estado` es `"en_bandeja"` o
  `"atendida"` según `atendida_en`.

Contrato de errores heredado: las consultas de `lib/fuentes` **lanzan** ante un
fallo de Supabase (Tarea 3); las rutas no lo atrapan, así que un fallo de
infraestructura sale como 500 de Next, nunca como un 404 falso.

## Qué falta / qué NO hace

- Sin tests automatizados propios — directiva del usuario, ver "Decisiones".
- La verificación con `curl` contra el servidor levantado (paso 7 del brief)
  queda pendiente de la primera puesta en marcha con `pnpm dev`; los handlers
  se verificaron invocándolos directamente (ver abajo).
- Ninguna pantalla consume todavía estas rutas: son la superficie
  sustituible de cara a la Fase 3, y su consumo corresponde a las tareas de
  pantallas y del chatbot.
- El mock de PinQ no persiste nada: el acuse es solo narrativo.
- El POST de SPQ+ no asigna `cliente_id` ni `csr_asignado` (la asignación
  automática es del Plan 4) y no emite evento en `eventos_demo` — la métrica de
  la solicitud generada la emite la Server Action del portal (Tarea 11), no el
  mock.
- No se tocó ninguna migración ni se re-añadieron índices. No se escribió nada
  fuera de `solicitudes` (la fila de prueba se borró) y `sesion_demo`
  (restaurada a `modo='hoy'`, `plantas_override={}`).

## Cómo verificar

```bash
./node_modules/.bin/tsc.cmd --noEmit
```
Sin salida — sin errores de tipos.

```bash
pnpm lint
```
`Checked 103 files. No fixes applied. Found 1 info.` — solo el aviso
informativo preexistente de `biome.json` (campo `recommended` deprecado).

```bash
pnpm test
```
`Test Files 16 passed (16)` · `Tests 187 passed (187)`. Mismo número que antes
de esta tarea — no se agregó ningún test nuevo (directiva vigente).

Script temporal `scripts/comprobar-mocks.mts` (creado, ejecutado con
`NODE_OPTIONS="--conditions=react-server" pnpm exec tsx scripts/comprobar-mocks.mts`
contra la base cloud real vía `.env.local`, y **borrado antes de cerrar la
tarea**). Salida completa, todas las comprobaciones en verde:

```
== Latencia artificial ==
  OK   - calcularLatencia siempre cae en [200, 800]
  OK   - el rango es el de los documentos
  OK   - la espera real cae en el rango (427 ms)
== Mock de inventario ==
       sin parámetro: HTTP 400 en 4 ms
  OK   - sin designación responde 400
  OK   - designación inexistente responde 404
       DEMO-6205-2RSH/C3: HTTP 200 en 1177 ms
  OK   - responde 200
  OK   - existencias PS=1200, SL=300 en orden
== Mock de WCL ==
       DEMO-6205-2RSH/C3 x100: HTTP 200 en 1266 ms
  OK   - responde 200 con precio de lista
  OK   - incluye la estimación de TE
  OK   - sin aviso de precio cuando hay precio
  OK   - precioNeto aplica el descuento del cliente (neto=210.25)
  OK   - sin precio de lista devuelve el aviso del 5.2/5.3 (punto 5.3)
  OK   - cantidad inválida responde 400
== Mock de PinQ ==
       DEMO-PT-PLANNER x40: HTTP 200 en 966 ms
  OK   - power_transmission va por PT Inquery al Planner (PDIV P106)
  OK   - acuse con número de PINQ
  OK   - rodamiento va por OPI/PINQ a la fábrica (P101)
== Mock de SPQ+ ==
       alta de solicitud: HTTP 201 en 632 ms
  OK   - el alta responde 201
  OK   - número con formato AAAAQ##### (2026Q23409)
  OK   - preclasificada con el motor QMS (declinar_designacion_invalida · punto 4.8)
  OK   - la consulta por número devuelve su estado (en_bandeja)
  OK   - número inexistente responde 404
  OK   - solicitud de prueba borrada (estado restaurado)
== Fallo durante la ventana ==
  OK   - DEMO-VENTANA (P103) responde 503 en ventana
  OK   - sesion_demo restaurada (modo 'hoy', sin overrides)

TODAS LAS COMPROBACIONES PASARON
```
