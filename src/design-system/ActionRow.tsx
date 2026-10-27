import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from './utils';

/** Actions keep semantic DOM order; the shared layout places the primary first on mobile. */
export interface ActionRowProps extends HTMLAttributes<HTMLDivElement> { layout?: 'end' | 'section'; }
export const ActionRow = forwardRef<HTMLDivElement, ActionRowProps>(function ActionRow({ className, layout = 'end', ...props }, ref) {
  return <div ref={ref} data-slot="action-row" data-layout={layout} className={cn('action-row', className)} {...props} />;
});

export interface ActionHeaderProps extends HTMLAttributes<HTMLElement> { action: ReactNode; }
export const ActionHeader = forwardRef<HTMLElement, ActionHeaderProps>(function ActionHeader({ children, action, className, ...props }, ref) {
  return <header ref={ref} className={cn('action-header', className)} {...props}><div className="min-w-0">{children}</div><ActionRow>{action}</ActionRow></header>;
});