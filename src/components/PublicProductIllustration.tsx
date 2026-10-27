import { ArrowDownRight, ArrowUpRight, Droplets, Search } from 'lucide-react';

export function PublicProductIllustration() {
  return <figure aria-label="Sample Brambly funnel and AI search visibility" className="w-full max-w-2xl mx-auto">
    <div className="brand-hero-card overflow-hidden rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-5 py-4"><span className="font-display text-sm font-bold">Your product / Overview</span><span className="status-chip status-sample">Sample data</span></div>
      <div className="p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-2 text-sm font-semibold"><Droplets className="size-4 text-foreground" />Conversion funnel<span className="ml-auto text-xs font-normal text-muted-foreground">30 days · Sample</span></div>
        <div className="space-y-3">{[
          ['Visited', '1,000', '100%', 'w-full', false], ['Pricing page', '240', '24%', 'w-[24%]', true], ['Signed up', '32', '3.2%', 'w-[3.2%]', false],
        ].map(([label, value, rate, width, flagged]) => <div key={String(label)} className={flagged ? 'rounded-md border border-foreground bg-selected p-3' : 'px-3 py-1'}>
          <div className="flex items-center justify-between gap-2 text-sm"><span>{label}</span><span className="font-semibold tabular-nums">{value}<span className="ml-3 text-xs font-normal text-muted-foreground">{rate}</span></span></div>
          <div className="mt-2 h-2 overflow-hidden rounded-sm bg-secondary"><div className={`h-full min-w-2 ${width} ${flagged ? 'bg-primary' : 'bg-chart-other'}`} /></div>
          {flagged && <p className="mt-2 flex items-center gap-1 text-xs font-medium"><ArrowDownRight className="size-3.5 text-foreground" />Biggest drop-off · Sample data</p>}
        </div>)}</div>
        <div className="mt-6 border-t pt-5"><div className="flex items-center gap-2 text-sm font-semibold"><Search className="size-4 text-foreground" />AI search visibility<ArrowUpRight className="ml-auto size-4 text-foreground" /></div><p className="mt-1 text-xs text-muted-foreground">Sample share of voice · 30 sample runs</p>
          <div className="mt-4 space-y-3">{[['ChatGPT', '40%', 'w-[40%]'], ['Perplexity', '60%', 'w-[60%]'], ['Claude', '30%', 'w-[30%]']].map(([engine, value, width]) => <div key={engine} className="grid grid-cols-[76px_1fr_32px] items-center gap-3 text-xs"><span>{engine}</span><div className="h-3 overflow-hidden rounded-sm bg-secondary"><div className={`h-full border border-foreground bg-primary ${width}`} /></div><span className="text-right tabular-nums">{value}</span></div>)}</div>
        </div>
      </div>
    </div><figcaption className="mt-4 text-center text-xs text-muted-foreground">Sample data, not real results</figcaption>
  </figure>;
}
