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
- Con `cantidad = 5000` y semilla `20260803`, se generan **685 pares designación-es-prefijo-de-otra** y una proporción de `power_transmission` de **9.82%**. Estos números son deterministas para esa semilla y cantidad exactas; no están garantizados para otras combinaciones, aunque los tests verifican que se mantienen dentro de rango con esa misma semilla.

## Qué falta / qué NO hace

- No inserta nada en la base de datos ni conoce la tabla de productos/catálogo — es generación pura en memoria.
- No genera precios, existencias, ni ningún otro atributo de producto más allá de `designacion`, `descripcion`, `familia`, `segmento`.
- No garantiza que las designaciones sean únicas *entre distintas llamadas* a `generarDesignaciones` (cada llamada arranca su propio `Set` de `vistas`); si la tarea siguiente necesita unicidad global entre múltiples generaciones, debe deduplicarlas externamente o generar todo con una sola llamada.
- No valida que las designaciones no coincidan con códigos reales de catálogo SKF más allá de seguir patrones públicos genéricos — es responsabilidad de las restricciones globales del proyecto, no de esta tarea, y se siguió esa restricción al diseñar `FAMILIAS`.
- El campo `peso` de `Familia` no es un porcentaje directo de la proporción final observada (ver nota sobre colisiones arriba); quien ajuste `FAMILIAS` en el futuro debe volver a medir la proporción real con el script de verificación, no asumir que peso == proporción.

## Cómo verificar

Ejecutar los tests de esta tarea:
```bash
pnpm test nomenclatura
```
Esperado: `Test Files 1 passed (1)`, `Tests 10 passed (10)`.

Ejecutar toda la suite (verificar que no hay regresiones):
```bash
pnpm test
```
Esperado: `Test Files 10 passed (10)`, `Tests 106 passed (106)`.

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

Inspeccionar directamente el conteo de pares-prefijo y la proporción de `power_transmission`: crear un archivo temporal `scripts/seed/_tmp_check.ts` (fuera del repo versionado, borrar después) con:
```ts
import { crearAleatorio } from "./aleatorio";
import { generarDesignaciones } from "./nomenclatura";

const d = generarDesignaciones(crearAleatorio(20260803), 5000);
const codigos = d.map((x) => x.designacion);
const conjunto = new Set(codigos);
const prefijos = codigos.filter((c) => [...conjunto].some((o) => o !== c && o.startsWith(c)));
console.log("pares prefijo:", prefijos.length);
console.log("proporcion pt:", d.filter((x) => x.segmento === "power_transmission").length / d.length);
```
y ejecutarlo con `pnpm exec tsx scripts/seed/_tmp_check.ts`.
Esperado: `pares prefijo: 685`, `proporcion pt: 0.0982`.
