function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function respuestaPregrabada(pregunta: string): string | null {
  const texto = normalizar(pregunta);
  if (
    texto.includes("demo-6205-2rsh/c3") &&
    (texto.includes("tarda") || texto.includes("tiempo"))
  ) {
    return "DEMO-6205-2RSH/C3 tiene 1.200 piezas en PS y 300 en SL, con precio de lista simulado de USD 250,00. Para 200 piezas, el TE estimado es de 8 a 17,5 semanas, basado en 39 casos de la misma familia (confianza media). Es una estimación, no un tiempo confirmado; se confirma en firme al procesar la cotización.";
  }
  if (
    texto.includes("equivalente") &&
    (texto.includes("sellado") || texto.includes("ambos lados"))
  ) {
    return "Puedo buscar un equivalente dentro del catálogo y mostrar sus diferencias técnicas. Usa DEMO-6205-2RSH/C3 como origen; cualquier cambio de sellado debe validarse con Ingeniería de Ventas antes de confirmarlo (punto 4.6).";
  }
  if (texto.includes("cotizacion") && (texto.includes("estado") || texto.includes("numero"))) {
    return "El estado de una cotización se consulta por su número. En respaldo sin conexión no puedo leer un estado vigente; un CSR puede confirmarlo sin inventar fechas ni condiciones.";
  }
  if (
    (texto.includes("solicitudes") || texto.includes("productos")) &&
    (texto.includes("planead") || texto.includes("declinar")) &&
    (texto.includes("stock") || texto.includes("disponib") || texto.includes("hoy"))
  ) {
    return "Según el punto 4.1, las solicitudes de productos planeados (LCC=PLAN) con stock suficiente ya visible en WCL pueden declinarse e informándoselo al cliente. Con conexión, esa lista sale de la bandeja de la sesión con su clasificación QMS ya resuelta; el respaldo sin conexión no inventa solicitudes.";
  }
  return null;
}
