import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "./utils";

/** Shared signed-in page frame: full width beside the sidebar, capped at --page-max on very wide screens. */
export interface PageShellProps extends HTMLAttributes<HTMLDivElement> {}
export const PageShell = forwardRef<HTMLDivElement, PageShellProps>(function PageShell({ children, className, ...props }, ref) {
  return <div ref={ref} data-page-shell className={cn("page-shell", className)} {...props}>{children}</div>;
});
/** 12-column grid: main 8/12 plus context 4/12 on >=1024px; one column below in source order. */
export interface PageGridProps extends HTMLAttributes<HTMLDivElement> { main: ReactNode; context?: ReactNode; }
export const PageGrid = forwardRef<HTMLDivElement, PageGridProps>(function PageGrid({ main, context, className, ...props }, ref) {
  return <div ref={ref} className={cn("page-grid", className)} {...props}><div className="page-main">{main}</div>{context && <aside className="page-context">{context}</aside>}</div>;
});
