# Tarea 11 — Portal: Vista Cliente

## Estado
completa

Para ubicar el trabajo usa `git log --oneline -- app/(portal) app/(operador) components/portal components/operador`.

## Qué entrega esta tarea

Entrega el portal de consulta con el contraste completo entre modo `hoy` y modo
`solucion`, el contexto QMS de cada candidato, precio y TE estimado, y la bandeja
mínima del operador. También incorpora una fuente de lectura de solicitudes para
mantener la regla arquitectónica de que las pantallas no consultan tablas.

## Decisiones tomadas y por qué

- `buscarDesignacion` es el único punto de bifurcación de modos. En `hoy` hace
  coincidencia exacta; en `solucion` usa la cascada completa.
- El resultado del portal extiende `ResultadoValidacion` con un mapa de
  estimaciones. El buscador es Client Component y necesita recibir el TE junto
  con los candidatos para renderizar `EstimacionTE` sin consultar Supabase desde
  el navegador.
- `generarSolicitud` reintenta hasta cinco veces únicamente ante colisión del
  número aleatorio `AAAAQ#####`; otros errores se propagan.
- El verde aparece solo después de una confirmación (`Consulta resuelta` o
  solicitud creada). El ámbar queda exclusivamente en `BannerVentana`.
- `lib/fuentes/solicitudes.ts` se añadió aunque no figuraba en la lista mínima
  del brief: consultar la tabla directamente desde `/operador` habría violado la
  arquitectura global de `lib/fuentes` como única capa de tablas.
- No se añadieron ni ejecutaron tests de Vitest, por directiva explícita del
  usuario. Se verificaron tipado, lint, build y respuestas HTTP reales.

## Contrato que exponen estos archivos

```ts
interface ResultadoBusquedaPortal extends ResultadoValidacion {
  estimaciones: Record<string, Estimacion | null>;
}

function buscarDesignacion(
  consulta: string,
  cantidad: number,
): Promise<ResultadoBusquedaPortal>;

function generarSolicitud(consulta: string, cantidad: number): Promise<string>;
function registrarSolicitudEvitada(codigo: string): Promise<void>;

interface SolicitudResumen {
  numero: string;
  designacionTexto: string;
  cantidad: number;
  clasificacionQms: string | null;
  puntoQms: string | null;
  creadaEn: string;
}

function solicitudesDesde(iniciadaEn: string): Promise<SolicitudResumen[]>;
```

Componentes públicos: `<Buscador />`, `<ResultadoBusqueda />`,
`<TarjetaSugerencia />`, `<DetalleDesignacion />`, `<BannerVentana />`,
`<EtiquetaQMS />` y `<ListaSolicitudes solicitudes />`.

## Qué falta / qué NO hace

- La bandeja es deliberadamente mínima: filtros, asignación y detalle completo
  pertenecen al Plan 4.
- La automatización del navegador no estuvo disponible por una limitación del
  conector de esta sesión. Se validó que `/portal` y `/operador` renderizan con
  Supabase cloud, pero el recorrido visual de dos ventanas y el cambio Realtime
  queda como ensayo manual junto con la tarea 12.
- No se añadieron tests automatizados.

## Cómo verificar

```powershell
.\node_modules\.bin\tsc.cmd --noEmit
pnpm.cmd lint
pnpm.cmd build
```

Esperado: tipado sin salida, lint sin errores (solo el aviso informativo de
`biome.json`) y build con `/portal` y `/operador` dinámicas.

Con `pnpm.cmd dev` y acceso a Supabase cloud:

```powershell
curl.exe -s -o NUL -w "%{http_code}" http://127.0.0.1:3000/portal
curl.exe -s -o NUL -w "%{http_code}" http://127.0.0.1:3000/operador
```

Ambas devolvieron `200` (1.39 s y 0.56 s respectivamente).
