import { EstimacionTE } from "@/components/estimador/estimacion-te";
import type { Estimacion } from "@/lib/estimador/calculo";

type Registro = Record<string, unknown>;

function registro(valor: unknown): Registro | null {
  return typeof valor === "object" && valor !== null ? (valor as Registro) : null;
}

function esEstimacion(valor: unknown): valor is Estimacion {
  const dato = registro(valor);
  return Boolean(
    dato &&
      typeof dato.semanasMin === "number" &&
      typeof dato.semanasMax === "number" &&
      typeof dato.casos === "number" &&
      ["designacion", "familia", "global"].includes(String(dato.base)) &&
      ["alta", "media", "baja"].includes(String(dato.confianza)),
  );
}

export function TarjetaProducto({ salida }: { salida: unknown }) {
  const resultado = registro(salida);
  const candidatos = Array.isArray(resultado?.candidatos) ? resultado.candidatos : [];
  if (candidatos.length === 0) return null;
  return (
    <div className="mt-2 space-y-2">
      {candidatos.slice(0, 3).map((valor, indice) => {
        const candidato = registro(valor);
        const producto = registro(candidato?.designacion);
        const codigo =
          typeof producto?.designacion === "string" ? producto.designacion : `candidato-${indice}`;
        const existencias = Array.isArray(candidato?.existencias) ? candidato.existencias : [];
        return (
          <div key={codigo} className="rounded-lg border border-borde bg-fondo p-3 text-sm">
            <p className="designacion font-semibold text-primario">{codigo}</p>
            {typeof producto?.descripcion === "string" && (
              <p className="mt-1 text-texto-tenue">{producto.descripcion}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-texto-tenue">
              {existencias.map((existencia) => {
                const dato = registro(existencia);
                return (
                  <span
                    key={String(dato?.almacen)}
                    className="rounded border border-borde px-2 py-1"
                  >
                    {String(dato?.almacen ?? "—")}: {String(dato?.cantidad ?? 0)}
                  </span>
                );
              })}
              <span className="rounded border border-borde px-2 py-1">
                Precio:{" "}
                {typeof producto?.precioLista === "number"
                  ? `USD ${producto.precioLista.toFixed(2)}`
                  : "requiere cotización"}
              </span>
            </div>
            {esEstimacion(candidato?.estimacion) && (
              <div className="mt-3">
                <EstimacionTE estimacion={candidato.estimacion} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
