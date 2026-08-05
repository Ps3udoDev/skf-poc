import { Tablero } from "@/components/impacto/tablero";
import { BarraSuperior } from "@/components/marco/barra-superior";
import { ProveedorSesion } from "@/components/sesion/proveedor-sesion";
import { todasLasPlantas } from "@/lib/fuentes";
import { indicadoresDeSesion } from "@/lib/metricas/indicadores";
import { leerSesion } from "@/lib/sesion-demo/leer";

export const dynamic = "force-dynamic";

export default async function PaginaImpacto() {
  const [sesion, plantas, indicadores] = await Promise.all([
    leerSesion(),
    todasLasPlantas(),
    indicadoresDeSesion(),
  ]);

  return (
    <ProveedorSesion sesionInicial={sesion} plantas={plantas}>
      <div className="min-h-screen bg-fondo-sutil">
        <BarraSuperior perfil="impacto" />
        <main className="mx-auto w-full max-w-7xl px-6 py-8">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primario">
              Tablero de impacto
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-texto">
              Qué produjo esta sesión
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-texto-tenue">
              Cifras calculadas sobre datos simulados. El propósito de la Fase 1 es sustituirlas por
              las reales; este tablero es donde vivirán.
            </p>
          </div>
          <Tablero indicadoresIniciales={indicadores} panelInicial={null} />
        </main>
      </div>
    </ProveedorSesion>
  );
}
