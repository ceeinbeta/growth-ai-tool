import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Droplets } from 'lucide-react';
import { PageSkeleton, EmptyState, ErrorState } from '@/components/States';
import { useActiveProduct } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { PageShell, PageGrid } from '@/components/PageLayout';
import { FunnelCard } from '@/components/FunnelCard';
import { PageAudit } from '@/components/PageAudit';
import { conversionQuery } from '@/lib/conversion-data';
import { Button } from '@/components/ui/button';
import type { Product } from '@/lib/workspace';
export const Route = createFileRoute('/_authenticated/conversion-leaks')({
  head: () => ({ meta: [{ title: 'Conversion leaks — Brambly' }, { name: 'description', content: 'Measured visitor funnels and AI-written page copy audits for your product.' }, { property: 'og:title', content: 'Conversion leaks — Brambly' }, { property: 'og:description', content: 'Find measured drop-offs and review specific page copy fixes.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }, { name: 'robots', content: 'noindex' }] }),
  component: ConversionLeaks,
});
function ConversionLeaks() {
  const { active, data } = useActiveProduct();
  return <PageShell><PageHeader title="Conversion leaks" purpose="See where visitors drop off and get suggestions for the page that loses the most." />{active ? <ConversionProduct key={active.id} product={active} /> : <div className="mt-6">{data ? <EmptyState icon={Droplets} text="Add a product to measure where visitors drop off." action="Add product" to="/products/new" /> : <PageSkeleton variant="conversion" embedded />}</div>}</PageShell>;
}
function ConversionProduct({ product }: { product: Product }) {
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const { data, error, refetch } = useQuery(conversionQuery(product.id, days));
  return <><p className="text-sm text-muted-foreground">{product.name} · {product.url}</p>{error ? <div className="mt-6"><ErrorState text="We couldn't load the funnel." onRetry={() => void refetch()} /></div> : !data ? <PageSkeleton variant="conversion" embedded /> : <PageGrid main={<FunnelCard productId={product.id} stage={product.stage} days={days} setDays={setDays} summary={data.summary} saved={data.steps.map(s => ({ label: s.label, kind: s.kind === 'page' ? 'page' : 'event', match: s.match }))} hasEvents={data.hasEvents} />} context={<PageAudit key={product.id} productId={product.id} name={product.name} website={product.url} days={days} audit={data.audit} leaks={data.leaks} />} />}</>;
}