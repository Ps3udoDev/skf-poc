import { NextResponse } from "next/server";
import { obtenerDesignacion, plantaCompleta } from "@/lib/fuentes";
import { latenciaArtificial } from "@/lib/mock/latencia";

export const dynamic = "force-dynamic";

/** Número de PINQ simulado: solo necesita verse verosímil en pantalla. */
function numeroDePinq(): string {
  const anio = new Date().getFullYear();
  const secuencia = String(Math.floor(Math.random() * 100_000)).padStart(5, "0");
  return `PINQ-${anio}-${secuencia}`;
}

/**
 * Consulta de soporte a planta. Simula el ingreso de una PINQ.
 *
 * Punto 4.3 del procedimiento: el destino depende del segmento del producto.
 * Power Transmission se consulta por PT Inquery directo con el Planner de la
 * PDIV; el resto de los segmentos se ingresa por OPI/PINQ a la fábrica.
 */
export async function GET(peticion: Request) {
  const parametros = new URL(peticion.url).searchParams;
  const designacion = parametros.get("designacion");
  if (!designacion) {
    return NextResponse.json({ error: "Falta el parámetro designacion" }, { status: 400 });
  }
  const cantidad = Number(parametros.get("cantidad") ?? "");
  if (!Number.isInteger(cantidad) || cantidad <= 0) {
    return NextResponse.json(
      { error: "El parámetro cantidad debe ser un entero positivo" },
      { status: 400 },
    );
  }

  await latenciaArtificial();

  const producto = await obtenerDesignacion(designacion);
  if (!producto) {
    return NextResponse.json({ error: "Designación no encontrada" }, { status: 404 });
  }

  const planta = await plantaCompleta(producto.pdiv);
  const esPowerTransmission = producto.segmento === "power_transmission";

  return NextResponse.json({
    numeroPinq: numeroDePinq(),
    designacion: producto.designacion,
    cantidad,
    pdiv: producto.pdiv,
    planta: planta?.nombre ?? null,
    canal: esPowerTransmission ? "PT Inquery" : "OPI/PINQ",
    destino: esPowerTransmission
      ? `Planner de la PDIV ${producto.pdiv}`
      : `Fábrica ${producto.pdiv}`,
    registradaEn: new Date().toISOString(),
  });
}
