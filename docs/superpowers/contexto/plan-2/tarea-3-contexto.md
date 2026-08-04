# Tarea 3 — Nomenclatura de designaciones

## Estado
completa

No cites el hash de tu propio commit: el archivo va dentro de ese commit y no
puedes conocerlo al escribirlo. Enmendar el commit para corregirlo solo genera
un hash nuevo y el problema se repite. Para ubicar el trabajo basta con
`git log --oneline -- scripts/seed/nomenclatura.ts scripts/seed/nomenclatura.test.ts`.

## Qué entrega esta tarea

Un generador combinatorio determinista de designaciones de producto que sigue patrones **públicos** de nomenclatura de rodamientos (prefijo + serie + código de diámetro + sufijo técnico). Expone el catálogo fijo de 9 familias (`FAMILIAS`), la función de codificación de diámetro interior (`diametroInterior`) y la función de generación (`generarDesignaciones`) que produce `DesignacionBase[]` sin repeticiones, con la mezcla de sufijos y truncamientos necesaria para que el demo de captura de cotizaciones tenga errores de tipeo verosímiles.

## Decisiones tomadas y por qué

- **9 familias, no 7 (el mínimo del test).** Se incluyeron todas las familias del brief tal cual: rodamiento rígido de bolas, rodillos cónicos, rodillos a rótula, rodillos cilíndricos, bolas a rótula, agujas, unidad de rodamiento, sello radial, y transmisión de potencia. Cubren tanto el segmento `rodamiento` como `power_transmission`, que el test exige explícitamente.
- **Peso de la familia "Transmisión de potencia" ajustado de 7 a 9 (única desviación del código del brief).** Con peso 7 (7% nominal sobre un total de 100), la proporción real observada tras 5000 generaciones con la semilla `20260803` fue 0.078 — por debajo del umbral `> 0.08` que exige el test "la proporcion de transmision de potencia esta entre 8% y 25%". La causa es que las familias con menos combinaciones posibles (series/sufijos más cortos) sufren más colisiones de designación ya vista y ceden turnos efectivos a otras familias durante el `while` de reintento, así que la proporción final no es exactamente proporcional al peso nominal. Subir el peso a 9 (9% nominal) dejó la proporción real en **9.82%**, dentro del rango pedido con margen. No se tocó nada más del código de referencia del brief.
- **Umbral de pares-prefijo no se tocó.** Con la implementación tal cual (sufijos que son extensión de otros, p. ej. `-2Z` y `-2Z/C3`, o designación base sin sufijo vs. con sufijo), 5000 designaciones con semilla `20260803` producen **685 pares donde una designación es prefijo de otra** — muy por encima del mínimo de 50 exigido. No hizo falta ampliar sufijos.
- **`separador = prefijo && !serie ? " " : ""`:** cuando una familia tiene prefijo alfabético pero la "serie" es vacía (p. ej. unidades de rodamiento `YAR`, `YET`; sellos radiales `CR`, `HMS5`), se inserta un espacio antes del código de diámetro para que la designación no quede pegada de forma poco natural (`YAR 205` en vez de `YAR205`). Cuando hay serie numérica (p. ej. rodillos cilíndricos `NU` + serie `2`), el prefijo y la serie se concatenan sin espacio (`NU2` + `05` = `NU205`), que es el patrón habitual en nomenclatura pública de rodamientos.
- **Reintento acotado (`intentos < cantidad * 200`) con `Error` explícito si no alcanza la cantidad pedida:** evita bucles infinitos si algún día se reduce demasiado el espacio combinatorio de una familia; el mensaje de error apunta directamente a la causa ("Amplía las series o los sufijos de FAMILIAS").
- **Sin `Math.random()` ni `Date.now()`:** todo el azar viene de la instancia `Aleatorio` pasada como parámetro, cumpliendo el requisito de determinismo absoluto de las restricciones globales.

### Ronda de arreglo 1 — espacio combinatorio insuficiente para 30.000

