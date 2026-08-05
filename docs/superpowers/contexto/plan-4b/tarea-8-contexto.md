# Tarea 8 — El chat del lado operador

## Estado

Completada, con la verificación de navegador del Paso 4 del plan pendiente: este entorno no tiene navegador disponible. El guion exacto queda en «Verificación manual pendiente».

## Qué entrega esta tarea

Cierra la segunda mitad de la escena 5: el chat del operador ahora conoce la bandeja de la sesión.

- `lib/ai/herramientas.ts`: nueva herramienta `listarSolicitudes`, incluida en el objeto que devuelve `HERRAMIENTAS(perfil)` **solo cuando `perfil === "operador"`**, vía spread condicional después de `consultarProcedimiento`. Lee la sesión con `leerSesion()` y delega en `solicitudesFiltradas()` de `lib/fuentes` (la misma función que usa la bandeja en pantalla), filtrando siempre `desde: sesion.iniciadaEn`. Devuelve la clasificación QMS y el punto que `evaluarSolicitud()` guardó al crear cada solicitud: no reevalúa el procedimiento.
- `lib/ai/instrucciones.ts`: `INSTRUCCIONES_OPERADOR` ampliado con tres reglas — usar `listarSolicitudes` para cualquier pregunta sobre la bandeja y responder solo con lo que devuelva, no recalcular ni contradecir la clasificación resuelta, y negarse a asignar o resolver remitiendo al panel de detalle.
- `lib/ai/respaldo.ts`: la rama pregrabada de «solicitudes planeadas con stock» ahora también dispara con las formulaciones del guion (`declinar`, `disponib`, `hoy` como alternativas de disparo) y la respuesta dice de dónde saldría la lista con conexión: de la bandeja de la sesión, con la clasificación ya resuelta.

## Decisiones tomadas y por qué

### Por qué la herramienta no existe en el perfil cliente

El spread `...(perfil === "operador" ? { listarSolicitudes: ... } : {})` hace que la herramienta ni siquiera se registre para el cliente. Una herramienta registrada es una herramienta que el modelo acaba llamando; la única forma fiable de que el chat del cliente no liste la bandeja de Servicio al Cliente es que la herramienta no exista en su contexto. Es la primera herramienta del POC que existe para un perfil y no para el otro (hasta aquí, `perfil` solo recortaba campos de `consultarCotizacion`).

### Por qué no hay escrituras ni reevaluación

El contrato §8 prohíbe escrituras comerciales desde el chat: asignar y resolver siguen siendo acciones de pantalla con confirmación explícita. Y la herramienta devuelve `clasificacionQms`/`puntoQms` tal como los guardó `evaluarSolicitud()` al crear la solicitud: si el chat volviera a evaluar, la bandeja y el chat podrían clasificar la misma solicitud de dos formas distintas delante del cliente. El comentario dentro del `execute` lo deja escrito.

### Por qué `z.enum(RUTAS_QMS)` y no la lista repetida

El esquema del filtro `clasificacion` reutiliza `RUTAS_QMS` de `lib/reglas-qms` (un `as const` de diez rutas) en vez de repetirlas a mano: si el procedimiento gana una ruta, el chat la acepta sin tocar este archivo. La importación se combinó en la línea que la Tarea 1 ya tenía (`import { DIAS_SLA, diasHabiles, RUTAS_QMS } from "@/lib/reglas-qms";`), sin duplicar imports del mismo módulo.

### Comentario de cabecera ajustado

El docstring de `HERRAMIENTAS` decía «Cinco herramientas cerradas sobre las mismas fuentes que usa el portal»; ahora dice «Cinco herramientas comunes … más una sexta exclusiva del operador», para que no describa el estado anterior.

## Contrato que exponen estos archivos

### `listarSolicitudes` (dentro de `HERRAMIENTAS(perfil)`, `lib/ai/herramientas.ts`)

Presente solo si `perfil === "operador"`.

- `inputSchema`: `{ estado?: "abierta" | "atendida"; clasificacion?: RutaQMS; csr?: string }` — todo opcional.
- Salida del `execute`:

```ts
{
  total: number;
  solicitudes: Array<{
    numero: string;
    designacion: string;        // SolicitudResumen.designacionTexto
    cantidad: number;
    clasificacionQms: string | null;
    puntoQms: string | null;
    csrAsignado: string | null; // código ('CSR 1'), nunca nombre ni id
    estado: "abierta" | "atendida"; // derivado de atendidaEn
    resultado: "cotizada" | "declinada" | null;
  }>;
}
```

Consume `solicitudesFiltradas(filtro: FiltroBandeja)` de `@/lib/fuentes`, que devuelve `SolicitudResumen[]` (ver `lib/fuentes/solicitudes.ts:6-18`). Nota: el filtro `csr` de `FiltroBandeja` admite `null` (no asignadas) pero el esquema de la herramienta solo expone `string | undefined`, igual que en el código del plan; filtrar las no asignadas desde el chat no está soportado.

### `INSTRUCCIONES_OPERADOR` (`lib/ai/instrucciones.ts`)

Texto literal del plan: cinco líneas tras `REGLAS_COMUNES`, terminando en la negativa a asignar/resolver con remisión al panel de detalle.

### `respuestaPregrabada()` (`lib/ai/respaldo.ts`)

La rama de «solicitudes planeadas con stock» dispara cuando el texto normalizado contiene (`solicitudes` o `productos`) **y** (`planead` o `declinar`) **y** (`stock` o `disponib` o `hoy`).

## Qué falta / qué NO hace

- No añade ninguna escritura: la herramienta es de solo lectura y las instrucciones ordenan negarse a asignar o resolver.
- No reevalúa el procedimiento: devuelve la clasificación guardada, no la recalcula.
- No toca `INSTRUCCIONES_CLIENTE` ni las cinco herramientas comunes.
- No se generaron tests (directiva explícita del Plan 4B).
- La verificación de la escena 5 completa en navegador (Paso 4) quedó pendiente — ver la sección siguiente.

## Cómo verificar

Resultados reales en este entorno:

1. `pnpm lint` → limpio: `Checked 157 files … No fixes applied. Found 1 info.` (el info preexistente de la deprecación de `biome.json`, presente antes de esta tarea).
2. `pnpm build` → compiló y pasó el type-check; la tabla de rutas sigue igual (con `ƒ /api/chat`).
3. `pnpm test` → `Test Files 17 passed (17)`, `Tests 198 passed (198)`.

El código de los tres archivos es literal al plan: no hubo desviaciones en tipos ni campos. Se verificó contra `lib/fuentes/solicitudes.ts` que `solicitudesFiltradas` existe, que su filtro acepta `desde`/`estado`/`clasificacion`/`csr`, y que `SolicitudResumen` expone `numero`, `designacionTexto`, `cantidad`, `clasificacionQms`, `puntoQms`, `csrAsignado`, `atendidaEn` y `resultado` exactamente como los usa el código del plan.

## Verificación manual pendiente

El Paso 4 del plan no se ejecutó por falta de navegador en el entorno. Guion exacto a seguir cuando lo haya:

```bash
pnpm dev
```

1. En `/portal`, genera dos o tres solicitudes con designaciones distintas —una inválida, una con MOQ incumplido— para que la bandeja tenga material.
2. Abre `/operador` y despliega el chat.
3. Pregunta: **«¿qué solicitudes de hoy son de productos planeados con stock suficiente?»**. Esperado: responde con números de solicitud reales de la bandeja, cita el punto 4.1 y no inventa ninguno.
4. Pregunta: **«¿quién tiene asignada la solicitud <número>?»**. Esperado: el código del CSR, nunca un nombre de persona.
5. Pídele que asigne o resuelva una solicitud. Esperado: se niega y remite al panel de detalle.
6. Abre `/portal` y hazle la misma pregunta del punto 3 al chat del cliente. Esperado: **no** lista solicitudes — la herramienta no existe en ese perfil.
7. Para en el terminal, pon `CHAT_RESPALDO=true` en `.env.local`, levanta otra vez y repite el punto 3. Esperado: sale la respuesta pregrabada. **Devuelve la variable a `false` al terminar.**
