# Plan 3 — Motores y pantallas del núcleo

> **Para agentes ejecutores:** SUB-SKILL REQUERIDA: usa `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans` para implementar tarea por tarea. Los pasos usan casillas (`- [ ]`) para seguimiento.

**Objetivo:** Construir la aplicación web del POC sobre el esquema del Plan 1 y los datos del Plan 2, hasta poder presentar en vivo las escenas 0, 1, 2, 4 (mitad) y 5 del guion, con el interruptor modo "hoy" / modo "con la solución" operado desde una segunda pantalla.

**Arquitectura:** Cuatro capas. `lib/fuentes` es la **única** que consulta tablas; `lib/reglas-qms`, `lib/estado-fabricas`, `lib/validador` y `lib/estimador` son motores que reciben datos ya resueltos; `app/api/mock/*` envuelve las fuentes con el comportamiento de un sistema externo (latencia y fallo en ventana); las pantallas leen el estado del demo desde `sesion_demo` por Realtime. Un solo conjunto de pantallas sirve a los dos modos: el modo es un dato, no una ruta.

**Stack:** Next.js 16.2 App Router · React 19.2 · TypeScript · Tailwind CSS v4 · shadcn/ui · Supabase (cloud) · AI SDK v7 vía Vercel AI Gateway · Recharts · Biome · Vitest

---

## Restricciones globales

- **Todo en español:** nombres de archivos, carpetas, funciones, variables, tipos, comentarios y textos de pantalla. Única excepción: los componentes vendorizados por el CLI de shadcn en `components/ui/`, que conservan su nomenclatura original de origen. Todo lo que escribamos nosotros va en español.
- **Cero datos reales de SKF.** Ninguna designación, cliente, precio o código de planta puede coincidir con los suyos.
- **Distintivo permanente** de *Entorno de demostración · datos simulados* visible en todas las pantallas.
- **Operadores como `CSR 1`, `CSR 2`…** nunca nombres de personas.
- **Terminología del cliente:** "Producto No Planeado (LCC=NP)", no "producto sin stock". Designación, tiempo de entrega, cantidad mínima de orden, almacén PS/SL/XX, cotización, PDIV.
- **Las designaciones siempre en fuente monoespaciada** en cualquier pantalla.
- **Ámbar exclusivamente** para el estado de desconexión. **Verde exclusivamente** para confirmación. Azul profundo primario, grises neutros. Sin degradados ni ilustraciones decorativas.
- **Ninguna estimación se presenta como confirmada.** Toda estimación de TE muestra los tres elementos: rango, número de casos que la sustentan y compromiso de confirmación.
- **El validador nunca genera una designación que no exista en la base.** Siempre elige de un conjunto cerrado.
- **Las claves de API viven solo del lado servidor.** Nada de `NEXT_PUBLIC_` para el Gateway ni para la service role.
- **Ninguna escritura desde el navegador.** Todas las escrituras van por Server Actions con `service_role`, que no pasan por RLS. El navegador solo lee con la clave anónima.
- **Nunca editar una migración ya aplicada.** Las aplicadas son `000001, 000002, 000003, 000005, 000006, 000007`; el hueco en `000004` es deliberado. Este plan añade `000008`.
- **Base de datos:** Supabase cloud, sin Docker. `SUPABASE_DB_URL` de `.env.local` apunta al pooler de sesión. La conexión directa `db.<ref>.supabase.co` no resuelve, es IPv6.
- **Vitest usa `pool: "threads"`**, ya fijado. Los tests que tocan la red viven en `*.integracion.test.ts` y **no** corren con `pnpm test`; corren con `pnpm test:integracion`.
- **Linter Biome.** Su reordenamiento de imports y sus ajustes de formato son esperados, **no** desviación. Corre `pnpm lint` antes de cada commit.
- **No re-añadir los índices `inventario_designacion` ni `homologos_origen`.** Son redundantes conocidos, documentados como deuda consciente. No faltan.

### Contrato de contexto por tarea (obligatorio)

Cada tarea **debe** escribir `docs/superpowers/contexto/plan-3/tarea-N-contexto.md` y **commitearlo junto con el código**. Va versionado en git a propósito: si la sesión se corta por límite de tokens, otro agente retoma desde ahí sin acceso a esta conversación.

Estructura mínima, en español:

```markdown
# Tarea N — <título>

## Estado
<completa | en curso | bloqueada>

No cites el hash de tu propio commit: el archivo va dentro de ese commit y no
puedes conocerlo al escribirlo. Enmendar el commit para corregirlo solo genera
un hash nuevo y el problema se repite. Para ubicar el trabajo basta con
`git log --oneline -- <ruta de los archivos de la tarea>`.

## Qué entrega esta tarea
<dos o tres frases>

## Decisiones tomadas y por qué
<las que no son obvias leyendo el código>

## Contrato que exponen estos archivos
<funciones exportadas con sus firmas exactas, para quien las consuma después>

## Qué falta / qué NO hace
<explícito, para que nadie asuma de más>

## Cómo verificar
<comandos exactos y qué debe salir>
```

---

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `lib/utilidades.ts` | `cn()` para componer clases de Tailwind |
| `components/ui/*` | Primitivas vendorizadas de shadcn/ui |
| `components/marco/barra-superior.tsx` | Perfil, modo activo, estado de plantas, distintivo |
| `components/marco/distintivo-demo.tsx` | *Entorno de demostración · datos simulados* |
| `supabase/migrations/20260804000008_busqueda_y_indices.sql` | RPC de trigramas y prefijo, índices pendientes |
| `lib/supabase/lectura.ts` | Cliente de lectura sin cookies, usable en rutas y tests |
| `lib/fuentes/designaciones.ts` | Catálogo: exacta, prefijo, similares, `aDesignacion()` |
| `lib/fuentes/inventario.ts` | Existencias por almacén |
| `lib/fuentes/plantas.ts` | Plantas y su configuración de ventana |
| `lib/fuentes/homologos.ts` | Equivalencias con diferencias técnicas |
| `lib/fuentes/cotizaciones.ts` | Histórico para el estimador y consulta por número |
| `lib/fuentes/contexto.ts` | Construye `ContextoSolicitud` con el reemplazo resuelto |
| `lib/estado-fabricas/reloj.ts` | Reloj simulado y minutos del día en un huso |
| `lib/estado-fabricas/ventanas.ts` | Estado de cada planta según calendario y override |
| `lib/sesion-demo/tipos.ts` | Tipo `SesionDemo` |
| `lib/sesion-demo/leer.ts` | Lectura de la fila única |
| `lib/sesion-demo/acciones.ts` | Server Actions con service role |
| `lib/sesion-demo/sondeo.ts` | Lógica pura del respaldo por sondeo |
| `components/sesion/proveedor-sesion.tsx` | Contexto de React + suscripción a Realtime |
| `lib/metricas/emitir.ts` | Escritura de `eventos_demo` |
| `lib/metricas/indicadores.ts` | Cálculo de contadores de la sesión |
| `lib/validador/normalizar.ts` | Normalización y variantes de confusión de caracteres |
| `lib/validador/cascada.ts` | Las estrategias 1–4 en orden |
| `lib/validador/sugerencia.ts` | Enriquecido de cada candidato con su contexto QMS |
| `lib/validador/respaldo-llm.ts` | Estrategia 6: elección sobre conjunto cerrado |
| `lib/ai/gateway.ts` | Modelo y configuración del Gateway |
| `lib/estimador/calculo.ts` | Mediana, percentiles y nivel de confianza (puro) |
| `lib/estimador/estimador.ts` | Estimación con ajustes del procedimiento |
| `components/estimador/estimacion-te.tsx` | Los tres elementos obligatorios en pantalla |
| `lib/mock/latencia.ts` | Latencia artificial de sistemas externos |
| `app/api/mock/*/route.ts` | Envoltorios con comportamiento de sistema externo |
| `app/(portal)/portal/page.tsx` | Vista Cliente |
| `components/portal/*` | Buscador, resultados, detalle, sugerencias |
| `app/(operador)/operador/page.tsx` | Bandeja mínima (el Plan 4 la completa) |
| `app/demo/page.tsx` | Panel del presentador |
| `components/demo/*` | Interruptor, plantas, reloj, escenarios, canal |
| `app/api/chat/route.ts` | Chatbot con streaming y tool calling |
| `lib/ai/herramientas.ts` | Herramientas del modelo contra `lib/fuentes` |
| `lib/ai/instrucciones.ts` | Prompts de sistema, modo cliente y modo operador |
| `lib/ai/procedimiento.ts` | Fragmentos del QMS consultables |
| `lib/ai/respaldo.ts` | Respuestas pregrabadas del guion |
| `components/chat/panel-chat.tsx` | Interfaz del chat |

---

## Tarea 1: Sistema de diseño y armazón de la aplicación

**Archivos:**
- Modificar: `app/globals.css`, `app/layout.tsx`, `app/page.tsx`
- Crear: `lib/utilidades.ts`, `components/marco/distintivo-demo.tsx`, `components/marco/barra-superior.tsx`
- Crear (vía CLI): `components/ui/button.tsx`, `card.tsx`, `input.tsx`, `badge.tsx`, `table.tsx`, `alert.tsx`, `dialog.tsx`, `separator.tsx`, `skeleton.tsx`, `switch.tsx`, `tabs.tsx`
- Crear: `components.json`
- Crear: `docs/superpowers/contexto/plan-3/tarea-1-contexto.md`

**Interfaces:**
- Consume: nada.
- Produce:
  - `cn(...clases: ClassValue[]): string`
  - `<DistintivoDemo />` — píldora fija con el texto de entorno simulado
  - `<BarraSuperior perfil={"cliente" | "operador"} />` — server component, sin estado propio todavía

**Nota de diseño.** El doc 06 fija la dirección visual y no es negociable: azul profundo primario, grises neutros, **ámbar solo para desconexión**, **verde solo para confirmación**, rojo solo para error, densidad de información media-alta, sin degradados ni sombras marcadas. Las designaciones van siempre en monoespaciada. Es una herramienta de trabajo, no una landing: las pantallas aireadas transmiten "producto inmaduro" y aquí eso cuesta dinero.

- [ ] **Paso 1: Instalar shadcn/ui**

```bash
pnpm dlx shadcn@latest init
```

Responde: estilo `new-york`, color base `slate`, variables CSS `sí`. Si el CLI pregunta por la ruta de `globals.css`, es `app/globals.css`; el alias de componentes es `@/components` y el de utilidades `@/lib/utilidades`.

Si el CLI falla por red, no lo reintentes en bucle: detente y anota el fallo en el contexto de la tarea. El resto del plan no depende de que las primitivas vengan del CLI, pero sí de que existan con esas rutas.

- [ ] **Paso 2: Añadir las primitivas que usa el plan**

```bash
pnpm dlx shadcn@latest add button card input badge table alert dialog separator skeleton switch tabs
```

- [ ] **Paso 3: Fijar los tokens de diseño**

Reemplaza el bloque de tokens de `app/globals.css`. Conserva `@import "tailwindcss";` y lo que el CLI de shadcn haya añadido; sustituye los colores por estos:

```css
@import "tailwindcss";

:root {
  --fondo: #ffffff;
  --fondo-sutil: #f4f5f7;
  --texto: #16181d;
  --texto-tenue: #5b6270;
  --borde: #d9dce2;

  /* Azul profundo: color primario, acciones y encabezados. */
  --primario: #0f3a63;
  --primario-suave: #e6eef6;
  --primario-contraste: #ffffff;

  /* Ámbar: EXCLUSIVO del estado de desconexión. No usar para nada más. */
  --desconexion: #b45309;
  --desconexion-suave: #fdf3e3;

  /* Verde: EXCLUSIVO de confirmación. */
  --confirmacion: #15803d;
  --confirmacion-suave: #e8f5ec;

  --error: #b91c1c;
  --error-suave: #fdecec;
}

@theme inline {
  --color-fondo: var(--fondo);
  --color-fondo-sutil: var(--fondo-sutil);
  --color-texto: var(--texto);
  --color-texto-tenue: var(--texto-tenue);
  --color-borde: var(--borde);
  --color-primario: var(--primario);
  --color-primario-suave: var(--primario-suave);
  --color-primario-contraste: var(--primario-contraste);
  --color-desconexion: var(--desconexion);
  --color-desconexion-suave: var(--desconexion-suave);
  --color-confirmacion: var(--confirmacion);
  --color-confirmacion-suave: var(--confirmacion-suave);
  --color-error: var(--error);
  --color-error-suave: var(--error-suave);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

body {
  background: var(--fondo);
  color: var(--texto);
  font-family: var(--font-sans), system-ui, sans-serif;
}

/* Toda designación en monoespaciada, en cualquier pantalla. */
.designacion {
  font-family: var(--font-mono), ui-monospace, monospace;
  letter-spacing: 0.01em;
}
```

No definas variante oscura. El demo se proyecta en una sala de juntas con luz; una sola paleta clara es una decisión, no una omisión, y evita que el ámbar de desconexión pierda contraste en un tema que nadie va a usar.

- [ ] **Paso 4: Escribir el distintivo de entorno de demostración**

`components/marco/distintivo-demo.tsx`:

```tsx
/**
 * Regla de honestidad 1 del diseño: distintivo permanente en toda la
 * aplicación. No es decoración — es lo que impide que el cliente confunda el
 * POC con producto terminado.
 */
export function DistintivoDemo() {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-borde bg-fondo-sutil px-3 py-1 text-xs font-medium text-texto-tenue">
      <span className="size-1.5 rounded-full bg-desconexion" aria-hidden />
      Entorno de demostración · datos simulados
    </span>
  );
}
```

- [ ] **Paso 5: Escribir la barra superior**

`components/marco/barra-superior.tsx`. Recibe el perfil y muestra: nombre genérico de la aplicación, selector de perfil (enlaces a `/portal` y `/operador`, sin estado todavía), hueco reservado para el indicador de plantas y el distintivo. El indicador de estado real llega en la tarea 5; aquí déjalo como un espacio marcado con un comentario, no como un valor inventado.

```tsx
import Link from "next/link";
import { DistintivoDemo } from "./distintivo-demo";

export function BarraSuperior({ perfil }: { perfil: "cliente" | "operador" }) {
  return (
    <header className="flex items-center justify-between gap-6 border-b border-borde bg-fondo px-6 py-3">
      <div className="flex items-center gap-6">
        <span className="text-sm font-semibold tracking-tight text-primario">
          Portal de Consultas y Cotizaciones
        </span>
        <nav className="flex items-center gap-1 rounded-md bg-fondo-sutil p-1">
          <Link
            href="/portal"
            className={`rounded px-3 py-1 text-sm ${perfil === "cliente" ? "bg-fondo font-medium text-texto shadow-sm" : "text-texto-tenue"}`}
          >
            Vista Cliente
          </Link>
          <Link
            href="/operador"
            className={`rounded px-3 py-1 text-sm ${perfil === "operador" ? "bg-fondo font-medium text-texto shadow-sm" : "text-texto-tenue"}`}
          >
            Servicio al Cliente
          </Link>
        </nav>
      </div>
      <div className="flex items-center gap-4">
        {/* El indicador de estado de plantas y el del modo activo se montan
            aquí en la tarea 5, cuando exista el proveedor de sesión. */}
        <DistintivoDemo />
      </div>
    </header>
  );
}
```

- [ ] **Paso 6: Limpiar el boilerplate**

`app/layout.tsx`: cambia `lang="en"` por `lang="es"` y los metadatos por `title: "Portal de Consultas y Cotizaciones"` y `description: "POC de servicio al cliente. Entorno de demostración con datos simulados."`.

`app/page.tsx`: sustituye la página de `create-next-app` por una redirección permanente al portal.

```tsx
import { redirect } from "next/navigation";

export default function Inicio() {
  redirect("/portal");
}
```

Crea `app/(portal)/portal/page.tsx` con un marcador provisional que la tarea 11 sustituye por completo:

```tsx
import { BarraSuperior } from "@/components/marco/barra-superior";

export default function PaginaPortal() {
  return (
    <div className="flex min-h-full flex-col">
      <BarraSuperior perfil="cliente" />
      <main className="flex-1 px-6 py-10">
        <p className="text-sm text-texto-tenue">Buscador en construcción (tarea 11).</p>
      </main>
    </div>
  );
}
```

- [ ] **Paso 7: Verificar que compila y se ve**

```bash
pnpm lint
pnpm build
```

Esperado: build sin errores, con las rutas `/` y `/portal`.

Levanta `pnpm dev`, abre `/`, confirma que redirige a `/portal`, que la barra superior se ve, que el distintivo aparece y que los colores son los de la paleta (azul profundo, no el azul por defecto de Tailwind).

- [ ] **Paso 8: Escribir el contexto y commitear**

Crea `docs/superpowers/contexto/plan-3/tarea-1-contexto.md`. En "Decisiones tomadas y por qué" deja escrito que no hay tema oscuro y por qué, y que `components/ui/` conserva la nomenclatura de shadcn mientras el resto del código va en español.

```bash
pnpm lint
git add app components lib/utilidades.ts components.json package.json pnpm-lock.yaml docs/superpowers/contexto
git commit -m "Sistema de diseno y armazon de la aplicacion"
```

---

## Tarea 2: Migración 000008 y la rama 5.2 del procedimiento

**Archivos:**
- Crear: `supabase/migrations/20260804000008_busqueda_y_indices.sql`
- Modificar: `lib/reglas-qms/tipos.ts`, `lib/reglas-qms/tiempos.ts`, `lib/reglas-qms/tiempos.test.ts`
- Regenerar: `lib/supabase/tipos.ts`
- Crear: `docs/superpowers/contexto/plan-3/tarea-2-contexto.md`

**Interfaces:**
- Consume: el esquema del Plan 1.
- Produce:
  - RPC `buscar_similares(consulta text, limite int) → (designacion text, puntaje real)`
  - RPC `buscar_por_prefijo(prefijo text, limite int) → (designacion text)`
  - `avisoPrecio(d: Designacion): Aviso | null` — ahora cubre también el punto 5.2
  - Nuevo `TipoAviso`: `"precio_bajo_spq"`

**Por qué hace falta la migración.** PostgREST no expone `similarity()` de `pg_trgm`; sin una función RPC el validador tendría que traerse el catálogo al cliente o filtrar con `ilike`, que no resuelve transposiciones. Y el punto 5.2 del QMS —*"si no tenemos precio se cotiza bajo los parámetros de SPQ+"*— quedó como deuda consciente del Plan 1: ahora que `precio_lista` es nullable es una rama real del procedimiento sin implementar.

- [ ] **Paso 1: Escribir la migración**

`supabase/migrations/20260804000008_busqueda_y_indices.sql`:

```sql
-- ============================================================================
-- 008 · Búsqueda difusa expuesta a la aplicación e índices de consulta inversa
-- ----------------------------------------------------------------------------
-- PostgREST no expone similarity() de pg_trgm. Sin estas funciones el validador
-- tendría que traerse el catálogo al navegador o filtrar con ilike, que no
-- resuelve transposiciones de caracteres — justamente el error de captura que
-- la escena 2 del guion tiene que corregir en vivo.
--
-- Los tres índices son los que el Plan 1 dejó anotados como ausentes a
-- propósito, para añadirlos cuando existieran los patrones de consulta reales.
-- Ya existen: el validador resuelve reemplazos, la confirmación guiada recorre
-- homólogos en sentido inverso y el estado de fábricas agrupa por planta dueña.
-- ============================================================================

-- Estrategia 4 de la cascada: similitud por trigramas.
create or replace function buscar_similares(consulta text, limite int default 5)
returns table (designacion text, puntaje real)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select d.designacion, similarity(d.designacion, consulta) as puntaje
  from designaciones d
  where d.designacion % consulta
  order by similarity(d.designacion, consulta) desc, d.designacion
  limit greatest(limite, 1);
$$;

comment on function buscar_similares is
  'Estrategia 4 del validador. Devuelve las designaciones más parecidas por trigramas, ordenadas por puntaje. El umbral es el de pg_trgm (0.3 por defecto).';

-- Estrategia 3: captura incompleta. El texto es prefijo de designaciones
-- válidas — el caso del copiado truncado desde Word.
create or replace function buscar_por_prefijo(prefijo text, limite int default 5)
returns table (designacion text)
language sql
stable
security invoker
set search_path = public
as $$
  select d.designacion
  from designaciones d
  where d.designacion like prefijo || '%'
    and d.designacion <> prefijo
  order by length(d.designacion), d.designacion
  limit greatest(limite, 1);
$$;

comment on function buscar_por_prefijo is
  'Estrategia 3 del validador: detección de captura incompleta. Excluye la coincidencia exacta, que ya resolvió la estrategia 1.';

grant execute on function buscar_similares(text, int) to anon, authenticated;
grant execute on function buscar_por_prefijo(text, int) to anon, authenticated;

-- ── Índices de consulta inversa ──────────────────────────────────────────────
-- No re-añadir inventario_designacion ni homologos_origen: son redundantes
-- conocidos y están documentados como deuda consciente.

create index if not exists homologos_equivalente on homologos (equivalente);
create index if not exists inventario_pdiv_dueno on inventario (pdiv_dueno);
create index if not exists designaciones_reemplazado_por on designaciones (reemplazado_por);
```

- [ ] **Paso 2: Aplicar la migración y regenerar tipos**

```bash
pnpm db:push
pnpm tipos
```

Esperado: `db:push` aplica solo `000008`. `pnpm tipos` reescribe `lib/supabase/tipos.ts` añadiendo las dos funciones en la sección `Functions`.

- [ ] **Paso 3: Comprobar las funciones contra la base real**

```bash
pnpm verificar
```

Esperado: sigue en verde (esta migración no toca nada de lo que verifica).

Después, comprueba las funciones desde `psql` o desde un script temporal con `SUPABASE_DB_URL`:

```sql
select * from buscar_similares('6205-2RSH/C', 5);
select * from buscar_por_prefijo('DEMO-6205-2RSH', 5);
```

Esperado: la primera devuelve filas con puntaje descendente; la segunda devuelve las tres completaciones `DEMO-6205-2RSH/C3`, `/C4` y `/W64` sembradas por el Plan 2.

- [ ] **Paso 4: Escribir el test que falle para el punto 5.2**

Añade a `lib/reglas-qms/tiempos.test.ts`:

```ts
describe("punto 5.2 — FPC 1 sin Precio de Lista", () => {
  it("avisa que se cotiza bajo los parámetros de SPQ+", () => {
    const d = designacionBase({ fpc: "1", precioLista: null });
    const aviso = avisoPrecio(d);
    expect(aviso).not.toBeNull();
    expect(aviso?.tipo).toBe("precio_bajo_spq");
    expect(aviso?.punto).toBe("5.2");
    expect(aviso?.mensaje).toContain("SPQ+");
  });

  it("un FPC 1 con precio no genera aviso", () => {
    expect(avisoPrecio(designacionBase({ fpc: "1", precioLista: 1200 }))).toBeNull();
  });

  it("el FPC 2 sigue avisando por el punto 5.3, no por el 5.2", () => {
    const aviso = avisoPrecio(designacionBase({ fpc: "2", precioLista: null }));
    expect(aviso?.tipo).toBe("precio_requiere_lpc");
    expect(aviso?.punto).toBe("5.3");
  });
});
```

Usa el ayudante `designacionBase` que ya existe en ese archivo de tests. Si no existe con ese nombre, usa el que el archivo ya emplee para construir designaciones de prueba: **no** dupliques uno nuevo.

- [ ] **Paso 5: Ejecutar y ver el fallo**

Ejecuta: `pnpm test tiempos`
Esperado: FALLA — `avisoPrecio` devuelve `null` para el FPC 1 sin precio.

- [ ] **Paso 6: Implementar**

En `lib/reglas-qms/tipos.ts`, añade `"precio_bajo_spq"` a la unión `TipoAviso`.

En `lib/reglas-qms/tiempos.ts`, sustituye `avisoPrecio` por:

```ts
/**
 * Puntos 5.2 y 5.3 — las dos razones por las que una designación puede no
 * tener precio en pantalla.
 *
 * 5.3, FPC 2: no es producto de línea; el precio sale del LPC de la fábrica.
 * 5.2, FPC 1 sin Precio de Lista: "si no tenemos precio se cotiza bajo los
 * parámetros de SPQ+". Es un producto de línea al que le falta el precio, no un
 * producto fuera de línea: la salida del procedimiento es distinta y el CSR
 * necesita distinguirlas.
 */
export function avisoPrecio(d: Designacion): Aviso | null {
  if (d.fpc === "2") {
    return {
      tipo: "precio_requiere_lpc",
      punto: "5.3",
      mensaje:
        "Producto fuera de línea (FPC 2): el precio requiere el LPC de la fábrica " +
        "y el cálculo posterior en SPQ+.",
    };
  }
  if (d.precioLista === null) {
    return {
      tipo: "precio_bajo_spq",
      punto: "5.2",
      mensaje:
        "Producto de línea (FPC 1) sin Precio de Lista publicado: se cotiza bajo " +
        "los parámetros de SPQ+.",
    };
  }
  return null;
}
```

- [ ] **Paso 7: Ejecutar toda la suite**

```bash
pnpm test
```

Esperado: pasan los 187 tests previos más los 3 nuevos. Si alguno de los tests existentes del índice se rompe, es porque construía designaciones FPC 1 sin precio y ahora reciben un aviso extra: ajusta la expectativa del test, **no** la regla — la regla está tomada del texto literal del procedimiento.

- [ ] **Paso 8: Escribir el contexto y commitear**

```bash
pnpm lint
git add supabase/migrations lib/reglas-qms lib/supabase/tipos.ts docs/superpowers/contexto
git commit -m "Migracion 008: RPC de busqueda difusa, indices inversos y punto 5.2"
```

---

## Tarea 3: `lib/fuentes` — la única capa que consulta tablas

**Archivos:**
- Crear: `lib/supabase/lectura.ts`
- Crear: `lib/fuentes/designaciones.ts`, `lib/fuentes/inventario.ts`, `lib/fuentes/plantas.ts`, `lib/fuentes/homologos.ts`, `lib/fuentes/cotizaciones.ts`, `lib/fuentes/contexto.ts`, `lib/fuentes/index.ts`
- Crear: `lib/fuentes/designaciones.test.ts` (unitario, solo el mapeo)
- Crear: `lib/fuentes/fuentes.integracion.test.ts`
- Crear: `docs/superpowers/contexto/plan-3/tarea-3-contexto.md`

**Interfaces:**
- Consume: `Designacion`, `Planta`, `Existencia`, `ContextoSolicitud` de `lib/reglas-qms`; las RPC de la tarea 2.
- Produce:
  - `clienteLectura(): SupabaseClient<Database>`
  - `aDesignacion(fila: FilaDesignacion): Designacion`
  - `obtenerDesignacion(codigo: string): Promise<Designacion | null>`
  - `obtenerVarias(codigos: string[]): Promise<Designacion[]>`
  - `completacionesDe(prefijo: string, limite?: number): Promise<string[]>`
  - `similaresA(consulta: string, limite?: number): Promise<{ designacion: string; puntaje: number }[]>`
  - `existenciasDe(codigo: string): Promise<Existencia[]>`
  - `obtenerPlanta(pdiv: string): Promise<Planta | null>`
  - `plantaCompleta(pdiv: string): Promise<PlantaCompleta | null>` y `todasLasPlantas(): Promise<PlantaCompleta[]>`
  - `homologosDe(codigo: string): Promise<Homologo[]>`
  - `historicoDe(codigo: string): Promise<number[]>` y `historicoDeFamilia(familia: string): Promise<number[]>`
  - `obtenerCotizacion(numero: string): Promise<Cotizacion | null>`
  - `construirContexto(codigo: string, cantidad: number): Promise<ContextoSolicitud>`

**El invariante que esta tarea existe para cumplir.** `ContextoSolicitud.reemplazo` debe venir resuelto. Si `designacion.reemplazadoPor` no es nulo y se pasa `reemplazo: null`, el motor declina por el punto 4.7 aunque la base diga que sí hay reemplazo — y la escena 3 del guion se cae. `construirContexto` es el único lugar donde se resuelve.

**Por qué un cliente de lectura sin cookies.** `clienteServidor()` llama a `cookies()`, que solo existe dentro del ciclo de una petición: no sirve en los tests de integración ni fuera de un Server Component. El POC no tiene login, así que las cookies no aportan nada a las lecturas. Un cliente plano con la clave anónima funciona en rutas, componentes de servidor y tests por igual.

- [ ] **Paso 1: Escribir el cliente de lectura**

`lib/supabase/lectura.ts`:

```ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { variableDeEntorno } from "./entorno";
import type { Database } from "./tipos";

let cliente: SupabaseClient<Database> | null = null;

/**
 * Cliente de solo lectura con la clave anónima.
 *
 * No usa cookies: el POC no tiene sesión de usuario y `cookies()` solo existe
 * dentro del ciclo de una petición, lo que dejaría fuera a los tests de
 * integración. RLS garantiza que esta clave no puede escribir en ninguna tabla.
 */
export function clienteLectura(): SupabaseClient<Database> {
  if (cliente) return cliente;
  cliente = createClient<Database>(
    variableDeEntorno("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    variableDeEntorno("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    { auth: { persistSession: false } },
  );
  return cliente;
}
```

- [ ] **Paso 2: Escribir el test unitario del mapeo**

`lib/fuentes/designaciones.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { aDesignacion } from "./designaciones";

const fila = {
  designacion: "6205-2RSH/C3",
  descripcion: "Rodamiento rígido de bolas, una hilera, diámetro interior 25 mm",
  familia: "Rodamiento rígido de bolas",
  pcc: "C" as const,
  lcc: "PLAN" as const,
  fpc: "1" as const,
  pdiv: "P101",
  segmento: "rodamiento" as const,
  moq: 1,
  pack_quantity: 10,
  precio_lista: 412.5,
  vigente: true,
  reemplazado_por: null,
  reemplazo_indicado_fabrica: null,
  es_nueva_creacion: false,
};

describe("aDesignacion", () => {
  it("convierte snake_case de la base a camelCase del dominio", () => {
    const d = aDesignacion(fila);
    expect(d.packQuantity).toBe(10);
    expect(d.precioLista).toBe(412.5);
    expect(d.reemplazadoPor).toBeNull();
    expect(d.reemplazoIndicadoFabrica).toBeNull();
    expect(d.esNuevaCreacion).toBe(false);
  });

  it("preserva el precio nulo en vez de convertirlo en cero", () => {
    // Un 0 aquí haría que el punto 5.2 quedara invisible y que la UI mostrara
    // "$0.00" como si fuera un precio real.
    expect(aDesignacion({ ...fila, precio_lista: null }).precioLista).toBeNull();
  });

  it("convierte el precio numérico aunque la base lo devuelva como cadena", () => {
    // PostgREST serializa numeric como string en algunas configuraciones.
    expect(aDesignacion({ ...fila, precio_lista: "412.50" as unknown as number }).precioLista).toBe(
      412.5,
    );
  });
});
```

- [ ] **Paso 3: Ejecutar y ver el fallo**

Ejecuta: `pnpm test fuentes`
Esperado: FALLA — no existe `./designaciones`.

- [ ] **Paso 4: Implementar el acceso al catálogo**

`lib/fuentes/designaciones.ts`:

```ts
import type { Designacion } from "@/lib/reglas-qms";
import { clienteLectura } from "@/lib/supabase/lectura";

/** Columnas del catálogo que el dominio necesita. Una sola lista, un solo lugar. */
export const COLUMNAS = `
  designacion, descripcion, familia, pcc, lcc, fpc, pdiv, segmento,
  moq, pack_quantity, precio_lista, vigente,
  reemplazado_por, reemplazo_indicado_fabrica, es_nueva_creacion
`;

export interface FilaDesignacion {
  designacion: string;
  descripcion: string;
  familia: string;
  pcc: Designacion["pcc"];
  lcc: Designacion["lcc"];
  fpc: Designacion["fpc"];
  pdiv: string;
  segmento: Designacion["segmento"];
  moq: number;
  pack_quantity: number;
  precio_lista: number | null;
  vigente: boolean;
  reemplazado_por: string | null;
  reemplazo_indicado_fabrica: string | null;
  es_nueva_creacion: boolean;
}

/**
 * Único punto de conversión snake_case → camelCase de todo el proyecto.
 *
 * Si esta conversión se duplica en otro archivo, la próxima columna que se
 * añada quedará mapeada en un sitio y olvidada en el otro.
 */
export function aDesignacion(fila: FilaDesignacion): Designacion {
  return {
    designacion: fila.designacion,
    descripcion: fila.descripcion,
    familia: fila.familia,
    pcc: fila.pcc,
    lcc: fila.lcc,
    fpc: fila.fpc,
    pdiv: fila.pdiv,
    segmento: fila.segmento,
    moq: fila.moq,
    packQuantity: fila.pack_quantity,
    precioLista: fila.precio_lista === null ? null : Number(fila.precio_lista),
    vigente: fila.vigente,
    reemplazadoPor: fila.reemplazado_por,
    reemplazoIndicadoFabrica: fila.reemplazo_indicado_fabrica,
    esNuevaCreacion: fila.es_nueva_creacion,
  };
}

export async function obtenerDesignacion(codigo: string): Promise<Designacion | null> {
  const { data } = await clienteLectura()
    .from("designaciones")
    .select(COLUMNAS)
    .eq("designacion", codigo)
    .maybeSingle();
  return data ? aDesignacion(data as unknown as FilaDesignacion) : null;
}

export async function obtenerVarias(codigos: string[]): Promise<Designacion[]> {
  if (codigos.length === 0) return [];
  const { data } = await clienteLectura()
    .from("designaciones")
    .select(COLUMNAS)
    .in("designacion", codigos);
  const encontradas = ((data ?? []) as unknown as FilaDesignacion[]).map(aDesignacion);
  // Se preserva el orden pedido: el validador ordena por puntaje y la base no.
  const porCodigo = new Map(encontradas.map((d) => [d.designacion, d]));
  return codigos.map((c) => porCodigo.get(c)).filter((d): d is Designacion => d !== undefined);
}

/** Estrategia 3 de la cascada: el texto es prefijo de designaciones válidas. */
export async function completacionesDe(prefijo: string, limite = 5): Promise<string[]> {
  const { data } = await clienteLectura().rpc("buscar_por_prefijo", { prefijo, limite });
  return ((data ?? []) as { designacion: string }[]).map((f) => f.designacion);
}

/** Estrategia 4 de la cascada: similitud por trigramas. */
export async function similaresA(
  consulta: string,
  limite = 5,
): Promise<{ designacion: string; puntaje: number }[]> {
  const { data } = await clienteLectura().rpc("buscar_similares", { consulta, limite });
  return (data ?? []) as { designacion: string; puntaje: number }[];
}
```

- [ ] **Paso 5: Ejecutar y verificar el mapeo**

Ejecuta: `pnpm test fuentes`
Esperado: PASAN los 3 tests.

- [ ] **Paso 6: Implementar inventario, plantas, homólogos y cotizaciones**

`lib/fuentes/inventario.ts`:

```ts
import type { Existencia } from "@/lib/reglas-qms";
import { clienteLectura } from "@/lib/supabase/lectura";

/** Orden del QMS: PS primario, SL secundario, XX terciario. */
const ORDEN: Record<Existencia["almacen"], number> = { PS: 0, SL: 1, XX: 2 };

export async function existenciasDe(codigo: string): Promise<Existencia[]> {
  const { data } = await clienteLectura()
    .from("inventario")
    .select("almacen, cantidad")
    .eq("designacion", codigo);
  return ((data ?? []) as Existencia[]).sort((a, b) => ORDEN[a.almacen] - ORDEN[b.almacen]);
}
```

`lib/fuentes/plantas.ts`:

```ts
import type { Planta } from "@/lib/reglas-qms";
import { clienteLectura } from "@/lib/supabase/lectura";

/** Planta con lo que el motor de reglas ignora pero el estado de fábricas necesita. */
export interface PlantaCompleta extends Planta {
  pais: string;
  huso: string;
  ventanaInicioMin: number;
  ventanaDuracionMin: number;
  ventanaVariabilidadMin: number;
  desempenoTe: number;
}

const COLUMNAS_PLANTA = `
  pdiv, nombre, pais, huso, tiene_conexion, tiene_ruta_embarque,
  ventana_inicio_min, ventana_duracion_min, ventana_variabilidad_min, desempeno_te
`;

interface FilaPlanta {
  pdiv: string;
  nombre: string;
  pais: string;
  huso: string;
  tiene_conexion: boolean;
  tiene_ruta_embarque: boolean;
  ventana_inicio_min: number;
  ventana_duracion_min: number;
  ventana_variabilidad_min: number;
  desempeno_te: number;
}

export function aPlanta(fila: FilaPlanta): PlantaCompleta {
  return {
    pdiv: fila.pdiv,
    nombre: fila.nombre,
    pais: fila.pais,
    huso: fila.huso,
    tieneConexion: fila.tiene_conexion,
    tieneRutaEmbarque: fila.tiene_ruta_embarque,
    ventanaInicioMin: fila.ventana_inicio_min,
    ventanaDuracionMin: fila.ventana_duracion_min,
    ventanaVariabilidadMin: fila.ventana_variabilidad_min,
    desempenoTe: Number(fila.desempeno_te),
  };
}

export async function plantaCompleta(pdiv: string): Promise<PlantaCompleta | null> {
  const { data } = await clienteLectura()
    .from("plantas")
    .select(COLUMNAS_PLANTA)
    .eq("pdiv", pdiv)
    .maybeSingle();
  return data ? aPlanta(data as unknown as FilaPlanta) : null;
}

export async function obtenerPlanta(pdiv: string): Promise<Planta | null> {
  return plantaCompleta(pdiv);
}

export async function todasLasPlantas(): Promise<PlantaCompleta[]> {
  const { data } = await clienteLectura()
    .from("plantas")
    .select(COLUMNAS_PLANTA)
    .order("pdiv");
  return ((data ?? []) as unknown as FilaPlanta[]).map(aPlanta);
}
```

`lib/fuentes/homologos.ts`:

```ts
import { clienteLectura } from "@/lib/supabase/lectura";

export interface DiferenciaTecnica {
  atributo: string;
  valor_origen: string;
  valor_equivalente: string;
}

export interface Homologo {
  origen: string;
  equivalente: string;
  motivo: string;
  diferencias: DiferenciaTecnica[];
}

/**
 * Equivalencias de una designación en ambos sentidos: la relación es simétrica
 * en la realidad aunque la tabla la guarde dirigida.
 */
export async function homologosDe(codigo: string): Promise<Homologo[]> {
  const { data } = await clienteLectura()
    .from("homologos")
    .select("origen, equivalente, motivo, diferencias")
    .or(`origen.eq.${codigo},equivalente.eq.${codigo}`);
  return ((data ?? []) as Homologo[]).map((h) =>
    h.origen === codigo
      ? h
      : {
          origen: codigo,
          equivalente: h.origen,
          motivo: h.motivo,
          diferencias: h.diferencias.map((d) => ({
            atributo: d.atributo,
            valor_origen: d.valor_equivalente,
            valor_equivalente: d.valor_origen,
          })),
        },
  );
}
```

`lib/fuentes/cotizaciones.ts`:

```ts
import { clienteLectura } from "@/lib/supabase/lectura";

export interface Cotizacion {
  numero: string;
  designacion: string;
  cantidad: number;
  fechaSolicitud: string;
  fechaRespuesta: string | null;
  resultado: "cotizada" | "declinada";
  motivoDeclinado: string | null;
  teSemanas: number | null;
  precio: number | null;
}

/** Semanas de TE del histórico de una designación. Base del estimador. */
export async function historicoDe(codigo: string): Promise<number[]> {
  const { data } = await clienteLectura()
    .from("cotizaciones")
    .select("te_semanas")
    .eq("designacion", codigo)
    .eq("resultado", "cotizada")
    .not("te_semanas", "is", null);
  return ((data ?? []) as { te_semanas: number }[]).map((f) => Number(f.te_semanas));
}

/**
 * Histórico de toda la familia, para cuando una designación tiene pocos casos.
 * Se hace en dos consultas porque `cotizaciones.designacion` es texto libre y no
 * tiene clave foránea al catálogo: el histórico incluye designaciones inválidas,
 * que es justamente el caso del punto 4.8.
 */
export async function historicoDeFamilia(familia: string): Promise<number[]> {
  const cliente = clienteLectura();
  const { data: codigos } = await cliente
    .from("designaciones")
    .select("designacion")
    .eq("familia", familia)
    .limit(400);
  const lista = ((codigos ?? []) as { designacion: string }[]).map((f) => f.designacion);
  if (lista.length === 0) return [];

  const { data } = await cliente
    .from("cotizaciones")
    .select("te_semanas")
    .in("designacion", lista)
    .eq("resultado", "cotizada")
    .not("te_semanas", "is", null);
  return ((data ?? []) as { te_semanas: number }[]).map((f) => Number(f.te_semanas));
}

export async function obtenerCotizacion(numero: string): Promise<Cotizacion | null> {
  const { data } = await clienteLectura()
    .from("cotizaciones")
    .select(
      "numero, designacion, cantidad, fecha_solicitud, fecha_respuesta, resultado, motivo_declinado, te_semanas, precio",
    )
    .eq("numero", numero)
    .maybeSingle();
  if (!data) return null;
  const f = data as Record<string, unknown>;
  return {
    numero: f.numero as string,
    designacion: f.designacion as string,
    cantidad: f.cantidad as number,
    fechaSolicitud: f.fecha_solicitud as string,
    fechaRespuesta: (f.fecha_respuesta as string | null) ?? null,
    resultado: f.resultado as Cotizacion["resultado"],
    motivoDeclinado: (f.motivo_declinado as string | null) ?? null,
    teSemanas: f.te_semanas === null ? null : Number(f.te_semanas),
    precio: f.precio === null ? null : Number(f.precio),
  };
}
```

- [ ] **Paso 7: Implementar `construirContexto`**

`lib/fuentes/contexto.ts`:

```ts
import type { ContextoSolicitud } from "@/lib/reglas-qms";
import { obtenerDesignacion } from "./designaciones";
import { existenciasDe } from "./inventario";
import { obtenerPlanta } from "./plantas";

/**
 * Construye el contexto que consume `evaluarSolicitud`.
 *
 * INVARIANTE: si la designación tiene `reemplazadoPor`, este es el único lugar
 * que carga esa designación en `reemplazo`. Pasar `null` teniendo
 * `reemplazadoPor` hace que el motor decline por el punto 4.7 un caso que el
 * procedimiento manda cotizar por el 4.6 — y tumba la escena 3 del guion.
 */
export async function construirContexto(
  codigo: string,
  cantidad: number,
): Promise<ContextoSolicitud> {
  const designacion = await obtenerDesignacion(codigo);
  if (!designacion) {
    return { designacion: null, cantidad, existencias: [], planta: null, reemplazo: null };
  }

  const [existencias, planta, reemplazo] = await Promise.all([
    existenciasDe(designacion.designacion),
    obtenerPlanta(designacion.pdiv),
    designacion.reemplazadoPor ? obtenerDesignacion(designacion.reemplazadoPor) : null,
  ]);

  return { designacion, cantidad, existencias, planta, reemplazo };
}
```

`lib/fuentes/index.ts` reexporta los seis módulos:

```ts
export * from "./contexto";
export * from "./cotizaciones";
export * from "./designaciones";
export * from "./homologos";
export * from "./inventario";
export * from "./plantas";
```

- [ ] **Paso 8: Escribir los tests de integración**

`lib/fuentes/fuentes.integracion.test.ts`. Se apoyan en los casos curados que el Plan 2 dejó sembrados, que son estables entre siembras:

Los tests de integración cargan `.env.local` en un `beforeAll`, igual que
`lib/supabase/admin.integracion.test.ts`: Vitest no tiene `setupFiles` y sin esa
llamada `clienteLectura()` fallaría por variables ausentes. Debe ejecutarse
antes de la primera llamada, porque el cliente se memoiza.

