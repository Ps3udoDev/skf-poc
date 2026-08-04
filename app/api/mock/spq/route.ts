import { NextResponse } from "next/server";
import { construirContexto } from "@/lib/fuentes";
import { latenciaArtificial } from "@/lib/mock/latencia";
import { evaluarSolicitud } from "@/lib/reglas-qms";
import { clienteAdmin } from "@/lib/supabase/admin";
import { clienteLectura } from "@/lib/supabase/lectura";

export const dynamic = "force-dynamic";

/** Número de solicitud con el formato que exige el CHECK de la base: AAAAQ#####. */
function numeroDeSolicitud(): string {
  const anio = new Date().getFullYear();
  const secuencia = String(Math.floor(Math.random() * 100_000)).padStart(5, "0");
  return `${anio}Q${secuencia}`;
}

/**
 * Alta de solicitudes de cotización. Simula el ingreso de una SPQ+.
 *
 * Se preclasifica con el motor de reglas en el momento del alta
 * (`clasificacion_qms` y `punto_qms`): esa clasificación es la que la bandeja
 * del operador muestra sin que nadie la calcule a mano.
 *
 * La escritura va con `service_role` (las escrituras nunca vienen del
 * navegador). `solicitudes` se consulta directamente y no vía `lib/fuentes`
 * porque la capa de fuentes es de solo lectura sobre el catálogo: no expone
 * las solicitudes del demo, que nacen en esta misma ruta.
 */
export async function POST(peticion: Request) {
  const cuerpo: unknown = await peticion.json().catch(() => null);
  if (typeof cuerpo !== "object" || cuerpo === null) {
    return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 });
  }
  const { designacion, cantidad } = cuerpo as { designacion?: unknown; cantidad?: unknown };
  if (typeof designacion !== "string" || designacion.trim() === "") {
    return NextResponse.json({ error: "Falta el campo designacion" }, { status: 400 });
  }
  if (typeof cantidad !== "number" || !Number.isInteger(cantidad) || cantidad <= 0) {
    return NextResponse.json(
      { error: "El campo cantidad debe ser un entero positivo" },
      { status: 400 },
    );
  }

  await latenciaArtificial();

  const contexto = await construirContexto(designacion.trim(), cantidad);
  const evaluacion = evaluarSolicitud(contexto);
  const numero = numeroDeSolicitud();

  const { error } = await clienteAdmin().from("solicitudes").insert({
    numero,
    designacion_texto: designacion,
    cantidad,
    clasificacion_qms: evaluacion.ruta,
    punto_qms: evaluacion.punto,
  });
  if (error) {
    return NextResponse.json(
      { error: `No se pudo dar de alta la solicitud: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      numero,
      designacion,
      cantidad,
      clasificacionQms: evaluacion.ruta,
      puntoQms: evaluacion.punto,
      declinada: evaluacion.declinada,
      mensaje: evaluacion.mensaje,
    },
    { status: 201 },
  );
}

/** Consulta del estado de una solicitud por su número (AAAAQ#####). */
export async function GET(peticion: Request) {
  const numero = new URL(peticion.url).searchParams.get("numero");
  if (!numero) {
    return NextResponse.json({ error: "Falta el parámetro numero" }, { status: 400 });
  }

  await latenciaArtificial();

  const { data, error } = await clienteLectura()
    .from("solicitudes")
    .select(
      "numero, designacion_texto, cantidad, creada_en, clasificacion_qms, punto_qms, atendida_en, resultado, motivo_declinado",
    )
    .eq("numero", numero)
    .maybeSingle();
  if (error) throw new Error(`No se pudo consultar la solicitud ${numero}: ${error.message}`);
  if (!data) {
    return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
  }

  return NextResponse.json({
    numero: data.numero,
    designacion: data.designacion_texto,
    cantidad: data.cantidad,
    clasificacionQms: data.clasificacion_qms,
    puntoQms: data.punto_qms,
    estado: data.atendida_en === null ? "en_bandeja" : "atendida",
    resultado: data.resultado,
    motivoDeclinado: data.motivo_declinado,
    creadaEn: data.creada_en,
  });
}
