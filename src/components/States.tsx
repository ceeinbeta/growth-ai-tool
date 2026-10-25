import type { LucideIcon } from "lucide-react";
import { AlertCircle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageShell, PageGrid } from '@/components/PageLayout';

export function EmptyState({ icon: Icon, text, action, to, onClick }: { icon: LucideIcon; text: string; action: string; to?: string; onClick?: () => void }) {
  return (
    <div className="empty-row flex flex-wrap items-center gap-3 rounded-lg border bg-card px-4 py-3">
      <Icon className="size-4 shrink-0 text-foreground" aria-hidden />
      <p className="min-w-0 flex-1 text-sm text-muted-foreground">{text}</p>
      {to ? <Button asChild size="sm"><Link to={to}>{action}</Link></Button> : <Button size="sm" onClick={onClick}>{action}</Button>}
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

export function PageSkeleton({ variant = 'overview', embedded = false }: { embedded?: boolean; variant?: 'overview' | 'visibility' | 'admin' | 'integrations' | 'technical' | 'conversion' }) {
  const cards = (count: number, height = 'h-24') => Array.from({ length: count }, (_, i) => <Skeleton key={i} className={`${height} w-full`} />);
  const Frame = embedded ? 'div' : PageShell;
  return <Frame><div aria-busy="true" aria-label="Loading" className="flex flex-col gap-4">
    {!embedded && <div className="flex items-center justify-between gap-4"><div className="flex-1 space-y-2"><Skeleton className="h-7 w-1/2" /><Skeleton className="h-4 w-2/3" /></div><Skeleton className="h-10 w-28" /></div>}
    {variant === 'overview' && <><Skeleton className="h-16 w-full" /><div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{cards(4)}</div><PageGrid main={<Skeleton className="h-48 w-full" />} context={<><Skeleton className="h-48 w-full" /><Skeleton className="h-16 w-full" /></>} /><Skeleton className="h-20 w-full" /></>}
    {variant === 'visibility' && <><Skeleton className="h-24 w-full" /><div className="card-grid" data-cols="3">{cards(3,'h-16')}</div><Skeleton className="h-10 w-full" /><PageGrid main={<><Skeleton className="h-60 w-full" /><Skeleton className="h-72 w-full" /></>} context={<><Skeleton className="h-60 w-full" /><Skeleton className="h-48 w-full" /></>} /></>}
    {variant === 'admin' && <><div className="card-grid" data-cols="3">{cards(3)}</div><PageGrid main={<><Skeleton className="h-40 w-full" /><Skeleton className="h-48 w-full" /><Skeleton className="h-48 w-full" /></>} context={<>{cards(2,'h-60')}</>} /><Skeleton className="h-48 w-full" /></>}
    {variant === 'integrations' && <><div className="card-grid" data-cols="3">{cards(3,'h-40')}</div><div className="grid gap-4 lg:grid-cols-2">{cards(2,'h-60')}</div><Skeleton className="h-48 w-full" /><div className="card-grid" data-cols="4">{cards(4,'h-40')}</div></>}
    {variant === 'technical' && <PageGrid main={<><Skeleton className="h-32 w-full" /><div className="card-grid">{cards(8,'h-40')}</div></>} context={<Skeleton className="h-60 w-full" />} />}
    {variant === 'conversion' && <PageGrid main={<Skeleton className="h-80 w-full" />} context={<><Skeleton className="h-60 w-full" /><Skeleton className="h-48 w-full" /></>} />}
  </div></Frame>;
}

export function BlockSkeleton({ rows = 3 }: { rows?: number }) {
  return <div className="mt-6 space-y-3" aria-busy="true" aria-label="Loading">{Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;
}