```ts
import { config } from "dotenv";
import { beforeAll, describe, expect, it } from "vitest";
import { evaluarSolicitud } from "@/lib/reglas-qms";
import {
  completacionesDe,
  construirContexto,
  existenciasDe,
  historicoDe,
  homologosDe,
  obtenerDesignacion,
  similaresA,
  todasLasPlantas,
} from "./index";

beforeAll(() => config({ path: ".env.local", quiet: true }));

describe("catálogo", () => {
  it("encuentra un caso curado por su código exacto", async () => {
    const d = await obtenerDesignacion("DEMO-6205-2RSH/C3");
    expect(d?.designacion).toBe("DEMO-6205-2RSH/C3");
    expect(d?.packQuantity).toBeGreaterThanOrEqual(1);
  });

  it("devuelve null para una designación inexistente en vez de lanzar", async () => {
    expect(await obtenerDesignacion("NO-EXISTE-XYZ-999")).toBeNull();
  });

  it("el prefijo truncado ofrece las tres completaciones del guion", async () => {
    const c = await completacionesDe("DEMO-6205-2RSH", 5);
    expect(c).toContain("DEMO-6205-2RSH/C3");
    expect(c.length).toBeGreaterThanOrEqual(3);
  });

  it("los trigramas devuelven candidatos ordenados por puntaje", async () => {
    const s = await similaresA("DEMO-6205-2RSH/C3", 5);
    expect(s.length).toBeGreaterThan(0);
    for (let i = 1; i < s.length; i++) {
      expect(s[i - 1].puntaje).toBeGreaterThanOrEqual(s[i].puntaje);
    }
  });
});

describe("contexto para el motor de reglas", () => {
  it("resuelve el reemplazo del obsoleto curado", async () => {
    const ctx = await construirContexto("DEMO-OBS-CON", 10);
    expect(ctx.designacion?.reemplazadoPor).not.toBeNull();
    expect(ctx.reemplazo).not.toBeNull();
    expect(ctx.reemplazo?.designacion).toBe(ctx.designacion?.reemplazadoPor);
  });

  it("el obsoleto con reemplazo se cotiza por el 4.6, no se declina por el 4.7", async () => {
    const evaluacion = evaluarSolicitud(await construirContexto("DEMO-OBS-CON", 10));
    expect(evaluacion.ruta).toBe("cotizar_con_reemplazo");
    expect(evaluacion.declinada).toBe(false);
  });

  it("el obsoleto sin reemplazo sí se declina por el 4.7", async () => {
    const evaluacion = evaluarSolicitud(await construirContexto("DEMO-OBS-SIN", 10));
    expect(evaluacion.ruta).toBe("declinar_obsoleto_sin_reemplazo");
  });

  it("una designación inexistente produce el contexto del punto 4.8", async () => {
    const evaluacion = evaluarSolicitud(await construirContexto("NO-EXISTE-XYZ-999", 5));
    expect(evaluacion.ruta).toBe("declinar_designacion_invalida");
  });
});

describe("resto de fuentes", () => {
  it("las existencias vienen en el orden del QMS: PS, SL, XX", async () => {
    const e = await existenciasDe("DEMO-6205-2RSH/C3");
    const codigos = e.map((x) => x.almacen);
    expect(codigos).toEqual([...codigos].sort((a, b) => "PS SL XX".indexOf(a) - "PS SL XX".indexOf(b)));
  });

  it("el homólogo curado trae diferencias técnicas", async () => {
    const h = await homologosDe("DEMO-OBS-CON");
    expect(h.length).toBeGreaterThan(0);
    expect(h[0].diferencias.length).toBeGreaterThan(0);
  });

  it("hay 18 plantas con su configuración de ventana", async () => {
    const p = await todasLasPlantas();
    expect(p).toHaveLength(18);
    expect(p[0].ventanaDuracionMin).toBeGreaterThan(0);
    expect(p[0].desempenoTe).toBeGreaterThan(0);
  });

  it("el histórico devuelve semanas numéricas", async () => {
    const casos = await historicoDe("DEMO-6205-2RSH/C3");
    for (const c of casos) expect(Number.isFinite(c)).toBe(true);
  });
});
```

- [ ] **Paso 9: Ejecutar ambas suites**

```bash
pnpm test
pnpm test:integracion
```

Esperado: la unitaria en verde; la de integración en verde contra la base sembrada. Si `DEMO-OBS-CON` no aparece, la base no está sembrada: corre `pnpm seed` antes de volver a intentarlo.

- [ ] **Paso 10: Escribir el contexto y commitear**

En "Contrato que exponen estos archivos" incluye las firmas exactas de las trece funciones exportadas: **todas las tareas siguientes las consumen y ninguna debe volver a consultar tablas por su cuenta.**

```bash
pnpm lint
git add lib/fuentes lib/supabase/lectura.ts docs/superpowers/contexto
git commit -m "Capa de fuentes: unico acceso a tablas y resolucion del contexto QMS"
```

---

## Tarea 4: `lib/estado-fabricas` — ventanas y reloj simulado

**Archivos:**
- Crear: `lib/estado-fabricas/reloj.ts`, `lib/estado-fabricas/reloj.test.ts`
- Crear: `lib/estado-fabricas/ventanas.ts`, `lib/estado-fabricas/ventanas.test.ts`
- Crear: `lib/estado-fabricas/index.ts`
- Crear: `docs/superpowers/contexto/plan-3/tarea-4-contexto.md`

**Interfaces:**
- Consume: `PlantaCompleta` de `lib/fuentes/plantas`.
- Produce:
  - `ahoraSimulada(offsetMin: number, base?: Date): Date`
  - `minutosDelDia(momento: Date, huso?: string): number`
  - `fechaEnHuso(momento: Date, huso?: string): string`
  - `EstadoPlanta = "online" | "ventana" | "reactivando"`
  - `inicioDeVentana(planta: PlantaCompleta, momento: Date): number`
  - `estadoDePlanta(planta, momento, override?): EstadoPlanta`
  - `minutosParaReapertura(planta, momento): number | null`
  - `estadoDeTodas(plantas, momento, overrides): Record<string, EstadoPlanta>`

**Nota de diseño — por qué el offset y no una hora absoluta.** El presentador salta el reloj hacia adelante durante la escena 4. Si guardáramos una hora absoluta, el reloj simulado quedaría congelado en ese instante y la cuenta regresiva del banner dejaría de correr. Con un offset en minutos contra la hora real, el reloj sigue avanzando solo después de cada salto.

**Nota de diseño — la variabilidad de Bélgica.** La planta `P103` tiene `ventana_variabilidad_min = 120`: su ventana no empieza a la misma hora cada día. Un `Math.random()` haría que la ventana se moviera entre dos renders de la misma pantalla. El desplazamiento se deriva de la fecha del día, así que es estable dentro de un día y distinto entre días.

- [ ] **Paso 1: Escribir el test del reloj**

`lib/estado-fabricas/reloj.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { ahoraSimulada, fechaEnHuso, minutosDelDia } from "./reloj";

describe("reloj simulado", () => {
  it("un offset de cero deja la hora intacta", () => {
    const base = new Date("2026-08-04T18:30:00Z");
    expect(ahoraSimulada(0, base).getTime()).toBe(base.getTime());
  });

  it("el offset se suma en minutos", () => {
    const base = new Date("2026-08-04T18:30:00Z");
    expect(ahoraSimulada(90, base).toISOString()).toBe("2026-08-04T20:00:00.000Z");
  });

  it("admite offsets negativos, para retroceder en un ensayo", () => {
    const base = new Date("2026-08-04T18:30:00Z");
    expect(ahoraSimulada(-30, base).toISOString()).toBe("2026-08-04T18:00:00.000Z");
  });
});

describe("minutos del día en hora de México", () => {
  it("las 18:30 UTC son las 12:30 en Ciudad de México, es decir el minuto 750", () => {
    // 750 es exactamente el inicio de la ventana pico del Plan 2.
    expect(minutosDelDia(new Date("2026-08-04T18:30:00Z"))).toBe(750);
  });

  it("la medianoche local es el minuto 0, no el 1440", () => {
    expect(minutosDelDia(new Date("2026-08-04T06:00:00Z"))).toBe(0);
  });

  it("respeta el huso que se le pase", () => {
    expect(minutosDelDia(new Date("2026-08-04T18:30:00Z"), "Europe/Brussels")).toBe(20 * 60 + 30);
  });
});

describe("fecha en huso", () => {
  it("devuelve el día local, no el día UTC", () => {
    // 03:00 UTC del día 5 son las 21:00 del día 4 en México.
    expect(fechaEnHuso(new Date("2026-08-05T03:00:00Z"))).toBe("2026-08-04");
  });
});
```

- [ ] **Paso 2: Ejecutar y ver el fallo**

Ejecuta: `pnpm test reloj`
Esperado: FALLA — no existe `./reloj`.

- [ ] **Paso 3: Implementar el reloj**

`lib/estado-fabricas/reloj.ts`:

```ts
/** Huso de referencia: las ventanas del Plan 2 están en minutos hora de México. */
export const HUSO_MEXICO = "America/Mexico_City";

/**
 * Hora simulada del demo.
 *
 * El offset se guarda en minutos contra la hora real y NO como hora absoluta:
 * así el reloj sigue corriendo solo después de cada salto del presentador. Con
 * una hora absoluta, la cuenta regresiva del banner de ventana se congelaría.
 */
export function ahoraSimulada(offsetMin: number, base: Date = new Date()): Date {
  return new Date(base.getTime() + offsetMin * 60_000);
}

/** Minutos transcurridos desde la medianoche local del huso indicado. */
export function minutosDelDia(momento: Date, huso: string = HUSO_MEXICO): number {
  const partes = new Intl.DateTimeFormat("es-MX", {
    timeZone: huso,
    hour: "2-digit",
    minute: "2-digit",
    // h23 evita que la medianoche se formatee como "24:00" en algunas versiones
    // de ICU, que daría 1440 en vez de 0 y rompería toda comparación de ventana.
    hourCycle: "h23",
  }).formatToParts(momento);

  const hora = Number(partes.find((p) => p.type === "hour")?.value ?? "0");
  const minuto = Number(partes.find((p) => p.type === "minute")?.value ?? "0");
  return hora * 60 + minuto;
}

/** Fecha local en formato AAAA-MM-DD. Base determinista de la variabilidad. */
export function fechaEnHuso(momento: Date, huso: string = HUSO_MEXICO): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: huso,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(momento);
  const valor = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "";
  return `${valor("year")}-${valor("month")}-${valor("day")}`;
}
```

- [ ] **Paso 4: Ejecutar y verificar**

Ejecuta: `pnpm test reloj`
Esperado: PASAN los 7 tests.

- [ ] **Paso 5: Escribir el test de las ventanas**

`lib/estado-fabricas/ventanas.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { PlantaCompleta } from "@/lib/fuentes/plantas";
import { estadoDePlanta, estadoDeTodas, inicioDeVentana, minutosParaReapertura } from "./ventanas";

function planta(cambios: Partial<PlantaCompleta> = {}): PlantaCompleta {
  return {
    pdiv: "P101",
    nombre: "Planta Norte 1",
    pais: "Alemania",
    huso: "Europe/Berlin",
    tieneConexion: true,
    tieneRutaEmbarque: true,
    ventanaInicioMin: 750, // 12:30 hora de México
    ventanaDuracionMin: 130,
    ventanaVariabilidadMin: 0,
    desempenoTe: 1,
    ...cambios,
  };
}

/** Construye un instante UTC que corresponde a una hora local de México. */
function enMexico(fecha: string, hora: number, minuto: number): Date {
  // México está en UTC-6 sin horario de verano desde 2022.
  return new Date(`${fecha}T${String(hora + 6).padStart(2, "0")}:${String(minuto).padStart(2, "0")}:00Z`);
}

describe("estado de una planta", () => {
  it("está en línea antes de que abra su ventana", () => {
    expect(estadoDePlanta(planta(), enMexico("2026-08-04", 11, 0))).toBe("online");
  });

  it("está en ventana justo al minuto de inicio", () => {
    expect(estadoDePlanta(planta(), enMexico("2026-08-04", 12, 30))).toBe("ventana");
  });

  it("sigue en ventana a la mitad", () => {
    expect(estadoDePlanta(planta(), enMexico("2026-08-04", 13, 30))).toBe("ventana");
  });

  it("pasa a reactivando en los minutos siguientes al cierre", () => {
    // 12:30 + 130 min = 14:40. A las 14:45 está reactivando.
    expect(estadoDePlanta(planta(), enMexico("2026-08-04", 14, 45))).toBe("reactivando");
  });

  it("vuelve a estar en línea pasado el periodo de reactivación", () => {
    expect(estadoDePlanta(planta(), enMexico("2026-08-04", 15, 30))).toBe("online");
  });

  it("una ventana que cruza la medianoche se evalúa correctamente", () => {
    const nocturna = planta({ ventanaInicioMin: 1380, ventanaDuracionMin: 120 }); // 23:00 a 01:00
    expect(estadoDePlanta(nocturna, enMexico("2026-08-04", 23, 30))).toBe("ventana");
    expect(estadoDePlanta(nocturna, enMexico("2026-08-04", 0, 30))).toBe("ventana");
    expect(estadoDePlanta(nocturna, enMexico("2026-08-04", 5, 0))).toBe("online");
  });
});

describe("override del presentador", () => {
  it("el override gana sobre el calendario", () => {
    // Fuera de ventana, pero el presentador la fuerza para la escena 4.
    expect(estadoDePlanta(planta(), enMexico("2026-08-04", 9, 0), "ventana")).toBe("ventana");
  });

  it("el override también puede devolverla a línea durante su ventana", () => {
    expect(estadoDePlanta(planta(), enMexico("2026-08-04", 13, 0), "online")).toBe("online");
  });
});

describe("variabilidad del inicio", () => {
  it("sin variabilidad el inicio es siempre el configurado", () => {
    const p = planta();
    expect(inicioDeVentana(p, enMexico("2026-08-04", 8, 0))).toBe(750);
    expect(inicioDeVentana(p, enMexico("2026-08-05", 8, 0))).toBe(750);
  });

  it("con variabilidad el inicio es estable dentro del mismo día", () => {
    const belga = planta({ pdiv: "P103", ventanaVariabilidadMin: 120 });
    const a = inicioDeVentana(belga, enMexico("2026-08-04", 8, 0));
    const b = inicioDeVentana(belga, enMexico("2026-08-04", 20, 0));
    expect(a).toBe(b);
  });

  it("con variabilidad el inicio cambia entre días y se mantiene en el rango", () => {
    const belga = planta({ pdiv: "P103", ventanaVariabilidadMin: 120 });
    const inicios = new Set<number>();
    for (let dia = 1; dia <= 20; dia++) {
      const valor = inicioDeVentana(belga, enMexico(`2026-08-${String(dia).padStart(2, "0")}`, 8, 0));
      expect(valor).toBeGreaterThanOrEqual(750 - 60);
      expect(valor).toBeLessThanOrEqual(750 + 60);
      inicios.add(valor);
    }
    expect(inicios.size).toBeGreaterThan(1);
  });
});

describe("cuenta regresiva", () => {
  it("devuelve los minutos que faltan para reabrir durante la ventana", () => {
    expect(minutosParaReapertura(planta(), enMexico("2026-08-04", 13, 30))).toBe(70);
  });

  it("devuelve null cuando la planta no está en ventana", () => {
    expect(minutosParaReapertura(planta(), enMexico("2026-08-04", 9, 0))).toBeNull();
  });
});

describe("estado de todas", () => {
  it("aplica los overrides por pdiv y deja el resto al calendario", () => {
    const plantas = [planta(), planta({ pdiv: "P204", ventanaInicioMin: 300 })];
    const estados = estadoDeTodas(plantas, enMexico("2026-08-04", 13, 0), { P204: "ventana" });
    expect(estados.P101).toBe("ventana");
    expect(estados.P204).toBe("ventana");
  });
});
```

- [ ] **Paso 6: Ejecutar y ver el fallo**

Ejecuta: `pnpm test ventanas`
Esperado: FALLA — no existe `./ventanas`.

- [ ] **Paso 7: Implementar las ventanas**

`lib/estado-fabricas/ventanas.ts`:

```ts
import type { PlantaCompleta } from "@/lib/fuentes/plantas";
import { fechaEnHuso, minutosDelDia } from "./reloj";

export type EstadoPlanta = "online" | "ventana" | "reactivando";

/**
 * Minutos tras el cierre de la ventana en los que la planta ya responde pero
 * aún está poniéndose al día. Da al presentador un estado intermedio visible
 * cuando salta el reloj hasta el final de la ventana en la escena 4.
 */
export const MINUTOS_REACTIVANDO = 15;

const MINUTOS_DIA = 1440;

/** Hash estable de una cadena. No criptográfico: solo reparte de forma fija. */
function hash(texto: string): number {
  let valor = 0;
  for (let i = 0; i < texto.length; i++) {
    valor = (valor * 31 + texto.charCodeAt(i)) >>> 0;
  }
  return valor;
}

/**
 * Minuto de inicio de la ventana de esa planta ese día.
 *
 * Con `ventanaVariabilidadMin > 0` (la planta belga) el inicio se desplaza
 * dentro de esa franja. El desplazamiento se deriva de la fecha local y del
 * PDIV, no del azar: si fuera aleatorio, la ventana se movería entre dos
 * renders de la misma pantalla y el banner mentiría a mitad de la escena.
 */
export function inicioDeVentana(planta: PlantaCompleta, momento: Date): number {
  if (planta.ventanaVariabilidadMin === 0) return planta.ventanaInicioMin;
  const semilla = hash(`${planta.pdiv}|${fechaEnHuso(momento)}`);
  const desplazamiento =
    (semilla % (planta.ventanaVariabilidadMin + 1)) - Math.floor(planta.ventanaVariabilidadMin / 2);
  return planta.ventanaInicioMin + desplazamiento;
}

/** ¿Está `minuto` dentro de [inicio, inicio + duracion), con vuelta de día? */
function dentro(minuto: number, inicio: number, duracion: number): boolean {
  const desde = ((inicio % MINUTOS_DIA) + MINUTOS_DIA) % MINUTOS_DIA;
  const transcurrido = (minuto - desde + MINUTOS_DIA) % MINUTOS_DIA;
  return transcurrido < duracion;
}

/**
 * Estado de una planta en un instante dado.
 *
 * El override del presentador siempre gana: durante la demostración el guion
 * manda sobre el calendario.
 */
export function estadoDePlanta(
  planta: PlantaCompleta,
  momento: Date,
  override?: EstadoPlanta,
): EstadoPlanta {
  if (override) return override;

  const minuto = minutosDelDia(momento);
  const inicio = inicioDeVentana(planta, momento);

  if (dentro(minuto, inicio, planta.ventanaDuracionMin)) return "ventana";
  if (dentro(minuto, inicio + planta.ventanaDuracionMin, MINUTOS_REACTIVANDO)) return "reactivando";
  return "online";
}

/** Minutos que faltan para que la planta reabra, o `null` si no está en ventana. */
export function minutosParaReapertura(planta: PlantaCompleta, momento: Date): number | null {
  const minuto = minutosDelDia(momento);
  const inicio = inicioDeVentana(planta, momento);
  if (!dentro(minuto, inicio, planta.ventanaDuracionMin)) return null;
  const transcurrido = (minuto - inicio + MINUTOS_DIA) % MINUTOS_DIA;
  return planta.ventanaDuracionMin - transcurrido;
}

export function estadoDeTodas(
  plantas: readonly PlantaCompleta[],
  momento: Date,
  overrides: Record<string, EstadoPlanta> = {},
): Record<string, EstadoPlanta> {
  const salida: Record<string, EstadoPlanta> = {};
  for (const p of plantas) salida[p.pdiv] = estadoDePlanta(p, momento, overrides[p.pdiv]);
  return salida;
}
```

`lib/estado-fabricas/index.ts`:

```ts
export * from "./reloj";
export * from "./ventanas";
```

- [ ] **Paso 8: Ejecutar y verificar**

Ejecuta: `pnpm test estado-fabricas`
Esperado: PASAN los 14 tests de ventanas y los 7 de reloj.

- [ ] **Paso 9: Escribir el contexto y commitear**

Deja escrito en "Decisiones tomadas y por qué" el motivo del offset frente a la hora absoluta y el del hash de fecha frente a `Math.random()`. Ambos se ven arbitrarios leyendo solo el código.

```bash
pnpm lint
git add lib/estado-fabricas docs/superpowers/contexto
git commit -m "Estado de fabricas: reloj simulado, ventanas y override del presentador"
```

---

## Tarea 5: Estado de la sesión y propagación por Realtime

**Archivos:**
- Crear: `lib/sesion-demo/tipos.ts`, `lib/sesion-demo/leer.ts`, `lib/sesion-demo/escenarios.ts`
- Crear: `lib/sesion-demo/sondeo.ts`, `lib/sesion-demo/sondeo.test.ts`
- Crear: `lib/sesion-demo/acciones.ts`
- Crear: `components/sesion/proveedor-sesion.tsx`, `components/sesion/indicador-canal.tsx`, `components/sesion/indicador-plantas.tsx`
- Modificar: `components/marco/barra-superior.tsx`, `app/(portal)/portal/page.tsx`
- Crear: `docs/superpowers/contexto/plan-3/tarea-5-contexto.md`

**Interfaces:**
- Consume: `clienteLectura`, `clienteAdmin`, `todasLasPlantas`, `estadoDeTodas`, `ahoraSimulada`.
- Produce:
  - `SesionDemo = { modo, plantasOverride, relojOffsetMin, escenarioActivo, iniciadaEn }`
  - `leerSesion(): Promise<SesionDemo>`
  - `ESCENARIOS: readonly Escenario[]`
  - `debeSondear(estado: EstadoCanal, msDesdeApertura: number): boolean`
  - Server Actions: `cambiarModo(modo)`, `fijarEstadoPlanta(pdiv, estado | null)`, `avanzarReloj(minutos)`, `cerrarVentanaEnCurso(pdiv)`, `activarEscenario(clave)`, `reiniciarSesion()`
  - `<ProveedorSesion sesionInicial plantas>` y el hook `useSesion()`

**El riesgo que esta tarea existe para neutralizar.** El Plan 1 registró que **la primera suscripción a Realtime tras un periodo de inactividad no propagó en 15 segundos**, y que los dos reintentos inmediatos propagaron en ~500 ms. Es un arranque en frío del servicio, no un defecto del esquema. Pero el interruptor del presentador se apoya en Realtime, y una primera pulsación que no reacciona frente al cliente arruina el momento central de la presentación. De ahí las cuatro medidas: suscripción al cargar la pantalla (no al primer cambio), indicador de estado del canal visible en `/demo`, respaldo por sondeo si el canal no confirma, y **escribir solo tras confirmar `SUBSCRIBED`** — si se escribe antes, el evento se pierde sin error.

- [ ] **Paso 1: Escribir los tipos y la lectura**

`lib/sesion-demo/tipos.ts`:

```ts
import type { EstadoPlanta } from "@/lib/estado-fabricas";

export interface SesionDemo {
  modo: "hoy" | "solucion";
  plantasOverride: Record<string, EstadoPlanta>;
  relojOffsetMin: number;
  escenarioActivo: string | null;
  iniciadaEn: string;
}

/** Estados que expone el canal de Realtime de supabase-js. */
export type EstadoCanal = "conectando" | "suscrito" | "error" | "cerrado";
```

`lib/sesion-demo/leer.ts`:

```ts
import { clienteLectura } from "@/lib/supabase/lectura";
import type { SesionDemo } from "./tipos";

export const SESION_POR_DEFECTO: SesionDemo = {
  modo: "hoy",
  plantasOverride: {},
  relojOffsetMin: 0,
  escenarioActivo: null,
  iniciadaEn: new Date(0).toISOString(),
};

export async function leerSesion(): Promise<SesionDemo> {
  const { data } = await clienteLectura()
    .from("sesion_demo")
    .select("modo, plantas_override, reloj_offset_min, escenario_activo, iniciada_en")
    .eq("id", 1)
    .maybeSingle();

  // Si la fila no está, el demo arranca en modo "hoy" en vez de romperse: el
  // modo "hoy" es el estado narrativo inicial, así que fallar hacia él es
  // exactamente lo que el presentador esperaría.
  if (!data) return SESION_POR_DEFECTO;

  return {
    modo: data.modo,
    plantasOverride: (data.plantas_override ?? {}) as SesionDemo["plantasOverride"],
    relojOffsetMin: data.reloj_offset_min,
    escenarioActivo: data.escenario_activo,
    iniciadaEn: data.iniciada_en,
  };
}
```

- [ ] **Paso 2: Escribir el test del respaldo por sondeo**

`lib/sesion-demo/sondeo.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { MS_ESPERA_CANAL, debeSondear } from "./sondeo";

describe("respaldo por sondeo", () => {
  it("no sondea mientras el canal está suscrito", () => {
    expect(debeSondear("suscrito", 60_000)).toBe(false);
  });

  it("no sondea durante el margen inicial: el canal puede tardar en confirmar", () => {
    expect(debeSondear("conectando", 500)).toBe(false);
  });

  it("sondea si el canal sigue conectando pasado el margen", () => {
    // Este es el arranque en frío que el Plan 1 detectó: 15 s sin evento.
    expect(debeSondear("conectando", MS_ESPERA_CANAL + 1)).toBe(true);
  });

  it("sondea de inmediato si el canal da error, sin esperar el margen", () => {
    expect(debeSondear("error", 0)).toBe(true);
  });

  it("sondea de inmediato si el canal se cerró", () => {
    expect(debeSondear("cerrado", 0)).toBe(true);
  });
});
```

- [ ] **Paso 3: Ejecutar y ver el fallo**

Ejecuta: `pnpm test sondeo`
Esperado: FALLA — no existe `./sondeo`.

- [ ] **Paso 4: Implementar el sondeo**

`lib/sesion-demo/sondeo.ts`:

```ts
import type { EstadoCanal } from "./tipos";

/**
 * Margen que se le da al canal para confirmar antes de encender el sondeo.
 *
 * El Plan 1 midió una primera suscripción que no propagó en 15 s tras
 * inactividad, y reintentos que propagaron en ~500 ms. Cuatro segundos son
 * suficientes para un canal sano y lo bastante cortos para que el presentador
 * no llegue al interruptor con la pantalla muerta.
 */
export const MS_ESPERA_CANAL = 4_000;

/** Cada cuánto se relee `sesion_demo` cuando el canal no es de fiar. */
export const MS_INTERVALO_SONDEO = 2_000;

/**
 * Es un POC: quedarse congelado en vivo cuesta mucho más que una consulta de
 * más cada dos segundos.
 */
export function debeSondear(estado: EstadoCanal, msDesdeApertura: number): boolean {
  if (estado === "suscrito") return false;
  if (estado === "error" || estado === "cerrado") return true;
  return msDesdeApertura > MS_ESPERA_CANAL;
}
```

- [ ] **Paso 5: Ejecutar y verificar**

Ejecuta: `pnpm test sondeo`
Esperado: PASAN los 5 tests.

- [ ] **Paso 6: Escribir los escenarios precargados**

`lib/sesion-demo/escenarios.ts`. Son los casos curados que sembró el Plan 2, uno por escena del guion, accesibles con un clic desde `/demo` (doc 04 §4).

```ts
import type { EstadoPlanta } from "@/lib/estado-fabricas";

export interface Escenario {
  clave: string;
  nombre: string;
  escena: string;
  /** Qué debe teclear el presentador en el buscador. */
  consulta: string;
  cantidadSugerida: number;
  modo: "hoy" | "solucion" | null;
  /** Overrides de planta que el escenario deja activos. `null` los limpia. */
  overrides: Record<string, EstadoPlanta> | null;
  nota: string;
}

export const ESCENARIOS: readonly Escenario[] = [
  {
    clave: "truncada",
    nombre: "Designación truncada",
    escena: "Escenas 1 y 2",
    consulta: "DEMO-6205-2RSH",
    cantidadSugerida: 100,
    modo: null,
    overrides: {},
    nota: "Copiado incompleto desde Word. En modo hoy no encuentra nada; en modo solución ofrece las tres completaciones.",
  },
  {
    clave: "moq",
    nombre: "MOQ superior a lo pedido",
    escena: "Escena 2, variante",
    consulta: "DEMO-MOQ-50",
    cantidadSugerida: 5,
    modo: "solucion",
    overrides: {},
    nota: "Punto 4.4. El validador lo advierte antes de enviar; hoy llega a Customer Service y termina declinado.",
  },
  {
    clave: "pack",
    nombre: "Pack quantity",
    escena: "Escena 2, variante",
    consulta: "DEMO-PACK-20",
    cantidadSugerida: 25,
    modo: "solucion",
    overrides: {},
    nota: "Punto 4.5a. Ajusta la cantidad a 40 en vez de declinar.",
  },
  {
    clave: "obsoleto_con_reemplazo",
    nombre: "Obsoleto con reemplazo",
    escena: "Escena 3",
    consulta: "DEMO-OBS-CON",
    cantidadSugerida: 50,
    modo: "solucion",
    overrides: {},
    nota: "Punto 4.6, primer sub-caso. Diferencias técnicas visibles y validación con el Ing. de Ventas.",
  },
  {
    clave: "obsoleto_sin_reemplazo",
    nombre: "Obsoleto sin reemplazo",
    escena: "Escena 3",
    consulta: "DEMO-OBS-SIN",
    cantidadSugerida: 50,
    modo: "solucion",
    overrides: {},
    nota: "Punto 4.7. El declinado legítimo: no todo se puede salvar, y mostrarlo da credibilidad.",
  },
  {
    clave: "obsoleto_reemplazo_fabrica",
    nombre: "Reemplazo indicado por fábrica",
    escena: "Escena 3, variante",
    consulta: "DEMO-OBS-FAB",
    cantidadSugerida: 50,
    modo: "solucion",
    overrides: {},
    nota: "Punto 4.6, segundo sub-caso: el reemplazo no está en sistema. Hoy este caso se pierde.",
  },
  {
    clave: "ventana",
    nombre: "Planta en ventana de mantenimiento",
    escena: "Escena 4 — momento clave",
    consulta: "DEMO-VENTANA",
    cantidadSugerida: 200,
    modo: "hoy",
    // P103 es la planta belga, la de ventana de inicio variable.
    overrides: { P103: "ventana" },
    nota: "Existe y tiene stock, pero su planta está desconectada. Se presenta primero en modo hoy y luego en modo solución.",
  },
  {
    clave: "nueva_creacion",
    nombre: "Designación de nueva creación",
    escena: "Escena 2, variante",
    consulta: "DEMO-NUEVA",
    cantidadSugerida: 30,
    modo: "solucion",
    overrides: {},
    nota: "Punto 4.9: +4 semanas por creación del material, extensión en MDG-SAP, precio en SAP y seteo en WCL.",
  },
  {
    clave: "transmision_planner",
    nombre: "Transmisión de potencia sin disponibilidad",
    escena: "Escena 5, pregunta de procedimiento",
    consulta: "DEMO-PT-PLANNER",
    cantidadSugerida: 40,
    modo: "solucion",
    overrides: {},
    nota: "Punto 4.3: por segmento va al Planner vía PT Inquery, no por PINQ a fábrica.",
  },
];

export function escenarioPorClave(clave: string): Escenario | undefined {
  return ESCENARIOS.find((e) => e.clave === clave);
}
```

- [ ] **Paso 7: Escribir las Server Actions**

`lib/sesion-demo/acciones.ts`. Todas escriben con `service_role`, que no pasa por RLS, y revalidan las rutas para que los Server Components relean.

```ts
"use server";

import { revalidatePath } from "next/cache";
import type { EstadoPlanta } from "@/lib/estado-fabricas";
import { clienteAdmin } from "@/lib/supabase/admin";
import { escenarioPorClave } from "./escenarios";
import { leerSesion } from "./leer";

async function actualizar(cambios: Record<string, unknown>): Promise<void> {
  const { error } = await clienteAdmin().from("sesion_demo").update(cambios).eq("id", 1);
  if (error) throw new Error(`No se pudo actualizar la sesión del demo: ${error.message}`);
  revalidatePath("/portal");
  revalidatePath("/operador");
  revalidatePath("/demo");
}

export async function cambiarModo(modo: "hoy" | "solucion"): Promise<void> {
  await actualizar({ modo });
}

/** `null` devuelve la planta al calendario en vez de forzarle un estado. */
export async function fijarEstadoPlanta(pdiv: string, estado: EstadoPlanta | null): Promise<void> {
  const sesion = await leerSesion();
  const overrides = { ...sesion.plantasOverride };
  if (estado === null) delete overrides[pdiv];
  else overrides[pdiv] = estado;
  await actualizar({ plantas_override: overrides });
}

/** El offset es acumulativo: cada salto se suma al anterior. */
export async function avanzarReloj(minutos: number): Promise<void> {
  const sesion = await leerSesion();
  await actualizar({ reloj_offset_min: sesion.relojOffsetMin + minutos });
}

export async function reiniciarReloj(): Promise<void> {
  await actualizar({ reloj_offset_min: 0 });
}

/**
 * Cierra la ventana en curso de una planta.
 *
 * Quitar el override no basta si la planta está además dentro de su ventana de
 * calendario: hay que forzarla a 'online'. El presentador usa esto al final de
 * la escena 4, cuando la cola se envía en lote.
 */
export async function cerrarVentanaEnCurso(pdiv: string): Promise<void> {
  await fijarEstadoPlanta(pdiv, "online");
}

export async function activarEscenario(clave: string): Promise<void> {
  const escenario = escenarioPorClave(clave);
  if (!escenario) throw new Error(`Escenario desconocido: ${clave}`);
  const sesion = await leerSesion();
  await actualizar({
    escenario_activo: clave,
    modo: escenario.modo ?? sesion.modo,
    plantas_override: escenario.overrides ?? sesion.plantasOverride,
  });
}

/**
 * Reinicia la sesión.
 *
 * Mueve `iniciada_en` a ahora y borra las solicitudes generadas en la sesión.
 * NO toca `eventos_demo` ni el histórico: los contadores leen solo eventos
 * posteriores a `iniciada_en`, así que reiniciar deja los contadores en cero
 * sin destruir el histórico sintético que alimenta al estimador.
 */
export async function reiniciarSesion(): Promise<void> {
  const admin = clienteAdmin();
  const { error } = await admin.from("solicitudes").delete().gt("id", 0);
  if (error) throw new Error(`No se pudieron borrar las solicitudes: ${error.message}`);
  await actualizar({
    iniciada_en: new Date().toISOString(),
    modo: "hoy",
    plantas_override: {},
    reloj_offset_min: 0,
    escenario_activo: null,
  });
}
```

- [ ] **Paso 8: Escribir el proveedor de sesión**

`components/sesion/proveedor-sesion.tsx`. Es un Client Component. Cuatro responsabilidades: abrir el canal al montar, exponer el estado del canal, sondear si el canal no confirma, y hacer avanzar el reloj simulado.

```tsx
"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { PlantaCompleta } from "@/lib/fuentes/plantas";
import { ahoraSimulada, type EstadoPlanta, estadoDeTodas } from "@/lib/estado-fabricas";
import { MS_INTERVALO_SONDEO, debeSondear } from "@/lib/sesion-demo/sondeo";
import type { EstadoCanal, SesionDemo } from "@/lib/sesion-demo/tipos";
import { clienteNavegador } from "@/lib/supabase/navegador";

interface ValorSesion {
  sesion: SesionDemo;
  estadoCanal: EstadoCanal;
  plantas: readonly PlantaCompleta[];
  estados: Record<string, EstadoPlanta>;
  ahora: Date;
}

const Contexto = createContext<ValorSesion | null>(null);

export function useSesion(): ValorSesion {
  const valor = useContext(Contexto);
  if (!valor) throw new Error("useSesion debe usarse dentro de <ProveedorSesion>");
  return valor;
}

/** Cada cuánto refresca el reloj de pantalla la cuenta regresiva del banner. */
const MS_TIC_RELOJ = 15_000;

export function ProveedorSesion({
  sesionInicial,
  plantas,
  children,
}: {
  sesionInicial: SesionDemo;
  plantas: readonly PlantaCompleta[];
  children: React.ReactNode;
}) {
  const [sesion, setSesion] = useState(sesionInicial);
  const [estadoCanal, setEstadoCanal] = useState<EstadoCanal>("conectando");
  const [ahora, setAhora] = useState(() => new Date());
  const abiertoEn = useRef(Date.now());

  // Suscripción TEMPRANA: se abre al montar la pantalla, no al primer cambio de
  // estado. Así el arranque en frío del servicio —que el Plan 1 midió en más de
  // 15 s tras inactividad— ocurre mientras el presentador todavía está hablando,
  // y no cuando toca el interruptor delante del cliente.
  useEffect(() => {
    const supabase = clienteNavegador();
    const canal = supabase
      .channel("sesion-demo")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "sesion_demo" },
        (evento) => {
          const fila = evento.new as Record<string, unknown>;
          setSesion({
            modo: fila.modo as SesionDemo["modo"],
            plantasOverride: (fila.plantas_override ?? {}) as SesionDemo["plantasOverride"],
            relojOffsetMin: fila.reloj_offset_min as number,
            escenarioActivo: (fila.escenario_activo as string | null) ?? null,
            iniciadaEn: fila.iniciada_en as string,
          });
        },
      )
      .subscribe((estado) => {
        if (estado === "SUBSCRIBED") setEstadoCanal("suscrito");
        else if (estado === "CHANNEL_ERROR" || estado === "TIMED_OUT") setEstadoCanal("error");
        else if (estado === "CLOSED") setEstadoCanal("cerrado");
      });

    return () => {
      void supabase.removeChannel(canal);
    };
  }, []);

  // Respaldo por sondeo. Es un POC: una consulta de más cada dos segundos
  // cuesta mucho menos que una pantalla congelada delante del cliente.
  useEffect(() => {
    const temporizador = setInterval(async () => {
      if (!debeSondear(estadoCanal, Date.now() - abiertoEn.current)) return;
      const { data } = await clienteNavegador()
        .from("sesion_demo")
        .select("modo, plantas_override, reloj_offset_min, escenario_activo, iniciada_en")
        .eq("id", 1)
        .maybeSingle();
      if (!data) return;
      setSesion({
        modo: data.modo,
        plantasOverride: (data.plantas_override ?? {}) as SesionDemo["plantasOverride"],
        relojOffsetMin: data.reloj_offset_min,
        escenarioActivo: data.escenario_activo,
        iniciadaEn: data.iniciada_en,
      });
    }, MS_INTERVALO_SONDEO);
    return () => clearInterval(temporizador);
  }, [estadoCanal]);

  // El reloj de pantalla avanza solo: la cuenta regresiva del banner de ventana
  // tiene que verse correr durante la escena 4.
  useEffect(() => {
    const temporizador = setInterval(() => setAhora(new Date()), MS_TIC_RELOJ);
    return () => clearInterval(temporizador);
  }, []);

  const valor = useMemo<ValorSesion>(() => {
    const momento = ahoraSimulada(sesion.relojOffsetMin, ahora);
    return {
      sesion,
      estadoCanal,
      plantas,
      estados: estadoDeTodas(plantas, momento, sesion.plantasOverride),
      ahora: momento,
    };
  }, [sesion, estadoCanal, plantas, ahora]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}
```

- [ ] **Paso 9: Escribir los indicadores**

`components/sesion/indicador-canal.tsx` — solo para `/demo`, no para las pantallas que ve el cliente. Muestra `suscrito` en verde, `conectando` en gris, `error` y `cerrado` en rojo, con el texto explícito de que el respaldo por sondeo está activo cuando no está suscrito.

`components/sesion/indicador-plantas.tsx` — para la barra superior. Cuenta las plantas en ventana; si hay al menos una, muestra una píldora **ámbar** con el nombre de la planta y los minutos restantes; si no, una píldora neutra de "todas las plantas en línea". Usa `minutosParaReapertura` para la cuenta regresiva. El ámbar no se usa para ninguna otra cosa en toda la aplicación.

- [ ] **Paso 10: Montar el proveedor en el portal**

Convierte `app/(portal)/portal/page.tsx` en un Server Component que lea la sesión y las plantas y envuelva el contenido:

```tsx
import { BarraSuperior } from "@/components/marco/barra-superior";
import { ProveedorSesion } from "@/components/sesion/proveedor-sesion";
import { todasLasPlantas } from "@/lib/fuentes";
import { leerSesion } from "@/lib/sesion-demo/leer";

export const dynamic = "force-dynamic";

export default async function PaginaPortal() {
  const [sesion, plantas] = await Promise.all([leerSesion(), todasLasPlantas()]);
  return (
    <ProveedorSesion sesionInicial={sesion} plantas={plantas}>
      <div className="flex min-h-full flex-col">
        <BarraSuperior perfil="cliente" />
        <main className="flex-1 px-6 py-10">
          <p className="text-sm text-texto-tenue">Buscador en construcción (tarea 11).</p>
        </main>
      </div>
    </ProveedorSesion>
  );
}
```

`export const dynamic = "force-dynamic"` es obligatorio: sin él Next.js cachearía la página y el modo del demo quedaría congelado en el del build.

Monta `<IndicadorPlantas />` en el hueco que la tarea 1 dejó marcado en `components/marco/barra-superior.tsx`. Como el indicador es un Client Component que usa `useSesion()`, la barra pasa a recibirlo como hijo o se convierte ella misma en cliente: elige lo que deje `BarraSuperior` más simple y déjalo anotado en el contexto.

- [ ] **Paso 11: Verificar la propagación en vivo**

```bash
pnpm test
pnpm build
```

Después, con `pnpm dev` levantado, abre `/portal` en dos pestañas y ejecuta desde un script temporal con `SUPABASE_DB_URL`:

```sql
update sesion_demo set modo = 'solucion' where id = 1;
update sesion_demo set plantas_override = '{"P103":"ventana"}'::jsonb where id = 1;
```

Esperado: ambas pestañas reflejan el cambio sin recargar, y la segunda sentencia hace aparecer la píldora ámbar con la cuenta regresiva. Anota en el contexto **cuánto tardó la primera propagación**: es el dato que dice si el arranque en frío sigue presente.

- [ ] **Paso 12: Escribir el contexto y commitear**

En "Qué falta / qué NO hace" deja claro que el panel `/demo` que dispara estas acciones llega en la tarea 12: aquí solo existen las acciones y la propagación.

```bash
pnpm lint
git add lib/sesion-demo components/sesion components/marco app docs/superpowers/contexto
git commit -m "Estado de sesion del demo con Realtime, sondeo de respaldo y escenarios"
```

---

## Tarea 6: `lib/metricas` — emisión de eventos y contadores

**Archivos:**
- Crear: `lib/metricas/emitir.ts`
- Crear: `lib/metricas/calculo.ts`, `lib/metricas/calculo.test.ts`
- Crear: `lib/metricas/indicadores.ts`
- Crear: `docs/superpowers/contexto/plan-3/tarea-6-contexto.md`

**Interfaces:**
- Consume: `clienteAdmin`, `clienteLectura`, `leerSesion`.
- Produce:
  - `TipoEvento` (el enum de la base)
  - `emitirEvento(entrada: EntradaEvento): Promise<void>`
  - `calcularIndicadores(eventos: EventoDemo[]): Indicadores`
  - `indicadoresDeSesion(): Promise<Indicadores>`

**Por qué esta tarea va antes que las pantallas.** El diseño §2.2 lo fija: la versión 1 emite **todos** los eventos aunque ninguna pantalla los renderice. Emitir un evento cuesta tres líneas; retro-instrumentar un pipeline de métricas cuesta un refactor. El dashboard es del Plan 4, pero los eventos que consumirá se emiten desde ahora.

**Regla dura:** `emitirEvento` **nunca** lanza. Un fallo al registrar una métrica no puede tumbar una búsqueda en mitad de la demostración. Registra el error en consola y sigue.

- [ ] **Paso 1: Escribir el test del cálculo**

`lib/metricas/calculo.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { MINUTOS_POR_SOLICITUD, calcularIndicadores, type EventoDemo } from "./calculo";

function evento(tipo: EventoDemo["tipo"], extra: Partial<EventoDemo> = {}): EventoDemo {
  return { tipo, designacion: null, pdiv: null, perfil: "cliente", detalle: {}, ...extra };
}

describe("indicadores de la sesión", () => {
  it("una sesión sin eventos deja todos los contadores en cero", () => {
    const i = calcularIndicadores([]);
    expect(i.solicitudesEvitadas).toBe(0);
    expect(i.solicitudesGeneradas).toBe(0);
    expect(i.minutosOperadorLiberados).toBe(0);
    expect(i.confirmacionesHomologo).toBe(0);
    expect(i.avisosAnticipados).toBe(0);
  });

  it("cuenta por separado las evitadas y las generadas", () => {
    const i = calcularIndicadores([
      evento("solicitud_evitada"),
      evento("solicitud_evitada"),
      evento("solicitud_generada"),
    ]);
    expect(i.solicitudesEvitadas).toBe(2);
    expect(i.solicitudesGeneradas).toBe(1);
  });

  it("convierte las solicitudes evitadas en minutos de operador liberados", () => {
    const i = calcularIndicadores([evento("solicitud_evitada"), evento("solicitud_evitada")]);
    expect(i.minutosOperadorLiberados).toBe(2 * MINUTOS_POR_SOLICITUD);
  });

  it("suma los avisos de MOQ y de pack quantity en un solo contador", () => {
    const i = calcularIndicadores([
      evento("aviso_moq"),
      evento("aviso_pack_quantity"),
      evento("aviso_moq"),
    ]);
    expect(i.avisosAnticipados).toBe(3);
  });

  it("cuenta las confirmaciones de homólogo, que son los errores prevenidos", () => {
    expect(calcularIndicadores([evento("confirmacion_homologo")]).confirmacionesHomologo).toBe(1);
  });

  it("la tasa de resolución sin solicitud es evitadas sobre el total", () => {
    const i = calcularIndicadores([
      evento("solicitud_evitada"),
      evento("solicitud_evitada"),
      evento("solicitud_evitada"),
      evento("solicitud_generada"),
    ]);
    expect(i.tasaResueltasSinSolicitud).toBeCloseTo(0.75, 5);
  });

  it("la tasa es cero, no NaN, cuando no hubo ni evitadas ni generadas", () => {
    // Una división 0/0 se vería en pantalla como "NaN%" delante del cliente.
    expect(calcularIndicadores([evento("busqueda")]).tasaResueltasSinSolicitud).toBe(0);
  });

  it("agrupa las búsquedas por hora para la gráfica del dashboard", () => {
    const i = calcularIndicadores([
      evento("busqueda", { ocurridoEn: "2026-08-04T18:10:00Z" }),
      evento("busqueda", { ocurridoEn: "2026-08-04T18:50:00Z" }),
      evento("busqueda", { ocurridoEn: "2026-08-04T20:05:00Z" }),
    ]);
    expect(i.busquedasPorHora["12"]).toBe(2); // 18:00 UTC = 12:00 en México
    expect(i.busquedasPorHora["14"]).toBe(1);
  });
});
```