El código de referencia del brief (no una transcripción mía) tenía un defecto que solo se manifestaba con volúmenes grandes: el rango del código de diámetro era `a.entero(0, 48)` (49 valores posibles), lo que dejaba el espacio combinatorio total de las 9 familias en **26.215** designaciones únicas. El test original solo pedía 5.000, así que nunca lo detectó. El orquestador de la Tarea 10, que pide **30.000**, fallaba a los ~1.5 s con `Error: Solo se generaron 26215 designaciones únicas de 30000 pedidas`.

**Arreglo aplicado — ampliar el rango del código de diámetro, no inventar sufijos:**

- Se introdujo la constante `CANTIDAD_CODIGOS_DIAMETRO = 100` (códigos `"00"` a `"99"`), y `generarDesignaciones` ahora dibuja `a.entero(0, CANTIDAD_CODIGOS_DIAMETRO - 1)` en vez de `a.entero(0, 48)`. Esto es fiel al dominio: la nomenclatura pública de rodamientos ya multiplica por 5 el código a partir de `04`, así que un código `96` es un diámetro real de 480 mm (rodamientos grandes existen). No se añadieron series ni prefijos ficticios — solo se dejó de recortar artificialmente el rango de diámetro a 49 valores cuando la codificación real admite hasta 100.
- Con `CANTIDAD_CODIGOS_DIAMETRO = 100`, el espacio combinatorio total pasó de 26.215 a **53.500** designaciones únicas — supera los 30.000 pedidos por la Tarea 10 con un margen de ~1.78×, y deja techo para que el catálogo crezca más adelante sin volver a romperse por agotamiento.
- Se exportó `espacioCombinatorio(familias = FAMILIAS): number`, que calcula el tamaño teórico del espacio (`Σ prefijos.length × series.length × sufijos.length × CANTIDAD_CODIGOS_DIAMETRO`) **sin generar nada**. Un test nuevo (`"espacio combinatorio"` → `"supera con margen los 30000..."`) falla con un mensaje explícito si alguien recorta `FAMILIAS` por debajo de 45.000 en el futuro, en vez de que el error aparezca a mitad de una siembra real de 30.000. Se añadió también un test que genera 30.000 designaciones de verdad (`"produce las 30000 designaciones que pide el orquestador del plan..."`), que es el escenario real que ejecuta el orquestador.
- **Efecto sobre las proporciones existentes:** ampliar el rango de diámetro sí movió ligeramente los números medidos con la semilla `20260803` y 5.000 designaciones (más valores de diámetro posibles diluyen algunas coincidencias). Los pares-prefijo bajaron de 685 a **461** (sigue muy por encima del mínimo de 50) y la proporción de `power_transmission` bajó de 9.82% a **9.7%** (sigue dentro de 8%–25%). Ambos tests pasan sin tocar sus umbrales ni el peso de ninguna familia — no hizo falta ajustar nada más.
- Generar 30.000 designaciones con la semilla `20260803` toma **~30 ms** en esta máquina — nada cerca del límite de reintentos (`30000 * 200` intentos).

### Ronda de arreglo 2 — el rango de diámetro debe ser por familia, no una constante global

El arreglo de la ronda 1 amplió el código de diámetro a 100 valores (`"00"`–`"99"`, hasta 495 mm) **igual para las 9 familias**. Eso resolvió el espacio combinatorio, pero introdujo un problema distinto: tres familias empezaron a generar diámetros que no existen en ningún catálogo público. Medido sobre 30.000 designaciones: **71%** de "Rodamiento de bolas a rótula" por encima de 140 mm, **59%** de "Unidad de rodamiento" por encima de 200 mm, **56%** de "Rodamiento de agujas" por encima de 220 mm. Un rodamiento de bolas a rótula de 345 mm no existe — y esto ataca la misma verosimilitud que la restricción de "sin datos reales de SKF, pero con patrones públicos reales" protege: si el catálogo produce tipos de producto físicamente imposibles, un ingeniero de SKF que lo revise pierde confianza en el demo completo.

