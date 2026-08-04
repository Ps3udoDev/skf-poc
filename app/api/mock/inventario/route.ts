import { NextResponse } from "next/server";
import { consultarInventarioExterno } from "@/lib/mock/inventario";

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

  const resultado = await consultarInventarioExterno(designacion);
  if (resultado.tipo === "designacion_no_encontrada") {
    return NextResponse.json({ error: "Designación no encontrada" }, { status: 404 });
  }
  if (resultado.tipo === "planta_no_encontrada") {
    return NextResponse.json({ error: "Planta no encontrada" }, { status: 404 });
  }
  if (resultado.tipo === "planta_en_ventana") {
    return NextResponse.json(
      {
        error: "Sistema de la planta no disponible",
        pdiv: resultado.pdiv,
        estado: "ventana",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    designacion: resultado.designacion,
    pdiv: resultado.pdiv,
    estado: resultado.estado,
    existencias: resultado.existencias,
  });
}