- [ ] **Paso 2: Ejecutar y ver el fallo**

Ejecuta: `pnpm test calculo`
Esperado: FALLA — no existe `./calculo`.

- [ ] **Paso 3: Implementar el cálculo**

`lib/metricas/calculo.ts`:

```ts
import { minutosDelDia } from "@/lib/estado-fabricas";
import type { Database } from "@/lib/supabase/tipos";

export type TipoEvento = Database["public"]["Enums"]["tipo_evento"];

export interface EventoDemo {
  tipo: TipoEvento;
  perfil: string | null;
  designacion: string | null;
  pdiv: string | null;
  detalle: Record<string, unknown>;
  ocurridoEn?: string;
}

/**
 * Minutos que consume una solicitud de cotización en el lado del operador.
 *
 * Es un supuesto del POC, no una medición: se presenta siempre acompañado de
 * "sobre datos simulados" y su valor real es una de las preguntas de la Fase 1.
 */
export const MINUTOS_POR_SOLICITUD = 12;

export interface Indicadores {
  solicitudesEvitadas: number;
  solicitudesGeneradas: number;
  minutosOperadorLiberados: number;
  confirmacionesHomologo: number;
  avisosAnticipados: number;
  tasaResueltasSinSolicitud: number;
  busquedasPorHora: Record<string, number>;
  llamadasModelo: number;
}

export function calcularIndicadores(eventos: readonly EventoDemo[]): Indicadores {
  const contar = (...tipos: TipoEvento[]) =>
    eventos.filter((e) => tipos.includes(e.tipo)).length;

  const solicitudesEvitadas = contar("solicitud_evitada");
  const solicitudesGeneradas = contar("solicitud_generada");
  const total = solicitudesEvitadas + solicitudesGeneradas;

  const busquedasPorHora: Record<string, number> = {};
  for (const e of eventos) {
    if (e.tipo !== "busqueda" || !e.ocurridoEn) continue;
    const hora = String(Math.floor(minutosDelDia(new Date(e.ocurridoEn)) / 60));
    busquedasPorHora[hora] = (busquedasPorHora[hora] ?? 0) + 1;
  }

  return {
    solicitudesEvitadas,
    solicitudesGeneradas,
    minutosOperadorLiberados: solicitudesEvitadas * MINUTOS_POR_SOLICITUD,
    confirmacionesHomologo: contar("confirmacion_homologo"),
    avisosAnticipados: contar("aviso_moq", "aviso_pack_quantity"),
    // 0/0 daría NaN, y "NaN%" en pantalla delante del cliente es peor que un 0.
    tasaResueltasSinSolicitud: total === 0 ? 0 : solicitudesEvitadas / total,
    busquedasPorHora,
    llamadasModelo: contar("llamada_modelo"),
  };
}
```

- [ ] **Paso 4: Ejecutar y verificar**

Ejecuta: `pnpm test calculo`
Esperado: PASAN los 8 tests.

- [ ] **Paso 5: Implementar la emisión y la lectura**

`lib/metricas/emitir.ts`:

```ts
import "server-only";
import { clienteAdmin } from "@/lib/supabase/admin";
import type { TipoEvento } from "./calculo";

export interface EntradaEvento {
  tipo: TipoEvento;
  perfil?: "cliente" | "operador";
  /** Texto libre a propósito: el punto 4.8 exige registrar designaciones que no existen. */
  designacion?: string | null;
  pdiv?: string | null;
  detalle?: Record<string, unknown>;
}

/**
 * Registra un evento de la sesión.
 *
 * NUNCA lanza. Un fallo al escribir una métrica no puede tumbar una búsqueda en
 * mitad de la demostración: el evento se pierde, la pantalla sigue viva.
 */
export async function emitirEvento(entrada: EntradaEvento): Promise<void> {
  try {
    const { error } = await clienteAdmin().from("eventos_demo").insert({
      tipo: entrada.tipo,
      perfil: entrada.perfil ?? null,
      designacion: entrada.designacion ?? null,
      pdiv: entrada.pdiv ?? null,
      detalle: entrada.detalle ?? {},
    });
    if (error) console.error("[metricas] no se pudo registrar el evento:", error.message);
  } catch (fallo) {
    console.error("[metricas] excepción al registrar el evento:", fallo);
  }
}
```

`lib/metricas/indicadores.ts`:

```ts
import { leerSesion } from "@/lib/sesion-demo/leer";
import { clienteLectura } from "@/lib/supabase/lectura";
import { calcularIndicadores, type EventoDemo, type Indicadores } from "./calculo";

/**
 * Indicadores de la sesión en curso.
 *
 * Solo cuenta eventos posteriores a `sesion_demo.iniciada_en`: reiniciar la
 * sesión entre dos presentaciones del mismo día deja los contadores en cero sin
 * borrar el histórico sintético.
 */
export async function indicadoresDeSesion(): Promise<Indicadores> {
  const sesion = await leerSesion();
  const { data } = await clienteLectura()
    .from("eventos_demo")
    .select("tipo, perfil, designacion, pdiv, detalle, ocurrido_en")
    .gte("ocurrido_en", sesion.iniciadaEn)
    .order("ocurrido_en");

  const eventos: EventoDemo[] = ((data ?? []) as Record<string, unknown>[]).map((f) => ({
    tipo: f.tipo as EventoDemo["tipo"],
    perfil: (f.perfil as string | null) ?? null,
    designacion: (f.designacion as string | null) ?? null,
    pdiv: (f.pdiv as string | null) ?? null,
    detalle: (f.detalle ?? {}) as Record<string, unknown>,
    ocurridoEn: f.ocurrido_en as string,
  }));

  return calcularIndicadores(eventos);
}
```

- [ ] **Paso 6: Escribir el contexto y commitear**

En "Contrato que exponen estos archivos" lista los doce valores de `TipoEvento`, porque las tareas 11, 12 y 13 tienen que emitirlos y no deben inventar tipos nuevos: el enum vive en la base y añadir uno exige otra migración.

```bash
pnpm lint
pnpm test
git add lib/metricas docs/superpowers/contexto
git commit -m "Metricas: emision de eventos y calculo de indicadores de sesion"
```

---

## Tarea 7: `lib/validador` — la cascada determinista

**Archivos:**
- Crear: `lib/validador/normalizar.ts`, `lib/validador/normalizar.test.ts`
- Crear: `lib/validador/tipos.ts`, `lib/validador/sugerencia.ts`, `lib/validador/cascada.ts`
- Crear: `lib/validador/validador.integracion.test.ts`
- Crear: `docs/superpowers/contexto/plan-3/tarea-7-contexto.md`

**Interfaces:**
- Consume: `obtenerDesignacion`, `obtenerVarias`, `completacionesDe`, `similaresA`, `construirContexto`, `evaluarSolicitud`.
- Produce:
  - `normalizar(texto: string): string`
  - `variantesConfusion(texto: string): string[]`
  - `Sugerencia`, `ResultadoValidacion`, `TipoResultado`, `Estrategia`
  - `construirSugerencia(codigo: string, cantidad: number, puntaje: number): Promise<Sugerencia>`
  - `validar(consulta: string, cantidad: number): Promise<ResultadoValidacion>`

**Este es el componente más importante del POC** y el que más veces se ve en pantalla. Ataca el ~80% de los casos reportados.

**La regla de oro:** el validador **nunca genera una designación que no exista en la base**. Siempre elige de un conjunto cerrado. Si un técnico de SKF pregunta "¿y si se inventa un código?", la respuesta tiene que ser una arquitectura, no una promesa.

**Y la que hace la escena 2:** el truncamiento tiene mensaje propio. *"La designación parece incompleta"* no es lo mismo que *"no se encontró"*, y esa distinción es literalmente el caso del copiado desde Word.

- [ ] **Paso 1: Escribir el test de normalización**

`lib/validador/normalizar.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { MAX_VARIANTES, normalizar, variantesConfusion } from "./normalizar";

describe("normalizar", () => {
  it("pasa a mayúsculas y recorta los extremos", () => {
    expect(normalizar("  6205-2rsh  ")).toBe("62052RSH");
  });

  it("elimina espacios, guiones y barras internos", () => {
    expect(normalizar("6205 - 2RSH / C3")).toBe("62052RSHC3");
  });

  it("quita acentos", () => {
    expect(normalizar("Ródamiento")).toBe("RODAMIENTO");
  });

  it("dos capturas del mismo código con distinta puntuación colapsan a lo mismo", () => {
    expect(normalizar("6205-2RSH/C3")).toBe(normalizar("6205 2RSH C3"));
  });

  it("una cadena vacía sigue siendo vacía", () => {
    expect(normalizar("   ")).toBe("");
  });
});

describe("variantes de confusión de caracteres", () => {
  it("incluye siempre el texto original", () => {
    expect(variantesConfusion("6205")).toContain("6205");
  });

  it("propone el cambio entre O y 0", () => {
    expect(variantesConfusion("O205")).toContain("0205");
  });

  it("propone el cambio entre I y 1, y entre S y 5", () => {
    const v = variantesConfusion("I5");
    expect(v).toContain("15");
    expect(v).toContain("IS");
  });

  it("no devuelve duplicados", () => {
    const v = variantesConfusion("6205");
    expect(new Set(v).size).toBe(v.length);
  });

  it("acota la explosión combinatoria", () => {
    // Sin tope, diez caracteres ambiguos darían 1024 consultas a la base.
    expect(variantesConfusion("OOOOOOOOOO").length).toBeLessThanOrEqual(MAX_VARIANTES);
  });
});
```

- [ ] **Paso 2: Ejecutar y ver el fallo**

Ejecuta: `pnpm test normalizar`
Esperado: FALLA — no existe `./normalizar`.

- [ ] **Paso 3: Implementar la normalización**

`lib/validador/normalizar.ts`:

```ts
/**
 * Estrategia 2 de la cascada: muchos "errores" del cliente desaparecen aquí.
 * La designación se compara sin espacios, guiones, barras, acentos ni
 * diferencias de mayúsculas.
 */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[\s\-/.]/g, "")
    .trim();
}

/**
 * Pares de caracteres que se confunden al leer un código impreso o al teclearlo
 * desde un PDF. Es una de las causas de designación mal ingresada que la
 * propuesta reporta.
 */
const CONFUSIONES: readonly (readonly [string, string])[] = [
  ["O", "0"],
  ["I", "1"],
  ["L", "1"],
  ["S", "5"],
  ["B", "8"],
  ["Z", "2"],
  ["G", "6"],
];

/**
 * Tope de variantes generadas.
 *
 * Cada variante es una consulta a la base. Sin tope, un código con diez
 * caracteres ambiguos produciría 1024 consultas y el buscador dejaría de ser
 * instantáneo — que es justo lo que la escena 2 necesita que sea.
 */
export const MAX_VARIANTES = 32;

export function variantesConfusion(texto: string): string[] {
  let variantes = [texto];

  for (let i = 0; i < texto.length; i++) {
    const caracter = texto[i];
    const par = CONFUSIONES.find(([a, b]) => a === caracter || b === caracter);
    if (!par) continue;
    const alterno = par[0] === caracter ? par[1] : par[0];

    const ampliadas: string[] = [];
    for (const v of variantes) {
      ampliadas.push(v);
      if (ampliadas.length + variantes.length > MAX_VARIANTES * 2) break;
      ampliadas.push(v.slice(0, i) + alterno + v.slice(i + 1));
    }
    variantes = [...new Set(ampliadas)];
    if (variantes.length >= MAX_VARIANTES) break;
  }

  return [...new Set(variantes)].slice(0, MAX_VARIANTES);
}
```

- [ ] **Paso 4: Ejecutar y verificar**

Ejecuta: `pnpm test normalizar`
Esperado: PASAN los 10 tests.

- [ ] **Paso 5: Escribir los tipos y el enriquecido de sugerencias**

`lib/validador/tipos.ts`:

```ts
import type { Designacion, EvaluacionQMS, Existencia, Planta } from "@/lib/reglas-qms";

export type TipoResultado = "exacta" | "truncada" | "similar" | "no_encontrada";

export type Estrategia =
  | "exacta"
  | "normalizacion"
  | "prefijo"
  | "trigramas"
  | "llm"
  | "ninguna";

/**
 * Una sugerencia no es solo un código: trae el contexto que hoy obliga al CSR a
 * investigar a mano. Eso es lo que convierte un buscador en un asesor.
 */
export interface Sugerencia {
  designacion: Designacion;
  puntaje: number;
  existencias: Existencia[];
  planta: Planta | null;
  evaluacion: EvaluacionQMS;
}

export interface ResultadoValidacion {
  consulta: string;
  tipo: TipoResultado;
  estrategia: Estrategia;
  /** Texto para el usuario. Distingue "parece incompleta" de "no existe". */
  mensaje: string;
  candidatos: Sugerencia[];
}
```

`lib/validador/sugerencia.ts`:

```ts
import { construirContexto } from "@/lib/fuentes";
import { evaluarSolicitud } from "@/lib/reglas-qms";
import type { Sugerencia } from "./tipos";

/**
 * Enriquece un código con todo su contexto QMS.
 *
 * La evaluación se hace aquí, en el validador, y no en la pantalla: así el
 * aviso de MOQ, el redondeo a pack quantity y la advertencia de nueva creación
 * llegan al cliente ANTES de enviar la solicitud, que es lo que evita el
 * declinado del punto 4.4 en la bandeja del operador.
 */
export async function construirSugerencia(
  codigo: string,
  cantidad: number,
  puntaje: number,
): Promise<Sugerencia | null> {
  const contexto = await construirContexto(codigo, cantidad);
  if (!contexto.designacion) return null;
  return {
    designacion: contexto.designacion,
    puntaje,
    existencias: contexto.existencias,
    planta: contexto.planta,
    evaluacion: evaluarSolicitud(contexto),
  };
}

export async function construirVarias(
  codigos: readonly { codigo: string; puntaje: number }[],
  cantidad: number,
): Promise<Sugerencia[]> {
  const resueltas = await Promise.all(
    codigos.map((c) => construirSugerencia(c.codigo, cantidad, c.puntaje)),
  );
  return resueltas.filter((s): s is Sugerencia => s !== null);
}
```

- [ ] **Paso 6: Implementar la cascada**

`lib/validador/cascada.ts`:

```ts
import { completacionesDe, obtenerDesignacion, similaresA } from "@/lib/fuentes";
import { normalizar, variantesConfusion } from "./normalizar";
import { construirSugerencia, construirVarias } from "./sugerencia";
import type { ResultadoValidacion } from "./tipos";

/** Cuántas alternativas se ofrecen. Tres es lo que el guion muestra en pantalla. */
export const MAX_SUGERENCIAS = 3;

/**
 * Cascada de estrategias del validador, en orden de menor a mayor
 * incertidumbre. Se detiene en la primera que resuelve.
 *
 * La estrategia 5 (similitud semántica sobre la descripción) queda reservada
 * para la versión 2: exige pgvector y a la escala de este catálogo no aporta
 * sobre los trigramas. La estrategia 6 (respaldo con LLM) la añade la tarea 8.
 */
export async function validar(consulta: string, cantidad: number): Promise<ResultadoValidacion> {
  const limpia = consulta.trim();
  if (limpia === "") {
    return {
      consulta,
      tipo: "no_encontrada",
      estrategia: "ninguna",
      mensaje: "Escribe una designación para consultar.",
      candidatos: [],
    };
  }

  // ── 1. Coincidencia exacta ────────────────────────────────────────────────
  const exacta = await obtenerDesignacion(limpia);
  if (exacta) {
    const sugerencia = await construirSugerencia(exacta.designacion, cantidad, 1);
    return {
      consulta,
      tipo: "exacta",
      estrategia: "exacta",
      mensaje: `Designación ${exacta.designacion} encontrada.`,
      candidatos: sugerencia ? [sugerencia] : [],
    };
  }

  // ── 2. Normalización y confusión de caracteres ────────────────────────────
  // Se prueban las variantes contra el catálogo; el código real siempre sale de
  // la base, nunca de la variante generada.
  const normalizada = normalizar(limpia);
  for (const variante of variantesConfusion(normalizada)) {
    const encontrada = await obtenerDesignacion(variante);
    if (!encontrada) continue;
    const sugerencia = await construirSugerencia(encontrada.designacion, cantidad, 0.95);
    return {
      consulta,
      tipo: "exacta",
      estrategia: "normalizacion",
      mensaje: `Se interpretó "${limpia}" como ${encontrada.designacion}.`,
      candidatos: sugerencia ? [sugerencia] : [],
    };
  }

  // ── 3. Captura incompleta ─────────────────────────────────────────────────
  // El caso del copiado truncado desde Word. Merece mensaje propio: "parece
  // incompleta" y "no existe" llevan al usuario a acciones distintas.
  const completaciones = await completacionesDe(limpia, MAX_SUGERENCIAS);
  if (completaciones.length > 0) {
    return {
      consulta,
      tipo: "truncada",
      estrategia: "prefijo",
      mensaje:
        "La designación parece incompleta: falta el sufijo. Estas son las designaciones " +
        "que comienzan con lo que escribiste.",
      candidatos: await construirVarias(
        completaciones.map((codigo) => ({ codigo, puntaje: 0.9 })),
        cantidad,
      ),
    };
  }

  // ── 4. Similitud por trigramas ────────────────────────────────────────────
  const similares = await similaresA(limpia, MAX_SUGERENCIAS);
  if (similares.length > 0) {
    return {
      consulta,
      tipo: "similar",
      estrategia: "trigramas",
      mensaje: "No se encontró esa designación exacta. Las más parecidas del catálogo son:",
      candidatos: await construirVarias(
        similares.map((s) => ({ codigo: s.designacion, puntaje: s.puntaje })),
        cantidad,
      ),
    };
  }

  return {
    consulta,
    tipo: "no_encontrada",
    estrategia: "ninguna",
    mensaje:
      `No se encontró la designación "${limpia}" ni ninguna parecida en el catálogo. ` +
      "Según el procedimiento (punto 4.8) una solicitud con designación incorrecta se declina.",
    candidatos: [],
  };
}
```

- [ ] **Paso 7: Escribir los tests de integración de la cascada**

`lib/validador/validador.integracion.test.ts`:

```ts
import { config } from "dotenv";
import { beforeAll, describe, expect, it } from "vitest";
import { validar } from "./cascada";

beforeAll(() => config({ path: ".env.local", quiet: true }));

describe("estrategia 1 — exacta", () => {
  it("resuelve un caso curado por su código exacto", async () => {
    const r = await validar("DEMO-6205-2RSH/C3", 100);
    expect(r.tipo).toBe("exacta");
    expect(r.estrategia).toBe("exacta");
    expect(r.candidatos[0].designacion.designacion).toBe("DEMO-6205-2RSH/C3");
  });

  it("la sugerencia trae existencias y evaluación QMS, no solo el código", async () => {
    const r = await validar("DEMO-6205-2RSH/C3", 100);
    expect(r.candidatos[0].evaluacion.punto).toBeTruthy();
    expect(Array.isArray(r.candidatos[0].existencias)).toBe(true);
  });
});

describe("estrategia 2 — normalización", () => {
  it("resuelve el mismo código escrito con espacios en vez de guiones", async () => {
    const r = await validar("demo 6205 2rsh c3", 100);
    expect(r.tipo).toBe("exacta");
    expect(r.candidatos[0].designacion.designacion).toBe("DEMO-6205-2RSH/C3");
  });
});

describe("estrategia 3 — captura incompleta", () => {
  it("detecta el truncamiento y lo distingue de un no encontrado", async () => {
    const r = await validar("DEMO-6205-2RSH", 100);
    expect(r.tipo).toBe("truncada");
    expect(r.mensaje).toContain("incompleta");
    expect(r.candidatos.length).toBeGreaterThanOrEqual(3);
  });

  it("las completaciones son designaciones reales del catálogo", async () => {
    const r = await validar("DEMO-6205-2RSH", 100);
    for (const c of r.candidatos) {
      expect(c.designacion.designacion.startsWith("DEMO-6205-2RSH")).toBe(true);
    }
  });
});

describe("estrategia 4 — trigramas", () => {
  it("propone parecidos ante una transposición de caracteres", async () => {
    const r = await validar("DEMO-6250-2RSH/C3", 100);
    expect(["similar", "truncada", "exacta"]).toContain(r.tipo);
    expect(r.candidatos.length).toBeGreaterThan(0);
  });
});

describe("regla anti-alucinación", () => {
  it("nunca devuelve un código que no exista en el catálogo", async () => {
    for (const consulta of ["DEMO-6205-2RSH", "DEMO-6250-2RSH/C3", "demo 6205 2rsh c3"]) {
      const r = await validar(consulta, 10);
      for (const c of r.candidatos) {
        expect(c.designacion.designacion.length).toBeGreaterThan(0);
        // construirSugerencia solo devuelve candidatos que la base resolvió:
        // si el código no existiera, obtenerDesignacion habría dado null y el
        // candidato se habría filtrado.
        expect(c.evaluacion).toBeDefined();
      }
    }
  });

  it("ante un texto sin ninguna relación devuelve no_encontrada y cita el 4.8", async () => {
    const r = await validar("ZZZZ-QQQQ-9999-NO-EXISTE", 10);
    expect(r.tipo).toBe("no_encontrada");
    expect(r.candidatos).toHaveLength(0);
    expect(r.mensaje).toContain("4.8");
  });
});

describe("contexto anticipado que evita el declinado", () => {
  it("el MOQ se advierte antes de enviar, con el punto del procedimiento", async () => {
    const r = await validar("DEMO-MOQ-50", 5);
    expect(r.candidatos[0].evaluacion.ruta).toBe("declinar_moq");
    expect(r.candidatos[0].evaluacion.punto).toBe("4.4");
  });

  it("el pack quantity ajusta la cantidad en vez de declinar", async () => {
    const r = await validar("DEMO-PACK-20", 25);
    expect(r.candidatos[0].evaluacion.declinada).toBe(false);
    expect(r.candidatos[0].evaluacion.cantidadEfectiva).toBe(40);
  });

  it("la nueva creación suma 4 semanas al tiempo de entrega", async () => {
    const r = await validar("DEMO-NUEVA", 30);
    expect(r.candidatos[0].evaluacion.semanasExtraTE).toBe(4);
  });
});
```

