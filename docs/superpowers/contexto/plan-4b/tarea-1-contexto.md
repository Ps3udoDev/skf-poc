# Tarea 1 — SLA en días hábiles, extraído del chat

## Estado
completa

## Qué entrega esta tarea

Se extrae la función `diasHabiles()` que el chat usa para reportar el avance de cotizaciones (herramienta `consultarCotizacion`) a un módulo puro en `lib/reglas-qms/sla.ts`. El módulo exporta:

- `DIAS_SLA`: constante que define el SLA de 4 días hábiles (KPI declarado por SKF)
- `diasHabiles(desde, hasta)`: cálculo de días hábiles completos (sin contar el día de inicio)
- `dentroDelSla(solicitud, respuesta)`: validación de si una cotización cumple el SLA

## Decisiones tomadas y por qué

1. **Extracción de código existente, no nueva función.** La función privada de `herramientas.ts:19-30` ya está en producción y se usa en las respuestas del chat. Si el dashboard escribiera su propia implementación, podrían devolver resultados distintos ante el mismo SLA y confundir al cliente. Se mueve el que existe, se importa, se usa.

2. **Módulo puro sin dependencias.** El módulo `sla.ts` contiene solo lógica de fechas (JavaScript nativo). No importa de Supabase ni de otros módulos del proyecto. Esto lo hace reutilizable en cualquier contexto (servidor, cliente, tests, CLI).

3. **Firma flexible: `desde | Date` en lugar de `string`.**  La función original solo aceptaba `string`, pero el código de `herramientas.ts:95-96` ya pasaba `new Date()` como el segundo argumento. Se generaliza la firma para que acepte ambos tipos.

4. **Constante explícita en lugar de literal.** Se define `DIAS_SLA = 4` para que cualquier código que necesite el KPI no repita el valor mágico. Fuerza un punto único de cambio en el futuro si SKF modifica el SLA.

5. **Re-exportación desde el barril.** El módulo se re-exporta desde `lib/reglas-qms/index.ts` en orden alfabético, siguiendo el patrón existente de la carpeta. Permite importar desde `@/lib/reglas-qms` sin nombrar el archivo.

## Contrato que exponen estos archivos

```ts
// lib/reglas-qms/sla.ts (exportado desde lib/reglas-qms)
export const DIAS_SLA: 4;
export function diasHabiles(desde: string | Date, hasta?: string | Date): number;
export function dentroDelSla(solicitud: string | Date, respuesta: string | Date): boolean;
```

El módulo no tiene dependencias externas (salvo el tipo `Date` nativo). Las pruebas de corrección están implícitas en:
- Type-check: si `herramientas.ts` importara con firma incompatible, `pnpm build` falla.
- Comportamiento: `consultarCotizacion` sigue respondiendo con el mismo cálculo de días hábiles que antes, ahora importado.

## Qué falta / qué NO hace

- No hay tests dedicados a `diasHabiles()` (el usuario indicó no crear tests nuevos en Plan 4B).
- No cambia la descripción de la herramienta `consultarCotizacion` (sigue diciendo «4 días» en prosa, es correcto).
- No valida festivos locales (supuesto abierto con SKF: solo se excluyen sábados y domingos).

## Cómo verificar

1. **Lint:** `pnpm lint` debe pasar (salvo la deprecación preexistente de `linter.recommended`).
2. **Build:** `pnpm build` debe compilar sin errores de tipo.
3. **Tests:** `pnpm test` debe pasar los 198 tests existentes sin regresión.

## Verificación manual pendiente

Ninguna. El código está integrado en una herramienta existente (`consultarCotizacion`) que ya ha sido probada manualmente en sesiones previas. La extracción no cambia su comportamiento observado desde el cliente.
