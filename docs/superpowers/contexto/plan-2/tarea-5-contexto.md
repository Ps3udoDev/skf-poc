# Tarea 5 — Homólogos y cadenas de obsolescencia

## Estado
completa

No cites el hash de tu propio commit: el archivo va dentro de ese commit y no
puedes conocerlo al escribirlo. Para ubicar el trabajo usa:
`git log --oneline -- scripts/seed/homologos.ts scripts/seed/homologos.test.ts`.

## Qué entrega esta tarea

Entrega la resolución determinista de las tres salidas de obsolescencia del procedimiento QMS y un generador de equivalencias técnicas entre designaciones de la misma familia. La resolución modifica el catálogo completo en memoria, mientras los homólogos se devuelven como relaciones independientes con motivo y entre una y tres diferencias técnicas explícitas.

También entrega la lista ordenada de columnas y la conversión a filas para cargar los homólogos, serializando `diferencias` como JSON.

## Decisiones tomadas y por qué

- `resolverObsolescencia` **muta los objetos de `DesignacionCompleta` recibidos**. Solo procesa designaciones no vigentes y reparte los casos con pesos 55/20/25: 55% intenta un reemplazo existente en sistema, 20% recibe un código indicado solo por fábrica y 25% queda sin reemplazo.
- Un reemplazo en sistema se elige exclusivamente entre designaciones vigentes de la misma familia. Así, `reemplazado_por` siempre referencia una designación existente, vigente y técnicamente relacionada por familia. Si una familia no tiene candidatos vigentes, el caso se degrada de forma segura a “sin reemplazo”; por ello 55/20/25 son pesos objetivo, no conteos exactos garantizados para cualquier catálogo.
- Los códigos de `reemplazo_indicado_fabrica` se construyen con el sufijo reservado `-NS` y, ante una colisión, `-NS1` hasta `-NS50`. Solo se asignan cuando el código propuesto **no existe en el catálogo**: esto representa precisamente el caso QMS “la fábrica lo indica, pero todavía no está en sistema”.
- Los dos tipos de reemplazo son excluyentes. Los vigentes conservan ambos campos nulos y los obsoletos del caso “NINGUNO” también quedan con ambos nulos.
- Las designaciones con prefijo `DEMO-` se omiten deliberadamente al resolver obsolescencia. Ese prefijo queda reservado para los casos curados de la tarea 9, cuyas decisiones manuales forman parte del guion y no deben ser sobrescritas por el reparto sintético.
- `generarHomologos` agrupa primero por familia y solo forma pares dentro de cada grupo. Descarta relaciones reflexivas y pares dirigidos duplicados mediante la clave `origen|equivalente`.
- Por cada familia intenta generar `floor(miembros * 0.14)` relaciones. El resultado puede ser menor porque se descartan sorteos reflexivos o repetidos; no se promete un 14% exacto.
- Cada homólogo lleva un motivo y entre una y tres diferencias tomadas de atributos técnicos como sellado, juego interno, jaula, temperatura, velocidad y lubricación. Los valores de origen y equivalente se escogen sin coincidir dentro de cada diferencia, para que la confirmación guiada del demo tenga información concreta que comparar.
- Toda elección aleatoria usa la instancia `Aleatorio` recibida. Con el mismo catálogo, semilla y orden de llamadas se obtiene el mismo resultado.
- El orden de orquestación es obligatorio: primero `resolverObsolescencia(a, catalogo)` y solo después `filasDesignaciones(catalogo)`. Si las designaciones se convierten a filas antes de resolver la obsolescencia, las filas ya habrán capturado los dos reemplazos como `null` y la mutación posterior no quedará reflejada en la carga.

## Contrato que exponen estos archivos

`scripts/seed/homologos.ts` exporta:

```ts
export interface DiferenciaTecnica {
  atributo: string;
  valor_origen: string;
  valor_equivalente: string;
}

export interface Homologo {
  origen: string;
  equivalente: string;
  motivo: string;
  diferencias: DiferenciaTecnica[];
}

export function resolverObsolescencia(
  a: Aleatorio,
  catalogo: DesignacionCompleta[],
): void;

export function generarHomologos(
  a: Aleatorio,
  catalogo: readonly DesignacionCompleta[],
): Homologo[];

export const COLUMNAS_HOMOLOGOS = [
  "origen",
  "equivalente",
  "motivo",
  "diferencias",
] as const;

export function filasHomologos(
  homologos: readonly Homologo[],
): unknown[][];
```

`resolverObsolescencia` no devuelve un catálogo nuevo: su resultado observable es la mutación de `reemplazado_por` y `reemplazo_indicado_fabrica` en el arreglo recibido. `generarHomologos` no muta el catálogo y devuelve relaciones cuyos extremos son designaciones del catálogo.

`filasHomologos` devuelve una fila de cuatro posiciones por relación, en el orden de `COLUMNAS_HOMOLOGOS`. La cuarta posición es `JSON.stringify(h.diferencias)`, lista para que el cargador la envíe a la columna JSON correspondiente.

## Qué falta / qué NO hace

- No inserta ni actualiza datos en la base; opera en memoria y produce filas para una carga posterior.
- No devuelve una copia al resolver obsolescencia. Quien necesite preservar el catálogo original debe copiarlo antes de llamar a `resolverObsolescencia`.
- No puede llamarse después de `filasDesignaciones` esperando que las filas existentes se actualicen. Hay que resolver primero y serializar después, o volver a construir las filas.
- No garantiza porcentajes finales exactos de 55%, 20% y 25% para catálogos pequeños o sin candidatos vigentes por familia. Son pesos de selección; los casos “SISTEMA” sin candidato se degradan a “sin reemplazo”.
- No crea una designación real para los códigos indicados por fábrica ni los incorpora a homólogos. Esos códigos deben permanecer ausentes del catálogo para conservar el significado del caso.
- No construye cadenas recursivas de obsoleto a obsoleto: `reemplazado_por` apunta directamente a una designación vigente. Tampoco modifica `pcc`, `lcc`, `vigente` ni la familia.
- No asegura un número exacto de homólogos ni evita que puedan existir las dos direcciones de un par (`A|B` y `B|A`); solo evita duplicados de la misma dirección y relaciones reflexivas.
- No decide la obsolescencia de los casos `DEMO-`; estos quedan reservados para la tarea 9.

## Cómo verificar

Ejecutar los tests específicos:

```powershell
pnpm.cmd test homologos
```

Resultado real: `Test Files 1 passed (1)` y `Tests 9 passed (9)`.

Ejecutar toda la suite:

```powershell
pnpm.cmd test
```

Resultado real: `Test Files 12 passed (12)` y `Tests 131 passed (131)`.

Verificar tipos:

```powershell
.\node_modules\.bin\tsc.cmd --noEmit
```

Resultado real: finaliza sin errores.

Verificar formato y lint:

```powershell
pnpm.cmd lint
```

Resultado real después de aplicar `biome check --write` a `scripts/seed/homologos.ts` y `scripts/seed/homologos.test.ts`: código de salida 0 y 39 archivos revisados. Solo aparece el aviso informativo preexistente sobre `linter.recommended` deprecado en `biome.json`; no hay errores de esta tarea.
