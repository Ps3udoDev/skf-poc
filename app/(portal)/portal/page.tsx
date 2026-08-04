import { BarraSuperior } from "@/components/marco/barra-superior";
import { ProveedorSesion } from "@/components/sesion/proveedor-sesion";
import { todasLasPlantas } from "@/lib/fuentes";
import { leerSesion } from "@/lib/sesion-demo/leer";

export const dynamic = "force-dynamic";

export default async function PaginaPortal() {
  const [sesion, plantas] = await Promise.all([leerSesion(), todasLasPlantas()]);
  return (
    <ProveedorSesion sesionInicial={sesion} plantas={plantas}>
      <div className="flex min-h-full flex-col">
        <BarraSuperior perfil="cliente" />
        <main className="flex-1 px-6 py-10">
          <p className="text-sm text-texto-tenue">Buscador en construcción (tarea 11).</p>
        </main>
      </div>
    </ProveedorSesion>
  );
}
