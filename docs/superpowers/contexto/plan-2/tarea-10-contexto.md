# Tarea 10 — Orquestador y verificación de los datos cargados

## Estado
completa

No cites el hash de tu propio commit: el archivo va dentro de ese commit y no
puedes conocerlo al escribirlo. Para ubicar el trabajo usa:
`git log --oneline -- scripts/seed/index.ts scripts/seed/verificar.ts package.json`.

## Qué entrega esta tarea

Entrega los dos comandos operativos del Plan 2: `pnpm seed`, que genera y carga transaccionalmente todos los datos sintéticos, y `pnpm seed:verificar`, que comprueba en la base los volúmenes, casos curados, búsqueda difusa, patrones del dashboard e invariantes de coherencia.

La siembra completa fue ejecutada dos veces contra Supabase. Ambas corridas produjeron exactamente los mismos conteos y ambas verificaciones terminaron en verde.

## Decisiones tomadas y por qué

- `DEMO_SEED` se lee desde `.env.local`, con valor predeterminado `20260803`. Antes de crear el PRNG se exige que sea un entero seguro; una semilla inválida detiene el proceso antes de conectar o modificar la base.
- La generación en memoria respeta este orden:
  1. `generarCatalogo(a, 30000)`.
  2. `generarInventario(a, catalogo)`.
  3. `aplicarCasosCurados(catalogo, inventario)`.
  4. `resolverObsolescencia(a, catalogo)`.
  5. `generarHomologos(a, catalogo)`.
  6. `aplicarHomologosCurados(homologos)`.
  7. `generarClientes(a, 300)`.
  8. `generarCotizaciones(...)` desde `2026-02-02T00:00:00Z` hasta `2026-08-01T00:00:00Z`, con 65 solicitudes por día hábil como base.
- Los casos curados se aplican antes de resolver la obsolescencia para que la guarda `DEMO-` preserve sus reemplazos. El homólogo curado se aplica después de los homólogos aleatorios y antes de serializar, para garantizar la relación `DEMO-OBS-CON` → `DEMO-6205-2RSH/C3` con sus dos diferencias técnicas.
- `resolverObsolescencia` muta el catálogo, por lo que las designaciones se serializan únicamente después de esa llamada. Hacerlo antes perdería los reemplazos en las filas de carga.
- Antes del `COPY`, el catálogo se ordena con los vigentes primero y los obsoletos después. La FK autorreferente `reemplazado_por` debe encontrar cargada la designación vigente referenciada cuando se valida la inserción.
- El orden de carga, impuesto por las claves foráneas, es: `plantas` → `designaciones` → `homologos` → `inventario` → `clientes` → `operadores` → `cotizaciones`.
- Toda limpieza y carga ocurre dentro de una transacción explícita: `BEGIN`, `TRUNCATE ... RESTART IDENTITY CASCADE`, los siete `COPY` y `COMMIT`. Si cualquier limpieza o carga falla, se ejecuta `ROLLBACK` y se relanza el error; PostgreSQL revierte también el `TRUNCATE`, evitando dejar una base parcialmente vacía o sembrada.
- `RESTART IDENTITY` restablece las secuencias en cada corrida. Esto mantiene estables los IDs de clientes y, especialmente, los IDs reales de operadores usados por las cotizaciones; `CSR 7` conserva el ID 7 inactivo y nunca recibe asignaciones.
- El `TRUNCATE` incluye además las tablas dependientes `solicitudes`, `intenciones_pedido`, `snapshot_inventario` y `eventos_demo`. Usa `CASCADE` para respetar dependencias y no modifica el esquema.
- Todos los datos se generan antes de abrir la conexión. La conexión se cierra en `finally`, tanto si hay éxito como si se produce un error.
- Los tiempos se miden con `Date.now()` únicamente alrededor de cada carga. Esto no interviene en ningún valor generado y no rompe el determinismo de los datos.
- `package.json` ya contenía los scripts correctos `"seed": "tsx scripts/seed/index.ts"` y `"seed:verificar": "tsx scripts/seed/verificar.ts"`. No se modificó porque no había nada que corregir.

### Primera siembra

Salida relevante completa:

```text
Sembrando con semilla 20260803...
  generando catálogo...
  generando histórico...
  limpiando tablas...
  plantas: 18 filas en 222 ms
  designaciones: 30011 filas en 3577 ms
  homologos: 4196 filas en 507 ms
  inventario: 29691 filas en 2129 ms
  clientes: 300 filas en 214 ms
  operadores: 8 filas en 204 ms
  cotizaciones: 7921 filas en 780 ms

Listo. 11 casos curados disponibles para el guion.
```

Primera verificación, toda en verde:

```text
Volúmenes
  ✓ plantas: 18 filas (mínimo 18)
  ✓ designaciones: 30011 filas (mínimo 30000)
  ✓ homologos: 4196 filas (mínimo 1000)
  ✓ inventario: 29691 filas (mínimo 15000)
  ✓ clientes: 300 filas (mínimo 300)
  ✓ operadores: 8 filas (mínimo 8)
  ✓ cotizaciones: 7921 filas (mínimo 7000)

Casos curados del guion
  ✓ truncada · DEMO-6205-2RSH/C3
  ✓ truncada_alt_1 · DEMO-6205-2RSH/C4
  ✓ truncada_alt_2 · DEMO-6205-2RSH/W64
  ✓ moq · DEMO-MOQ-50
  ✓ pack · DEMO-PACK-20
  ✓ obsoleto_con_reemplazo · DEMO-OBS-CON
  ✓ obsoleto_sin_reemplazo · DEMO-OBS-SIN
  ✓ obsoleto_reemplazo_fabrica · DEMO-OBS-FAB
  ✓ ventana · DEMO-VENTANA
  ✓ nueva_creacion · DEMO-NUEVA
  ✓ transmision_planner · DEMO-PT-PLANNER
  ✓ homólogo curado DEMO-OBS-CON → DEMO-6205-2RSH/C3 con diferencias

Búsqueda difusa
  ✓ trigramas responde en 130 ms (límite 1000)
  ✓ devuelve 5 sugerencias
  ✓ el prefijo incompleto tiene 3 completaciones

Patrones del dashboard
  ✓ pico en la franja de desconexión: 66.3%
  ✓ los 5 motivos de declinado están presentes
  ✓ promedio de respuesta: 3.91 días

Coherencia
  ✓ ninguna cotizada sin TE ni precio
  ✓ ninguna cotización asignada a CSR inactivo
  ✓ ningún reemplazo indicado por fábrica existe en el catálogo (es su definición)
  ✓ las tres salidas del punto 4.6/4.7 están representadas: 814 / 294 / 376

Datos verificados.
```

### Segunda siembra y reproducibilidad

La segunda corrida produjo los mismos conteos, con estos tiempos:

```text
Sembrando con semilla 20260803...
  generando catálogo...
  generando histórico...
  limpiando tablas...
  plantas: 18 filas en 199 ms
  designaciones: 30011 filas en 3488 ms
  homologos: 4196 filas en 507 ms
  inventario: 29691 filas en 2030 ms
  clientes: 300 filas en 188 ms
  operadores: 8 filas en 187 ms
  cotizaciones: 7921 filas en 723 ms

Listo. 11 casos curados disponibles para el guion.
```

La segunda verificación repitió todos los valores y conteos de la primera. La única diferencia observada fue el tiempo de trigramas:

```text
Volúmenes
  ✓ plantas: 18 filas (mínimo 18)
  ✓ designaciones: 30011 filas (mínimo 30000)
  ✓ homologos: 4196 filas (mínimo 1000)
  ✓ inventario: 29691 filas (mínimo 15000)
  ✓ clientes: 300 filas (mínimo 300)
  ✓ operadores: 8 filas (mínimo 8)
  ✓ cotizaciones: 7921 filas (mínimo 7000)

Casos curados del guion
  ✓ truncada · DEMO-6205-2RSH/C3
  ✓ truncada_alt_1 · DEMO-6205-2RSH/C4
  ✓ truncada_alt_2 · DEMO-6205-2RSH/W64
  ✓ moq · DEMO-MOQ-50
  ✓ pack · DEMO-PACK-20
  ✓ obsoleto_con_reemplazo · DEMO-OBS-CON
  ✓ obsoleto_sin_reemplazo · DEMO-OBS-SIN
  ✓ obsoleto_reemplazo_fabrica · DEMO-OBS-FAB
  ✓ ventana · DEMO-VENTANA
  ✓ nueva_creacion · DEMO-NUEVA
  ✓ transmision_planner · DEMO-PT-PLANNER
  ✓ homólogo curado DEMO-OBS-CON → DEMO-6205-2RSH/C3 con diferencias

Búsqueda difusa
  ✓ trigramas responde en 116 ms (límite 1000)
  ✓ devuelve 5 sugerencias
  ✓ el prefijo incompleto tiene 3 completaciones

Patrones del dashboard
  ✓ pico en la franja de desconexión: 66.3%
  ✓ los 5 motivos de declinado están presentes
  ✓ promedio de respuesta: 3.91 días

Coherencia
  ✓ ninguna cotizada sin TE ni precio
  ✓ ninguna cotización asignada a CSR inactivo
  ✓ ningún reemplazo indicado por fábrica existe en el catálogo (es su definición)
  ✓ las tres salidas del punto 4.6/4.7 están representadas: 814 / 294 / 376

Datos verificados.
```

Los conteos son reproducibles con la misma semilla y versiones bloqueadas. Los tiempos no lo son: dependen de red, carga de Supabase, pooler, máquina y caché.