**Arreglo aplicado — `codigoDiametroMax` por `Familia`, no una constante compartida:**

- Se añadió el campo `codigoDiametroMax: number` a la interfaz `Familia` (código máximo inclusive; convertir a mm con `diametroInterior`). `generarDesignaciones` ahora dibuja `a.entero(0, familia.codigoDiametroMax)` en vez de usar `CANTIDAD_CODIGOS_DIAMETRO - 1` para todas. `espacioCombinatorio` también se actualizó para usar `(f.codigoDiametroMax + 1)` por familia en vez de la constante global.
- Topes elegidos, con conversión hecha a mano (código = mm / 5 para mm ≥ 20; recordar que 04 en adelante es ×5):

  | Familia | `codigoDiametroMax` | mm máximo | Motivo |
  |---|---|---|---|
  | Rodamiento rígido de bolas | 99 (sin tope propio) | 495 | Existen rodamientos rígidos de bolas grandes en catálogo público. |
  | Rodamiento de rodillos cónicos | 99 (sin tope propio) | 495 | Uso común en minería/cemento con diámetros grandes. |
  | Rodamiento de rodillos a rótula | 99 (sin tope propio) | 495 | Familia típica de aplicaciones pesadas. |
  | Rodamiento de rodillos cilíndricos | 99 (sin tope propio) | 495 | También alcanza diámetros grandes en catálogo público. |
  | Rodamiento de bolas a rótula | **28** | **140** | Tope real de catálogo público para esta familia (instrucción explícita de esta ronda). |
  | Rodamiento de agujas | **44** | **220** | Ídem. |
  | Unidad de rodamiento | **40** | **200** | Ídem. |
  | Sello radial | **30** | **150** | Acotado con criterio: sellos radiales genéricos rara vez cubren ejes mayores en catálogo público. |
  | Transmisión de potencia | **20** | 100 (nominal) | El código de dos dígitos no representa diámetro de eje en esta familia (los designadores de correas/poleas usan otras unidades), pero se acota igual para no producir números de dos dígitos implausibles. |

  El campo es **por familia y no una constante global** justamente porque el diámetro máximo plausible varía mucho de una familia de producto a otra — la lección de esta ronda es que "ampliar el rango" nunca es una operación uniforme sobre todo el catálogo; hay que revisar familia por familia qué es físicamente real.

- **El espacio combinatorio bajó al acotar tres familias, así que se compensó ampliando sufijos reales en las familias que sí alcanzan diámetros grandes** (instrucción explícita: subir el tope de esas familias o añadir sufijos reales, nunca relajar los topes de las acotadas ni bajar el umbral del test):
  - "Rodamiento rígido de bolas": se añadieron `"-2ZNR"`, `"-2RS1NR"` (variantes con ranura para anillo de retención, notación pública real) y `"/C2"` (clase de holgura reducida, ya existían `/C3` y `/C4`). Sufijos: 12 → 15.
  - "Rodamiento de rodillos cilíndricos": se añadieron `"/C2"` y `"/C4"` (clases de holgura, mismo patrón que `/C3` ya existente). Sufijos: 5 → 7.
  - No se tocaron series ni prefijos de ninguna familia (solo sufijos reales y ya cubiertos por el patrón de clases de holgura/variantes de sello que el catálogo ya usaba).
- **Espacio combinatorio resultante: 49.718** (antes 53.500 con la constante global; sigue por encima del piso de 45.000 exigido, con margen de ~1.66× sobre los 30.000 pedidos por la Tarea 10).
- **Test nuevo que fija la regla (versión original de esta ronda, corregida en la Ronda de arreglo 3 más abajo):** `"ninguna designacion supera el diametro maximo real de su familia"`, dentro de `describe("generacion")`.
- **Verificación sobre 30.000 designaciones (semilla `20260803`):** el diámetro máximo observado en cada familia acotada coincidió exactamente con su tope — 140 mm, 200 mm y 220 mm respectivamente — confirmando que el nuevo test cubre el caso real.
- **Efecto sobre los tests existentes:** ninguno necesitó ajuste de umbral. Con la misma semilla y 5.000 designaciones, los pares-prefijo subieron de 461 a **580** (más aún por encima del mínimo de 50) y la proporción de `power_transmission` bajó de 9.7% a **8.7%** (sigue dentro de 8%–25%, aunque con menos margen que antes — no se tocó el peso porque ya pasa; si una ronda futura la acerca más al 8%, ahí sí habría que subir el peso de esa familia, no el umbral).

