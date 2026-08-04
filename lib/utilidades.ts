import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Combina clases de Tailwind resolviendo conflictos (último valor gana). */
export function cn(...clases: ClassValue[]): string {
  return twMerge(clsx(clases));
}
