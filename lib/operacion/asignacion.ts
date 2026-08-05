/**
 * Reparto de solicitudes entre los CSR.
 *
 * Función pura: recibe la carga ya contada y no sabe de dónde salió. Así el
 * reparto se prueba con arreglos en memoria y `lib/fuentes` puede cambiar la
 * consulta sin tocar la regla.
 */
export interface CargaCsr {
  codigo: string;
  /** Solicitudes de la sesión que ese operador tiene sin atender. */
  abiertas: number;
  activo: boolean;
}

/**
 * Operador que debe recibir la siguiente solicitud, o `null` si no hay ninguno
 * activo.
 *
 * `null` NO es un error: la solicitud se crea igual y la bandeja la muestra
 * como «Sin asignar». Una solicitud nunca se pierde por no haber a quién
 * asignarla.
 *
 * El desempate es lexicográfico y por tanto determinista. Un `Math.random()`
 * aquí haría que el ensayo cronometrado del Plan 4B no fuera repetible. Con
 * códigos de dos dígitos el orden lexicográfico pondría "CSR 10" antes que
 * "CSR 2"; es aceptable porque la regla solo necesita ser estable, no
 * numéricamente ordenada.
 */
export function elegirCsr(cargas: readonly CargaCsr[]): string | null {
  const activos = cargas.filter((carga) => carga.activo);
  if (activos.length === 0) return null;

  return activos.reduce((mejor, actual) => {
    if (actual.abiertas !== mejor.abiertas)
      return actual.abiertas < mejor.abiertas ? actual : mejor;
    return actual.codigo < mejor.codigo ? actual : mejor;
  }).codigo;
}