- [ ] **Paso 8: Ejecutar ambas suites**

```bash
pnpm test
pnpm test:integracion
```

Esperado: todo en verde. Si el test de pack quantity no da 40, revisa el `pack_quantity` sembrado de `DEMO-PACK-20`: el Plan 2 lo fijó en 20 y 25 redondea a 40.

- [ ] **Paso 9: Escribir el contexto y commitear**

Deja explícito en "Qué falta / qué NO hace" que la estrategia 5 (semántica con pgvector) no existe y es una decisión, no un olvido, y que la 6 llega en la tarea 8.

```bash
pnpm lint
git add lib/validador docs/superpowers/contexto
git commit -m "Validador: cascada determinista con contexto QMS por sugerencia"
```

---

## Tarea 8: Estrategia 6 — respaldo con LLM sobre conjunto cerrado

**Archivos:**
- Crear: `lib/ai/gateway.ts`
- Crear: `lib/validador/respaldo-llm.ts`, `lib/validador/respaldo-llm.test.ts`
- Modificar: `lib/validador/cascada.ts`
- Crear: `docs/superpowers/contexto/plan-3/tarea-8-contexto.md`

**Interfaces:**
- Consume: `similaresA`, `construirVarias`, AI SDK v7.
- Produce:
  - `MODELO_CHAT: string`, `modeloConfigurado(): boolean`
  - `elegirDelConjunto(consulta, candidatos, modelo?): Promise<{ codigo: string; explicacion: string } | null>`

**Nota de implementación — obligatoria.** Antes de escribir código, carga la skill `vercel:ai-sdk`. El proyecto usa **AI SDK v7** (`ai@^7`) con `@ai-sdk/react@^4`, y la API de v7 difiere de la de versiones anteriores en puntos que no se pueden adivinar. No escribas la llamada de memoria.

**La arquitectura que hay que poder defender.** Al modelo se le entrega el texto del cliente y un conjunto **cerrado** de candidatos que ya salieron de la base, y se le pide **elegir uno o ninguno**. No se le pide generar una designación. La salida se valida contra el conjunto: si devolviera algo fuera de él, se descarta. Esa doble barrera —esquema cerrado más validación de la salida— es lo que se le responde a un técnico de SKF que pregunte si el sistema puede inventar un código.

- [ ] **Paso 1: Escribir la configuración del Gateway**

`lib/ai/gateway.ts`:

```ts
import "server-only";

/**
 * Modelo enrutado por Vercel AI Gateway. Cambiarlo no requiere tocar código:
 * el identificador vive en CHAT_MODEL de `.env.local`.
 */
export const MODELO_CHAT = process.env.CHAT_MODEL ?? "anthropic/claude-sonnet-5";

/**
 * El Gateway puede no estar configurado en un entorno de desarrollo. Todo lo
 * que dependa del modelo tiene que degradar, no romper: el validador
 * determinista y el estimador siguen funcionando sin él.
 */
export function modeloConfigurado(): boolean {
  return Boolean(process.env.AI_GATEWAY_API_KEY);
}
```

- [ ] **Paso 2: Escribir el test con un modelo simulado**

`lib/validador/respaldo-llm.test.ts`. Se testea con el modelo simulado que trae el propio AI SDK, así que corre dentro de `pnpm test` sin tocar la red.

Consulta la skill `vercel:ai-sdk` para el nombre exacto del simulador en v7 y su forma de construcción. El test debe cubrir estos cinco comportamientos:

```ts
import { describe, expect, it } from "vitest";
import { elegirDelConjunto } from "./respaldo-llm";

// Construye el modelo simulado según lo que indique la skill vercel:ai-sdk
// para AI SDK v7. `respuesta` es el objeto que el modelo devolvería.
function modeloQueResponde(respuesta: unknown) { /* … */ }

describe("respaldo con LLM", () => {
  it("devuelve el candidato elegido cuando está dentro del conjunto", async () => {
    const modelo = modeloQueResponde({ codigo: "DEMO-6205-2RSH/C3", explicacion: "Sufijo C3." });
    const r = await elegirDelConjunto("6205 2rsh c tres", ["DEMO-6205-2RSH/C3", "DEMO-MOQ-50"], modelo);
    expect(r?.codigo).toBe("DEMO-6205-2RSH/C3");
  });

  it("descarta la elección si el modelo devuelve un código fuera del conjunto", async () => {
    // Segunda barrera anti-alucinación: aunque el esquema lo impida, se valida.
    const modelo = modeloQueResponde({ codigo: "INVENTADO-999", explicacion: "…" });
    expect(await elegirDelConjunto("algo", ["DEMO-MOQ-50"], modelo)).toBeNull();
  });

  it("devuelve null cuando el modelo declina elegir", async () => {
    const modelo = modeloQueResponde({ codigo: null, explicacion: "Ninguno corresponde." });
    expect(await elegirDelConjunto("algo", ["DEMO-MOQ-50"], modelo)).toBeNull();
  });

  it("no llama al modelo si el conjunto de candidatos viene vacío", async () => {
    // Sin conjunto cerrado no hay nada que elegir, y llamar sería pagar por nada.
    expect(await elegirDelConjunto("algo", [], undefined)).toBeNull();
  });

  it("devuelve null si el modelo falla, en vez de propagar el error", async () => {
    const modelo = modeloQueResponde(new Error("gateway caído"));
    expect(await elegirDelConjunto("algo", ["DEMO-MOQ-50"], modelo)).toBeNull();
  });
});
```

- [ ] **Paso 3: Ejecutar y ver el fallo**

Ejecuta: `pnpm test respaldo-llm`
Esperado: FALLA — no existe `./respaldo-llm`.

- [ ] **Paso 4: Implementar el respaldo**

`lib/validador/respaldo-llm.ts`. Usa `generateObject` con un esquema de Zod en el que `codigo` es un **enum construido a partir del conjunto de candidatos**, más `null`. El modelo no puede devolver nada fuera de esa lista, y aun así se valida la salida.

```ts
import "server-only";
import { z } from "zod";
import { MODELO_CHAT, modeloConfigurado } from "@/lib/ai/gateway";

const INSTRUCCIONES =
  "Eres un asistente de catálogo de componentes industriales. El usuario escribió una " +
  "designación de producto que no se encontró exactamente. Elige cuál de las designaciones " +
  "de la lista quiso escribir. Si ninguna corresponde con claridad, devuelve null en codigo. " +
  "NUNCA propongas una designación que no esté en la lista. Responde en español.";

/**
 * Estrategia 6 de la cascada: solo se llega aquí si las cuatro anteriores
 * fallaron.
 *
 * Barrera 1: el esquema restringe la respuesta al conjunto cerrado.
 * Barrera 2: la salida se vuelve a validar contra ese conjunto.
 *
 * Es deliberadamente redundante. Esa redundancia es la respuesta a "¿y si se
 * inventa un código?".
 */
export async function elegirDelConjunto(
  consulta: string,
  candidatos: readonly string[],
  modelo?: unknown,
): Promise<{ codigo: string; explicacion: string } | null> {
  if (candidatos.length === 0) return null;
  if (!modelo && !modeloConfigurado()) return null;

  const esquema = z.object({
    codigo: z.enum(candidatos as [string, ...string[]]).nullable(),
    explicacion: z.string(),
  });

  try {
    // Consulta la skill vercel:ai-sdk para la firma exacta de generateObject en
    // AI SDK v7. Con el Gateway, el modelo se pasa como cadena "proveedor/modelo".
    const { object } = await generateObject({
      model: modelo ?? MODELO_CHAT,
      schema: esquema,
      system: INSTRUCCIONES,
      prompt: `Texto del usuario: "${consulta}"\nDesignaciones disponibles:\n${candidatos.join("\n")}`,
    });

    if (!object.codigo) return null;
    // Barrera 2.
    if (!candidatos.includes(object.codigo)) return null;
    return { codigo: object.codigo, explicacion: object.explicacion };
  } catch (fallo) {
    // Si el Gateway falla, la cascada se queda con lo que dieron los trigramas.
    // Nunca se propaga el error: el buscador no puede romperse en vivo.
    console.error("[validador] el respaldo con LLM falló:", fallo);
    return null;
  }
}
```

- [ ] **Paso 5: Ejecutar y verificar**

Ejecuta: `pnpm test respaldo-llm`
Esperado: PASAN los 5 tests.

- [ ] **Paso 6: Enganchar la estrategia 6 en la cascada**

En `lib/validador/cascada.ts`, **antes** del `return` de `no_encontrada`, añade el respaldo. Se le entrega un conjunto de candidatos más amplio que el que se muestra en pantalla, porque el modelo elige mejor con más contexto:

```ts
  // ── 6. Respaldo con LLM sobre conjunto cerrado ────────────────────────────
  // Solo se llega aquí si las cuatro estrategias deterministas fallaron. Los
  // candidatos salen de la base: el modelo elige, nunca inventa.
  const conjunto = await similaresA(normalizada, 12);
  if (conjunto.length > 0) {
    const eleccion = await elegirDelConjunto(
      limpia,
      conjunto.map((c) => c.designacion),
    );
    if (eleccion) {
      const sugerencia = await construirSugerencia(eleccion.codigo, cantidad, 0.5);
      if (sugerencia) {
        await emitirEvento({
          tipo: "llamada_modelo",
          perfil: "cliente",
          designacion: limpia,
          detalle: { estrategia: "validador", elegido: eleccion.codigo },
        });
        return {
          consulta,
          tipo: "similar",
          estrategia: "llm",
          mensaje: eleccion.explicacion,
          candidatos: [sugerencia],
        };
      }
    }
  }
```

Nota que la búsqueda del conjunto usa `normalizada`, no `limpia`: si el texto original ni siquiera pasó el umbral de trigramas, la versión normalizada tiene más posibilidades de traer candidatos.

Añade también los dos imports que este bloque introduce en `cascada.ts`:

```ts
import { emitirEvento } from "@/lib/metricas/emitir";
import { elegirDelConjunto } from "./respaldo-llm";
```

Y en `respaldo-llm.ts`, el import de `generateObject`: la skill `vercel:ai-sdk` indica de qué paquete se importa en v7. Si `cascada.ts` pasa a importar un módulo marcado con `server-only`, la cascada queda restringida al servidor — que es donde ya se ejecuta, porque solo la invocan Server Actions y rutas de API. Confírmalo con `pnpm build`: si algo del cliente la importara, la compilación fallaría con un error explícito.

- [ ] **Paso 7: Verificar la cascada completa**

```bash
pnpm test
pnpm test:integracion
```

Esperado: los tests de integración de la tarea 7 siguen en verde. La estrategia 6 no debe activarse en ninguno de ellos: si un test que antes daba `trigramas` ahora da `llm`, la estrategia 4 dejó de resolver algo que sí resolvía y hay una regresión.

Prueba manualmente el respaldo con un texto que los trigramas no resuelvan por sí solos, con `AI_GATEWAY_API_KEY` presente en `.env.local`, y anota en el contexto qué consulta lo activó.

- [ ] **Paso 8: Escribir el contexto y commitear**

```bash
pnpm lint
git add lib/ai lib/validador docs/superpowers/contexto
git commit -m "Estrategia 6 del validador: eleccion con LLM sobre conjunto cerrado"
```

---

## Tarea 9: `lib/estimador` — tiempo de entrega con incertidumbre honesta

**Archivos:**
- Crear: `lib/estimador/calculo.ts`, `lib/estimador/calculo.test.ts`
- Crear: `lib/estimador/estimador.ts`
- Crear: `lib/estimador/estimador.integracion.test.ts`
- Crear: `components/estimador/estimacion-te.tsx`
- Crear: `docs/superpowers/contexto/plan-3/tarea-9-contexto.md`

**Interfaces:**
- Consume: `historicoDe`, `historicoDeFamilia`, `plantaCompleta`, `evaluarSolicitud`.
- Produce:
  - `percentil(ordenados: number[], p: number): number`
  - `estimarDesdeCasos(casos: number[], base: BaseEstimacion): Estimacion | null`
  - `ajustarPorProcedimiento(estimacion, { desempenoTe, semanasExtra }): Estimacion`
  - `estimarTE(codigo: string, cantidad: number): Promise<Estimacion | null>`
  - `<EstimacionTE estimacion={…} horaConfirmacion={…} />`

**Lo que hace este componente aceptable comercialmente.** Presentar una estimación como si fuera un tiempo confirmado sería un problema serio para SKF frente a sus clientes. El diseño obliga a que sea imposible confundirlas: toda estimación muestra **el rango** (nunca un número falsamente preciso), **la base** (cuántos casos la sustentan) y **el compromiso de confirmación**. El componente `<EstimacionTE>` es el único lugar donde se renderiza una estimación, precisamente para que esos tres elementos no se puedan omitir por descuido en una pantalla.

- [ ] **Paso 1: Escribir el test del cálculo**

`lib/estimador/calculo.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { ajustarPorProcedimiento, estimarDesdeCasos, percentil } from "./calculo";

describe("percentil", () => {
  it("la mediana de una lista impar es el elemento central", () => {
    expect(percentil([1, 2, 3, 4, 5], 0.5)).toBe(3);
  });

  it("la mediana de una lista par interpola entre los dos centrales", () => {
    expect(percentil([2, 4, 6, 8], 0.5)).toBe(5);
  });

  it("los extremos devuelven el mínimo y el máximo", () => {
    expect(percentil([2, 4, 6, 8], 0)).toBe(2);
    expect(percentil([2, 4, 6, 8], 1)).toBe(8);
  });

  it("una lista de un solo elemento devuelve ese elemento en cualquier percentil", () => {
    expect(percentil([7], 0.25)).toBe(7);
  });
});

describe("estimación desde casos", () => {
  it("sin casos no se inventa una estimación", () => {
    // Devolver un rango sin base sería exactamente lo que el diseño prohíbe.
    expect(estimarDesdeCasos([], "designacion")).toBeNull();
  });

  it("usa la mediana como valor central, no el promedio", () => {
    // Un caso extremo de 40 semanas no debe arrastrar la estimación.
    const e = estimarDesdeCasos([4, 4, 5, 5, 6, 40], "designacion");
    expect(e?.mediana).toBe(5);
  });

  it("el rango sale de los percentiles 25 y 75", () => {
    const e = estimarDesdeCasos([2, 3, 4, 5, 6, 7, 8, 9], "designacion");
    expect(e?.semanasMin).toBeLessThan(e?.mediana as number);
    expect(e?.semanasMax).toBeGreaterThan(e?.mediana as number);
  });

  it("registra cuántos casos sustentan la estimación", () => {
    expect(estimarDesdeCasos([4, 5, 6], "designacion")?.casos).toBe(3);
  });
});

describe("nivel de confianza", () => {
  it("es alta con muchos casos de la propia designación", () => {
    const casos = Array.from({ length: 40 }, () => 5);
    expect(estimarDesdeCasos(casos, "designacion")?.confianza).toBe("alta");
  });

  it("es media con pocos casos de la propia designación", () => {
    expect(estimarDesdeCasos([5, 5, 5, 5, 5, 5, 5, 5, 5, 5], "designacion")?.confianza).toBe("media");
  });

  it("es baja con muy pocos casos", () => {
    expect(estimarDesdeCasos([5, 6], "designacion")?.confianza).toBe("baja");
  });

  it("inferir de la familia nunca da confianza alta, por muchos casos que haya", () => {
    const casos = Array.from({ length: 500 }, () => 5);
    expect(estimarDesdeCasos(casos, "familia")?.confianza).toBe("media");
  });
});

describe("ajustes del procedimiento", () => {
  it("el desempeño de la planta multiplica el rango completo", () => {
    const base = estimarDesdeCasos([4, 4, 4, 4], "designacion");
    const a = ajustarPorProcedimiento(base as never, { desempenoTe: 1.5, semanasExtra: 0 });
    expect(a.mediana).toBe(6);
  });

  it("la nueva creación suma sus 4 semanas después del multiplicador", () => {
    const base = estimarDesdeCasos([4, 4, 4, 4], "designacion");
    const a = ajustarPorProcedimiento(base as never, { desempenoTe: 1, semanasExtra: 4 });
    expect(a.mediana).toBe(8);
    expect(a.semanasMin).toBe(8);
  });

  it("el ajuste conserva la base y el número de casos", () => {
    const base = estimarDesdeCasos([4, 5, 6], "familia");
    const a = ajustarPorProcedimiento(base as never, { desempenoTe: 1.2, semanasExtra: 0 });
    expect(a.base).toBe("familia");
    expect(a.casos).toBe(3);
  });

  it("redondea a medias semanas: un TE de 5.37 semanas es falsa precisión", () => {
    const base = estimarDesdeCasos([4, 4, 4, 4], "designacion");
    const a = ajustarPorProcedimiento(base as never, { desempenoTe: 1.34, semanasExtra: 0 });
    expect(a.mediana % 0.5).toBe(0);
  });

  it("nunca produce un rango invertido", () => {
    const base = estimarDesdeCasos([3, 4, 5, 6, 7], "designacion");
    const a = ajustarPorProcedimiento(base as never, { desempenoTe: 0.7, semanasExtra: 1 });
    expect(a.semanasMin).toBeLessThanOrEqual(a.mediana);
    expect(a.mediana).toBeLessThanOrEqual(a.semanasMax);
  });
});
```

- [ ] **Paso 2: Ejecutar y ver el fallo**

Ejecuta: `pnpm test estimador`
Esperado: FALLA — no existe `./calculo`.

- [ ] **Paso 3: Implementar el cálculo**

`lib/estimador/calculo.ts`:

```ts
export type BaseEstimacion = "designacion" | "familia" | "global";
export type Confianza = "alta" | "media" | "baja";

export interface Estimacion {
  semanasMin: number;
  mediana: number;
  semanasMax: number;
  casos: number;
  base: BaseEstimacion;
  confianza: Confianza;
}

/** Casos mínimos para poder afirmar algo con confianza alta. */
export const CASOS_CONFIANZA_ALTA = 30;
export const CASOS_CONFIANZA_MEDIA = 8;

/** Percentil por interpolación lineal. La lista no necesita venir ordenada. */
export function percentil(valores: readonly number[], p: number): number {
  if (valores.length === 0) return Number.NaN;
  const ordenados = [...valores].sort((a, b) => a - b);
  if (ordenados.length === 1) return ordenados[0];
  const posicion = p * (ordenados.length - 1);
  const inferior = Math.floor(posicion);
  const superior = Math.ceil(posicion);
  if (inferior === superior) return ordenados[inferior];
  return ordenados[inferior] + (ordenados[superior] - ordenados[inferior]) * (posicion - inferior);
}

/** Media semana. Un TE de "5.37 semanas" es precisión que el dato no sostiene. */
function aMediaSemana(valor: number): number {
  return Math.round(valor * 2) / 2;
}

function nivelDeConfianza(casos: number, base: BaseEstimacion): Confianza {
  // Inferir de la familia o del catálogo entero nunca da confianza alta, por
  // muchos casos que haya: la incertidumbre no está en el tamaño de la muestra
  // sino en que la muestra no es de este producto.
  if (base !== "designacion") return base === "familia" ? "media" : "baja";
  if (casos >= CASOS_CONFIANZA_ALTA) return "alta";
  if (casos >= CASOS_CONFIANZA_MEDIA) return "media";
  return "baja";
}

/**
 * Estimación a partir del histórico.
 *
 * Mediana en vez de promedio: es robusta ante los casos extremos que el Plan 2
 * sembró deliberadamente en la cola del SLA. Rango por percentiles 25 y 75:
 * expresa la incertidumbre en vez de esconderla.
 *
 * Devuelve `null` sin casos. Inventar un rango sin base es exactamente lo que
 * las reglas de honestidad del demo prohíben.
 */
export function estimarDesdeCasos(
  casos: readonly number[],
  base: BaseEstimacion,
): Estimacion | null {
  if (casos.length === 0) return null;
  return {
    semanasMin: aMediaSemana(percentil(casos, 0.25)),
    mediana: aMediaSemana(percentil(casos, 0.5)),
    semanasMax: aMediaSemana(percentil(casos, 0.75)),
    casos: casos.length,
    base,
    confianza: nivelDeConfianza(casos.length, base),
  };
}

/**
 * Ajustes del procedimiento sobre la estimación base.
 *
 * `desempenoTe` es el multiplicador histórico de la planta; `semanasExtra` son
 * las 4 semanas del punto 4.9 por designación de nueva creación. El extra se
 * suma DESPUÉS del multiplicador: son semanas de trámite administrativo
 * (creación del material, extensión en MDG-SAP, precio en SAP, seteo en WCL),
 * no de fabricación, así que el desempeño de la planta no las afecta.
 */
export function ajustarPorProcedimiento(
  estimacion: Estimacion,
  ajustes: { desempenoTe: number; semanasExtra: number },
): Estimacion {
  const aplicar = (valor: number) =>
    aMediaSemana(valor * ajustes.desempenoTe + ajustes.semanasExtra);
  return {
    ...estimacion,
    semanasMin: aplicar(estimacion.semanasMin),
    mediana: aplicar(estimacion.mediana),
    semanasMax: aplicar(estimacion.semanasMax),
  };
}
```

- [ ] **Paso 4: Ejecutar y verificar**

Ejecuta: `pnpm test estimador`
Esperado: PASAN los 16 tests.

- [ ] **Paso 5: Implementar el estimador contra la base**

`lib/estimador/estimador.ts`:

```ts
import { construirContexto, historicoDe, historicoDeFamilia, plantaCompleta } from "@/lib/fuentes";
import { evaluarSolicitud } from "@/lib/reglas-qms";
import { ajustarPorProcedimiento, estimarDesdeCasos, type Estimacion } from "./calculo";
import { CASOS_CONFIANZA_MEDIA } from "./calculo";

/**
 * Estimación de tiempo de entrega de una designación.
 *
 * Escala hacia atrás: histórico de la designación; si no alcanza, histórico de
 * su familia. Nunca inventa un rango: si no hay casos de ninguna de las dos,
 * devuelve null y la pantalla debe decir que no hay base histórica suficiente.
 */
export async function estimarTE(codigo: string, cantidad: number): Promise<Estimacion | null> {
  const contexto = await construirContexto(codigo, cantidad);
  if (!contexto.designacion) return null;

  const propios = await historicoDe(codigo);
  let base = estimarDesdeCasos(propios, "designacion");

  if (!base || propios.length < CASOS_CONFIANZA_MEDIA) {
    const familiares = await historicoDeFamilia(contexto.designacion.familia);
    const porFamilia = estimarDesdeCasos(familiares, "familia");
    // Se prefiere la familia solo si aporta más casos que el propio histórico.
    if (porFamilia && (!base || familiares.length > propios.length)) base = porFamilia;
  }

  if (!base) return null;

  const planta = await plantaCompleta(contexto.designacion.pdiv);
  const evaluacion = evaluarSolicitud(contexto);

  return ajustarPorProcedimiento(base, {
    desempenoTe: planta?.desempenoTe ?? 1,
    semanasExtra: evaluacion.semanasExtraTE,
  });
}
```

