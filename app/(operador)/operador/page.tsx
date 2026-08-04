import { PanelChat } from "@/components/chat/panel-chat";
import { BarraSuperior } from "@/components/marco/barra-superior";
import { ListaSolicitudes } from "@/components/operador/lista-solicitudes";
import { ProveedorSesion } from "@/components/sesion/proveedor-sesion";
import { solicitudesDesde, todasLasPlantas } from "@/lib/fuentes";
import { indicadoresDeSesion } from "@/lib/metricas/indicadores";
import { leerSesion } from "@/lib/sesion-demo/leer";

export const dynamic = "force-dynamic";

export default async function PaginaOperador() {
  const sesion = await leerSesion();
  const [plantas, indicadores, solicitudes] = await Promise.all([
    todasLasPlantas(),
    indicadoresDeSesion(),
    solicitudesDesde(sesion.iniciadaEn),
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
          <ListaSolicitudes solicitudes={solicitudes} />
        </main>
        <PanelChat perfil="operador" />
      </div>
    </ProveedorSesion>
  );
}
