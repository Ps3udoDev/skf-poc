# Despliegue en Vercel y checklist de humo

El despliegue lo ejecuta el presentador con su propia cuenta de Vercel. Este documento deja los pasos exactos y la verificación posterior.

## Variables de entorno

Las ocho que la aplicación necesita en Vercel, con su origen y su ámbito:

| Variable | Dónde se obtiene | Ámbito |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → Data API | Navegador y servidor |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → API Keys | Navegador y servidor |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API Keys → revelar `service_role` | **Solo servidor** |
| `AI_GATEWAY_API_KEY` | Vercel → AI Gateway → API Keys | Solo servidor |
| `CHAT_MODEL` | Valor fijo: `anthropic/claude-sonnet-5` | Solo servidor |
| `DEMO_SEED` | Valor fijo: `20260803` | Solo servidor |
| `CHAT_RESPALDO` | `false` en producción; se pone en `true` como interruptor de sala | Solo servidor |
| `CHAT_LIMITE_MENSAJES` | Valor fijo: `60` | Solo servidor |

Las cuatro de la CLI de Supabase (`SUPABASE_PROJECT_REF`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_DB_URL`) **no se suben a Vercel**: son de la máquina de desarrollo, para migrar y sembrar.

> **Advertencia:** `SUPABASE_SERVICE_ROLE_KEY` nunca lleva el prefijo `NEXT_PUBLIC_`. Esa clave salta RLS; expuesta al navegador, cualquiera con el inspector abierto puede escribir en la base durante la presentación.

## Pasos de despliegue

```bash
npm i -g vercel
vercel login
vercel link
vercel env add <cada variable> production
vercel --prod
```

`vercel env add` se repite una vez por cada variable de la tabla (las ocho).

## Checklist de humo post-deploy

En la URL de producción, una casilla por punto:

- [ ] `/portal` busca `DEMO-6205-2RSH/C` y ofrece candidatos.
- [ ] `/operador` filtra por estado y abre el panel de detalle.
- [ ] `/demo` cambia el modo y el estado de una planta, y `/portal` lo refleja sin recargar.
- [ ] `/impacto` sube un contador al provocar un evento, sin recargar.
- [ ] El chat responde en `/portal` y en `/operador`.
- [ ] El distintivo de datos simulados aparece en las tres pantallas públicas.

## Interruptor de sala

Si el Gateway falla durante la presentación, el chat pasa a las respuestas pregrabadas del guion:

```bash
vercel env add CHAT_RESPALDO production   # valor: true
vercel --prod
```

(Si la variable ya existe, se actualiza desde el dashboard de Vercel → Project → Settings → Environment Variables, y se vuelve a desplegar con `vercel --prod`.)

Al terminar la presentación, devolver `CHAT_RESPALDO` a `false` y volver a desplegar.
