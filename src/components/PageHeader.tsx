import type { ReactNode } from "react";
import { ActionHeader } from "@/components/ActionRow";

/** Shared signed-in page header: title, one-line purpose, primary action top-right. */
export function PageHeader({ title, purpose, action, meta }: { title: ReactNode; purpose: string; action?: ReactNode; meta?: ReactNode }) {
  const body = <><h1 className="text-3xl font-extrabold">{title}</h1><p className="mt-1 text-sm text-muted-foreground">{purpose}</p>{meta}</>;
  if (!action) return <header>{body}</header>;
  return <ActionHeader action={action}>{body}</ActionHeader>;
}