### Ronda de arreglo 3 — el test de diámetro máximo era tautológico

El test añadido en la ronda 2 construía su mapa de máximos leyendo `f.codigoDiametroMax` directamente de `FAMILIAS` — el **mismo campo** que `generarDesignaciones` usa para acotar el sorteo (`a.entero(0, familia.codigoDiametroMax)`). Por construcción, ninguna designación puede superar un límite que ella misma usó para generarse: el test comparaba el generador consigo mismo y pasaba siempre, sin importar qué tan alto se pusiera el tope. El revisor lo demostró subiendo `codigoDiametroMax` de "Rodamiento de bolas a rótula" de 28 a 40 (reintroduciendo la regresión de la ronda 2 para esa familia) y viendo que los 13 tests, incluido este, seguían pasando.

**Arreglo aplicado — tabla de máximos escrita a mano dentro del test, no derivada de `FAMILIAS`:**

```ts
const maximoRealMm: Record<string, number> = {
  "Rodamiento de bolas a rótula": 140,
  "Rodamiento de agujas": 220,
  "Unidad de rodamiento": 200,
  "Sello radial": 150,
  "Transmisión de potencia": 100,
  // Rígidos de bolas, rodillos cónicos, rodillos a rótula y rodillos cilíndricos
  // quedan fuera a propósito: alcanzan diámetros grandes (hasta 495 mm) reales.
};
```

**Por qué la tabla está duplicada a mano y no se deriva de `FAMILIAS.codigoDiametroMax` (esto no es redundancia accidental, es la propiedad que hace el test útil):** un test que lee el límite de la misma fuente que el código de producción usa para generar los datos nunca puede detectar que ese límite esté mal — solo puede detectar que el generador no respeta su propio límite (un bug distinto, y mucho menos probable). La única forma de que el test proteja contra "alguien sube un tope por encima de lo real" es que el test tenga su propia fuente de verdad, independiente del dato que vigila. Si en el futuro alguien "simplifica" esto derivando la tabla de `FAMILIAS` otra vez, el test vuelve a ser tautológico sin que nadie lo note hasta la próxima ronda de revisión — de ahí esta nota.

**Verificación con mutación (antes de dar el arreglo por bueno):** se subió temporalmente `codigoDiametroMax` de "Rodamiento de bolas a rótula" de 28 a 40 en `nomenclatura.ts`, se corrió `pnpm test nomenclatura`, y el test falló con:

```
AssertionError: Rodamiento de bolas a rótula: la designacion "2238 ETN9" tiene diametro interior 190 mm, supera el maximo real de 140 mm de esa familia: expected 190 to be less than or equal to 140
```

Se restauró `codigoDiametroMax` a `28` de inmediato (`git diff scripts/seed/nomenclatura.ts` quedó vacío tras restaurar, confirmando que no quedó ningún resto de la mutación) y se volvió a correr la suite completa, verde.

## Contrato que exponen estos archivos

`scripts/seed/nomenclatura.ts`:

