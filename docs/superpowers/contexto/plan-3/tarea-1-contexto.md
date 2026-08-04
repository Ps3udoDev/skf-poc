# Tarea 1 — Sistema de diseño y armazón de la aplicación

## Estado
completa

No cites el hash de tu propio commit: el archivo va dentro de ese commit y no
puedes conocerlo al escribirlo. Para ubicar el trabajo basta con
`git log --oneline -- app/globals.css components/marco lib/utilidades.ts components.json`.

## Qué entrega esta tarea
El armazón puro sobre el que se apoyan las 12 tareas siguientes del Plan 3: los
tokens de color de doc 06 en `app/globals.css`, la utilidad `cn()` en
`lib/utilidades.ts`, las 11 primitivas de `components/ui/` vendorizadas por el
CLI de shadcn, y dos componentes de marco propios —
`<DistintivoDemo />` y `<BarraSuperior />` — que ya se montan en un
placeholder de `/portal`. `app/page.tsx` redirige `/` a `/portal`. No hay
ninguna pantalla de negocio todavía; eso empieza en tareas posteriores.

## Decisiones tomadas y por qué

- **No hay tema oscuro, y es deliberado.** El demo se proyecta en una sala de
  juntas con luz, y una segunda paleta le haría perder contraste al ámbar de
  desconexión, el color más importante de la presentación. No hay clase
  `.dark` ni bloque de colores oscuros en ningún archivo de esta tarea.
  **Detalle no obvio:** el código vendorizado en `components/ui/` (botón,
  badge, input...) trae clases `dark:...` de fábrica. Si `globals.css` no
  redefine el variante `dark`, Tailwind v4 usa su comportamiento por
  defecto — `dark:` = `@media (prefers-color-scheme: dark)` — y esas clases
  se activarían solas si el sistema operativo del presentador está en modo
  oscuro (muy común en laptops de desarrollo), alterando la demo sin que
  nadie lo pidiera. Por eso `globals.css` sí declara
  `@custom-variant dark (&:is(.dark *));`: no crea un tema oscuro, solo hace
  que ese prefijo dependa de una clase `.dark` que esta app **nunca aplica**
  en ningún `<html>`/`<body>` — así el prefijo queda inerte en vez de atado a
  la preferencia del sistema. Verificado inspeccionando el CSS compilado:
  antes del fix, las reglas `dark:*` salían bajo
  `@media (prefers-color-scheme: dark)`; después, salen como
  `.dark\:clase:is(.dark *)`, que nunca coincide con nada en esta app.

- **`components/ui/` conserva la nomenclatura de origen de shadcn** (inglés,
  `cn`, `cva`, nombres de archivo en inglés) mientras el resto del código va
  en español — es la única excepción que fija el brief. La única línea que sí
  se tocó en los 11 archivos generados es el import de la utilidad
  (`@/lib/utilidades` en vez de `@/lib/utils`), porque el nombre del archivo
  de utilidades sí está fijado por el brief y no es parte de esa excepción.

- **El CLI de shadcn instalado (v4.16.1) ya no tiene los prompts que pide el
  brief** ("estilo new-york, color base slate, variables CSS sí"). Esas flags
  (`--style`, `--base-color`, `--css-variables`) fueron eliminadas en la v4 a
  favor de un sistema de "presets" con nombres nuevos (nova, vega, maia...) y
  ya no existe un estilo llamado "new-york". Se ejecutó
  `pnpm dlx shadcn@latest init -d --base radix -y` (no interactivo, primitiva
  Radix explícita en vez de la Base UI que trae el preset por defecto, para
  no introducir una segunda librería de primitivas que el resto del plan no
  espera) y luego
  `pnpm dlx shadcn@latest add button card input badge table alert dialog separator skeleton switch tabs -y`.
  `components.json` quedó con `"style": "radix-nova"` (el nombre real que usa
  esta versión del CLI; escribir `"new-york"` ahí sería falso y podría romper
  una futura ejecución de `shadcn add`) y `"baseColor": "slate"` (ese sí se
  pudo fijar a mano porque el campo es solo metadata para futuras
  ejecuciones del CLI; el color real que se ve en pantalla no depende de él,
  ver punto siguiente). Esto no es una desviación silenciosa: no hubo fallo
  de red, hubo un cambio de versión del CLI entre cuando se escribió el
  brief y cuando se ejecutó esta tarea. Las rutas de los 11 archivos en
  `components/ui/` son exactamente las que pide el brief.

