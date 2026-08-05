"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import type { CargaCsr } from "@/lib/fuentes";
import { RUTAS_QMS } from "@/lib/reglas-qms";

const ETIQUETAS_RUTA: Record<string, string> = {
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

const CLASE_SELECT =
  "mt-1 h-10 w-full rounded-lg border border-borde bg-fondo px-3 text-sm text-texto " +
  "outline-none focus:border-primario focus:ring-2 focus:ring-primario-suave";

export function FiltrosBandeja({ cargas }: { cargas: readonly CargaCsr[] }) {
  const router = useRouter();
  const ruta = usePathname();
  const parametros = useSearchParams();
  const [enVuelo, iniciar] = useTransition();

  function fijar(clave: string, valor: string) {
    const siguientes = new URLSearchParams(parametros.toString());
    if (valor === "") siguientes.delete(clave);
    else siguientes.set(clave, valor);
    // La solicitud abierta en el panel puede quedar fuera del nuevo filtro.
    siguientes.delete("solicitud");
    iniciar(() => router.replace(`${ruta}?${siguientes.toString()}`));
  }

  const hayFiltros = ["estado", "clasificacion", "csr"].some((clave) => parametros.get(clave));

  return (
    <section
      aria-label="Filtros de la bandeja"
      className="grid gap-3 rounded-xl border border-borde bg-fondo p-4 md:grid-cols-[1fr_1.4fr_1fr_auto] md:items-end"
    >
      <label className="block">
        <span className="text-sm font-medium text-texto">Estado</span>
        <select
          value={parametros.get("estado") ?? ""}
          onChange={(evento) => fijar("estado", evento.target.value)}
          className={CLASE_SELECT}
        >
          <option value="">Todas</option>
          <option value="abierta">Abiertas</option>
          <option value="atendida">Atendidas</option>
        </select>
      </label>

      <label className="block">
        <span className="text-sm font-medium text-texto">Clasificación QMS</span>
        <select
          value={parametros.get("clasificacion") ?? ""}
          onChange={(evento) => fijar("clasificacion", evento.target.value)}
          className={CLASE_SELECT}
        >
          <option value="">Todas</option>
          {RUTAS_QMS.map((valor) => (
            <option key={valor} value={valor}>
              {ETIQUETAS_RUTA[valor]}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-sm font-medium text-texto">CSR</span>
        <select
          value={parametros.get("csr") ?? ""}
          onChange={(evento) => fijar("csr", evento.target.value)}
          className={CLASE_SELECT}
        >
          <option value="">Todos</option>
          <option value="sin-asignar">Sin asignar</option>
          {cargas
            .filter((carga) => carga.activo)
            .map((carga) => (
              <option key={carga.codigo} value={carga.codigo}>
                {carga.codigo} · {carga.abiertas} abiertas
              </option>
            ))}
        </select>
      </label>

      <button
        type="button"
        disabled={enVuelo || !hayFiltros}
        onClick={() => iniciar(() => router.replace(ruta))}
        className="h-10 rounded-lg border border-borde bg-fondo px-4 text-sm font-medium text-texto hover:bg-fondo-sutil disabled:opacity-40"
      >
        Limpiar
      </button>
    </section>
  );
}