- [ ] **Paso 6: Escribir los tests de integración**

`lib/estimador/estimador.integracion.test.ts`:

```ts
import { config } from "dotenv";
import { beforeAll, describe, expect, it } from "vitest";
import { estimarTE } from "./estimador";

beforeAll(() => config({ path: ".env.local", quiet: true }));

describe("estimador contra el histórico sembrado", () => {
  it("estima un caso curado con un rango coherente", async () => {
    const e = await estimarTE("DEMO-6205-2RSH/C3", 100);
    expect(e).not.toBeNull();
    expect(e?.semanasMin).toBeLessThanOrEqual(e?.mediana as number);
    expect(e?.mediana).toBeLessThanOrEqual(e?.semanasMax as number);
    expect(e?.casos).toBeGreaterThan(0);
  });

  it("la designación de nueva creación arrastra sus 4 semanas del punto 4.9", async () => {
    const e = await estimarTE("DEMO-NUEVA", 30);
    expect(e).not.toBeNull();
    expect(e?.semanasMin).toBeGreaterThanOrEqual(4);
  });

  it("una designación inexistente no produce estimación", async () => {
    expect(await estimarTE("NO-EXISTE-XYZ-999", 10)).toBeNull();
  });

  it("dos llamadas seguidas devuelven exactamente lo mismo", async () => {
    // El estimador es determinista: el presentador puede repetir la consulta
    // delante del cliente sin que el número cambie.
    expect(await estimarTE("DEMO-VENTANA", 200)).toEqual(await estimarTE("DEMO-VENTANA", 200));
  });
});
```

- [ ] **Paso 7: Escribir el componente de presentación**

`components/estimador/estimacion-te.tsx`. Es el **único** lugar de la aplicación donde se renderiza una estimación, y muestra siempre los tres elementos obligatorios.

```tsx
import type { Estimacion } from "@/lib/estimador/calculo";

const TEXTO_BASE: Record<Estimacion["base"], string> = {
  designacion: "cotizaciones previas de esta designación",
  familia: "cotizaciones previas de productos de la misma familia",
  global: "cotizaciones previas del catálogo",
};

const TEXTO_CONFIANZA: Record<Estimacion["confianza"], string> = {
  alta: "Confianza alta",
  media: "Confianza media",
  baja: "Confianza baja",
};

/**
 * Único punto de render de una estimación de tiempo de entrega.
 *
 * Los tres elementos son obligatorios y no configurables: el rango, la base y
 * el compromiso de confirmación. Presentar una estimación como tiempo
 * confirmado sería un problema comercial serio para SKF frente a sus clientes,
 * así que el diseño lo hace imposible por construcción.
 */
export function EstimacionTE({
  estimacion,
  horaConfirmacion,
}: {
  estimacion: Estimacion;
  horaConfirmacion?: string;
}) {
  return (
    <div className="rounded-md border border-borde bg-fondo-sutil p-4">
      <div className="flex items-baseline gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-texto-tenue">
          Tiempo de entrega estimado
        </span>
        <span className="rounded border border-borde px-1.5 py-0.5 text-[11px] text-texto-tenue">
          {TEXTO_CONFIANZA[estimacion.confianza]}
        </span>
      </div>

      {/* 1. El rango. Nunca un número solo: sería falsa precisión. */}
      <p className="mt-1 text-2xl font-semibold text-texto">
        {estimacion.semanasMin} a {estimacion.semanasMax} semanas
      </p>

      {/* 2. La base que lo sustenta. */}
      <p className="mt-1 text-sm text-texto-tenue">
        Basado en {estimacion.casos} {TEXTO_BASE[estimacion.base]}.
      </p>

      {/* 3. El compromiso de confirmación. */}
      <p className="mt-2 text-sm text-texto-tenue">
        Es una estimación, no un tiempo confirmado
        {horaConfirmacion
          ? `: se confirma en firme al restablecerse la conexión con la planta, aproximadamente a las ${horaConfirmacion}.`
          : ": el tiempo en firme se confirma al procesar la cotización."}
      </p>
    </div>
  );
}
```

- [ ] **Paso 8: Ejecutar ambas suites y commitear**

```bash
pnpm test
pnpm test:integracion
pnpm lint
git add lib/estimador components/estimador docs/superpowers/contexto
git commit -m "Estimador de TE: mediana, percentiles, confianza y ajustes del procedimiento"
```

En el contexto, deja anotado que `<EstimacionTE>` es el único punto de render de una estimación y **por qué** ninguna pantalla debe formatear el rango por su cuenta.

---

## Tarea 10: Los mocks de los sistemas externos

**Archivos:**
- Crear: `lib/mock/latencia.ts`, `lib/mock/latencia.test.ts`
- Crear: `app/api/mock/inventario/route.ts`, `app/api/mock/wcl/route.ts`, `app/api/mock/pinq/route.ts`, `app/api/mock/spq/route.ts`
- Crear: `docs/superpowers/contexto/plan-3/tarea-10-contexto.md`

**Interfaces:**
- Consume: `lib/fuentes`, `lib/estado-fabricas`, `leerSesion`, `estimarTE`.
- Produce:
  - `latenciaArtificial(): Promise<void>`
  - `MS_LATENCIA_MIN = 200`, `MS_LATENCIA_MAX = 800`
  - Cuatro rutas HTTP con el comportamiento de un sistema externo.

**Por qué existen estas rutas.** Cuando llegue la Fase 3 real, sustituir cada mock por la API de WCL, SPQ+ o PinQ debe ser cambiar una implementación, no reescribir la aplicación. Poder decírselo al cliente durante el demo —y enseñarle el árbol de carpetas— es un argumento comercial.

**La latencia es selectiva, y eso es narrativo.** 200–800 ms **solo** en lo que simula un sistema corporativo externo: inventario, precio WCL, PinQ. **Nunca** en el buscador ni en el validador. En pantalla tiene que verse que los sistemas corporativos tardan y que la capa complementaria responde al instante; meterle latencia al buscador destruiría el momento de la escena 2.

**El fallo durante la ventana es el mecanismo de la escena 4.** El mock de inventario de una planta responde con error cuando esa planta está en ventana. Ese fallo es lo que hace que, en modo "hoy", el cliente no vea disponibilidad y no le quede más opción que generar una solicitud.

- [ ] **Paso 1: Escribir el test de la latencia**

`lib/mock/latencia.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { MS_LATENCIA_MAX, MS_LATENCIA_MIN, calcularLatencia, latenciaArtificial } from "./latencia";

describe("latencia artificial", () => {
  it("siempre cae dentro del rango que piden los documentos", () => {
    for (let i = 0; i < 200; i++) {
      const ms = calcularLatencia();
      expect(ms).toBeGreaterThanOrEqual(MS_LATENCIA_MIN);
      expect(ms).toBeLessThanOrEqual(MS_LATENCIA_MAX);
    }
  });

  it("el rango es el de los documentos: 200 a 800 ms", () => {
    expect(MS_LATENCIA_MIN).toBe(200);
    expect(MS_LATENCIA_MAX).toBe(800);
  });

  it("no espera en los tests: una suite no puede pagar 800 ms por llamada", () => {
    const inicio = Date.now();
    return latenciaArtificial().then(() => {
      expect(Date.now() - inicio).toBeLessThan(50);
    });
  });
});
```

- [ ] **Paso 2: Ejecutar y ver el fallo**

Ejecuta: `pnpm test latencia`
Esperado: FALLA — no existe `./latencia`.

- [ ] **Paso 3: Implementar la latencia**

`lib/mock/latencia.ts`:

```ts
/**
 * Latencia de los sistemas externos simulados.
 *
 * Se aplica SOLO a lo que representa un sistema corporativo (inventario, precio
 * WCL, PinQ) y NUNCA al buscador ni al validador. La razón es narrativa: en
 * pantalla debe verse que los sistemas corporativos tardan y que la capa
 * complementaria responde al instante.
 */
export const MS_LATENCIA_MIN = 200;
export const MS_LATENCIA_MAX = 800;

export function calcularLatencia(): number {
  return MS_LATENCIA_MIN + Math.floor(Math.random() * (MS_LATENCIA_MAX - MS_LATENCIA_MIN + 1));
}

export async function latenciaArtificial(): Promise<void> {
  // Los tests no pagan la espera: una suite con decenas de llamadas tardaría
  // minutos en simular algo que solo tiene sentido delante de una audiencia.
  if (process.env.NODE_ENV === "test" || process.env.VITEST) return;
  await new Promise((listo) => setTimeout(listo, calcularLatencia()));
}
```

- [ ] **Paso 4: Ejecutar y verificar**

Ejecuta: `pnpm test latencia`
Esperado: PASAN los 3 tests.

- [ ] **Paso 5: Implementar el mock de inventario**

`app/api/mock/inventario/route.ts`. Es el único mock que falla, y falla exactamente cuando su planta está en ventana.

```ts
import { NextResponse } from "next/server";
import { ahoraSimulada, estadoDePlanta } from "@/lib/estado-fabricas";
import { existenciasDe, obtenerDesignacion, plantaCompleta } from "@/lib/fuentes";
import { latenciaArtificial } from "@/lib/mock/latencia";
import { leerSesion } from "@/lib/sesion-demo/leer";

export const dynamic = "force-dynamic";

/**
 * Disponibilidad por almacén. Simula la consulta al sistema de la planta.
 *
 * Durante la ventana de mantenimiento responde 503: ese fallo es el mecanismo
 * que hace funcionar la escena 4 del guion. No es un error del POC — es el
 * comportamiento que el cliente sufre 2 horas al día en su horario pico.
 */
export async function GET(peticion: Request) {
  const designacion = new URL(peticion.url).searchParams.get("designacion");
  if (!designacion) {
    return NextResponse.json({ error: "Falta el parámetro designacion" }, { status: 400 });
  }

  await latenciaArtificial();

  const producto = await obtenerDesignacion(designacion);
  if (!producto) {
    return NextResponse.json({ error: "Designación no encontrada" }, { status: 404 });
  }

  const [planta, sesion] = await Promise.all([plantaCompleta(producto.pdiv), leerSesion()]);
  if (!planta) {
    return NextResponse.json({ error: "Planta no encontrada" }, { status: 404 });
  }

  const estado = estadoDePlanta(
    planta,
    ahoraSimulada(sesion.relojOffsetMin),
    sesion.plantasOverride[planta.pdiv],
  );

  if (estado === "ventana") {
    return NextResponse.json(
      {
        error: "Sistema de la planta no disponible",
        pdiv: planta.pdiv,
        estado,
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    designacion: producto.designacion,
    pdiv: planta.pdiv,
    estado,
    existencias: await existenciasDe(producto.designacion),
  });
}
```

- [ ] **Paso 6: Implementar los mocks de WCL, PinQ y SPQ+**

`app/api/mock/wcl/route.ts` — precio y tiempo de entrega, con latencia. Devuelve `precioLista`, `precioNeto` (aplicando el descuento del cliente si se pasa `clienteId`) y la estimación de `estimarTE`. Si `precioLista` es nulo, devuelve el aviso del punto 5.2 o 5.3 en vez de un precio inventado.

`app/api/mock/pinq/route.ts` — consulta de soporte a planta. Con latencia. Recibe designación y cantidad, devuelve un acuse con número de PINQ simulado y la planta destino, distinguiendo por segmento: `power_transmission` va a PT Inquery y al Planner, el resto a OPI/PINQ (punto 4.3).

`app/api/mock/spq/route.ts` — alta y consulta de solicitudes. `POST` da de alta en `solicitudes` con `service_role`, clasificándola con `evaluarSolicitud` y guardando `clasificacion_qms` y `punto_qms`; `GET` con `?numero=` devuelve su estado. Con latencia.

Los tres siguen el mismo esqueleto que el mock de inventario: `dynamic = "force-dynamic"`, validación del parámetro, `await latenciaArtificial()`, y toda consulta a datos vía `lib/fuentes`. **Ninguna ruta consulta tablas directamente.**

- [ ] **Paso 7: Verificar las cuatro rutas a mano**

Con `pnpm dev` levantado:

```bash
curl "http://localhost:3000/api/mock/inventario?designacion=DEMO-6205-2RSH/C3"
curl "http://localhost:3000/api/mock/wcl?designacion=DEMO-6205-2RSH/C3&cantidad=100"
curl "http://localhost:3000/api/mock/pinq?designacion=DEMO-PT-PLANNER&cantidad=40"
```

Esperado: las tres responden en 200–800 ms más el tiempo de consulta. Anota los tiempos observados en el contexto.

Después fuerza la ventana de la planta belga y repite la primera llamada con `DEMO-VENTANA`, que pertenece a `P103`:

```sql
update sesion_demo set plantas_override = '{"P103":"ventana"}'::jsonb where id = 1;
```

```bash
curl -i "http://localhost:3000/api/mock/inventario?designacion=DEMO-VENTANA"
```

Esperado: `503` con `estado: "ventana"`. Devuelve la sesión a su estado normal después:

```sql
update sesion_demo set plantas_override = '{}'::jsonb where id = 1;
```

- [ ] **Paso 8: Escribir el contexto y commitear**

Deja anotado en el contexto **qué rutas llevan latencia y cuáles no**, y por qué el buscador queda fuera. Es lo primero que alguien "arreglaría" por consistencia sin saber que rompe la escena 2.

```bash
pnpm lint
pnpm test
git add lib/mock app/api docs/superpowers/contexto
git commit -m "Mocks de sistemas externos con latencia selectiva y fallo en ventana"
```

---

## Tarea 11: Portal — Vista Cliente ⭐

**Archivos:**
- Reescribir: `app/(portal)/portal/page.tsx`
- Crear: `app/(portal)/portal/acciones.ts`
- Crear: `components/portal/buscador.tsx`, `components/portal/resultado-busqueda.tsx`, `components/portal/tarjeta-sugerencia.tsx`, `components/portal/detalle-designacion.tsx`, `components/portal/banner-ventana.tsx`, `components/portal/etiqueta-qms.tsx`
- Crear: `app/(operador)/operador/page.tsx`, `components/operador/lista-solicitudes.tsx`
- Crear: `docs/superpowers/contexto/plan-3/tarea-11-contexto.md`

**Interfaces:**
- Consume: `validar`, `estimarTE`, `useSesion`, `emitirEvento`, `EstimacionTE`, `evaluarSolicitud`.
- Produce:
  - Server Actions `buscarDesignacion(consulta, cantidad)`, `generarSolicitud(consulta, cantidad)`, `registrarSolicitudEvitada(codigo)`
  - Las pantallas `/portal` y `/operador`

**Esta es la tarea del hito.** Al terminarla se pueden presentar las escenas 0, 1 y 2 completas, que cubren los dos problemas prioritarios declarados por el cliente.

**El contraste de modos es el eje de toda la demostración y no se sacrifica nunca.** Se implementa en un solo sitio, la Server Action `buscarDesignacion`:

- **modo `hoy`**: solo coincidencia exacta. Si no existe, "no se encontraron resultados" y la única acción disponible es *Solicitar cotización*. Sin sugerencias, sin contexto, sin ayuda. Debe transmitir callejón sin salida sin ser caricaturesco: es una interfaz corporativa normal que deja al usuario sin opciones.
- **modo `solucion`**: la cascada completa del validador, con el bloque de sugerencias y todo el contexto QMS de cada candidato.

- [ ] **Paso 1: Escribir las Server Actions**

`app/(portal)/portal/acciones.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { construirContexto, obtenerDesignacion } from "@/lib/fuentes";
import { emitirEvento } from "@/lib/metricas/emitir";
import { evaluarSolicitud } from "@/lib/reglas-qms";
import { leerSesion } from "@/lib/sesion-demo/leer";
import { clienteAdmin } from "@/lib/supabase/admin";
import { construirSugerencia } from "@/lib/validador/sugerencia";
import type { ResultadoValidacion } from "@/lib/validador/tipos";
import { validar } from "@/lib/validador/cascada";

/**
 * Búsqueda del portal. Aquí vive el contraste que sostiene toda la demostración.
 *
 * En modo "hoy" el portal se comporta como el sistema actual: coincidencia
 * exacta o nada. En modo "solución" corre la cascada completa del validador.
 * Un solo punto de bifurcación, no dos pantallas duplicadas: si fueran dos, la
 * mitad del demo se pudriría sin que nadie lo notara.
 */
export async function buscarDesignacion(
  consulta: string,
  cantidad: number,
): Promise<ResultadoValidacion> {
  const sesion = await leerSesion();

  await emitirEvento({
    tipo: "busqueda",
    perfil: "cliente",
    designacion: consulta,
    detalle: { modo: sesion.modo, cantidad },
  });

  if (sesion.modo === "hoy") {
    const exacta = await obtenerDesignacion(consulta.trim());
    if (!exacta) {
      return {
        consulta,
        tipo: "no_encontrada",
        estrategia: "ninguna",
        mensaje: "No se encontraron resultados para esa designación.",
        candidatos: [],
      };
    }
    const sugerencia = await construirSugerencia(exacta.designacion, cantidad, 1);
    return {
      consulta,
      tipo: "exacta",
      estrategia: "exacta",
      mensaje: `Designación ${exacta.designacion} encontrada.`,
      candidatos: sugerencia ? [sugerencia] : [],
    };
  }

  return validar(consulta, cantidad);
}

/** Número de solicitud con el formato que exige el CHECK de la base: AAAAQ#####. */
function numeroDeSolicitud(): string {
  const anio = new Date().getFullYear();
  const secuencia = String(Math.floor(Math.random() * 100_000)).padStart(5, "0");
  return `${anio}Q${secuencia}`;
}

/**
 * Genera una solicitud de cotización.
 *
 * Se preclasifica con el motor de reglas en el momento del alta: esa
 * clasificación es la que la bandeja del operador muestra sin que nadie la
 * calcule a mano, y es el trabajo que hoy hace el CSR abriendo cuatro sistemas.
 */
export async function generarSolicitud(consulta: string, cantidad: number): Promise<string> {
  const contexto = await construirContexto(consulta.trim(), cantidad);
  const evaluacion = evaluarSolicitud(contexto);
  const numero = numeroDeSolicitud();

  const { error } = await clienteAdmin().from("solicitudes").insert({
    numero,
    designacion_texto: consulta,
    cantidad,
    clasificacion_qms: evaluacion.ruta,
    punto_qms: evaluacion.punto,
  });
  if (error) throw new Error(`No se pudo generar la solicitud: ${error.message}`);

  await emitirEvento({
    tipo: "solicitud_generada",
    perfil: "cliente",
    designacion: consulta,
    pdiv: contexto.designacion?.pdiv ?? null,
    detalle: { numero, ruta: evaluacion.ruta, punto: evaluacion.punto },
  });

  revalidatePath("/operador");
  return numero;
}

/**
 * El cliente resolvió su consulta sin generar solicitud.
 *
 * Es el contador que justifica el proyecto: cada una de estas es una solicitud
 * que Maritza no recibe.
 */
export async function registrarSolicitudEvitada(codigo: string): Promise<void> {
  await emitirEvento({
    tipo: "solicitud_evitada",
    perfil: "cliente",
    designacion: codigo,
  });
  revalidatePath("/operador");
}
```

- [ ] **Paso 2: Construir el buscador**

`components/portal/buscador.tsx` — Client Component. Campo de entrada protagonista, centrado y amplio, con un campo de cantidad al lado (la cantidad es indispensable: sin ella no se pueden evaluar MOQ ni pack quantity). Llama a `buscarDesignacion` y guarda el resultado en estado local.

Requisitos que no se pueden omitir:
- **Sin latencia artificial.** El buscador responde al instante; esa es la mitad del argumento de la escena 2.
- El texto tecleado se muestra en monoespaciada (clase `designacion`).
- Mientras la acción está en vuelo, un indicador de carga discreto — no un salto de layout.

- [ ] **Paso 3: Construir el bloque de resultados**

`components/portal/resultado-busqueda.tsx` renderiza según `resultado.tipo`:

| `tipo` | Qué se muestra |
|---|---|
| `exacta` | La tarjeta del producto y el detalle |
| `truncada` | Encabezado ámbar-neutro con *"La designación parece incompleta"*, las 3 completaciones y, debajo, la acción secundaria de solicitar cotización |
| `similar` | *"No se encontró esa designación exacta"* y los parecidos |
| `no_encontrada` | El mensaje, y como única acción *Solicitar cotización* |

**El mensaje de `truncada` debe ser visiblemente distinto del de `no_encontrada`.** No es un matiz de copia: es el hallazgo que la escena 2 demuestra. Un usuario que lee "no existe" abandona; uno que lee "parece incompleta" completa.

`components/portal/tarjeta-sugerencia.tsx` muestra, para cada candidato:
- la designación en monoespaciada y la descripción técnica;
- `<EtiquetaQMS>` con la clasificación: *Planeado (LCC=PLAN)*, *No Planeado (LCC=NP)* u *Obsoleto (PCC=O)* — con la sigla que SKF ya usa, nunca "producto sin stock";
- disponibilidad por almacén PS / SL / XX, en ese orden;
- MOQ y pack quantity, **con aviso destacado si la cantidad pedida los incumple**;
- el reemplazo si es obsoleto;
- la advertencia de +4 semanas si es de nueva creación;
- el aviso de que sería declinada si su planta no tiene conexión ni ruta de embarque;
- `evaluacion.punto` y `evaluacion.mensaje`, que es la regla del procedimiento que justifica todo lo anterior.

Ese bloque de contexto es lo que convierte un buscador en un asesor, y es literalmente el trabajo manual que el QMS asigna hoy al CSR.

- [ ] **Paso 4: Construir el detalle y el banner de ventana**

`components/portal/detalle-designacion.tsx` — panel con precio, `<EstimacionTE>` y las acciones. Si `precioLista` es nulo, muestra el aviso del punto 5.2 o 5.3 que devuelve la evaluación; **nunca** un precio inventado ni un `$0.00`.

`components/portal/banner-ventana.tsx` — Client Component que usa `useSesion()`. Si alguna planta está en `ventana`, muestra la franja **ámbar** con el nombre de la planta, la hora estimada de restablecimiento y la cuenta regresiva de `minutosParaReapertura`. Es el único uso de ámbar en toda la aplicación.

