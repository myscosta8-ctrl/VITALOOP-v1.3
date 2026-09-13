import * as React from 'react';
import { cn } from '../../lib/utils.js';

/**
 * Select nativo estilizado (não Radix) — escolha deliberada: o app usa
 * <select> nativo em todo lugar hoje (suporte a teclado/leitor de tela de
 * graça, sem dependência nova). Mesmos tokens visuais do Input/Textarea.
 */
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'flex h-9 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = 'Select';
