import { BarraSuperior } from "@/components/marco/barra-superior";

export default function PaginaPortal() {
  return (
    <div className="flex min-h-full flex-col">
      <BarraSuperior perfil="cliente" />
      <main className="flex-1 px-6 py-10">
        <p className="text-sm text-texto-tenue">Buscador en construcción (tarea 11).</p>
      </main>
    </div>
  );
}
