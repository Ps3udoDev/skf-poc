# POC de Presentación — Servicio al Cliente SKF México (Teams4Soft)

Paquete de documentación de alto nivel para construir y presentar el **POC (Proof of Concept)** de la solución propuesta a SKF México: chatbot de Servicio al Cliente, buscador/validador de designaciones, manejo de ventanas de desconexión y dashboard de impacto.

> **Propósito del POC:** evidenciar ante SKF (Germán, Wagner, stakeholders) que la solución descrita en la Propuesta Integral por Fases es real, viable y atacaría los tres problemas prioritarios — **antes** de que se apruebe la Fase 1. No es el MVP: es una simulación convincente construida con datos emulados y reglas de negocio reales tomadas del procedimiento QMS.

## Contenido del paquete

| Archivo | Contenido |
|---|---|
| `01_analisis_documentos.md` | Síntesis de los 3 documentos fuente y qué exige cada uno del POC |
| `02_alcance_y_guion_demo.md` | Qué se demuestra, escenarios del demo y cómo se **evidencia** cada problemática (guion de presentación) |
| `03_arquitectura_y_tecnologias.md` | Stack tecnológico: por qué Next.js y no Astro, base de datos, hosting y estructura del POC |
| `04_datos_demo.md` | Modelo de datos y estrategia para emular una data de prueba grande y realista |
| `05_ia_simulada.md` | Cómo simular / integrar la IA: chatbot, validador de designaciones y estimador de tiempos de entrega |
| `06_prompts_diseno.md` | Prompts listos para generar el diseño de UI (identidad visual, pantallas, componentes) |

## Principios del POC

1. **Simular, no integrar.** No hay acceso a WCL, SPQ+ ni PinQ. El POC emula un "portal tipo WCL" propio con datos sintéticos; la integración real es materia de las Fases 2–3.
2. **Reglas de negocio reales.** La credibilidad no viene del volumen de features sino de que el demo respete el procedimiento QMS real de SKF (planeado/no planeado, MOQ, pack quantity, obsoletos con reemplazo, SLA de 4 días). Eso hace que el equipo de Customer Service se reconozca en la pantalla.
3. **El villano es visible.** La ventana de desconexión con fábricas se simula en vivo con un interruptor: el presentador la "activa" durante el demo y muestra el antes/después. Es el momento clave de la presentación.
4. **Todo medible.** Cada interacción del demo alimenta un mini-dashboard: cotizaciones evitadas, designaciones corregidas, errores de homólogo prevenidos. Así se conecta directo con la sección 6 (métricas) de la propuesta.
5. **Bajo costo, alta velocidad.** Stack ya dominado por el equipo (Next.js + Supabase + TypeScript + shadcn/ui), desplegado en Vercel, con IA real vía API solo donde impacta (chatbot) y simulación determinista donde conviene (validador, estimador).

## Orden de trabajo sugerido

1. Leer `01` y `02` para fijar alcance y guion (qué se enseña y en qué orden).
2. Montar la base con `03` (proyecto, DB, estructura).
3. Generar la data con `04` (sin datos creíbles no hay demo).
4. Implementar los tres motores de `05` (validador → estimador → chatbot).
5. Pulir UI con los prompts de `06` y ensayar el guion de `02` de punta a punta.
