export interface FragmentoQMS {
  punto: string;
  titulo: string;
  texto: string;
}

export const FRAGMENTOS_QMS: readonly FragmentoQMS[] = [
  {
    punto: "4.1",
    titulo: "Planeado con stock suficiente",
    texto:
      "Si el producto es planeado (LCC=PLAN) y la cantidad solicitada es menor o igual al stock disponible, no requiere cotización: ya estaba visible en WCL. Se declina y se informa al cliente.",
  },
  {
    punto: "4.2",
    titulo: "Planeado sin stock suficiente",
    texto:
      "Si el producto planeado no tiene stock suficiente, se revisa el tiempo de entrega y se prepara la cotización con la información disponible.",
  },
  {
    punto: "4.3",
    titulo: "Consulta a planta o Planner",
    texto:
      "Cuando falta disponibilidad se ingresa una OPI/PINQ a fábrica; para Power Transmission se consulta directamente al Planner mediante PT Inquery.",
  },
  {
    punto: "4.4",
    titulo: "Cantidad menor al MOQ",
    texto:
      "Si la cantidad mínima de orden (MOQ) es mayor a la solicitada, la solicitud se declina y se informa la cantidad mínima aplicable.",
  },
  {
    punto: "4.5a",
    titulo: "Pack quantity",
    texto: "La cantidad se ajusta al múltiplo superior del pack quantity antes de cotizar.",
  },
  {
    punto: "4.5b",
    titulo: "Planta sin conexión ni ruta",
    texto:
      "Si la planta no tiene conexión y tampoco ruta de embarque disponible, la solicitud se declina.",
  },
  {
    punto: "4.6",
    titulo: "Obsoleto con reemplazo",
    texto:
      "Si una designación obsoleta tiene reemplazo, se cotiza el reemplazo y se validan sus diferencias técnicas con Ingeniería de Ventas. Si el reemplazo indicado por fábrica no existe en sistema, se escala para darlo de alta.",
  },
  {
    punto: "4.7",
    titulo: "Obsoleto sin reemplazo",
    texto:
      "Una designación obsoleta sin reemplazo disponible se declina conforme al procedimiento.",
  },
  {
    punto: "4.8",
    titulo: "Designación inválida",
    texto:
      "Si la designación no existe en el catálogo, el procedimiento obliga a declinar la solicitud; no se debe inventar ni dar de alta automáticamente un código.",
  },
  {
    punto: "4.9",
    titulo: "Nueva creación",
    texto:
      "Una designación de nueva creación suma cuatro semanas al tiempo de entrega por creación del material, extensión en MDG-SAP, precio en SAP y seteo en WCL.",
  },
  {
    punto: "5.2",
    titulo: "Sin precio de lista",
    texto:
      "Cuando no existe precio de lista, la cotización se procesa bajo los parámetros de SPQ+; nunca se presenta un precio inventado.",
  },
  {
    punto: "5.3",
    titulo: "Validación de precio",
    texto:
      "Los productos que requieren revisión de precio se envían al flujo correspondiente antes de confirmar una condición comercial.",
  },
];

const IRRELEVANTES = new Set([
  "que",
  "como",
  "cual",
  "para",
  "por",
  "los",
  "las",
  "una",
  "uno",
  "del",
  "con",
  "sin",
  "hago",
  "hace",
  "cuando",
  "si",
  "es",
  "el",
  "la",
  "de",
  "en",
]);

function terminos(texto: string): string[] {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9.]+/)
    .filter((termino) => termino.length > 2 && !IRRELEVANTES.has(termino));
}

export function buscarFragmento(consulta: string, limite = 3): FragmentoQMS[] {
  const buscados = terminos(consulta);
  if (buscados.length === 0) return [];
  return FRAGMENTOS_QMS.map((fragmento) => {
    const propios = new Set([
      ...terminos(`${fragmento.titulo} ${fragmento.texto}`),
      fragmento.punto,
    ]);
    const coincidencias = buscados.filter((termino) => propios.has(termino)).length;
    return { fragmento, puntaje: coincidencias + (buscados.includes(fragmento.punto) ? 5 : 0) };
  })
    .filter(({ puntaje }) => puntaje > 0)
    .sort((a, b) => b.puntaje - a.puntaje)
    .slice(0, limite)
    .map(({ fragmento }) => fragmento);
}
