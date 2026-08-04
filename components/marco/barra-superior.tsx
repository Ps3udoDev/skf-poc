import Link from "next/link";
import { IndicadorModo } from "@/components/sesion/indicador-modo";
import { IndicadorPlantas } from "@/components/sesion/indicador-plantas";
import { DistintivoDemo } from "./distintivo-demo";

export function BarraSuperior({ perfil }: { perfil: "cliente" | "operador" }) {
  return (
    <header className="flex items-center justify-between gap-6 border-b border-borde bg-fondo px-6 py-3">
      <div className="flex items-center gap-6">
        <span className="text-sm font-semibold tracking-tight text-primario">
          Portal de Consultas y Cotizaciones
        </span>
        <nav className="flex items-center gap-1 rounded-md bg-fondo-sutil p-1">
          <Link
            href="/portal"
            className={`rounded px-3 py-1 text-sm ${perfil === "cliente" ? "bg-fondo font-medium text-texto shadow-sm" : "text-texto-tenue"}`}
          >
            Vista Cliente
          </Link>
          <Link
            href="/operador"
            className={`rounded px-3 py-1 text-sm ${perfil === "operador" ? "bg-fondo font-medium text-texto shadow-sm" : "text-texto-tenue"}`}
          >
            Servicio al Cliente
          </Link>
        </nav>
      </div>
      <div className="flex items-center gap-4">
        {/* Los indicadores son Client Components que consumen useSesion():
            esta barra solo puede montarse dentro de <ProveedorSesion>. */}
        <IndicadorPlantas />
        <IndicadorModo />
        <DistintivoDemo />
      </div>
    </header>
  );
}
