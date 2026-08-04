/**
 * Catálogo de plantas (PDIV).
 *
 * ORIGEN DE LOS DATOS — leer antes de presentar: la minuta del 22/07/2026 con
 * los horarios reales de las ventanas de mantenimiento no está disponible.
 * Esta configuración es INVENTADA y solo respeta lo que la Propuesta Integral
 * afirma: ventanas concentradas en las actualizaciones nocturnas de Europa, de
 * 2 a 2.5 h, coincidentes con el horario pico de México, y una planta belga
 * cuyo horario varía. Los códigos PDIV son sintéticos y no corresponden a
 * ninguna planta real de SKF.
 *
 * ventana_inicio_min: minutos desde medianoche, hora de México. 12:30 = 750.
 */
export interface PlantaSemilla {
  pdiv: string;
  nombre: string;
  pais: string;
  com: string;
  huso: string;
  tiene_conexion: boolean;
  tiene_ruta_embarque: boolean;
  ventana_inicio_min: number;
  ventana_duracion_min: number;
  ventana_variabilidad_min: number;
  desempeno_te: number;
}

export const PLANTAS: readonly PlantaSemilla[] = [
  // ── Europa: el grueso, con ventana en el pico de México ──────────────────
  {
    pdiv: "P101",
    nombre: "Planta Norte 1",
    pais: "Alemania",
    com: "DE",
    huso: "Europe/Berlin",
    tiene_conexion: true,
    tiene_ruta_embarque: true,
    ventana_inicio_min: 750,
    ventana_duracion_min: 130,
    ventana_variabilidad_min: 0,
    desempeno_te: 1.0,
  },
  {
    pdiv: "P102",
    nombre: "Planta Norte 2",
    pais: "Alemania",
    com: "DE",
    huso: "Europe/Berlin",
    tiene_conexion: true,
    tiene_ruta_embarque: true,
    ventana_inicio_min: 765,
    ventana_duracion_min: 120,
    ventana_variabilidad_min: 0,
    desempeno_te: 0.95,
  },
  {
    pdiv: "P103",
    nombre: "Planta Central",
    pais: "Bélgica",
    com: "BE",
    huso: "Europe/Brussels",
    tiene_conexion: true,
    tiene_ruta_embarque: true,
    ventana_inicio_min: 735,
    ventana_duracion_min: 150,
    ventana_variabilidad_min: 120,
    desempeno_te: 1.15,
  },
  {
    pdiv: "P104",
    nombre: "Planta Sur 1",
    pais: "Italia",
    com: "IT",
    huso: "Europe/Rome",
    tiene_conexion: true,
    tiene_ruta_embarque: true,
    ventana_inicio_min: 780,
    ventana_duracion_min: 125,
    ventana_variabilidad_min: 0,
    desempeno_te: 1.05,
  },
  {
    pdiv: "P105",
    nombre: "Planta Sur 2",
    pais: "España",
    com: "ES",
    huso: "Europe/Madrid",
    tiene_conexion: true,
    tiene_ruta_embarque: true,
    ventana_inicio_min: 795,
    ventana_duracion_min: 120,
    ventana_variabilidad_min: 0,
    desempeno_te: 1.1,
  },
  {
    pdiv: "P106",
    nombre: "Planta Este 1",
    pais: "Polonia",
    com: "PL",
    huso: "Europe/Warsaw",
    tiene_conexion: true,
    tiene_ruta_embarque: true,
    ventana_inicio_min: 740,
    ventana_duracion_min: 140,
    ventana_variabilidad_min: 0,
    desempeno_te: 1.2,
  },
  {
    pdiv: "P107",
    nombre: "Planta Este 2",
    pais: "Chequia",
    com: "CZ",
    huso: "Europe/Prague",
    tiene_conexion: true,
    tiene_ruta_embarque: true,
    ventana_inicio_min: 755,
    ventana_duracion_min: 135,
    ventana_variabilidad_min: 0,
    desempeno_te: 1.08,
  },
  {
    pdiv: "P108",
    nombre: "Planta Nórdica",
    pais: "Suecia",
    com: "SE",
    huso: "Europe/Stockholm",
    tiene_conexion: true,
    tiene_ruta_embarque: true,
    ventana_inicio_min: 725,
    ventana_duracion_min: 120,
    ventana_variabilidad_min: 0,
    desempeno_te: 0.9,
  },
  {
    pdiv: "P109",
    nombre: "Planta Oeste",
    pais: "Francia",
    com: "FR",
    huso: "Europe/Paris",
    tiene_conexion: true,
    tiene_ruta_embarque: true,
    ventana_inicio_min: 810,
    ventana_duracion_min: 130,
    ventana_variabilidad_min: 0,
    desempeno_te: 1.12,
  },
  // Sin ruta de embarque: ejercita el punto 4.5b aunque la conexión exista.
  {
    pdiv: "P110",
    nombre: "Planta Alpina",
    pais: "Austria",
    com: "AT",
    huso: "Europe/Vienna",
    tiene_conexion: true,
    tiene_ruta_embarque: false,
    ventana_inicio_min: 770,
    ventana_duracion_min: 120,
    ventana_variabilidad_min: 0,
    desempeno_te: 1.3,
  },

  // ── Asia ─────────────────────────────────────────────────────────────────
  {
    pdiv: "P201",
    nombre: "Planta Oriental 1",
    pais: "China",
    com: "CN",
    huso: "Asia/Shanghai",
    tiene_conexion: true,
    tiene_ruta_embarque: true,
    ventana_inicio_min: 300,
    ventana_duracion_min: 140,
    ventana_variabilidad_min: 0,
    desempeno_te: 1.45,
  },
  {
    pdiv: "P202",
    nombre: "Planta Oriental 2",
    pais: "China",
    com: "CN",
    huso: "Asia/Shanghai",
    tiene_conexion: true,
    tiene_ruta_embarque: true,
    ventana_inicio_min: 315,
    ventana_duracion_min: 130,
    ventana_variabilidad_min: 0,
    desempeno_te: 1.5,
  },
  {
    pdiv: "P203",
    nombre: "Planta Índica",
    pais: "India",
    com: "IN",
    huso: "Asia/Kolkata",
    tiene_conexion: true,
    tiene_ruta_embarque: true,
    ventana_inicio_min: 360,
    ventana_duracion_min: 150,
    ventana_variabilidad_min: 0,
    desempeno_te: 1.4,
  },
  // Sin conexión: el otro caso del 4.5b.
  {
    pdiv: "P204",
    nombre: "Planta Sudeste",
    pais: "Tailandia",
    com: "TH",
    huso: "Asia/Bangkok",
    tiene_conexion: false,
    tiene_ruta_embarque: true,
    ventana_inicio_min: 330,
    ventana_duracion_min: 120,
    ventana_variabilidad_min: 0,
    desempeno_te: 1.6,
  },

  // ── América ──────────────────────────────────────────────────────────────
  {
    pdiv: "P301",
    nombre: "Planta Local 1",
    pais: "México",
    com: "MX",
    huso: "America/Mexico_City",
    tiene_conexion: true,
    tiene_ruta_embarque: true,
    ventana_inicio_min: 60,
    ventana_duracion_min: 120,
    ventana_variabilidad_min: 0,
    desempeno_te: 0.7,
  },
  {
    pdiv: "P302",
    nombre: "Planta Local 2",
    pais: "México",
    com: "MX",
    huso: "America/Monterrey",
    tiene_conexion: true,
    tiene_ruta_embarque: true,
    ventana_inicio_min: 75,
    ventana_duracion_min: 120,
    ventana_variabilidad_min: 0,
    desempeno_te: 0.75,
  },
  {
    pdiv: "P303",
    nombre: "Planta Norteña",
    pais: "Estados Unidos",
    com: "US",
    huso: "America/Chicago",
    tiene_conexion: true,
    tiene_ruta_embarque: true,
    ventana_inicio_min: 120,
    ventana_duracion_min: 125,
    ventana_variabilidad_min: 0,
    desempeno_te: 0.85,
  },
  {
    pdiv: "P304",
    nombre: "Planta Austral",
    pais: "Brasil",
    com: "BR",
    huso: "America/Sao_Paulo",
    tiene_conexion: true,
    tiene_ruta_embarque: true,
    ventana_inicio_min: 180,
    ventana_duracion_min: 135,
    ventana_variabilidad_min: 0,
    desempeno_te: 1.25,
  },
] as const;

export const COLUMNAS_PLANTAS = [
  "pdiv",
  "nombre",
  "pais",
  "com",
  "huso",
  "tiene_conexion",
  "tiene_ruta_embarque",
  "ventana_inicio_min",
  "ventana_duracion_min",
  "ventana_variabilidad_min",
  "desempeno_te",
] as const;

export function filasPlantas(): unknown[][] {
  return PLANTAS.map((p) => [
    p.pdiv,
    p.nombre,
    p.pais,
    p.com,
    p.huso,
    p.tiene_conexion,
    p.tiene_ruta_embarque,
    p.ventana_inicio_min,
    p.ventana_duracion_min,
    p.ventana_variabilidad_min,
    p.desempeno_te,
  ]);
}
