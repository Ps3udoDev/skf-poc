import { NextResponse } from "next/server";
import { estimarTE } from "@/lib/estimador/estimador";
import { obtenerDesignacion } from "@/lib/fuentes";
import { latenciaArtificial } from "@/lib/mock/latencia";
import { avisoPrecio } from "@/lib/reglas-qms";
import { clienteLectura } from "@/lib/supabase/lectura";

export const dynamic = "force-dynamic";

/**
 * Precio y tiempo de entrega. Simula la consulta a WCL.
 *
 * Si la designación no tiene Precio de Lista publicado NO se inventa un precio:
 * se devuelve el aviso del punto 5.2 (FPC 1 sin precio: se cotiza bajo los
 * parámetros de SPQ+) o del 5.3 (FPC 2: el precio requiere el LPC de fábrica).
 *
 * Desviación deliberada a la regla "toda consulta vía lib/fuentes": el
 * descuento del cliente se lee directamente de `clientes` porque la capa de
 * fuentes (Tarea 3) no expone ninguna función para esa tabla y crearla
 * modificaría archivos ajenos a esta tarea. Es la única lectura directa.
 */
export async function GET(peticion: Request) {
  const parametros = new URL(peticion.url).searchParams;
  const designacion = parametros.get("designacion");
  if (!designacion) {
    return NextResponse.json({ error: "Falta el parámetro designacion" }, { status: 400 });
  }
  const cantidad = Number(parametros.get("cantidad") ?? "1");
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

  // Precio neto: solo si el cliente se identifica y hay precio de lista.
  let precioNeto: number | null = null;
  const clienteId = parametros.get("clienteId");
  if (clienteId !== null && producto.precioLista !== null) {
    const { data: cliente, error } = await clienteLectura()
      .from("clientes")
      .select("descuento")
      .eq("id", Number(clienteId))
      .maybeSingle();
    if (error) throw new Error(`No se pudo obtener el cliente ${clienteId}: ${error.message}`);
    if (cliente) {
      precioNeto = Math.round(producto.precioLista * (1 - Number(cliente.descuento)) * 100) / 100;
    }
  }

  return NextResponse.json({
    designacion: producto.designacion,
    cantidad,
    precioLista: producto.precioLista,
    precioNeto,
    // Sin precio publicado: el aviso del procedimiento, nunca un precio inventado.
    avisoPrecio: producto.precioLista === null ? avisoPrecio(producto) : null,
    estimacion: await estimarTE(producto.designacion, cantidad),
  });
}
