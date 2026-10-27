import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Actions keep semantic DOM order; the shared layout places the primary first on mobile. */
export function ActionRow({ className, layout = 'end', ...props }: HTMLAttributes<HTMLDivElement> & { layout?: 'end' | 'section' }) {
  return <div data-slot="action-row" data-layout={layout} className={cn('action-row', className)} {...props} />;
}

export function ActionHeader({ children, action, className }: { children: ReactNode; action: ReactNode; className?: string }) {
  return <header className={cn('action-header', className)}><div className="min-w-0">{children}</div><ActionRow>{action}</ActionRow></header>;
}