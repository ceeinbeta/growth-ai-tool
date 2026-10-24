import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useActiveProduct } from '@/components/AppShell';
import { FunnelCard } from '@/components/FunnelCard';
import { PageAudit } from '@/components/PageAudit';
import { conversionQuery } from '@/lib/conversion-data';
import { Button } from '@/components/ui/button';
import type { Product } from '@/lib/workspace';
export const Route = createFileRoute('/_authenticated/conversion-leaks')({
  head: () => ({ meta: [{ title: 'Conversion leaks — Growloop' }, { name: 'description', content: 'Measured visitor funnels and AI-written page copy audits for your product.' }, { property: 'og:title', content: 'Conversion leaks — Growloop' }, { property: 'og:description', content: 'Find measured drop-offs and review specific page copy fixes.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }, { name: 'robots', content: 'noindex' }] }),
  component: ConversionLeaks,
});
function ConversionLeaks() {
  const { active, data } = useActiveProduct();
  return <div className="mx-auto max-w-3xl"><h1 className="text-3xl font-extrabold">Conversion leaks</h1>{active ? <ConversionProduct key={active.id} product={active} /> : <div className="mt-6"><p>{data ? 'Add a product to measure its funnel.' : 'Loading…'}</p>{data && <Button asChild className="mt-4"><Link to="/products/new">Add product</Link></Button>}</div>}</div>;
}
function ConversionProduct({ product }: { product: Product }) {
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const { data, error } = useQuery(conversionQuery(product.id, days));
  return <><p className="mt-2 text-sm text-muted-foreground">{product.name} · {product.url}</p>{error ? <p role="alert" className="mt-6 text-sm text-destructive">Couldn't load the funnel. Please refresh and try again.</p> : !data ? <p className="mt-6 text-sm text-muted-foreground">Loading…</p> : <><FunnelCard productId={product.id} stage={product.stage} days={days} setDays={setDays} summary={data.summary} saved={data.steps.map(s => ({ label: s.label, kind: s.kind === 'page' ? 'page' : 'event', match: s.match }))} hasEvents={data.hasEvents} /><PageAudit key={product.id} productId={product.id} name={product.name} days={days} audit={data.audit} leaks={data.leaks} /></>}</>;
}