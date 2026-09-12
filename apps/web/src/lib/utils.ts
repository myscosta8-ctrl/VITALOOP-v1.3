import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Convenção shadcn/ui: mescla classes Tailwind evitando conflito (ex.: dois `p-*`). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
