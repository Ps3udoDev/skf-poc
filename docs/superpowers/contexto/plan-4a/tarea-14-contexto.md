# Tarea 14 — Los eventos que faltan y la verificación de los doce tipos

## Estado

completa

No cites el hash de tu propio commit: el archivo va dentro de ese commit y no
puedes conocerlo al escribirlo. Para ubicar el trabajo basta con
`git log --oneline -- lib/fuentes/eventos.ts`.

## Qué entrega esta tarea

- `lib/fuentes/eventos.ts` (nuevo): `hayAvisoDeOperador(tipo, numero)` — fuente
  de comprobación que responde si la bandeja ya emitió un aviso para una
  solicitud, para que abrir el mismo detalle varias veces no multiplique el
  contador de avisos anticipados. Exportada desde `lib/fuentes/index.ts`
  (entre `./designaciones` y `./homologos`).
- `app/(portal)/portal/acciones.ts`:
  - Nueva función interna `emitirAvisos(candidatos, cantidad, modo)` (no
    exportada): emite `aviso_moq` (ruta `declinar_moq`) y
    `aviso_pack_quantity` (aviso `pack_quantity_ajustado`) con
    `perfil: "cliente"` y el modo (`hoy` / `solucion`) en el detalle. Se llama
    desde `conEstimaciones` justo antes del `return`, el único embudo que
    atraviesan las dos rutas de búsqueda.
  - `registrarSolicitudEvitada(codigo, estrategia?)`: firma ampliada con
    parámetro opcional; emite `sugerencia_aceptada` solo cuando la estrategia
    no es `exacta` ni `ninguna`, y siempre `solicitud_evitada` después.
- Cadena de la estrategia hasta el botón: `resultado-busqueda.tsx` pasa
  `estrategia={resultado.estrategia}` a `TarjetaSugerencia`, que la declara en
  sus props y la pasa a `DetalleDesignacion`, que la usa en
  `registrarSolicitudEvitada(designacion.designacion, estrategia)`.
- `app/(operador)/acciones.ts`, dentro de `detalleDeSolicitud` justo antes del
  `return`: emite `aviso_moq` / `aviso_pack_quantity` con `perfil: "operador"`,
  deduplicados vía `hayAvisoDeOperador` (una sola vez por solicitud).

## Decisiones tomadas y por qué

- **Los avisos del portal se emiten en el servidor, no en el componente.** Un
  aviso calculado que la pantalla nunca recibió no es un aviso anticipado; uno
  que el servidor devolvió sí lo es. `conEstimaciones` es el único embudo de
  las dos rutas de búsqueda (`hoy` y `solucion`), así que el contraste queda
  auditable con el modo en el detalle.

- **La coincidencia exacta no cuenta como sugerencia aceptada.** Si el cliente
  escribió la designación exacta, el sistema no aportó nada; contarla inflaría
  el indicador. Por eso el filtro es `estrategia !== "exacta" && !== "ninguna"`.

- **La bandeja deduplica y el portal no.** En el portal el hecho ocurre en cada
  búsqueda: tres búsquedas por debajo del MOQ son tres avisos ciertos. En la
  bandeja, abrir el mismo detalle cinco veces es un solo hecho, así que se
  comprueba antes con `hayAvisoDeOperador`.

- **`hayAvisoDeOperador` compara el número en memoria.** El filtro por tipo y
  perfil `operador` deja un puñado de filas por sesión; no hace falta un
  operador de ruta JSON en la consulta.

- **Sin desviaciones de los snippets del plan.** Los tipos `TipoEvento`
  (`@/lib/metricas/calculo`), `Sugerencia` y `Estrategia`
  (`@/lib/validador/tipos`) viven exactamente donde el plan indica. Biome solo
  reordenó un nombre en el import de `@/lib/fuentes` de
  `app/(operador)/acciones.ts` (`type Homologo` antes de `hayAvisoDeOperador`).

- **Sin tests nuevos** — directiva del usuario: no se crean archivos de test
  en este plan.

## Contrato que exponen estos archivos

```ts
// lib/fuentes/eventos.ts (nuevo, exportado desde lib/fuentes/index.ts)
export async function hayAvisoDeOperador(
  tipo: TipoEvento,   // de @/lib/metricas/calculo
  numero: string,
): Promise<boolean>;

// app/(portal)/portal/acciones.ts (firma ampliada, parámetro opcional)
export async function registrarSolicitudEvitada(
  codigo: string,
  estrategia?: Estrategia, // de @/lib/validador/tipos
): Promise<void>;
// Emite `sugerencia_aceptada` solo si estrategia ∉ {undefined, "exacta",
// "ninguna"}; siempre emite `solicitud_evitada` después.
```

- `emitirAvisos` es interna de `app/(portal)/portal/acciones.ts`; los eventos
  `aviso_moq` / `aviso_pack_quantity` del portal llevan
  `detalle: { modo, cantidad, ... }` y los de la bandeja
  `detalle: { numero, cantidad, ... }`.
- Consume `emitirEvento` (nunca lanza), `clienteLectura` y `lanzarSiError`;
  ninguna consulta a Supabase fuera de `lib/fuentes` y ninguna migración nueva.

## Qué falta / qué NO hace

- **No verifica los doce tipos de evento con datos reales**: el paso 6 del plan
  (recorrido en navegador + conteo SQL sobre `eventos_demo`) queda pendiente
  por falta de sesión interactiva en este entorno. Ver sección siguiente.
- **No calcula métricas ni dashboard**: eso es el Plan 4B (`/impacto`), que
  consumirá estos eventos.

## Cómo verificar

```bash
pnpm test
```

Salida: `Test Files 17 passed (17)`, `Tests 198 passed (198)` — la suite
completa sigue en verde.

```bash
pnpm build
```

Compila y type-check sin errores.

```bash
pnpm lint
```

`Checked 145 files ... Found 1 info.` (el info es la deprecación preexistente
de `biome.json`, ajena a esta tarea).

## Verificación manual pendiente

No se pudo ejecutar la verificación con navegador (entorno sin sesión
interactiva). Cuando se retome, el guion del plan (paso 6 de la Tarea 14) es:

1. Sesión recién reiniciada desde `/demo`.
2. Búsqueda con designación mal escrita y *Usar esta designación* sobre un
   candidato sugerido (emite `sugerencia_aceptada` + `solicitud_evitada`).
3. Búsqueda con cantidad por debajo del MOQ (`aviso_moq`, perfil `cliente`).
4. Búsqueda con cantidad no múltiplo del pack quantity (`aviso_pack_quantity`).
5. *Solicitar cotización* (`solicitud_generada`).
6. Abrir esa solicitud en `/operador` **dos veces** y comprobar que los avisos
   con `perfil = 'operador'` no se duplican.
7. Confirmación de homólogo de la escena 3 (`confirmacion_homologo`).
8. Escena 4 completa: forzar ventana, encolar, cerrar ventana
   (`ventana_inicio`, `intencion_encolada`, `reconciliacion`, `ventana_fin`).
9. Usar el chat al menos una vez (`llamada_modelo`).
10. SQL:

```sql
select tipo, count(*)
from eventos_demo
where ocurrido_en >= (select iniciada_en from sesion_demo where id = 1)
group by tipo
order by tipo;
```

Esperado: los doce valores del enum con conteo mayor que cero — `busqueda`,
`sugerencia_aceptada`, `solicitud_evitada`, `solicitud_generada`,
`confirmacion_homologo`, `aviso_moq`, `aviso_pack_quantity`, `ventana_inicio`,
`ventana_fin`, `intencion_encolada`, `reconciliacion`, `llamada_modelo`.