## Contrato que exponen estos archivos

`scripts/seed/index.ts` y `scripts/seed/verificar.ts` son puntos de entrada CLI y **no exportan funciones ni tipos**. Su contrato público son estos scripts de `package.json`, ya existentes y sin cambios:

```json
{
  "scripts": {
    "seed": "tsx scripts/seed/index.ts",
    "seed:verificar": "tsx scripts/seed/verificar.ts"
  }
}
```

Comandos exactos:

```powershell
pnpm.cmd seed
pnpm.cmd seed:verificar
```

`pnpm.cmd seed` requiere `SUPABASE_DB_URL` y acepta `DEMO_SEED` desde `.env.local`. Destruye y reconstruye los datos de las tablas incluidas en el `TRUNCATE`, dentro de una transacción. Termina con código distinto de cero si la semilla, conexión, limpieza o alguna carga falla.

`pnpm.cmd seed:verificar` es de solo lectura. Consulta la base ya cargada, imprime una marca por comprobación y termina con código 0 únicamente cuando `errores === 0`; si una condición falla, acumula el error y termina con código 1.

El verificador comprueba:

- mínimos de volumen para siete tablas;
- presencia individual de los once casos curados;
- presencia del homólogo curado y al menos dos diferencias;
- respuesta de trigramas bajo 1.000 ms, sugerencias y exactamente tres completaciones;
- pico superior a 38%, cinco motivos y promedio de respuesta entre 2 y 6 días;
- ausencia de cotizadas sin TE/precio, asignaciones a operadores inactivos y reemplazos de fábrica existentes en catálogo;
- presencia de las tres salidas de obsolescencia.

## Qué falta / qué NO hace

- `pnpm seed` es destructivo para los datos de las tablas enumeradas: las trunca y vuelve a cargar. No debe ejecutarse contra una base que contenga información que deba conservarse.
- No crea ni migra el esquema. Presupone que las migraciones del Plan 1 ya están aplicadas y que `SUPABASE_DB_URL` apunta al pooler de sesión correcto.
- No reintenta conexiones ni lotes fallidos. Ante un fallo revierte la transacción completa y termina con error.
- No verifica igualdad byte a byte entre dos corridas ni calcula un checksum. La reproducibilidad ejecutada y registrada compara los conteos y los indicadores impresos; esos valores coincidieron en ambas corridas.
- Los tiempos de carga y consulta no son deterministas ni forman parte de la semilla. Solo el verificador de trigramas aplica un límite operativo de 1.000 ms.
- El verificador usa umbrales para volúmenes y patrones; no exige que los conteos sean exactamente los anotados en este documento. La igualdad exacta se comprobó observando las dos ejecuciones consecutivas.
- El promedio denominado SLA se calcula como días calendario de 24 horas entre timestamps, no mediante un calendario corporativo de días hábiles.
- No verifica por sí solo que ninguna designación, cliente o precio coincida con un dato real de SKF; los generadores fueron diseñados para datos ficticios, pero no existe una fuente real contra la cual hacer una comparación automática.
- No ejecuta la aplicación web ni pruebas de navegador. El build de producción sí fue verificado, pero no valida el comportamiento interactivo del demo.
- `main()` y `leerSemilla()` son internos; no existe una API programática soportada para ejecutar una parte de la siembra.

## Cómo verificar

Ejecutar la suite unitaria completa:

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

Resultado real: código de salida 0 y 49 archivos revisados. Solo aparece el aviso informativo preexistente sobre `linter.recommended` deprecado en `biome.json`; no hay errores de esta tarea.

Verificar el build de producción:

```powershell
pnpm.cmd build
```

La primera ejecución dentro del sandbox falló únicamente porque Next.js no pudo descargar las fuentes **Geist** y **Geist Mono** debido a la restricción de red. No fue un error de TypeScript, de compilación ni del código del proyecto. Al repetir el mismo comando con acceso de red autorizado, el build terminó correctamente:

```text
Next.js 16.2.12
Compilación: 2.9 s
TypeScript: 4.4 s
Páginas estáticas: 4/4
Rutas generadas:
  /
  /_not-found
```

Resultado real final: build de producción exitoso. La necesidad de red proviene de la descarga de fuentes durante el build; si esas fuentes no están disponibles o no están cacheadas, un entorno aislado puede repetir el mismo fallo ambiental aunque el código siga siendo válido.

Repetir la verificación operativa completa:

```powershell
pnpm.cmd seed
pnpm.cmd seed:verificar
pnpm.cmd seed
pnpm.cmd seed:verificar
```

Esperado con `DEMO_SEED=20260803` y las mismas versiones: ambas siembras terminan sin error, ambas verificaciones imprimen `Datos verificados.` y los conteos de las siete tablas coinciden entre corridas. Los milisegundos pueden variar.
