import { ControlPlantas } from "@/components/demo/control-plantas";
import { ControlReloj } from "@/components/demo/control-reloj";
import { EstadoSesion } from "@/components/demo/estado-sesion";
import { InterruptorModo } from "@/components/demo/interruptor-modo";
import { SelectorEscenarios } from "@/components/demo/selector-escenarios";
import { ProveedorSesion } from "@/components/sesion/proveedor-sesion";
import { todasLasPlantas } from "@/lib/fuentes";
import { indicadoresDeSesion } from "@/lib/metricas/indicadores";
import { leerSesion } from "@/lib/sesion-demo/leer";

export const dynamic = "force-dynamic";

export default async function PaginaDemo() {
  const [sesion, plantas, indicadores] = await Promise.all([
    leerSesion(),
    todasLasPlantas(),
    indicadoresDeSesion(),
  ]);
  return (
    <ProveedorSesion sesionInicial={sesion} plantas={plantas}>
      <main className="mx-auto w-full max-w-[1480px] space-y-6 px-6 py-6">
        <EstadoSesion indicadores={indicadores} />
        <div className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-xl border border-borde bg-fondo p-5">
            <InterruptorModo />
          </section>
          <section className="rounded-xl border border-borde bg-fondo p-5">
            <ControlReloj />
          </section>
        </div>
        <section className="rounded-xl border border-borde bg-fondo p-5">
          <ControlPlantas />
        </section>
        <section className="rounded-xl border border-borde bg-fondo p-5">
          <SelectorEscenarios />
        </section>
      </main>
    </ProveedorSesion>
  );
}
