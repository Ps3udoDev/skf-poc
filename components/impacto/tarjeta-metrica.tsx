export function TarjetaMetrica({
  etiqueta,
  valor,
  leyenda = "sobre datos simulados",
  nota,
  destacada = false,
}: {
  etiqueta: string;
  valor: string;
  leyenda?: string;
  nota?: string;
  destacada?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-5 ${
        destacada ? "border-primario bg-primario-suave" : "border-borde bg-fondo"
      }`}
    >
      <p className="text-sm font-medium text-texto-tenue">{etiqueta}</p>
      <p className="mt-2 text-4xl font-semibold tracking-tight text-texto">{valor}</p>
      {nota && <p className="mt-2 text-xs leading-5 text-texto-tenue">{nota}</p>}
      <p className="mt-2 text-[11px] uppercase tracking-wide text-texto-tenue">{leyenda}</p>
    </div>
  );
}
