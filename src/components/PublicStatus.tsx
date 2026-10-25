export function PublicStatus({ upcoming = false }: { upcoming?: boolean }) {
  return <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-sm px-2 py-1 text-xs font-semibold ${upcoming ? 'bg-secondary text-muted-foreground' : 'bg-selected text-primary'}`}><span aria-hidden="true" className={`size-1.5 rounded-full ${upcoming ? 'bg-muted-foreground' : 'bg-primary'}`} />{upcoming ? 'Coming next' : 'Live'}</span>;
}
