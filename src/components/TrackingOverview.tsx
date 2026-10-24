import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { trackingQuery } from '@/lib/tracking-data';
import type { Product } from '@/lib/workspace';

export function TrackingOverview({ product }: { product: Product }) {
  const { data, error } = useQuery(trackingQuery(product.id));
  if (error) return <p role="alert" className="mt-6 text-sm text-destructive">Couldn't load tracking data. Please try again.</p>;
  if (!data) return <p className="mt-6 text-sm text-muted-foreground">Loading tracking data…</p>;
  if (!data.recent.length) return <div className="mt-6 flex gap-3 rounded-lg border bg-sunken px-4 py-3 text-sm"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-signal" aria-hidden /><p>No numbers show yet because no data is connected to this product. <Link to="/integrations" className="font-medium text-primary underline">Install tracking</Link></p></div>;
  const t = data.totals;
  return <section className="mt-8 rounded-lg border bg-card p-6" aria-label="Last 7 days">
    <h2 className="text-lg">Last 7 days</h2><p className="mt-1 text-sm text-muted-foreground">Measured by the Growloop snippet on your site</p>
    <dl className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-3">{[['Visits', t.visits], ['Unique visitors', t.visitors], [product.stage === 'prelaunch' ? 'Waitlist joins' : 'Signups', product.stage === 'prelaunch' ? t.waitlist : t.signups]].map(([label, value]) => <div key={label}><dt className="text-sm text-muted-foreground">{label}</dt><dd className="mt-1 font-display text-3xl font-bold">{Number(value).toLocaleString()}</dd></div>)}</dl>
    <h3 className="mt-6 text-sm font-semibold">Top sources · visits</h3>{t.sources.length ? <ul className="mt-3 divide-y">{t.sources.map(s => <li key={s.source} className="flex justify-between gap-4 py-2 text-sm"><span className="min-w-0 break-words">{s.source}</span><span className="font-semibold tabular-nums">{s.count.toLocaleString()}</span></li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">No pageviews in the last 7 days.</p>}
  </section>;
}