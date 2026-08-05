import type { SolicitudResumen } from "@/lib/fuentes";

const ETIQUETAS: Record<string, string> = {
  declinar_designacion_invalida: "Declinar · designación inválida",
  declinar_planta_sin_ruta: "Declinar · planta sin ruta",
  declinar_obsoleto_sin_reemplazo: "Declinar · obsoleto sin reemplazo",
  declinar_moq: "Declinar · MOQ",
  declinar_ya_disponible: "Declinar · ya disponible",
  cotizar_con_reemplazo: "Cotizar con reemplazo",
  revisar_lt: "Revisar tiempo de entrega",
  revisar_disponibilidad_np: "Revisar disponibilidad NP",
  ingresar_pinq: "Ingresar PINQ",
  consultar_planner: "Consultar Planner",
};

function antiguedad(creadaEn: string) {
  const minutos = Math.max(0, Math.floor((Date.now() - new Date(creadaEn).getTime()) / 60_000));
  if (minutos < 1) return "Ahora";
  if (minutos < 60) return `Hace ${minutos} min`;
  return `Hace ${Math.floor(minutos / 60)} h`;
}

export function ListaSolicitudes({ solicitudes }: { solicitudes: SolicitudResumen[] }) {
  if (solicitudes.length === 0) {
    return (
      <div className="rounded-xl border border-borde bg-fondo px-6 py-12 text-center">
        <h2 className="text-base font-semibold text-texto">No hay solicitudes en esta sesión</h2>
        <p className="mt-2 text-sm text-texto-tenue">
          Las consultas resueltas en el portal no llegan a la bandeja del operador.
        </p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-borde bg-fondo">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-borde bg-fondo-sutil text-xs uppercase tracking-wide text-texto-tenue">
          <tr>
            <th className="px-4 py-3">Solicitud</th>
            <th className="px-4 py-3">Designación capturada</th>
            <th className="px-4 py-3">Cantidad</th>
            <th className="px-4 py-3">Antigüedad</th>
            <th className="px-4 py-3">CSR</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Clasificación QMS</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-borde">
          {solicitudes.map((solicitud) => (
            <tr key={solicitud.numero} className="align-top">
              <td className="px-4 py-4 designacion font-medium text-texto">{solicitud.numero}</td>
              <td className="px-4 py-4 designacion text-texto">{solicitud.designacionTexto}</td>
              <td className="px-4 py-4 text-texto">{solicitud.cantidad}</td>
              <td className="px-4 py-4 text-texto-tenue">{antiguedad(solicitud.creadaEn)}</td>
              <td className="px-4 py-4">
                {solicitud.csrAsignado ? (
                  <span className="designacion text-texto">{solicitud.csrAsignado}</span>
                ) : (
                  <span className="text-texto-tenue">Sin asignar</span>
                )}
              </td>
              <td className="px-4 py-4">
                {solicitud.atendidaEn === null ? (
                  <span className="text-texto">Abierta</span>
                ) : (
                  <span
                    className={
                      solicitud.resultado === "cotizada"
                        ? "inline-flex rounded-full border border-confirmacion bg-confirmacion-suave px-2.5 py-1 text-xs font-medium text-confirmacion"
                        : "inline-flex rounded-full border border-borde bg-fondo-sutil px-2.5 py-1 text-xs font-medium text-texto"
                    }
                  >
                    {solicitud.resultado === "cotizada" ? "Cotizada" : "Declinada"}
                  </span>
                )}
              </td>
              <td className="px-4 py-4">
                <span className="inline-flex rounded-full border border-borde bg-fondo-sutil px-2.5 py-1 text-xs font-medium text-texto">
                  {ETIQUETAS[solicitud.clasificacionQms ?? ""] ??
                    solicitud.clasificacionQms ??
                    "Sin clasificar"}
                </span>
                {solicitud.puntoQms && (
                  <p className="mt-1 text-xs text-texto-tenue">Punto {solicitud.puntoQms}</p>
                )}
                {solicitud.clasificacionQms === "declinar_designacion_invalida" && (
                  <p className="mt-2 max-w-sm text-xs text-error">
                    El punto 4.8 del procedimiento obliga a declinar una designación que no existe
                    en el catálogo.
                  </p>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
