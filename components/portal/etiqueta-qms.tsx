import type { Designacion } from "@/lib/reglas-qms";

export function EtiquetaQMS({ designacion }: { designacion: Designacion }) {
  const texto =
    designacion.pcc === "O"
      ? "Obsoleto (PCC=O)"
      : designacion.lcc === "PLAN"
        ? "Planeado (LCC=PLAN)"
        : "No Planeado (LCC=NP)";
  return (
    <span className="inline-flex rounded-full border border-borde bg-fondo-sutil px-2.5 py-1 text-xs font-medium text-texto-tenue">
      {texto}
    </span>
  );
}