```ts
export type Segmento = "rodamiento" | "power_transmission";

export interface Familia {
  nombre: string;
  segmento: Segmento;
  prefijos: readonly string[];
  series: readonly string[];
  sufijos: readonly string[];
  codigoDiametroMax: number; // código máximo (inclusive) de diámetro para esta familia; ver diametroInterior
  peso: number;
  descripcionBase: string;
}

export const FAMILIAS: readonly Familia[]; // 9 elementos

export function diametroInterior(codigo: string): number;
// "00"->10, "01"->12, "02"->15, "03"->17; de "04" en adelante, Number(codigo) * 5

export const CANTIDAD_CODIGOS_DIAMETRO: number; // 100 ("00" a "99"); techo absoluto del formato, no un límite de ninguna familia

export function espacioCombinatorio(familias?: readonly Familia[]): number;
// Tamaño teórico del espacio combinatorio, calculado desde FAMILIAS (usa codigoDiametroMax por familia) sin generar nada.
// Con las FAMILIAS actuales: 49718.

export interface DesignacionBase {
  designacion: string;
  descripcion: string;
  familia: string;   // coincide con Familia.nombre
  segmento: Segmento;
}

export function generarDesignaciones(a: Aleatorio, cantidad: number): DesignacionBase[];
// Devuelve exactamente `cantidad` elementos, sin designaciones repetidas.
// Determinista: misma semilla de `a` (ver ./aleatorio) => mismo resultado exacto.
// Lanza Error si no logra generar `cantidad` designaciones únicas en cantidad*200 intentos.
```

Notas para quien consume (tarea siguiente):
- `generarDesignaciones` es la única función pensada para uso externo; `FAMILIAS` y `diametroInterior` son de solo lectura/consulta.
- El campo `familia` de `DesignacionBase` es el string `Familia.nombre` (español, con acentos, p. ej. `"Rodamiento rígido de bolas"`), no un slug ni un id.
- El campo `descripcion` siempre tiene más de 10 caracteres y sigue el patrón `"<descripcionBase>, diámetro interior <mm> mm"`.
- La `designacion` puede o no llevar sufijo (regex `/[-/]/` distingue con vs. sin sufijo/separador); esto es intencional para que existan pares "base" / "con sufijo" que son prefijo uno del otro.
- Con `cantidad = 5000` y semilla `20260803`, se generan **580 pares designación-es-prefijo-de-otra** y una proporción de `power_transmission` de **8.7%**. Con `cantidad = 30000` y la misma semilla, la generación es exitosa (espacio combinatorio total: 49.718) y tarda ~34 ms; el diámetro máximo observado en cada familia acotada coincide exactamente con su `codigoDiametroMax` (140 mm, 200 mm, 220 mm). Estos números son deterministas para esa semilla y cantidad exactas; no están garantizados para otras combinaciones, aunque los tests verifican que se mantienen dentro de rango con esa misma semilla.
- Cada familia trae su propio `codigoDiametroMax`: quien consuma `FAMILIAS` para mostrar u ordenar por diámetro debe leer ese campo por familia, no asumir un rango uniforme de 0-99.

## Qué falta / qué NO hace

- No inserta nada en la base de datos ni conoce la tabla de productos/catálogo — es generación pura en memoria.
- No genera precios, existencias, ni ningún otro atributo de producto más allá de `designacion`, `descripcion`, `familia`, `segmento`.
- No garantiza que las designaciones sean únicas *entre distintas llamadas* a `generarDesignaciones` (cada llamada arranca su propio `Set` de `vistas`); si la tarea siguiente necesita unicidad global entre múltiples generaciones, debe deduplicarlas externamente o generar todo con una sola llamada.
- No valida que las designaciones no coincidan con códigos reales de catálogo SKF más allá de seguir patrones públicos genéricos — es responsabilidad de las restricciones globales del proyecto, no de esta tarea, y se siguió esa restricción al diseñar `FAMILIAS`.
- El campo `peso` de `Familia` no es un porcentaje directo de la proporción final observada (ver nota sobre colisiones arriba); quien ajuste `FAMILIAS` en el futuro debe volver a medir la proporción real con el script de verificación, no asumir que peso == proporción.
- El espacio combinatorio actual (49.718) tiene un techo: si una tarea futura pide generar más de ~35.000-40.000 designaciones únicas de una sola vez, conviene volver a medir el margen real con `espacioCombinatorio()` antes de asumir que cabe — a partir de cierta ocupación del espacio, las colisiones empiezan a alargar sensiblemente el tiempo de generación (aunque a 30.000 sobre 49.718, ~60% de ocupación, el costo sigue siendo trivial, ~34 ms).
- **Subir un `codigoDiametroMax` no es gratis.** Las cinco familias acotadas (bolas a rótula, unidad de rodamiento, agujas, sello radial, transmisión de potencia) tienen su tope fijado a un diámetro real de catálogo público o a un criterio explícito de plausibilidad; subirlo para ganar espacio combinatorio reintroduciría el problema de la Ronda de arreglo 2 (diámetros implausibles). Las otras cuatro familias (rígidos de bolas, rodillos cónicos, rodillos a rótula, rodillos cilíndricos) ya están en `codigoDiametroMax: 99`, el máximo absoluto que permite un código de dos dígitos — no se puede subir más sin cambiar el formato de código. Si hace falta más espacio combinatorio en el futuro, la vía correcta es añadir series o sufijos reales a esas cuatro familias amplias (como se hizo en esta ronda con `/C2`, `/C4`, `-2ZNR`, `-2RS1NR`), no tocar los topes de las familias acotadas ni el umbral del test.

