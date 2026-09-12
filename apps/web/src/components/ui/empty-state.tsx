import * as React from 'react';
import { cn } from '../../lib/utils.js';

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

/**
 * Estado vazio único (Fase 2 da absorção de arquitetura, 11/09/2026) —
 * substitui os `<p role="status">Nenhum X...</p>` soltos por uma
 * apresentação consistente em toda a superfície já migrada para shadcn/ui.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action, className, ...props }) => (
  <div
    role="status"
    className={cn(
      'flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border p-10 text-center',
      className,
    )}
    {...props}
  >
    {icon && <div className="text-muted-foreground [&_svg]:size-8">{icon}</div>}
    <p className="font-semibold text-foreground">{title}</p>
    {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
    {action && <div className="mt-2">{action}</div>}
  </div>
);