- **`app/globals.css` no es una copia literal del bloque de la Tarea 1**
  — es una desviación deliberada y es el hallazgo más importante de esta
  tarea; queda documentado aquí en detalle para que quien revise pueda
  juzgarlo. El bloque de tokens que pide el brief define únicamente los
  nombres en español (`--fondo`, `--primario`, `--desconexion`...). Pero las
  11 primitivas de `components/ui/` que instala el Paso 2 de esta misma
  tarea usan directamente la convención de nombres de shadcn en sus clases
  (`bg-primary`, `text-foreground`, `border-border`, `bg-destructive`,
  `text-muted-foreground`, `bg-card`, etc. — confirmado con
  `grep` sobre los 11 archivos). Si `globals.css` se reemplaza tal cual lo
  muestra el brief, esos nombres dejan de existir, Tailwind no genera esas
  clases utilitarias y las primitivas quedan sin color (fondos
  transparentes, bordes invisibles) la primera vez que una tarea futura las
  use en una pantalla real. La Tarea 1 no lo detecta porque
  `DistintivoDemo`/`BarraSuperior`/la página de `/portal` no usan ninguna
  primitiva de `components/ui/` todavía — el problema es silencioso hasta la
  Tarea 2 o más adelante.

  La solución: se agregó un bloque puente en `:root` y en `@theme inline`
  que define esos nombres de shadcn apuntando a los **mismos valores
  literales** que ya fija el brief (`--primary: var(--primario)`,
  `--background: var(--fondo)`, `--destructive: var(--error)`, etc.) — no es
  una paleta nueva ni un valor inventado, es la misma paleta expresada con
  los nombres que ese código ya espera. También se conservaron
  `@import "tw-animate-css";` (las animaciones de apertura/cierre de
  `Dialog` dependen de esas clases) y `@import "shadcn/tailwind.css";` (de
  ahí salen los variantes `data-open:`, `data-closed:`, `data-checked:`,
  `data-active:` que usan `Dialog`, `Switch` y `Tabs` — sin este import esos
  estados no tienen estilo). Se verificó compilando y sirviendo la app: el
  CSS generado resuelve `--primario`, `--desconexion`, etc. a los hex
  exactos del brief, y clases como `.bg-desconexion`/`.text-primario`
  resuelven a `var(--desconexion)`/`var(--primario)` — no a los valores
  grises por defecto que trae el CLI.

  Se documenta esto explícitamente porque el encargo insistió en usar los
  valores del brief "literalmente, sin improvisar" — los valores no se
  improvisaron (son los mismos hex), pero la **estructura** del archivo sí
  se amplió respecto al bloque mostrado. Si esta decisión no es la que se
  quería, es reversible: basta con borrar el bloque puente y las primitivas
  de `components/ui/` quedarán sin color hasta que alguna tarea futura las
  estilice a mano con las clases en español.

- **`--radius: 0.5rem` y la escala `--radius-sm/md/lg/xl/4xl` en
  `@theme inline`** no son valores de marca del doc 06 (que no dice nada
  sobre radios) — existen únicamente porque `button.tsx` y `badge.tsx`
  referencian `var(--radius-md)` y `rounded-4xl` directamente en sus
  clases, y sin esas variables definidas esos dos componentes pierden su
  redondeo.

- **`lib/utilidades.ts` reemplaza a `lib/utils.ts`** (el que genera el CLI
  por defecto): el brief fija ese nombre y esa ruta explícitamente. Se
  actualizó `components.json` (`aliases.utils`) y los 11 imports en
  `components/ui/` para apuntar ahí. La firma es
  `cn(...clases: ClassValue[]): string` con el parámetro en español, tal
  como pide la sección de interfaces del brief; la implementación
  (`clsx` + `twMerge`) es la estándar de shadcn.

- **`package.json` ganó tres dependencias que no pedimos a mano:**
  `radix-ui` (paquete unificado que usan las primitivas Radix, en vez de
  paquetes `@radix-ui/react-*` sueltos — así vendoriza shadcn en esta
  versión), `shadcn` (el propio CLI, que ahora se registra como dependencia
  del proyecto para comandos como `shadcn docs`/`view`) y `tw-animate-css`
  (animaciones que usa `Dialog`). Son efectos secundarios normales del CLI,
  no se agregaron manualmente.

- **`app/(portal)/portal/page.tsx`** es un marcador provisional textual —
  "Buscador en construcción (tarea 11)" — tal como lo fija el brief; no
  intenta anticipar nada de la Tarea 11.

## Contrato que exponen estos archivos

`lib/utilidades.ts`:
```ts
export function cn(...clases: ClassValue[]): string;
```

