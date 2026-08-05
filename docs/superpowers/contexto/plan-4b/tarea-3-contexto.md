# Tarea 3 — Franjas de ventana de la semana

## Estado

Completada. Módulo puro implementado y verificado.

## Qué entrega esta tarea

Un módulo que expone la función `franjasDeLaSemana()`: proyecta las ventanas de mantenimiento de todas las plantas para los próximos siete días. Cada franja representa un día de una planta e incluye el offset del día, el día de la semana (para etiquetas), el minuto de inicio y la duración. La salida se ordena por planta y día: es el orden en el que la UI dibuja las filas.

## Decisiones tomadas y por qué

### Cálculo día a día, no repetición de horario

La función itera sobre cada día del rango de siete días y pasa cada fecha a `inicioDeVentana()`. Esto es obligatorio porque la planta belga (con `ventanaVariabilidadMin > 0`) **desplaza su ventana según la fecha**. Si se pasara la misma fecha siete veces, devolvería el mismo minuto siete veces y la línea de tiempo sería inverosímil. La variabilidad se deriva de un hash determinista (`fechaEnHuso(momento)` + PDIV), no de azar, así que el horario es estable por día pero distinto entre días.

### No conversión de husos horarios

`ventanaInicioMin` ya está expresado en minutos del día en huso de México. El archivo `ventanas.ts` usa `minutosDelDia(momento)` que internamente aplica `HUSO_MEXICO`, y compara directamente contra `ventanaInicioMin` sin conversiones. Si esta función convirtiera husos aquí, movería la línea de tiempo respecto de la comparación en `estadoDePlanta()`, causando saltos visibles en el banner de la escena 4.

## Contrato que exponen estos archivos

### `lib/estado-fabricas/semana.ts`

- **Exporta:**
  - `interface FranjaVentana`: descriptor de una ventana de mantenimiento en un día
    - `pdiv: string`: identificador de la planta
    - `diaOffset: number`: 0 = el día de `desde`, 1 = día siguiente, etc.
    - `dia: number`: valor de `Date.getDay()` (0 = domingo) para etiquetar
    - `inicioMin: number`: minuto de inicio en huso de México
    - `duracionMin: number`: duración en minutos
  - `franjasDeLaSemana(plantas, desde): FranjaVentana[]`: genera franjas para 7 días
    - Recibe plantas cargadas y una fecha de inicio
    - Devuelve un array de franjas ordenadas por (planta, diaOffset)
    - Consume `inicioDeVentana()` del módulo `ventanas`

### `lib/estado-fabricas/index.ts`

Se añadió la línea `export * from "./semana"` para re-exportar todo lo que produce `semana.ts`.

## Qué falta / qué NO hace

- No realiza I/O ni accede a Supabase.
- No convierte ni reinterpreta fechas: acepta un `Date` y lo incrementa con `setDate()`.
- No construye objetos adicionales ni mantiene estado.
- No genera el calendarios visual ni etiquetas en idioma natural: solo proporciona los números crudos.

## Cómo verificar

1. **Verificación de variabilidad:** Ejecutar el script del Paso 3:
   ```bash
   pnpm exec tsx -e "import 'dotenv/config'; import { todasLasPlantas } from './lib/fuentes'; import { franjasDeLaSemana } from './lib/estado-fabricas/semana'; todasLasPlantas().then((p) => { const f = franjasDeLaSemana(p, new Date()); console.log(f.length); const variable = p.find((x) => x.ventanaVariabilidadMin > 0); console.log(variable?.pdiv, f.filter((x) => x.pdiv === variable?.pdiv).map((x) => x.inicioMin)); });"
   ```
   Esperado:
   - El total de franjas es `cantidad de plantas × 7`.
   - La planta variable (si existe) muestra **inicios distintos entre días**.
   - Una planta sin variabilidad muestra el mismo minuto siete veces.

2. **Linting:** `pnpm lint` debe completar sin errores relacionados con este módulo.
3. **Tipado:** `pnpm build` debe pasar el type-check.
4. **Tests:** `pnpm test` debe mantener 198 tests en verde.

## Verificación manual pendiente

Ninguna.

