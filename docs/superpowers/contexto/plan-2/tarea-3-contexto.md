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
  peso: number;
  descripcionBase: string;
}

export const FAMILIAS: readonly Familia[]; // 9 elementos

export function diametroInterior(codigo: string): number;
// "00"->10, "01"->12, "02"->15, "03"->17; de "04" en adelante, Number(codigo) * 5

export const CANTIDAD_CODIGOS_DIAMETRO: number; // 100 ("00" a "99")

export function espacioCombinatorio(familias?: readonly Familia[]): number;
// Tamaño teórico del espacio combinatorio, calculado desde FAMILIAS sin generar nada.
// Con las FAMILIAS actuales: 53500.

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
- Con `cantidad = 5000` y semilla `20260803`, se generan **461 pares designación-es-prefijo-de-otra** y una proporción de `power_transmission` de **9.7%**. Con `cantidad = 30000` y la misma semilla, la generación es exitosa (espacio combinatorio total: 53.500) y tarda ~30 ms. Estos números son deterministas para esa semilla y cantidad exactas; no están garantizados para otras combinaciones, aunque los tests verifican que se mantienen dentro de rango con esa misma semilla.

## Qué falta / qué NO hace

- No inserta nada en la base de datos ni conoce la tabla de productos/catálogo — es generación pura en memoria.
- No genera precios, existencias, ni ningún otro atributo de producto más allá de `designacion`, `descripcion`, `familia`, `segmento`.
- No garantiza que las designaciones sean únicas *entre distintas llamadas* a `generarDesignaciones` (cada llamada arranca su propio `Set` de `vistas`); si la tarea siguiente necesita unicidad global entre múltiples generaciones, debe deduplicarlas externamente o generar todo con una sola llamada.
- No valida que las designaciones no coincidan con códigos reales de catálogo SKF más allá de seguir patrones públicos genéricos — es responsabilidad de las restricciones globales del proyecto, no de esta tarea, y se siguió esa restricción al diseñar `FAMILIAS`.
- El campo `peso` de `Familia` no es un porcentaje directo de la proporción final observada (ver nota sobre colisiones arriba); quien ajuste `FAMILIAS` en el futuro debe volver a medir la proporción real con el script de verificación, no asumir que peso == proporción.
- El espacio combinatorio actual (53.500) tiene un techo: si una tarea futura pide generar más de ~40.000 designaciones únicas de una sola vez, conviene volver a medir el margen real con `espacioCombinatorio()` antes de asumir que cabe — a partir de cierta ocupación del espacio, las colisiones empiezan a alargar sensiblemente el tiempo de generación (aunque a 30.000 sobre 53.500, ~56% de ocupación, el costo sigue siendo trivial, ~30 ms).

## Cómo verificar

Ejecutar los tests de esta tarea:
```bash
pnpm test nomenclatura
```
Esperado: `Test Files 1 passed (1)`, `Tests 12 passed (12)`.

Ejecutar toda la suite (verificar que no hay regresiones):
```bash
pnpm test
```
Esperado: `Test Files 10 passed (10)`, `Tests 108 passed (108)`.

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

Inspeccionar directamente el espacio combinatorio, el conteo de pares-prefijo, la proporción de `power_transmission` y el tiempo de generar 30.000: crear un archivo temporal `scripts/seed/_tmp_check.ts` (fuera del repo versionado, borrar después) con:
```ts
import { crearAleatorio } from "./aleatorio";
import { espacioCombinatorio, generarDesignaciones } from "./nomenclatura";

console.log("espacio combinatorio:", espacioCombinatorio());

const t0 = Date.now();
const d30 = generarDesignaciones(crearAleatorio(20260803), 30000);
console.log("30000 generadas en", Date.now() - t0, "ms; unicas:", new Set(d30.map((x) => x.designacion)).size);

const d = generarDesignaciones(crearAleatorio(20260803), 5000);
const codigos = d.map((x) => x.designacion);
const conjunto = new Set(codigos);
const prefijos = codigos.filter((c) => [...conjunto].some((o) => o !== c && o.startsWith(c)));
console.log("pares prefijo (5000):", prefijos.length);
console.log("proporcion pt (5000):", d.filter((x) => x.segmento === "power_transmission").length / d.length);
```
y ejecutarlo con `pnpm exec tsx scripts/seed/_tmp_check.ts`.
Esperado: `espacio combinatorio: 53500`, `30000 generadas en ~30 ms; unicas: 30000`, `pares prefijo (5000): 461`, `proporcion pt (5000): 0.097`.
