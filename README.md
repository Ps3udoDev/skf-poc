# POC Servicio al Cliente — SKF México

## Qué es

POC de presentación para SKF México: una simulación del flujo de Servicio al Cliente con datos sintéticos y las reglas del procedimiento QMS real. **No** está conectado a WCL, SPQ+ ni PinQ, y no es un MVP.

## Requisitos

- Node 20+
- pnpm
- Un proyecto de Supabase
- Una clave de Vercel AI Gateway

## Puesta en marcha

```bash
pnpm install
cp .env.example .env.local   # rellena los valores marcados
pnpm db:push
pnpm seed
pnpm dev
```

## Comandos

| Comando | Para qué sirve |
|---|---|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build` | Build de producción |
| `pnpm start` | Sirve el build de producción |
| `pnpm lint` | Revisa el código con Biome |
| `pnpm lint:fix` | Revisa y autocorrige con Biome |
| `pnpm format` | Formatea el código con Biome |
| `pnpm test` | Corre los tests unitarios |
| `pnpm test:watch` | Tests en modo observación |
| `pnpm test:integracion` | Tests de integración contra Supabase |
| `pnpm tipos` | Regenera los tipos de TypeScript desde el esquema de Supabase |
| `pnpm verificar` | Verifica la conexión con Supabase |
| `pnpm db:push` | Aplica las migraciones al proyecto enlazado |
| `pnpm db:reset` | Reinicia la base enlazada y reaplica las migraciones |
| `pnpm seed` | Siembra los datos sintéticos de la demo |
| `pnpm seed:verificar` | Verifica que la siembra quedó completa |

## Las cuatro pantallas

- `/portal` — el cliente: busca designaciones, recibe candidatos y genera solicitudes.
- `/operador` — Servicio al Cliente: bandeja de solicitudes, panel de detalle y chat.
- `/impacto` — tablero proyectable con los indicadores de la sesión en vivo.
- `/demo` — panel del presentador: controla el modo y el estado de las plantas. **No se proyecta.**

## Antes de una presentación

- [Guion cronometrado](docs/superpowers/presentacion/guion-cronometrado.md) — las ocho escenas con tiempos y acciones exactas.
- [Despliegue](docs/superpowers/presentacion/despliegue.md) — variables de entorno, pasos de despliegue y checklist de humo.

## Estructura

- `lib/ai` — el chat: gateway, instrucciones por perfil, herramientas y respuestas pregrabadas de respaldo.
- `lib/estado-fabricas` — estado simulado de las plantas, reloj de la demo y ventanas de entrega.
- `lib/estimador` — estimación de precio y plazo para el portal.
- `lib/fuentes` — única capa que consulta las tablas de Supabase.
- `lib/metricas` — agregación de indicadores y emisión de eventos de la sesión.
- `lib/mock` — inventario y latencia simulados.
- `lib/operacion` — reparto de solicitudes entre los CSR y reconciliación.
- `lib/reglas-qms` — reglas puras del procedimiento QMS: catálogo, cantidades, motivos y SLA.
- `lib/sesion-demo` — ciclo de vida de la sesión de demostración.
- `lib/supabase` — clientes de Supabase (navegador, servidor, admin) y tipos generados.
- `lib/validador` — validación en cascada de designaciones.
