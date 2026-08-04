# Tarea 12 — Panel del presentador

## Estado
completa

## Corrección posterior — escena 4

- Al activar **Planta en ventana de mantenimiento**, el panel fuerza `P103` en
  estado `ventana` y alinea el reloj simulado al minuto 5 de su ventana
  programada. Esto garantiza que el portal muestre una cuenta regresiva real en
  vez de “restablecimiento pendiente de confirmación”.
- La alineación usa el desplazamiento diario más corto y queda encapsulada en
  `offsetParaAlinearVentana`, dentro de `lib/sesion-demo/escenarios.ts`.
- Se comprobó que pulsar `+30 min` reduce la cuenta regresiva exactamente en 30
  minutos. El script temporal de comprobación fue eliminado al terminar.

Para ubicar el trabajo usa `git log --oneline -- app/demo components/demo`.

## Qué entrega esta tarea

Entrega `/demo`, la segunda pantalla desde la que el presentador controla el
modo, los overrides de plantas, el reloj simulado y los escenarios del guion.
Incluye el estado del canal Realtime, contadores de la sesión y un reinicio con
confirmación y explicación de su alcance.

## Decisiones tomadas y por qué

- Se preservaron y completaron los tres componentes heredados sin seguimiento
  encontrados al iniciar: interruptor, control de plantas y control del reloj.
- `P103` aparece primero y marcado como “Escena 4”. Los overrides usan una
  superficie azul, nunca ámbar; ámbar sigue reservado a una planta en ventana.
- El selector muestra la consulta y cantidad del escenario, y permite copiar
  solo la designación para evitar errores de captura durante la presentación.
- El diálogo de reinicio es local y explícito: informa que borra solicitudes y
  reinicia contadores, pero conserva el histórico sintético.
- Los indicadores recibidos son una fotografía inicial del Server Component.
  El estado operativo de modo, plantas, reloj y canal sí se actualiza por
  Realtime/sondeo. Refrescar contadores en vivo no es necesario para operar el
  panel y queda para el dashboard del Plan 4.
- No se añadieron ni ejecutaron tests de Vitest por directiva del usuario.

## Contrato que exponen estos archivos

```tsx
function InterruptorModo(): JSX.Element;
function ControlPlantas(): JSX.Element;
function ControlReloj(): JSX.Element;
function SelectorEscenarios(): JSX.Element;
function EstadoSesion(props: { indicadores: Indicadores }): JSX.Element;
```

`GET /demo` es una ruta dinámica que lee `leerSesion()`,
`todasLasPlantas()` e `indicadoresDeSesion()` y monta los controles dentro de
`ProveedorSesion`.

## Qué falta / qué NO hace

- No se pudo automatizar el ensayo de dos ventanas porque el conector del
  navegador no estuvo disponible en esta sesión. `/demo`, `/portal` y
  `/operador` sí se verificaron por HTTP contra Supabase cloud.
- No se midió el arranque en frío después de 20 minutos. Antes de la
  presentación se debe abrir `/portal` con antelación y registrar esa medición.
- No se pulsó “Reiniciar sesión” durante la verificación para no borrar las
  solicitudes que pudiera conservar el usuario. La acción subyacente ya existía
  desde la tarea 5 y el panel solo la expone tras confirmación.
- No hay tests automatizados.

## Cómo verificar

```powershell
.\node_modules\.bin\tsc.cmd --noEmit
pnpm.cmd lint
pnpm.cmd build
```

Esperado: tipado sin errores, lint limpio salvo el aviso informativo de
`biome.json` y build con `/demo` dinámica.

Con el servidor conectado a Supabase cloud:

```powershell
curl.exe -s -o NUL -w "%{http_code}" http://127.0.0.1:3000/demo
```

Devolvió `200` en 1.35 s.

Ensayo manual pendiente antes de presentar: abrir `/demo` y `/portal`, cambiar
modo, forzar `P103`, avanzar 30 minutos, cerrar la ventana y confirmar que el
portal responde sin recarga.
