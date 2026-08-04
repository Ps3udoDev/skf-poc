import type { ReactNode } from "react";
import { DistintivoDemo } from "@/components/marco/distintivo-demo";

export default function LayoutDemo({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-fondo-sutil">
      <header className="flex items-center justify-between border-b border-borde bg-fondo px-6 py-3">
        <div>
          <p className="text-sm font-semibold text-primario">Control de la demostración</p>
          <p className="text-xs text-texto-tenue">Pantalla del presentador</p>
        </div>
        <DistintivoDemo />
      </header>
      {children}
    </div>
  );
}
