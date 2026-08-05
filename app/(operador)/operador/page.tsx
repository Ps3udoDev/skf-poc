import { PanelChat } from "@/components/chat/panel-chat";
import { BarraSuperior } from "@/components/marco/barra-superior";
import { Bandeja } from "@/components/operador/bandeja";
import { FiltrosBandeja } from "@/components/operador/filtros-bandeja";
import { ProveedorSesion } from "@/components/sesion/proveedor-sesion";
import {
  cargaPorCsr,
  type EstadoSolicitud,
  type FiltroBandeja,
  solicitudesFiltradas,
  todasLasPlantas,
} from "@/lib/fuentes";
import { indicadoresDeSesion } from "@/lib/metricas/indicadores";
import { RUTAS_QMS, type RutaQMS } from "@/lib/reglas-qms";
import { leerSesion } from "@/lib/sesion-demo/leer";

export const dynamic = "force-dynamic";

type Parametros = Promise<Record<string, string | string[] | undefined>>;

/** Un `searchParams` repetido llega como arreglo; la bandeja usa el primero. */
function uno(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}

export default async function PaginaOperador({ searchParams }: { searchParams: Parametros }) {
  const parametros = await searchParams;
  const sesion = await leerSesion();

  const estado = uno(parametros.estado);
  const clasificacion = uno(parametros.clasificacion);
  const csr = uno(parametros.csr);

  const filtro: FiltroBandeja = {
    desde: sesion.iniciadaEn,
    estado: estado === "abierta" || estado === "atendida" ? (estado as EstadoSolicitud) : undefined,
    clasificacion: RUTAS_QMS.includes(clasificacion as RutaQMS)
      ? (clasificacion as RutaQMS)
      : undefined,
    csr: csr === "sin-asignar" ? null : csr,
  };

  const [plantas, indicadores, solicitudes, cargas] = await Promise.all([
    todasLasPlantas(),
    indicadoresDeSesion(),
    solicitudesFiltradas(filtro),
    cargaPorCsr(sesion.iniciadaEn),
  ]);
  const metricas = [
    ["Solicitudes recibidas", indicadores.solicitudesGeneradas],
    ["Solicitudes evitadas", indicadores.solicitudesEvitadas],
    ["Minutos de operador liberados", indicadores.minutosOperadorLiberados],
  ] as const;
  return (
    <ProveedorSesion sesionInicial={sesion} plantas={plantas}>
      <div className="min-h-screen bg-fondo-sutil">
        <BarraSuperior perfil="operador" />
        <main className="mx-auto w-full max-w-7xl px-6 py-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primario">
                Servicio al Cliente
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-texto">Bandeja de solicitudes</h1>
            </div>
            <p className="text-sm text-texto-tenue">
              Sesión iniciada {new Date(sesion.iniciadaEn).toLocaleString("es-MX")}
            </p>
          </div>
          <div className="my-6 grid gap-3 sm:grid-cols-3">
            {metricas.map(([etiqueta, valor]) => (
              <div key={etiqueta} className="rounded-xl border border-borde bg-fondo p-4">
                <p className="text-sm text-texto-tenue">{etiqueta}</p>
                <p className="mt-1 text-3xl font-semibold text-texto">{valor}</p>
                <p className="mt-1 text-xs text-texto-tenue">sobre datos simulados</p>
              </div>
            ))}
          </div>
          <div className="mb-4">
            <FiltrosBandeja cargas={cargas} />
          </div>
          <Bandeja solicitudes={solicitudes} cargas={cargas} />
        </main>
        <PanelChat perfil="operador" />
      </div>
    </ProveedorSesion>
  );
}
