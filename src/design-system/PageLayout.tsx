import type { ReactNode } from "react";
import { cn } from "./utils";

/** Shared signed-in page frame: full width beside the sidebar, capped at --page-max on very wide screens. */
export function PageShell({ children, className }: { children: ReactNode; className?: string }) {
  return <div data-page-shell className={cn("page-shell", className)}>{children}</div>;
}
/** 12-column grid: main 8/12 plus context 4/12 on >=1024px; one column below in source order. */
export function PageGrid({ main, context, className }: { main: ReactNode; context?: ReactNode; className?: string }) {
  return <div className={cn("page-grid", className)}><div className="page-main">{main}</div>{context && <aside className="page-context">{context}</aside>}</div>;
}
