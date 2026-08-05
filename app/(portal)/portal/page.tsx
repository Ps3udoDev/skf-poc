import { PanelChat } from "@/components/chat/panel-chat";
import { BarraSuperior } from "@/components/marco/barra-superior";
import { BannerVentana } from "@/components/portal/banner-ventana";
import { Buscador } from "@/components/portal/buscador";
import { ColaIntenciones } from "@/components/portal/cola-intenciones";
import { ProveedorSesion } from "@/components/sesion/proveedor-sesion";
import { todasLasPlantas } from "@/lib/fuentes";
import { leerSesion } from "@/lib/sesion-demo/leer";

export const dynamic = "force-dynamic";

export default async function PaginaPortal() {
  const [sesion, plantas] = await Promise.all([leerSesion(), todasLasPlantas()]);
  return (
    <ProveedorSesion sesionInicial={sesion} plantas={plantas}>
      <div className="flex min-h-screen flex-col bg-fondo-sutil">
        <BarraSuperior perfil="cliente" />
        <BannerVentana />
        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primario">
              Consulta de catálogo
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-texto">
              Encuentra una designación y valida sus condiciones
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-texto-tenue">
              Consulta disponibilidad, cantidad mínima de orden, pack quantity, precio y tiempo de
              entrega antes de solicitar una cotización.
            </p>
          </div>
          <Buscador />
          <ColaIntenciones />
        </main>
        <PanelChat perfil="cliente" />
      </div>
    </ProveedorSesion>
  );
}
