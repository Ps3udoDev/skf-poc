# Tarea 9 — Casos curados del guion

## Estado
completa

No cites el hash de tu propio commit: el archivo va dentro de ese commit y no
puedes conocerlo al escribirlo. Para ubicar el trabajo usa:
`git log --oneline -- scripts/seed/casos-curados.ts scripts/seed/casos-curados.test.ts`.

## Qué entrega esta tarea

Entrega once designaciones reservadas que materializan nueve escenarios del guion sin depender del azar durante una presentación. Cada registro contiene una designación completa y las existencias exactas que deben inyectarse junto con ella. También entrega una relación de homólogo fija para que la confirmación guiada de la escena 3 siempre muestre diferencias técnicas concretas.

El prefijo `DEMO-` está reservado para estos casos. El generador combinatorio no lo produce y `resolverObsolescencia` lo usa como guarda para no sobrescribir las decisiones preparadas a mano.

### Guía rápida para el presentador

La siguiente tabla contiene los **once registros**. Las tres primeras filas forman un solo escenario de autocompletado; por eso existen once registros para nueve escenarios.

| # | Escenario / escena | Registro inyectado | Texto exacto que debe escribir el presentador | Resultado preparado |
|---:|---|---|---|---|
| 1 | Escena 2 — designación incompleta | `DEMO-6205-2RSH/C3` | `DEMO-6205-2RSH` | Primera de tres completaciones; variante C3 con stock PS 1.200 y SL 300. |
| 2 | Escena 2 — alternativa cercana | `DEMO-6205-2RSH/C4` | El mismo texto: `DEMO-6205-2RSH` | Segunda completación; variante C4 con stock PS 240. |
| 3 | Escena 2 — alternativa cercana | `DEMO-6205-2RSH/W64` | El mismo texto: `DEMO-6205-2RSH` | Tercera completación; variante W64 con stock PS 860. |
| 4 | Escena 2 — MOQ, punto 4.4 | `DEMO-MOQ-50` | Designación `DEMO-MOQ-50`; cantidad `5` | MOQ 50 y precio unitario 42,50: debe advertir que pedir cinco unidades no cumple el mínimo. |
| 5 | Escena 2 — pack quantity, punto 4.5a | `DEMO-PACK-20` | Designación `DEMO-PACK-20`; cantidad `25` | Pack de 20: el ajuste esperado es a 40 unidades. Tiene stock PS 600. |
| 6 | Escena 3 — obsoleto con reemplazo | `DEMO-OBS-CON` | `DEMO-OBS-CON` | Obsoleto que apunta en sistema a `DEMO-6205-2RSH/C3`; la relación curada muestra diferencias de sellado y juego interno. |
| 7 | Escena 3 — declinado legítimo | `DEMO-OBS-SIN` | `DEMO-OBS-SIN` | Obsoleto sin ninguno de los dos tipos de reemplazo. |
| 8 | Escena 3 — reemplazo de fábrica | `DEMO-OBS-FAB` | `DEMO-OBS-FAB` | La fábrica indica `DEMO-OBS-FAB-NS`, código deliberadamente ausente; exige validación con Ingeniería de Ventas. |
| 9 | Escena 4 — ventana de desconexión | `DEMO-VENTANA` | `DEMO-VENTANA` | `PLAN` vigente en P103, con stock PS 2.400 y SL 800; permite demostrar la ventana aun cuando el producto existe y tiene saldo. |
| 10 | Escena 5 — nueva creación, punto 4.9 | `DEMO-NUEVA` | `DEMO-NUEVA` | `NP`, FPC 2, sin precio de lista y marcada como nueva creación; activa el tratamiento de +4 semanas de TE. |
| 11 | Escena 4 — consulta al Planner, punto 4.3 | `DEMO-PT-PLANNER` | `DEMO-PT-PLANNER` | Segmento `power_transmission`, `NP` y sin stock; debe seguir la ruta de consulta al Planner. |

Para los escenarios 6–11 esta tarea fija la designación exacta, pero no impone una cantidad concreta en el guion. El presentador puede conservar la cantidad válida por defecto del formulario; no debe inventarse una cantidad como requisito técnico del caso.

## Decisiones tomadas y por qué