## Cómo verificar

Ejecutar los tests de esta tarea:
```bash
pnpm test nomenclatura
```
Esperado: `Test Files 1 passed (1)`, `Tests 13 passed (13)`.

Ejecutar toda la suite (verificar que no hay regresiones):
```bash
pnpm test
```
Esperado: `Test Files 10 passed (10)`, `Tests 109 passed (109)`.

Verificar tipos:
```bash
pnpm exec tsc --noEmit
```
Esperado: sin salida (sin errores).

Verificar formato/lint (Biome puede reordenar imports, no es desviación):
```bash
pnpm lint
```
Esperado: sin errores sobre `scripts/seed/nomenclatura.ts` ni `scripts/seed/nomenclatura.test.ts` (puede haber un "info" preexistente de migración de configuración de Biome, no relacionado con esta tarea).

Inspeccionar directamente el espacio combinatorio, el diámetro máximo observado por familia, el conteo de pares-prefijo, la proporción de `power_transmission` y el tiempo de generar 30.000: crear un archivo temporal `scripts/seed/_tmp_check.ts` (fuera del repo versionado, borrar después) con:
```ts
import { crearAleatorio } from "./aleatorio";
import { espacioCombinatorio, FAMILIAS, generarDesignaciones } from "./nomenclatura";

console.log("espacio combinatorio:", espacioCombinatorio());

const t0 = Date.now();
const d30 = generarDesignaciones(crearAleatorio(20260803), 30000);
console.log("30000 generadas en", Date.now() - t0, "ms; unicas:", new Set(d30.map((x) => x.designacion)).size);

const maxObservado = new Map<string, number>();
for (const x of d30) {
  const mm = Number(x.descripcion.match(/diámetro interior (\d+) mm/)?.[1]);
  maxObservado.set(x.familia, Math.max(maxObservado.get(x.familia) ?? 0, mm));
}
for (const f of FAMILIAS) console.log(f.nombre, "max observado:", maxObservado.get(f.nombre), "mm | tope:", f.codigoDiametroMax);

const d = generarDesignaciones(crearAleatorio(20260803), 5000);
const codigos = d.map((x) => x.designacion);
const conjunto = new Set(codigos);
const prefijos = codigos.filter((c) => [...conjunto].some((o) => o !== c && o.startsWith(c)));
console.log("pares prefijo (5000):", prefijos.length);
console.log("proporcion pt (5000):", d.filter((x) => x.segmento === "power_transmission").length / d.length);
```
y ejecutarlo con `pnpm exec tsx scripts/seed/_tmp_check.ts`.
Esperado: `espacio combinatorio: 49718`; `30000 generadas en ~34 ms; unicas: 30000`; para "Rodamiento de bolas a rótula", "Unidad de rodamiento" y "Rodamiento de agujas" el máximo observado coincide exactamente con 140, 200 y 220 mm respectivamente; `pares prefijo (5000): 580`; `proporcion pt (5000): 0.087`.