- [ ] **Paso 5: Ensamblar la página del portal**

`app/(portal)/portal/page.tsx` — Server Component que lee sesión y plantas, envuelve todo en `<ProveedorSesion>` y monta barra superior, banner de ventana, buscador y resultados. Mantiene `export const dynamic = "force-dynamic"`.

- [ ] **Paso 6: Construir la bandeja mínima del operador**

`app/(operador)/operador/page.tsx` y `components/operador/lista-solicitudes.tsx`. Para la escena 1 basta con **ver llegar la solicitud y su clasificación automática**:

- tabla con número, designación tal como la escribió el cliente, cantidad, antigüedad y la etiqueta de `clasificacion_qms` con su `punto_qms`;
- cuando la clasificación es `declinar_designacion_invalida`, el texto del punto 4.8 visible: *el procedimiento obliga a declinar*;
- el contador de la sesión desde `indicadoresDeSesion()`: solicitudes recibidas, evitadas y minutos de operador liberados, cada cifra con la leyenda **"sobre datos simulados"**;
- estado vacío explícito: *"No hay solicitudes en esta sesión"*. Ese vacío **es** la evidencia de la escena 2 y tiene que verse bien, no como una tabla rota.

La bandeja completa —filtros, panel de detalle, asignación automática— es del Plan 4. No la adelantes.

- [ ] **Paso 7: Recorrer las escenas 0, 1 y 2 completas**

Este es el criterio de aceptación de la tarea. Con `pnpm dev` y `/demo` todavía inexistente, cambia el modo con SQL:

```sql
update sesion_demo set modo = 'hoy' where id = 1;
```

1. Abre `/portal`. Confirma el distintivo de entorno de demostración (escena 0).
2. Escribe `DEMO-6205-2RSH` con cantidad 100. Esperado: "No se encontraron resultados" y solo la acción de solicitar cotización.
3. Genera la solicitud. Ve a `/operador`: la solicitud aparece clasificada como `declinar_designacion_invalida`, punto 4.8 (escena 1).
4. Cambia a modo solución:

```sql
update sesion_demo set modo = 'solucion' where id = 1;
```

5. Repite la misma búsqueda **sin recargar la página**. Esperado: el resultado cambia por Realtime, aparece *"La designación parece incompleta"* con las tres completaciones y su contexto QMS (escena 2).
6. Elige `DEMO-6205-2RSH/C3`: precio y TE al instante, sin generar cotización.
7. Busca `DEMO-MOQ-50` con cantidad 5: el aviso de MOQ aparece **antes** de enviar nada.
8. Vuelve a `/operador`: no llegó ninguna solicitud nueva y el contador de evitadas subió.

Anota en el contexto cualquier paso que no se comportó como dice el guion. **No lo dejes "para después": el guion es el criterio de aceptación del POC entero.**

- [ ] **Paso 8: Escribir el contexto y commitear**

```bash
pnpm lint
pnpm build
git add app components docs/superpowers/contexto
git commit -m "Portal de consulta con contraste de modos y bandeja minima del operador"
```

---

## Tarea 12: Panel del presentador ⭐

**Archivos:**
- Crear: `app/demo/page.tsx`, `app/demo/layout.tsx`
- Crear: `components/demo/interruptor-modo.tsx`, `components/demo/control-plantas.tsx`, `components/demo/control-reloj.tsx`, `components/demo/selector-escenarios.tsx`, `components/demo/estado-sesion.tsx`
- Crear: `docs/superpowers/contexto/plan-3/tarea-12-contexto.md`

**Interfaces:**
- Consume: las Server Actions de la tarea 5, `useSesion`, `indicadoresDeSesion`, `ESCENARIOS`, `minutosParaReapertura`.
- Produce: la pantalla `/demo`.

**Cómo se usa.** Desde una segunda pantalla o una segunda laptop, mientras la proyección muestra `/portal`. De ahí salen todos los requisitos de esta pantalla: **botones grandes, alto contraste, etiquetas inequívocas, operable sin dudar mientras se habla frente a una audiencia.** Utilitario, no bonito.

- [ ] **Paso 1: El interruptor de modo**

`components/demo/interruptor-modo.tsx` — **el elemento más prominente de la pantalla.** Dos botones grandes, "Situación actual" y "Con la solución", con el activo inequívocamente marcado. Llama a `cambiarModo`.

Muestra un estado de envío mientras la acción está en vuelo: el presentador tiene que saber que su pulsación entró aunque la proyección tarde en reaccionar.

- [ ] **Paso 2: El control de plantas**

`components/demo/control-plantas.tsx` — una fila por planta con: PDIV, nombre, país, su ventana programada en hora de México, el estado actual calculado, y tres botones para forzar `online` / `ventana` / `reactivando` más uno de *Seguir calendario* que limpia el override (`fijarEstadoPlanta(pdiv, null)`).

Las plantas con override activo deben distinguirse visualmente de las que siguen el calendario: si no, el presentador no sabe qué dejó forzado de un ensayo anterior.

Ordena `P103` (Bélgica, la del caso `DEMO-VENTANA`) arriba o márcala: es la que se usa en la escena 4.

- [ ] **Paso 3: El control del reloj**

`components/demo/control-reloj.tsx` — hora simulada en grande, el offset acumulado, y botones de `+30 min`, `+1 h`, *Cerrar la ventana en curso* y *Reiniciar reloj*.

*Cerrar la ventana en curso* llama a `cerrarVentanaEnCurso` sobre las plantas que estén en `ventana`. Es el gesto con el que termina la escena 4.

- [ ] **Paso 4: El selector de escenarios**

`components/demo/selector-escenarios.tsx` — una tarjeta por escenario de `ESCENARIOS`, con nombre, escena del guion, la consulta a teclear en monoespaciada y la nota. Un clic llama a `activarEscenario`, que fija modo y overrides.

Incluye un botón de copiar la consulta al portapapeles: durante la presentación, teclear un código de 18 caracteres delante de una audiencia es una fuente de errores gratuita.

- [ ] **Paso 5: El estado de la sesión**

`components/demo/estado-sesion.tsx` — de un vistazo: modo activo, plantas en ventana, hora simulada, escenario activo, contadores de `indicadoresDeSesion()`, y **el indicador del canal de Realtime**.

El indicador de canal es obligatorio y solo existe aquí: **si el canal no está `suscrito`, el presentador tiene que saberlo antes de tocar el interruptor.** Cuando no lo esté, el texto debe decir explícitamente que el respaldo por sondeo está activo y que la propagación puede tardar un par de segundos.

Añade el botón de *Reiniciar sesión* con diálogo de confirmación. Su texto debe decir qué borra y qué no: borra las solicitudes de la sesión y pone los contadores a cero; **no** toca el histórico sintético.

- [ ] **Paso 6: Ensamblar la pantalla**

`app/demo/page.tsx` — Server Component con `dynamic = "force-dynamic"` que lee sesión, plantas e indicadores, y los envuelve en `<ProveedorSesion>`.

`app/demo/layout.tsx` — **sin la barra superior del portal.** Esta pantalla no la ve el cliente y no necesita el selector de perfil. Sí conserva el distintivo de entorno de demostración: si alguien proyecta esta pantalla por error, el distintivo tiene que estar.

- [ ] **Paso 7: Ensayar el control cruzado**

Abre `/demo` en una ventana y `/portal` en otra, en pantallas o navegadores distintos si es posible. Verifica:

1. El interruptor de modo cambia el portal **sin recargarlo**.
2. Forzar `P103` a `ventana` hace aparecer el banner ámbar en el portal, con cuenta regresiva.
3. `+30 min` mueve la hora simulada y la cuenta regresiva se acorta en consecuencia.
4. *Cerrar la ventana en curso* devuelve el portal a la normalidad.
5. Activar el escenario "Planta en ventana de mantenimiento" deja el portal en modo hoy y `P103` en ventana de una sola pulsación.
6. *Reiniciar sesión* deja los contadores en cero y `/operador` vacío, **y el histórico sigue ahí**: verifica que `estimarTE("DEMO-VENTANA", 200)` sigue devolviendo una estimación con casos.
7. **Mide cuánto tarda la primera pulsación del interruptor tras dejar la aplicación cerrada 20 minutos.** Ese es el arranque en frío de Realtime. Anota el número en el contexto: si sigue siendo alto, el ensayo previo a cada presentación tiene que incluir abrir el portal unos minutos antes.

- [ ] **Paso 8: Escribir el contexto y commitear**

```bash
pnpm lint
pnpm build
git add app/demo components/demo docs/superpowers/contexto
git commit -m "Panel del presentador: modo, plantas, reloj, escenarios y estado del canal"
```

---

## Tarea 13: Chatbot ⭐

**Archivos:**
- Crear: `lib/ai/instrucciones.ts`, `lib/ai/herramientas.ts`, `lib/ai/procedimiento.ts`, `lib/ai/respaldo.ts`, `lib/ai/limite.ts`
- Crear: `lib/ai/respaldo.test.ts`, `lib/ai/limite.test.ts`
- Crear: `app/api/chat/route.ts`
- Crear: `components/chat/panel-chat.tsx`, `components/chat/mensaje.tsx`, `components/chat/tarjeta-producto.tsx`
- Modificar: `app/(portal)/portal/page.tsx`, `app/(operador)/operador/page.tsx`
- Crear: `docs/superpowers/contexto/plan-3/tarea-13-contexto.md`

**Interfaces:**
- Consume: `validar`, `estimarTE`, `existenciasDe`, `obtenerCotizacion`, `homologosDe`, `emitirEvento`, AI SDK v7.
- Produce:
  - `INSTRUCCIONES_CLIENTE`, `INSTRUCCIONES_OPERADOR`
  - `HERRAMIENTAS` — definiciones para tool calling
  - `FRAGMENTOS_QMS`, `buscarFragmento(consulta)`
  - `respuestaPregrabada(pregunta): string | null`
  - `dentroDelLimite(mensajes: number): boolean`
  - `POST /api/chat` con streaming
  - `<PanelChat perfil>`

**Nota de implementación — obligatoria.** Antes de escribir código, carga la skill `vercel:ai-sdk`. El proyecto usa **AI SDK v7** con `@ai-sdk/react@^4`; la forma de `streamText`, la definición de herramientas y el hook `useChat` cambiaron respecto a versiones anteriores. No los escribas de memoria.

**La arquitectura que elimina el riesgo comercial.** El modelo **no consulta la base**: usa tool calling contra las mismas funciones que usa el resto del POC. **Ningún número sale del modelo; los números salen de Postgres.** El modelo redacta y conversa. Esto elimina la clase de error más peligrosa en un demo comercial: un precio o un tiempo inventado.

Y cumple además la sección 3.2 de la propuesta —*"comparten un mismo motor de IA"*—: el chat del cliente y el del operador llaman al mismo validador y al mismo estimador que el portal.

- [ ] **Paso 1: Escribir los fragmentos del procedimiento**

`lib/ai/procedimiento.ts`. Permite que el chatbot responda dudas de procedimiento con **la regla real de SKF**, no con una invención: *"¿qué hago si el MOQ es mayor a lo que pide el cliente?"*. Es capacitación integrada al flujo de trabajo, y de alto impacto en la escena 5.

Los fragmentos se escriben a mano desde el texto del procedimiento que ya está citado en `lib/reglas-qms/` (los mensajes y comentarios de cada regla contienen las citas literales) y en las migraciones `000007`. **No** parsees el `.docx`.

```ts
export interface FragmentoQMS {
  punto: string;
  titulo: string;
  texto: string;
}

export const FRAGMENTOS_QMS: readonly FragmentoQMS[] = [
  {
    punto: "4.1",
    titulo: "Producto planeado con stock suficiente",
    texto:
      "Si el producto es planeado (LCC=PLAN) y el monto solicitado es menor o igual al stock " +
      "disponible, no requiere cotización: ya estaba visible en WCL. Se declina y se informa al cliente.",
  },
  // … un fragmento por cada punto que el motor de reglas implementa:
  // 4.2, 4.3, 4.4, 4.5a, 4.5b, 4.6 (sus dos sub-casos), 4.7, 4.8, 4.9, 5.2, 5.3.
];

const IRRELEVANTES = new Set([
  "que", "como", "cual", "para", "por", "los", "las", "una", "uno", "del",
  "con", "sin", "hago", "hace", "cuando", "si", "es", "el", "la", "de", "en",
]);

function terminos(texto: string): string[] {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9.]+/)
    .filter((t) => t.length > 2 && !IRRELEVANTES.has(t));
}

/**
 * Recuperación por coincidencia de términos normalizados, no por embeddings.
 *
 * A la escala de un documento, pgvector sería complejidad sin ganancia medible.
 * Si la Fase 1 incorpora el corpus completo de procedimientos, se reevalúa.
 */
export function buscarFragmento(consulta: string, limite = 3): FragmentoQMS[] {
  const buscados = terminos(consulta);
  if (buscados.length === 0) return [];

  return FRAGMENTOS_QMS.map((fragmento) => {
    const propios = new Set([
      ...terminos(`${fragmento.titulo} ${fragmento.texto}`),
      fragmento.punto,
    ]);
    // El punto citado literalmente ("punto 4.4") pesa más que un término suelto.
    const coincidencias = buscados.filter((t) => propios.has(t)).length;
    const citaPunto = buscados.includes(fragmento.punto) ? 5 : 0;
    return { fragmento, puntaje: coincidencias + citaPunto };
  })
    .filter((r) => r.puntaje > 0)
    .sort((a, b) => b.puntaje - a.puntaje)
    .slice(0, limite)
    .map((r) => r.fragmento);
}
```

- [ ] **Paso 2: Escribir las instrucciones de los dos modos**

`lib/ai/instrucciones.ts`. Ambos prompts deben fijar, con estas palabras:

- Nunca inventar designaciones, precios ni tiempos: usar **exclusivamente** lo que devuelvan las herramientas.
- Cuando no haya dato, decirlo y ofrecer la alternativa (generar solicitud, escalar a un CSR).
- Distinguir siempre entre **estimado** y **confirmado**.
- Usar la terminología de SKF: WCL, SPQ+, designación, planeado / no planeado, MOQ, pack quantity, TE, PDIV.
- Responder **en español**, con concisión: el usuario está en medio de una compra, no leyendo un manual.
- No prometer plazos ni condiciones comerciales que no vengan del sistema.
- Cuando cite una regla del procedimiento, indicar el punto (`4.4`, `4.6`…).

Diferencias entre los dos:

| Modo | Comportamiento |
|---|---|
| `cliente` | Tono de servicio. **Sin exponer costos internos, márgenes ni información de otras cuentas.** Durante una desconexión, ofrece TE estimado y explica que se confirmará al restablecerse |
| `operador` | Acceso a la bandeja, a las reglas del procedimiento y a la clasificación de solicitudes. Puede responder "¿qué solicitudes de hoy puedo declinar según el punto 4.1?" |

- [ ] **Paso 3: Escribir las herramientas**

`lib/ai/herramientas.ts`. Cinco herramientas, todas envolviendo funciones que ya existen:

| Herramienta | Envuelve | Devuelve |
|---|---|---|
| `buscarDesignacion` | `validar` | Tipo de resultado y candidatos con su contexto QMS |
| `consultarDisponibilidad` | `existenciasDe` + `plantaCompleta` + `estadoDePlanta` | Existencias PS/SL/XX y estado de la planta |
| `estimarTiempoEntrega` | `estimarTE` | Rango, casos, confianza y base |
| `consultarCotizacion` | `obtenerCotizacion` | Estado, fechas y días transcurridos contra el SLA de 4 días hábiles |
| `consultarProcedimiento` | `buscarFragmento` | Fragmentos del QMS con su punto |

La herramienta de cotización solo se ofrece en modo operador con acceso a la bandeja; en modo cliente devuelve únicamente estado y días transcurridos, nunca el motivo interno de declinado ni el operador asignado.

- [ ] **Paso 4: Escribir el test del respaldo pregrabado**

`lib/ai/respaldo.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { respuestaPregrabada } from "./respaldo";

describe("respaldo pregrabado", () => {
  it("responde la pregunta de TE y precio del guion", () => {
    const r = respuestaPregrabada("¿Cuánto tarda el DEMO-6205-2RSH/C3 si pido 200 piezas?");
    expect(r).not.toBeNull();
    expect(r).toContain("semanas");
  });

  it("responde la pregunta de equivalente del guion", () => {
    expect(respuestaPregrabada("Necesito un rodamiento equivalente sellado por ambos lados")).not.toBeNull();
  });

  it("tolera variaciones de redacción y acentos", () => {
    expect(respuestaPregrabada("cuanto tarda el DEMO-6205-2RSH/C3")).not.toBeNull();
  });

  it("devuelve null ante una pregunta fuera del guion, en vez de una respuesta genérica", () => {
    // Una respuesta inventada delante del cliente es peor que un "no lo sé".
    expect(respuestaPregrabada("¿cuál es la capital de Suecia?")).toBeNull();
  });
});
```

`lib/ai/limite.test.ts` cubre `dentroDelLimite`: verdadero por debajo de `CHAT_LIMITE_MENSAJES`, falso al alcanzarlo, y que un valor ausente o no numérico en la variable de entorno cae a un valor por defecto sensato en vez de desactivar el límite.

- [ ] **Paso 5: Ejecutar, ver el fallo e implementar**

Ejecuta: `pnpm test respaldo limite` → FALLA.

Implementa `lib/ai/respaldo.ts` con las respuestas de las cuatro preguntas del guion (las tres del cliente de la escena 5 y la del operador), emparejadas por términos normalizados, y `lib/ai/limite.ts` leyendo `CHAT_LIMITE_MENSAJES`.

El respaldo se activa con `CHAT_RESPALDO=true`. Existe por una razón concreta: **si falla la red o el Gateway en la sala del cliente, el chat sigue respondiendo el guion.** Junto con el video de respaldo, elimina el riesgo de una demostración fallida.

Ejecuta de nuevo: PASAN.

- [ ] **Paso 6: Escribir la ruta del chat**

`app/api/chat/route.ts`. Consulta la skill `vercel:ai-sdk` para la forma exacta de `streamText` y del protocolo de respuesta en v7. La ruta debe:

1. Leer el perfil (`cliente` u `operador`) del cuerpo y elegir las instrucciones correspondientes.
2. Si `CHAT_RESPALDO=true` o el Gateway no está configurado, responder con `respuestaPregrabada`; si no hay respuesta pregrabada, un mensaje honesto de que el asistente no está disponible — **nunca** una respuesta inventada.
3. Aplicar `dentroDelLimite`; al superarlo, responder que la sesión alcanzó su límite.
4. Llamar al modelo con las herramientas y devolver la respuesta **en streaming**. Un chat que tarda 4 segundos en silencio se siente roto; el mismo tiempo con texto fluyendo se siente vivo.
5. Emitir `llamada_modelo` en `eventos_demo`, para el dashboard y para estimar los costos de la fase real.

- [ ] **Paso 7: Construir el panel de chat**

`components/chat/panel-chat.tsx` — Client Component con `useChat` de `@ai-sdk/react`. Panel lateral desplegable dentro del portal.

Requisitos:
- Sugerencias de preguntas iniciales, tomadas del guion, para orientar al usuario.
- Indicador de escritura y respuesta en streaming.
- `components/chat/tarjeta-producto.tsx`: cuando la respuesta viene de la herramienta de búsqueda, se embebe la tarjeta del producto con código, disponibilidad, precio y TE — no solo texto plano.
- **Distinción visual entre información confirmada y estimada** dentro de las respuestas. Cualquier TE estimado se renderiza con `<EstimacionTE>`, nunca como texto suelto.
- Cuando el asistente cite una regla del procedimiento, la referencia del punto se muestra de forma discreta pero visible.
- Sobrio, integrado al resto de la interfaz. Sin avatares caricaturescos.

Móntalo en `/portal` con perfil `cliente` y en `/operador` con perfil `operador`.

- [ ] **Paso 8: Recorrer la escena 5**

Con `AI_GATEWAY_API_KEY` presente y `CHAT_RESPALDO=false`, desde `/portal`:

1. *"¿Cuánto tarda el DEMO-6205-2RSH/C3 si pido 200 piezas?"* → responde con TE, precio y disponibilidad por almacén. **Verifica que los números coinciden con los que muestra el portal para esa misma designación.** Si no coinciden, el modelo está redactando cifras en vez de usar las herramientas: revisa las instrucciones y el resultado de las tools.
2. *"Necesito un rodamiento equivalente al DEMO-6205-2RSH/C3 pero sellado por ambos lados"* → sugiere designaciones del catálogo.
3. Toma un número de cotización real del histórico y pregunta por su estado → devuelve estado y días transcurridos contra el SLA de 4 días hábiles.
4. Desde `/operador`: *"¿qué solicitudes de hoy son de productos planeados con stock suficiente?"* → lista las que el punto 4.1 permite declinar de inmediato.

Después repite las cuatro con `CHAT_RESPALDO=true` y confirma que el guion sigue respondiéndose sin red.

- [ ] **Paso 9: Escribir el contexto y commitear**

En el contexto, deja registrado **cuáles preguntas del guion cubre el respaldo pregrabado y cuáles no**. El presentador necesita saber exactamente qué puede preguntar si el Gateway cae en la sala.

```bash
pnpm lint
pnpm test
pnpm build
git add lib/ai app/api/chat components/chat app docs/superpowers/contexto
git commit -m "Chatbot con tool calling, dos modos, streaming y respaldo pregrabado"
```

---

## Al cerrar el Plan 3

Escribe `docs/superpowers/specs/2026-08-XX-estado-tras-plan-3.md` con el mismo propósito que `2026-08-04-estado-tras-plan-1.md`: lo que quedó fijado, las restricciones que hereda el Plan 4, la deuda consciente y los supuestos abiertos con SKF. El espacio de trabajo de ejecución no se versiona, así que lo que no quede en ese documento se pierde.

Después se escribe el **Plan 4**: bandeja completa del operador, confirmación guiada de homólogos, cola de pedidos con reconciliación, asignación automática, dashboard de impacto, deploy a Vercel y ensayo con video de respaldo.

**Estado del guion al terminar el Plan 3:**

| Escena | Estado |
|---|---|
| 0 — Encuadre | Completa |
| 1 — Estado actual sin ayuda | Completa |
| 2 — El validador activo | Completa |
| 3 — Homólogos y obsoletos | Parcial: el contexto se muestra, la confirmación guiada es del Plan 4 |
| 4 — Ventana de desconexión | Parcial: el contraste y el TE estimado están; la cola de pedidos es del Plan 4 |
| 5 — Chatbot | Completa |
| 6 — Dashboard | Plan 4 |
| 7 — Cierre | Plan 4 |
