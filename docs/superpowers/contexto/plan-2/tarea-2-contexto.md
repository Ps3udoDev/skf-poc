# Tarea 2 — Catálogo de plantas (PDIV)

## Estado
completa

No cites el hash de tu propio commit: el archivo va dentro de ese commit y no
puedes conocerlo al escribirlo. Para ubicar el trabajo basta con
`git log --oneline -- scripts/seed/plantas.ts scripts/seed/plantas.test.ts`.

## Qué entrega esta tarea
El catálogo fijo de 18 plantas de manufactura de SKF con sus ventanas diarias de mantenimiento. Expone `PLANTAS: readonly PlantaSemilla[]` (array de 18 objetos inmutables, cada uno con código PDIV, nombre, país, zona horaria, estado de conectividad, y configuración de ventana de actualización de software), y la función `filasPlantas(): unknown[][]` que los serializa en 18 filas de 11 columnas para inserciones directas en la tabla `plantas` de la base de Supabase.

## Decisiones tomadas y por qué

**IMPORTANTE PARA LA PRESENTACIÓN AL CLIENTE — Leer antes de ensayar el demo:**

La **configuración de ventanas de mantenimiento de estas 18 plantas es íntegramente inventada**. La minuta del 22 de julio de 2026, que contenía los horarios reales de las ventanas por planta, no está disponible. Cada decisión fue tomada sobre la base de lo único que la Propuesta Integral de SKF afirma:

- Las ventanas están "concentradas en las actualizaciones nocturnas de Europa"
- Duran "entre 2 y 2.5 horas" 
- "Coinciden con el horario pico de México" (que cae entre 12:00 mediodía y 15:00 en hora de México, o 720–900 minutos desde medianoche)
- "Una planta belga tiene un horario que varía"

Lo que **SÍ se inventó**, sin respaldo de la documentación real:

- Los códigos PDIV (`P101`, `P102`, …, `P304`) son sintéticos y no corresponden a ninguna planta real de SKF.
- La distribución geográfica (9 plantas en Europa, 4 en Asia, 4 en América) fue elegida para ejercitar toda la zona horaria del negocio.
- Los nombres de planta ("Planta Norte 1", "Planta Oriental 1", etc.) son genéricos y no coinciden con designaciones reales.
- El rango específico de ventanas de inicio y duración para cada planta: aunque respeta el rango "2–2.5 h" global y posiciona la mayoría de plantas europeas en horario pico, cada valor exacto es arbitrario.
- El desempeño de "Time-to-Execution" (`desempeno_te`) por planta: generado sobre patrones lógicos (plantas asiáticas más rápidas, plants locales más lentas) pero sin base en métricas reales de SKF.
- El estado de conectividad (`tiene_conexion`, `tiene_ruta_embarque`): la configuración de 2 plantas no conectadas es deliberada para ejercitar el punto 4.5b (manejo de plantas no cotizables), pero los códigos PDIV específicos que carecen de connectividad son ficticios.

**Para el guion del demo:** solo puede afirmarse que se trata de un catálogo plausible, consistente con los principios de SKF documentados, pero sin correspondencia a las plantas reales. Si el cliente pregunta por un código PDIV específico, la respuesta correcta es "Este es un POC con datos sintéticos para demostración; la configuración real de ventanas viene de la integración con los sistemas internos de SKF".

Otras decisiones técnicas:

- **Interfaz `PlantaSemilla`:** inmediatamente serializable a 11 columnas — no hay cálculos derivados. Esto simplifica la verificación (8 tests en `plantas.test.ts` prueban directamente que PLANTAS cumpla sus contratos, sin tocar la base) y hace explícito qué se almacena.
- **`ventana_inicio_min` en minutos desde medianoche (hora de México):** permite comparación numérica simple (`>= 720` para "está en horario pico"). Usando ISO 8601 o `Date` sería más pesado; los minutos son suficientes para este catálogo estático.
- **Array `as const`:** hace que el tipo de `PLANTAS` sea `readonly PlantaSemilla[]`, lo que impide mutación accidental. Importante para datos de siembra que deben ser idempotentes.
- **Función `filasPlantas()`:** existe explícitamente para que los tests puedan verificar que el mapeo a 11 columnas es correcto sin tocar la base. Quien consuma esto (`scripts/seed/index.ts` en tarea futura) verá exactamente qué se va a insertar.
- **Los 8 tests de `plantas.test.ts` son herméticamente independientes:** no tocan la base, no necesitan red, no dependen de `aleatorio.ts` ni de `cargador.ts`. Esto permite verificar la integridad del catálogo offline y rápido.

