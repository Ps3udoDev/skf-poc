# Guía de ensayo y presentación — POC Plan 3

> **Nota (Plan 4B):** el recorrido vigente para presentar es el
> [guion cronometrado](guion-cronometrado.md), que cubre las ocho escenas con
> sus tiempos y acciones exactas. Esta guía queda como referencia de
> preparación técnica, contingencias y lista de comprobación previa.

Esta guía describe qué se puede probar hoy, cómo preparar el ambiente y el
recorrido recomendado para presentar el POC sin improvisar.

## 1. Qué está disponible para demostrar

- Contraste entre **Situación actual** y **Con la solución** sin cambiar de
  pantalla ni recargar el portal.
- Validación de designaciones exactas, incompletas y parecidas.
- Contexto previo a cotizar: LCC, PCC, MOQ, pack quantity, reemplazos,
  disponibilidad PS/SL/XX y regla QMS aplicable.
- Tiempo de entrega estimado como rango, con casos históricos y compromiso de
  confirmación.
- Bandeja mínima de Servicio al Cliente con clasificación automática.
- Simulación de una planta en ventana de mantenimiento.
- Panel del presentador en una segunda ventana.
- Chat para cliente y operador, con datos de los mismos motores del portal.
- Respaldo pregrabado del chat cuando el Gateway no está disponible.

No forman parte de este demo todavía: asignación automática completa, filtros
avanzados de bandeja, confirmación guiada de homólogos, cola y reconciliación de
pedidos, dashboard final y despliegue productivo. Esas piezas son del Plan 4.

## 2. Preparación técnica

Confirma que `.env.local` contiene las variables de Supabase y, para usar el
chat real, `AI_GATEWAY_API_KEY`. Nunca proyectes ni abras ese archivo durante la
presentación.

Desde la raíz del proyecto:

```powershell
pnpm.cmd install
pnpm.cmd verificar
pnpm.cmd seed:verificar
pnpm.cmd build
```

Resultados esperados:

- La conexión REST, Realtime y Gateway responde.
- Los casos curados `DEMO-*` están presentes.
- El build incluye `/portal`, `/operador`, `/demo` y `/api/chat`.

No hace falta ejecutar Vitest para ensayar esta presentación.

### Arrancar la aplicación

```powershell
pnpm.cmd dev
```

Abre tres pestañas o ventanas:

1. `http://localhost:3000/demo` — controles privados del presentador.
2. `http://localhost:3000/portal` — pantalla que se proyecta al cliente.
3. `http://localhost:3000/operador` — bandeja de Servicio al Cliente.

No proyectes `/demo`: contiene controles internos del relato.

## 3. Ensayo previo obligatorio

Haz este ensayo al menos 20 minutos antes de presentar:

1. En `/demo`, revisa el indicador del canal.
2. Si dice **Canal en vivo**, Realtime está listo.
3. Si informa que el respaldo por sondeo está activo, los cambios funcionarán,
   pero pueden tardar cerca de dos segundos.
4. Pulsa **Situación actual** y confirma que `/portal` cambia sin recargar.
5. Pulsa **Con la solución** y vuelve a confirmar la propagación.
6. Activa el escenario **Planta en ventana de mantenimiento**.
7. Confirma que el portal muestra la franja ámbar de desconexión.
8. Pulsa **Cerrar la ventana en curso** y confirma que la franja desaparece.
9. Reinicia la sesión desde `/demo` si quieres comenzar con la bandeja y los
   contadores en cero. El histórico sintético no se borra.
10. Prueba una pregunta del chat y espera la respuesta completa. Esto calienta
    tanto Realtime como el Gateway antes de la reunión.

## 4. Recorrido recomendado

### Escena 0 — Encuadre

Pantalla: `/portal`.

Señala el distintivo **Entorno de demostración · datos simulados**. Explica que
el objetivo no es sustituir hoy WCL, SPQ+ o PinQ, sino demostrar una capa de
validación y orientación que consume esas fuentes mediante adaptadores.

Mensaje sugerido:

> Vamos a comparar el recorrido actual y el recorrido asistido usando la misma
> pantalla y los mismos datos simulados. Lo único que cambia es el modo de la
> sesión.

### Escena 1 — Situación actual: callejón sin salida

En `/demo`, selecciona **Situación actual**.

En `/portal` busca:

```text
Designación: DEMO-6205-2RSH
Cantidad: 100
```

Resultado esperado:

- “No se encontraron resultados”.
- La única salida es **Solicitar cotización**.

Genera la solicitud y abre `/operador`.

Resultado esperado:

- La solicitud aparece con la designación capturada.
- Clasificación automática: designación inválida.
- Punto QMS 4.8: el procedimiento obliga a declinar.

Mensaje sugerido:

> El usuario copió una designación incompleta. El sistema actual no distingue
> entre un código inexistente y uno truncado, así que genera trabajo para el CSR
> que terminará declinado.

### Escena 2 — La misma captura con la solución

Sin recargar `/portal`, cambia en `/demo` a **Con la solución** y repite:

```text
DEMO-6205-2RSH
Cantidad: 100
```

Resultado esperado:

- Mensaje **La designación parece incompleta**.
- Hasta tres completaciones válidas del catálogo.
- Disponibilidad PS/SL/XX, clasificación QMS, MOQ, pack quantity, precio y TE.

Selecciona `DEMO-6205-2RSH/C3` con **Usar esta designación**.

Resultado esperado:

- La consulta queda resuelta.
- No llega una nueva solicitud a `/operador`.
- Sube el contador de solicitudes evitadas.

### Variantes rápidas

Usa el selector de escenarios de `/demo` o captura manualmente:

| Caso | Consulta | Cantidad | Qué debe verse |
|---|---|---:|---|
| MOQ | `DEMO-MOQ-50` | 5 | Advertencia previa; punto 4.4 |
| Pack quantity | `DEMO-PACK-20` | 25 | Ajuste a 40; punto 4.5a |
| Nueva creación | `DEMO-NUEVA` | 30 | Cuatro semanas adicionales; punto 4.9 |
| Power Transmission | `DEMO-PT-PLANNER` | 40 | Planner por PT Inquery; punto 4.3 |

No muestres todas si el tiempo es corto. MOQ suele ser la variante más clara.

### Escena 3 — Obsoleto y reemplazo

Activa **Obsoleto con reemplazo** o busca:

```text
DEMO-OBS-CON
Cantidad: 50
```

Resultado esperado:

- La designación se identifica como obsoleta.
- Se muestra el reemplazo existente.
- El punto 4.6 explica que las diferencias técnicas deben validarse con
  Ingeniería de Ventas.

Aclara que la confirmación guiada completa de homólogos se termina en el Plan 4.

### Escena 4 — Ventana de mantenimiento

Desde `/demo`, activa **Planta en ventana de mantenimiento**.

Resultado esperado en `/portal`:

- Modo Situación actual.
- Franja ámbar para `P103` y cuenta regresiva.
- Al buscar `DEMO-VENTANA`, cantidad `200`, aparece **Sistema de planta no
  disponible** y no se muestran inventario, precio ni TE.
- La única salida en este modo es **Solicitar cotización**.

Después:

1. Cambia a **Con la solución**.
2. Busca `DEMO-VENTANA`, cantidad `200`.
3. Confirma que PS/SL/XX aparecen sin cantidades porque la disponibilidad en
   vivo no puede verificarse durante la ventana.
4. Explica que el precio, el contexto QMS y el TE histórico siguen disponibles,
   y que el TE es estimado, no una confirmación de planta.
5. En `/demo`, pulsa `+30 min` y muestra que la cuenta regresiva se reduce.
6. Pulsa **Cerrar la ventana en curso** para terminar la escena.

Mensaje sugerido:

> Durante la desconexión no inventamos disponibilidad ni prometemos un plazo.
> Conservamos contexto histórico suficiente para orientar, y dejamos explícito
> qué debe confirmarse cuando la planta vuelva.

### Escena 5 — Chat con los mismos motores

Abre la burbuja **Asistente** en `/portal` y prueba:

```text
¿Cuánto tarda el DEMO-6205-2RSH/C3 si pido 200 piezas?
```

Resultado esperado:

- Disponibilidad: PS 1200 y SL 300.
- Precio de lista simulado: USD 250,00.
- TE estimado: 8 a 17,5 semanas.
- Base: 39 casos de la familia, confianza media.
- Aclaración de que el TE no está confirmado.

Segunda pregunta opcional:

```text
Necesito un equivalente al DEMO-6205-2RSH/C3 sellado por ambos lados
```

En `/operador`, abre el mismo asistente y prueba:

```text
Explícame el punto 4.6
```

Mensaje sugerido:

> El chat no tiene una base paralela ni redacta cifras de memoria. Llama al
> mismo validador, estimador y procedimiento que usa el portal.

## 5. Probar el respaldo del chat

Detén el servidor y fija temporalmente en `.env.local`:

```env
CHAT_RESPALDO=true
```

Reinicia `pnpm.cmd dev` y prueba únicamente estas intenciones:

1. TE de `DEMO-6205-2RSH/C3` para 200 piezas.
2. Equivalente sellado por ambos lados.
3. Estado de una cotización.
4. Regla 4.1 para productos planeados con stock suficiente.

El respaldo está deliberadamente cerrado. Ante otra pregunta debe informar que
el asistente no está disponible, no improvisar una respuesta.

Después del ensayo, restaura:

```env
CHAT_RESPALDO=false
```

## 6. Plan de contingencia

| Problema | Qué hacer |
|---|---|
| Realtime no está suscrito | Continúa con el sondeo; espera unos 2 s y no pulses repetidamente. |
| El Gateway no responde | Activa `CHAT_RESPALDO=true` y usa solo las cuatro preguntas cubiertas. |
| Supabase no responde | No inventes resultados; pasa al recorrido grabado cuando exista. |
| Una búsqueda tarda | Espera el indicador de carga; no vuelvas a pulsar Consultar. |
| El escenario quedó forzado | Usa **Seguir calendario** o **Reiniciar sesión** en `/demo`. |
| La bandeja tiene ensayos | Reinicia la sesión. Esto no borra el histórico sintético. |

## 7. Lista de comprobación cinco minutos antes

- [ ] `/demo`, `/portal` y `/operador` abiertos.
- [ ] Distintivo de datos simulados visible.
- [ ] Canal Realtime suscrito o sondeo identificado.
- [ ] Sesión reiniciada y bandeja vacía.
- [ ] Modo inicial: Situación actual.
- [ ] `P103` siguiendo calendario, sin override accidental.
- [ ] Chat real probado o respaldo activado.
- [ ] Zoom del navegador adecuado para la proyección.
- [ ] Notificaciones del sistema silenciadas.
- [ ] Designaciones del guion disponibles en `/demo`.

## 8. Cierre recomendado

Resume el valor demostrado en tres puntos:

1. Menos solicitudes evitables antes de llegar al CSR.
2. Orientación consistente con el procedimiento QMS y las fuentes corporativas.
3. Continuidad durante ventanas de planta sin presentar estimaciones como
   compromisos confirmados.

Cierra indicando que el Plan 4 convierte este POC demostrable en una operación
completa: bandeja, asignación, confirmación de homólogos, reconciliación,
dashboard y despliegue.