- Los casos usan valores explícitos en vez de una semilla aleatoria para que cada ensayo y presentación produzcan la misma rama del flujo.
- Una función interna `base` completa los campos comunes con un caso `PLAN`, vigente, FPC 1, planta P101, MOQ y pack 1, precio 250; cada escenario sobrescribe únicamente los atributos que necesita.
- Los tres registros de la escena de truncamiento comparten el prefijo que el presentador escribe, pero **ninguno coincide exactamente con él**. Se corrigió el snippet del plan reemplazando la alternativa exacta `DEMO-6205-2RSH` por `DEMO-6205-2RSH/W64`. Así, `DEMO-6205-2RSH` es realmente una captura inexistente e incompleta y devuelve tres completaciones claras: `/C3`, `/C4` y `/W64`.
- Todos los códigos reservados empiezan con `DEMO-`. La tarea 5 contiene la guarda `if (d.designacion.startsWith("DEMO-")) continue`, por lo que la resolución aleatoria no cambia los reemplazos del guion.
- El orden de orquestación es obligatorio: generar catálogo e inventario sintéticos; ejecutar `aplicarCasosCurados(catalogo, inventario)`; ejecutar `resolverObsolescencia(a, catalogo)`; generar las relaciones aleatorias con `generarHomologos(a, catalogo)`; ejecutar `aplicarHomologosCurados(homologos)`; y solo entonces serializar designaciones, inventario y homólogos. Aplicar los casos después de la resolución no ejercitaría la guarda `DEMO-`; serializar antes de las inyecciones las excluiría de la carga.
- `aplicarCasosCurados` **muta** los dos arreglos. Inserta una copia superficial de cada `DesignacionCompleta` y crea las filas de inventario con `pdiv_dueno` igual al PDIV del caso.
- La aplicación repetida sobre el resultado completo es idempotente tanto para catálogo como para inventario. Un `Set` de designaciones existentes hace que la segunda llamada omita cada caso completo, incluidas sus existencias; los tests fijan que no cambia ninguna de las dos longitudes.
- `HOMOLOGOS_CURADOS` contiene la relación dirigida fija `DEMO-OBS-CON` → `DEMO-6205-2RSH/C3`, con el motivo “Reemplazo por obsolescencia con validación técnica” y dos diferencias: sellado anterior frente a dos sellos de contacto `2RSH`, y juego normal `CN` frente a aumentado `C3`.
- `aplicarHomologosCurados` también es idempotente. Deduplica mediante la clave dirigida `origen|equivalente` y agrega la relación únicamente si todavía no existe.
- Al inyectar el homólogo se copia el objeto y cada elemento de `diferencias`. El arreglo resultante no comparte los objetos mutables de diferencias con la constante curada.
- Una lista de existencias vacía significa deliberadamente cero stock. No se crea una fila con cantidad cero.
- El caso obsoleto con reemplazo garantiza el vínculo a una designación vigente del catálogo. El caso de fábrica garantiza lo contrario: el código indicado no existe. El caso sin reemplazo deja ambos campos nulos.

## Contrato que exponen estos archivos

`scripts/seed/casos-curados.ts` exporta:

```ts
export interface CasoCurado {
  clave: string;
  escena: string;
  designacion: DesignacionCompleta;
  existencias: readonly {
    almacen: "PS" | "SL" | "XX";
    cantidad: number;
  }[];
}

export const CASOS_CURADOS: readonly CasoCurado[];

export const HOMOLOGOS_CURADOS: readonly Homologo[];

export function aplicarCasosCurados(
  catalogo: DesignacionCompleta[],
  inventario: FilaInventario[],
): void;

export function aplicarHomologosCurados(
  homologos: Homologo[],
): void;
```

`CASOS_CURADOS` contiene once elementos. `HOMOLOGOS_CURADOS` contiene una relación con dos diferencias técnicas. Ambas funciones de aplicación devuelven `void` y mutan los arreglos recibidos.

`aplicarCasosCurados` agrega las designaciones ausentes y, en la misma operación, sus existencias declaradas. `aplicarHomologosCurados` agrega los pares curados ausentes y copia sus diferencias antes de insertarlos.

La identidad usada para decidir si un caso ya existe es únicamente `caso.designacion.designacion`. Las filas de inventario creadas tienen `designacion`, `almacen`, `cantidad` y `pdiv_dueno` compatibles con `FilaInventario`.

## Qué falta / qué NO hace

- No inserta datos en la base ni serializa filas; la tarea 10 debe llamar después a los serializadores y al cargador.
- No crea los casos mediante el PRNG y no consume `Aleatorio`; son datos fijos por diseño.
- No ejecuta la lógica de UI, el ajuste de cantidad, la consulta al Planner, el cálculo de +4 semanas ni la ventana de mantenimiento. Solo garantiza los datos que permiten que esas ramas se activen.
- La idempotencia presupone un estado completo. Si una designación `DEMO-` ya existe en catálogo pero sus existencias faltan o están incompletas, la función omite todo el caso y no repara el inventario. Tampoco elimina filas de inventario duplicadas preexistentes.
- Si el par dirigido de `HOMOLOGOS_CURADOS` ya existe, `aplicarHomologosCurados` no corrige su motivo ni sus diferencias aunque estén incompletos. Tampoco considera el par inverso como duplicado ni elimina duplicados preexistentes.
- No actualiza un caso existente con el mismo código aunque sus demás campos difieran; la designación actúa como clave de exclusión.
- La guarda `DEMO-` depende de `resolverObsolescencia` de la tarea 5. Quitar o cambiar esa guarda permitiría sobrescribir al azar los tres casos obsoletos.
- El prefijo reservado evita colisiones con el generador actual, pero no es una restricción de base. Cualquier generador futuro debe seguir respetándolo.
- Las cantidades exactas de inventario están preparadas para el guion, no modelan una distribución estadística ni movimientos de almacén.

## Cómo verificar

Ejecutar los tests específicos:

```powershell
pnpm.cmd test casos-curados
```

Resultado real: `Test Files 1 passed (1)` y `Tests 15 passed (15)`.

Ejecutar toda la suite:

```powershell
pnpm.cmd test
```

Resultado real: `Test Files 16 passed (16)` y `Tests 187 passed (187)`.

Verificar tipos:

```powershell
.\node_modules\.bin\tsc.cmd --noEmit
```

Resultado real: finaliza sin errores.

Verificar formato y lint:

```powershell
pnpm.cmd lint
```

Resultado real: código de salida 0 y 47 archivos revisados. Solo aparece el aviso informativo preexistente sobre `linter.recommended` deprecado en `biome.json`; no hay errores de esta tarea.