## Contrato que exponen estos archivos

`scripts/seed/plantas.ts`:

```ts
export interface PlantaSemilla {
  pdiv: string;
  nombre: string;
  pais: string;
  com: string;  // código de país ISO-3166 (2 letras)
  huso: string; // nombre de huso IANA (e.g. "Europe/Berlin")
  tiene_conexion: boolean;
  tiene_ruta_embarque: boolean;
  ventana_inicio_min: number;    // minutos desde medianoche, hora de México
  ventana_duracion_min: number;  // minutos (120–150)
  ventana_variabilidad_min: number; // minutos (0 para fija, >0 para variable; solo Bélgica > 0)
  desempeno_te: number; // índice (típicamente 0.7–1.6)
}

export const PLANTAS: readonly PlantaSemilla[];  // 18 elementos

export const COLUMNAS_PLANTAS: readonly ("pdiv" | "nombre" | ... )[];  // 11 elementos, en orden

export function filasPlantas(): unknown[][];  // Devuelve 18 filas × 11 columnas
```

Notas para quien consume:
- `PLANTAS` es ordenable y indexable por entero (0–17), pero es `readonly` — no muta.
- `filasPlantas()` produce un array nuevo cada vez (no es cacheado); orden es el mismo que `PLANTAS`.
- `COLUMNAS_PLANTAS` lista exactamente los 11 nombres en el orden que usa `filasPlantas()` — útil para construir dinámicamente declaraciones `COPY` ("INSERT INTO plantas (pdiv, nombre, …)").
- Cada `PlantaSemilla` es válido para insertar directamente en la tabla `plantas` sin transformación; los tipos de dato coinciden (string, boolean, number) con los tipos SQL (`text`, `boolean`, `integer`, `numeric`).

## Qué falta / qué NO hace

- No hay generadores de horarios — el catálogo es estático, sin `Math.random()` ni `Date.now()`, por lo que es idempotente: ejecutar la siembra dos veces da exactamente el mismo resultado.
- No hay integración con la tabla `plantas` de la base — `plantas.ts` no importa ni conecta nada, es puro dato. La siembra real (inserciones `COPY` / `INSERT`) las hace una tarea futura (probablemente `scripts/seed/index.ts` y el orquestador del Plan 2).
- No hay migración de esquema — asume que la tabla `plantas` ya existe con exactamente 11 columnas en ese orden, con la restricción `plantas_desempeno_te_positivo` que exige `desempeno_te > 0`.
- No hay exportación de datos a formato CSV, JSON, o de reporte — `filasPlantas()` es la única interfaz de serialización.
- Los tests no tocan la red: son pruebas de contrato ("¿PLANTAS tiene exactamente 18 elementos?", "¿todas las ventanas duran 2–2.5 h?"), no de persistencia. Integración con la base es responsabilidad de tareas futuras (cuando se escriba `scripts/seed/index.ts` y se haga `pnpm seed`).

## Cómo verificar

Ejecutar los tests unitarios:
```bash
pnpm test plantas
```
Esperado: Test Files 1 passed, Tests 8 passed.

Los 8 tests verifican:
1. Exactamente 18 plantas, PDIVs únicos.
2. Todas las ventanas duran entre 120 y 150 minutos.
3. La mayoría de plantas europeas (P1xx) abren su ventana dentro de horario pico en México (720–900 min).
4. Exactamente una planta tiene variabilidad en el inicio de ventana (Bélgica, >= 60 min de variabilidad).
5. Al menos 2 plantas no son cotizables (les falta conexión O ruta de embarque).
6. Hay al menos una sin conexión y al menos una sin ruta de embarque (casos distintos del anterior).
7. Todos los desempeños de TE son positivos (> 0), cumpliendo con la restricción de base de datos.
8. `filasPlantas()` produce 18 filas × 11 columnas.

Verificar formato (Biome):
```bash
pnpm lint
```
Esperado: sin errores (pueden reordenarse imports, no es desviación).

Verificar tipos TypeScript:
```bash
pnpm exec tsc --noEmit
```
Esperado: sin errores.

Inspeccionar el contenido de `PLANTAS`:
```bash
node --input-type=module -e "import('./scripts/seed/plantas.ts').then(m => console.log(JSON.stringify(m.PLANTAS, null, 2)))"
```
(Devuelve JSON formateado de los 18 objetos.)
