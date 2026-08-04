export const CHAT_LIMITE_POR_DEFECTO = 20;

export function limiteDeMensajes(): number {
  const configurado = Number(process.env.CHAT_LIMITE_MENSAJES);
  return Number.isInteger(configurado) && configurado > 0 ? configurado : CHAT_LIMITE_POR_DEFECTO;
}

export function dentroDelLimite(mensajes: number): boolean {
  return Number.isInteger(mensajes) && mensajes < limiteDeMensajes();
}
