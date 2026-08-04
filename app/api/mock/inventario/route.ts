import { NextResponse } from "next/server";
import { ahoraSimulada, estadoDePlanta } from "@/lib/estado-fabricas";
import { existenciasDe, obtenerDesignacion, plantaCompleta } from "@/lib/fuentes";
import { latenciaArtificial } from "@/lib/mock/latencia";
import { leerSesion } from "@/lib/sesion-demo/leer";

export const dynamic = "force-dynamic";

/**
 * Disponibilidad por almacén. Simula la consulta al sistema de la planta.
 *
 * Durante la ventana de mantenimiento responde 503: ese fallo es el mecanismo
 * que hace funcionar la escena 4 del guion. No es un error del POC — es el
 * comportamiento que el cliente sufre 2 horas al día en su horario pico.
 */
export async function GET(peticion: Request) {
  const designacion = new URL(peticion.url).searchParams.get("designacion");
  if (!designacion) {
    return NextResponse.json({ error: "Falta el parámetro designacion" }, { status: 400 });
  }

  await latenciaArtificial();

  const producto = await obtenerDesignacion(designacion);
  if (!producto) {
    return NextResponse.json({ error: "Designación no encontrada" }, { status: 404 });
  }

  const [planta, sesion] = await Promise.all([plantaCompleta(producto.pdiv), leerSesion()]);
  if (!planta) {
    return NextResponse.json({ error: "Planta no encontrada" }, { status: 404 });
  }

  const estado = estadoDePlanta(
    planta,
    ahoraSimulada(sesion.relojOffsetMin),
    sesion.plantasOverride[planta.pdiv],
  );

  if (estado === "ventana") {
    return NextResponse.json(
      {
        error: "Sistema de la planta no disponible",
        pdiv: planta.pdiv,
        estado,
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    designacion: producto.designacion,
    pdiv: planta.pdiv,
    estado,
    existencias: await existenciasDe(producto.designacion),
  });
}