`components/marco/distintivo-demo.tsx`:
```tsx
export function DistintivoDemo(): JSX.Element;
```
Píldora fija (borde + punto ámbar decorativo + texto) con el texto exacto
"Entorno de demostración · datos simulados". Sin props.

`components/marco/barra-superior.tsx`:
```tsx
export function BarraSuperior({ perfil }: { perfil: "cliente" | "operador" }): JSX.Element;
```
Server component (sin `"use client"`, sin estado). Enlaces a `/portal` y
`/operador` vía `next/link`; resalta el que coincide con `perfil`. Monta
`<DistintivoDemo />`. Tiene un hueco marcado con comentario para el
indicador de plantas/modo activo que llega en la Tarea 5 — no hay ningún
valor inventado ahí.

`components.json`: `aliases.components = "@/components"`,
`aliases.utils = "@/lib/utilidades"`, `aliases.ui = "@/components/ui"`.

`app/globals.css`: variables en español (`--fondo`, `--fondo-sutil`,
`--texto`, `--texto-tenue`, `--borde`, `--primario` + `-suave` + `-contraste`,
`--desconexion` + `-suave`, `--confirmacion` + `-suave`, `--error` +
`-suave`) expuestas como utilidades Tailwind (`bg-fondo`, `text-primario`,
`bg-desconexion-suave`, etc. — prefijo `color-` en `@theme inline`, se usan
sin ese prefijo en JSX). Clase `.designacion` para forzar monoespaciada.
Puente de compatibilidad con `components/ui/` (ver decisión de arriba) — no
usar los nombres del puente (`--primary`, `--background`...) en código nuevo
en español; son solo para que las primitivas de shadcn se pinten solas.

## Qué falta / qué NO hace

- No hay ninguna pantalla de negocio: el buscador real de `/portal` es la
  Tarea 11, el layout de `/operador` no existe todavía, no hay proveedor de
  sesión (Tarea 5) ni indicador de plantas.
- `BarraSuperior` no tiene estado propio ni lee ninguna sesión real — el
  perfil se pasa como prop fija desde quien la monta.
- No se agregaron componentes de `components/ui/` más allá de los 11 que
  pide el brief (button, card, input, badge, table, alert, dialog,
  separator, skeleton, switch, tabs) — nada de `select`, `dropdown-menu`,
  `sheet`, etc. hasta que una tarea futura los necesite.
- El puente de compatibilidad de `globals.css` cubre únicamente los nombres
  de variable que las 11 primitivas instaladas usan hoy (confirmado con
  `grep` sobre esos 11 archivos: `background`, `foreground`, `card`,
  `card-foreground`, `popover`, `popover-foreground`, `primary`,
  `primary-foreground`, `secondary`, `secondary-foreground`, `muted`,
  `muted-foreground`, `destructive`, `border`, `input`, `ring`, y el radio).
  Si una tarea futura agrega una primitiva nueva vía `shadcn add` que use
  otro nombre de la convención (`accent`, `chart-*`, `sidebar-*`,
  `font-heading`...), ese nombre no está definido todavía y habría que
  añadirlo al puente siguiendo el mismo patrón.
- La verificación visual del Paso 7 se hizo sin la extensión de Chrome (no
  estaba disponible en este entorno): se confirmó sirviendo `pnpm dev` y
  usando `curl` contra el HTML renderizado y el CSS compilado — se
  confirmaron el texto exacto del distintivo, la estructura de la barra
  superior, y que las clases `bg-desconexion`/`text-primario`/`border-borde`
  resuelven a los hex exactos del brief en el CSS servido (no a los grises
  por defecto de Tailwind). No hay una captura de pantalla real.

## Cómo verificar

```bash
pnpm lint
```
Esperado: sin errores (Biome reordenó imports y aplicó comillas
dobles/punto y coma/trailing commas sobre los 11 archivos de
`components/ui/` recién vendorizados vía `pnpm lint:fix`; no es una
desviación). Queda un aviso informativo preexistente de `biome.json` sobre
el campo `recommended` deprecado — no relacionado con esta tarea.

```bash
pnpm build
```
Esperado: build sin errores, rutas `/`, `/_not-found` y `/portal` generadas
como estáticas.

```bash
pnpm dev
```
Abrir `/` → redirige a `/portal`. La barra superior muestra "Portal de
Consultas y Cotizaciones", las pestañas "Vista Cliente" (resaltada, perfil
por defecto) y "Servicio al Cliente", y el distintivo "Entorno de
demostración · datos simulados" a la derecha. Confirmado por inspección del
HTML/CSS servidos (ver nota en "Qué falta" sobre la ausencia de captura de
pantalla real).
