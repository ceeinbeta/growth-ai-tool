import type { LucideIcon } from "lucide-react";
import { AlertCircle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function EmptyState({ icon: Icon, text, action, to, onClick }: { icon: LucideIcon; text: string; action: string; to?: string; onClick?: () => void }) {
  return (
    <div className="rounded-lg border bg-card p-8 text-center">
      <Icon className="mx-auto h-8 w-8 text-primary" aria-hidden />
      <p className="mx-auto mt-3 max-w-sm text-sm text-muted-foreground">{text}</p>
      {to ? <Button asChild className="mt-5"><Link to={to}>{action}</Link></Button> : <Button className="mt-5" onClick={onClick}>{action}</Button>}
    </div>
  );
}

export function ErrorState({ text, onRetry }: { text: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg bg-danger-soft p-4 text-sm text-destructive">
      <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
      <p className="min-w-0 flex-1">{text}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>Try again</Button>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-6" aria-busy="true" aria-label="Loading">
      <div className="flex items-center gap-4"><Skeleton className="h-14 w-14" /><div className="flex-1 space-y-2"><Skeleton className="h-7 w-1/2" /><Skeleton className="h-4 w-1/3" /></div></div>
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-48 w-full" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
    </div>
  );
}

export function BlockSkeleton({ rows = 3 }: { rows?: number }) {
  return <div className="mt-6 space-y-3" aria-busy="true" aria-label="Loading">{Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;
}
