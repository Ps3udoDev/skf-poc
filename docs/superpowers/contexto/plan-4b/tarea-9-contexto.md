# Tarea 9 — README y checklist de despliegue

## Estado

Completada. El despliegue en sí queda pendiente: lo ejecuta el usuario con su cuenta de Vercel (Paso 5 del plan), y el checklist de humo se verifica contra la URL de producción en la Tarea 10.

## Qué entrega esta tarea

- `README.md` reescrito por completo en español (sustituye el boilerplate en inglés de `create-next-app`), con las secciones exactas del Paso 1 del plan: Qué es, Requisitos, Puesta en marcha, Comandos (una línea por cada uno de los 15 scripts de `package.json`), Las cuatro pantallas, Antes de una presentación y Estructura (una línea por carpeta de primer nivel de `lib/`). Sin insignias ni enlaces a la documentación de Next.js.
- `docs/superpowers/presentacion/despliegue.md`: tabla de variables de entorno con origen y ámbito, advertencia destacada sobre `SUPABASE_SERVICE_ROLE_KEY`, pasos de despliegue con los comandos exactos de la CLI de Vercel, checklist de humo post-deploy de seis casillas e interruptor de sala (`CHAT_RESPALDO=true`).

## Decisiones tomadas y por qué

### La tabla de variables documenta ocho, no nueve

El Paso 2 del plan dice «una tabla con las nueve de `.env.example`», pero la tabla que el propio plan lista tiene ocho filas, y `.env.example` contiene doce variables en total: las ocho de la tabla más las cuatro de la CLI de Supabase (`SUPABASE_PROJECT_REF`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_DB_URL`) que el plan manda explícitamente a **no** subir a Vercel. Se documentaron las ocho del plan en la tabla y las cuatro de la CLI en el párrafo siguiente, tal como el plan las separa. No hay ninguna variable de `.env.example` sin mencionar.

### Nota sobre el interruptor de sala

`vercel env add` falla si la variable ya existe, así que el documento aclara que la actualización de `CHAT_RESPALDO` se hace desde el dashboard (Settings → Environment Variables) cuando la variable ya fue creada en el despliegue inicial. El comando del plan se conserva para el primer alta.

### El enlace al guion cronometrado se deja aunque el archivo no exista

`docs/superpowers/presentacion/guion-cronometrado.md` se crea en la Tarea 10. El README lo enlaza igual, como indica el plan; hasta entonces el enlace queda roto en el repo local.

### `lib/utilidades.ts` no aparece en Estructura

El plan pide «una línea por carpeta de primer nivel de `lib/`». `utilidades.ts` es un archivo suelto (el helper `cn()` de shadcn), no una carpeta, así que no se lista. Las once carpetas sí están, una por línea.

## Contrato que exponen estos archivos

Documentación, sin código. Los únicos compromisos hacia fuera son:

- Los 15 comandos de la tabla del README corresponden uno a uno con los scripts de `package.json` (verificado por script: ninguno falta, ninguno sobra).
- Las doce variables mencionadas en `despliegue.md` son exactamente las de `.env.example`.
- La designación del checklist de humo, `DEMO-6205-2RSH/C`, existe en la semilla (`scripts/seed/casos-curados.ts`) y es el placeholder del buscador del portal.

## Qué falta / qué NO hace

- **No despliega nada ni instala la CLI de Vercel.** El despliegue lo ejecuta el usuario con su cuenta (Paso 5 del plan); esta tarea solo deja las instrucciones verificadas.
- El checklist de humo queda sin marcar: se verifica contra la URL de producción en la Tarea 10.
- No toca código ni tests (directiva del plan: esta tarea produce solo documentación).

## Cómo verificar

Resultados reales en este entorno:

1. `pnpm lint` → limpio: `Checked 157 files … No fixes applied. Found 1 info.` (el info preexistente de la deprecación de `biome.json`).
2. `pnpm build` → compiló y pasó el type-check; tabla de rutas sin cambios (`/portal`, `/operador`, `/impacto`, `/demo` dinámicas).
3. `pnpm test` → `Test Files 17 passed (17)`, `Tests 198 passed (198)`.
4. Verificación cruzada del README (Paso 3 del plan): script en Node que compara los 15 comandos documentados contra `package.json` → ninguno falta ni sobra. Variables de `despliegue.md` contrastadas contra `.env.example` → las doce coinciden. `DEMO-6205-2RSH/C` localizada en `scripts/seed/casos-curados.ts` y `components/portal/buscador.tsx`.

## Verificación manual pendiente

El checklist de humo completo, una vez el usuario despliegue y comparta la URL de producción (Tarea 10):

- [ ] `/portal` busca `DEMO-6205-2RSH/C` y ofrece candidatos.
- [ ] `/operador` filtra por estado y abre el panel de detalle.
- [ ] `/demo` cambia el modo y el estado de una planta, y `/portal` lo refleja sin recargar.
- [ ] `/impacto` sube un contador al provocar un evento, sin recargar.
- [ ] El chat responde en `/portal` y en `/operador`.
- [ ] El distintivo de datos simulados aparece en las tres pantallas públicas.
