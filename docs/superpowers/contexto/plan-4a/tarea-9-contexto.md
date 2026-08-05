# Tarea 9 — Confirmación guiada en el portal

## Estado

completa

No cites el hash de tu propio commit: el archivo va dentro de ese commit y no
puedes conocerlo al escribirlo. Para ubicar el trabajo basta con
`git log --oneline -- components/portal/confirmacion-homologo.tsx`.

## Qué entrega esta tarea

- `app/(portal)/portal/acciones.ts`: dos Server Actions nuevas al final del
  archivo —`equivalenciasDe` (lee homólogos y los convierte en pasos con
  `construirConfirmacion`) y `confirmarHomologo` (vuelve a resolver el homólogo
  en el servidor, emite el evento `confirmacion_homologo` y devuelve si exige
  Ingeniería de Ventas). Imports nuevos: `homologosDe` en la lista de
  `@/lib/fuentes`, y `construirConfirmacion` + tipo `Confirmacion` desde
  `@/lib/validador/confirmacion`.
- `components/portal/confirmacion-homologo.tsx` (nuevo): componente de cliente
  que carga las equivalencias a demanda (*Ver equivalencias registradas*),
  lista cada homólogo con sus pasos del punto 4.6 y obliga a marcar cada
  diferencia antes de habilitar *Aceptar equivalencia*.
- `components/portal/detalle-designacion.tsx`: gana la prop `cantidad` y monta
  `<ConfirmacionHomologo>` debajo del botón *Usar esta designación*, dentro del
  mismo `<div>`.
- `components/portal/tarjeta-sugerencia.tsx`: pasa `cantidad` hacia abajo a
  `<DetalleDesignacion>`.

## Decisiones tomadas y por qué

- **Las equivalencias se cargan a demanda.** Resolverlas para todos los
  candidatos en cada búsqueda añade una consulta por candidato a un buscador
  que la escena 2 necesita instantáneo; se consultan solo al pulsar *Ver
  equivalencias registradas*. (Decisión del plan, aplicada tal cual.)

- **El resultado va en azul primario, no en verde, cuando exige validación.**
  Verde es confirmación y nada más: solo aparece cuando
  `requiereIngenieriaVentas` es falso. Cuando es verdadero, el aviso usa el
  azul primario con «sujeta a validación de Ingeniería de Ventas». Ámbar no
  aparece aquí: es exclusivo de desconexión. (Decisión del plan.)

- **`confirmarHomologo` re-resuelve el homólogo en el servidor.** No confía en
  lo que manda el navegador: la equivalencia tiene que existir en la base,
  igual que el validador solo elige designaciones del catálogo. El evento
  `confirmacion_homologo` ya existía en el enum `tipo_evento`.

- **`resultado-busqueda.tsx` no necesitó cambios**: ya pasaba `cantidad` a
  `<TarjetaSugerencia>`. `TarjetaSugerencia` ya tenía la prop
  `plantaEnVentana` de una tarea anterior; no se le añadió nada más (ni
  `estrategia`, que es de tareas posteriores).

- **Adaptaciones mínimas al snippet del plan: formato.** Biome ordenó los
  imports de `acciones.ts` (el import de tipo `Confirmacion` antes que el de
  valor) y partió líneas largas de `confirmacion-homologo.tsx`
  (`biome check --write`); sin cambio de lógica.

- **Sin tests nuevos** — directiva del usuario: no se crean archivos de test
  en este plan.

## Contrato que exponen estos archivos

```ts
// app/(portal)/portal/acciones.ts
export async function equivalenciasDe(codigo: string): Promise<Confirmacion[]>

export async function confirmarHomologo(
  origen: string,
  equivalente: string,
  cantidad: number,
): Promise<{ designacion: string; requiereIngenieriaVentas: boolean }>
```

- `confirmarHomologo` lanza si el equivalente no es homólogo registrado del
  origen o no existe en el catálogo; emite `confirmacion_homologo` con
  `detalle: { equivalente, cantidad, pasos, requiereIngenieriaVentas }` y hace
  `revalidatePath("/operador")`.

```tsx
// components/portal/confirmacion-homologo.tsx (cliente)
export function ConfirmacionHomologo({
  codigo,
  cantidad,
}: {
  codigo: string;
  cantidad: number;
}): JSX.Element
```

```tsx
// components/portal/detalle-designacion.tsx (cliente)
export function DetalleDesignacion({
  sugerencia,
  estimacion,
  cantidad, // NUEVA
}: {
  sugerencia: Sugerencia;
  estimacion: Estimacion | null;
  cantidad: number;
}): JSX.Element
```

## Qué falta / qué NO hace

- **Sin verificación en navegador** (ver abajo): el recorrido de la escena 3
  queda pendiente de prueba manual, incluida la consulta SQL del evento.
- El componente no impide por su cuenta aceptar sin marcar pasos: el botón se
  deshabilita hasta que `marcados.size === pasos.length`, que es exactamente
  lo que pide el plan; no hay validación adicional en servidor de los pasos
  marcados (el servidor re-deriva la confirmación del homólogo).

## Cómo verificar

```bash
pnpm test
```

Salida: `Test Files 17 passed (17)`, `Tests 198 passed (198)` — la suite
sigue en verde; esta tarea es UI + Server Actions y no toca lógica cubierta
por tests.

```bash
pnpm build
```

Compila y type-check sin errores; `/portal` sigue siendo ruta dinámica (`ƒ`).

```bash
pnpm lint
```

`Checked 143 files ... Found 1 info.` (el info es la deprecación preexistente
de `biome.json`, ajena a esta tarea).

## Verificación manual pendiente

No se pudo correr `pnpm dev` + navegador en este entorno. Cuando se pueda, en
`/demo` activa el escenario de la escena 3 (o el modo *con la solución*) y en
`/portal` busca `DEMO-OBS-CON`:

1. Aparece *Ver equivalencias registradas*; al pulsarlo se lista
   `DEMO-6205-2RSH/C3`.
2. Al abrirla se ven los dos pasos —*Sellado* y *Juego interno*— y el botón
   está deshabilitado.
3. Marcando solo uno sigue deshabilitado. Con los dos marcados se habilita.
4. Al aceptar, el resultado sale en azul primario con el texto **sujeto a
   validación de Ingeniería de Ventas** — nunca en verde.
5. En el editor SQL:
   `select tipo, designacion, detalle from eventos_demo where tipo = 'confirmacion_homologo' order by ocurrido_en desc limit 3;`
   devuelve el evento con `requiereIngenieriaVentas: true`.
