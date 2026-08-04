# Estado tras el Plan 3 — restricciones que hereda el Plan 4

**Fecha:** 2026-08-04  
**Rama:** `plan-3-motores-y-pantallas`  
**Precede a:** Plan 4 (operación completa, dashboard, despliegue y ensayo)

## 1. Lo que quedó entregado

- Sistema visual en español y distintivo permanente de datos simulados.
- Migración `000008`, RPC de búsqueda por prefijo/trigramas e índices previstos.
- Capa `lib/fuentes`, estado de fábricas, sesión Realtime con sondeo de respaldo,
  métricas, validador de seis estrategias y estimador honesto de TE.
- Mocks de inventario, WCL, PinQ y SPQ+ con latencia selectiva; inventario falla
  durante una ventana de planta.
- `/portal` con contraste `hoy` / `solucion`, `/operador` con bandeja mínima y
  `/demo` como panel del presentador.
- `/api/chat` y panel compartido con AI SDK v7, tool calling y respaldo
  pregrabado.

## 2. Restricciones que hereda el Plan 4

- `lib/fuentes` sigue siendo la única capa que consulta tablas.
- Toda escritura del navegador pasa por Server Actions y `service_role`.
- Ámbar es exclusivo de desconexión; verde, de confirmación; designaciones en
  monoespaciada.
- Ninguna estimación se muestra como confirmada: rango, casos y compromiso de
  confirmación son obligatorios.
- El validador y el chat solo pueden elegir designaciones existentes.
- El modo es estado de `sesion_demo`, no una ruta duplicada.
- No editar migraciones aplicadas. Las vigentes llegan hasta `000008`; el hueco
  `000004` sigue siendo deliberado.
- Los mocks llevan latencia; buscador y validador no.

## 3. Contratos que consumirá el Plan 4

- `evaluarSolicitud(ctx)` para clasificación QMS.
- `validar(consulta, cantidad)` y `construirSugerencia(...)` para captura.
- `estimarTE(codigo, cantidad)` y `<EstimacionTE>` para rangos honestos.
- `leerSesion`, Server Actions de sesión y `useSesion()` para el demo.
- `indicadoresDeSesion()` y `emitirEvento()` para el dashboard.
- `homologosDe(codigo)` para la confirmación guiada.
- `solicitudesDesde(iniciadaEn)` como lectura mínima; filtros, asignación y
  detalle requieren ampliar esta fuente, no consultar desde componentes.

## 4. Deuda consciente

- Falta el ensayo visual automatizado de dos ventanas y la medición del arranque
  en frío de Realtime tras 20 minutos.
- Los contadores de `/demo` son fotografía inicial; el dashboard del Plan 4 debe
  resolver actualización y visualización completa.
- La bandeja actual no filtra, asigna ni confirma homólogos.
- El chat no lista solicitudes de la sesión ni ejecuta escrituras comerciales.
- `README.md` continúa como deuda si aún conserva boilerplate en inglés.
- Biome informa que `linter.recommended` está deprecado; no afecta el lint.

## 5. Supuestos abiertos con SKF

- Confirmar la interpretación de los puntos duplicados 4.5 y las rutas de
  Planner/PINQ por segmento.
- Validar el supuesto de 12 minutos liberados por solicitud evitada.
- Confirmar que el SLA de cotización se mide en cuatro días hábiles y cómo trata
  festivos locales.
- Validar la terminología y exposición de precio de lista en el perfil cliente.
- Medir tiempos reales de Realtime, APIs corporativas y operación de CSR antes
  de convertir cifras del POC en compromisos.

## 6. Próximo alcance

El Plan 4 debe completar bandeja, asignación, confirmación guiada de homólogos,
cola de pedidos y reconciliación, dashboard de impacto, despliegue a Vercel y
ensayo final con video de respaldo. No debe reimplementar motores ni duplicar
pantallas por modo.
