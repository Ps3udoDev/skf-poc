/**
 * Regla de honestidad 1 del diseño: distintivo permanente en toda la
 * aplicación. No es decoración — es lo que impide que el cliente confunda el
 * POC con producto terminado.
 */
export function DistintivoDemo() {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-borde bg-fondo-sutil px-3 py-1 text-xs font-medium text-texto-tenue">
      <span className="size-1.5 rounded-full bg-desconexion" aria-hidden />
      Entorno de demostración · datos simulados
    </span>
  );
}
