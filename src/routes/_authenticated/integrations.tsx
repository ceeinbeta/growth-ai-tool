import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useState } from 'react';
import { Plug } from 'lucide-react';
import { BlockSkeleton, EmptyState } from '@/components/States';
import { useActiveProduct } from '@/components/AppShell';
import { WebsiteTracking } from '@/components/WebsiteTracking';
import { PageHeader } from '@/components/PageHeader';
import { ActionRow } from '@/components/ActionRow';
import { Button } from '@/components/ui/button';
import { getSovEngineStatus, testEngineConnection } from '@/lib/sov.functions';
import { ENGINES, type EngineId } from '@/lib/engine-prices';
import type { Product } from '@/lib/workspace';
import { COMING_INTEGRATIONS } from '@/lib/integrations';

export const Route = createFileRoute('/_authenticated/integrations')({
  head: () => ({ meta: [
    { name: 'robots', content: 'noindex' },
    { title: 'Integrations — Growloop' }, { name: 'description', content: 'Install Growloop website tracking and see real visits, sources and signup activity.' },
    { property: 'og:title', content: 'Integrations — Growloop' }, { property: 'og:description', content: 'Connect website tracking for real visits and signup activity.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }), component: Integrations,
});


const ENGINE_GIVES: Record<EngineId, string> = {
  openai: 'Lets visibility checks ask OpenAI about your product.',
  perplexity: 'Lets visibility checks ask Perplexity about your product.',
  claude: 'Lets visibility checks ask Claude about your product.',
};

function Integrations() {
  const { active, data } = useActiveProduct();
  return <div className="mx-auto max-w-4xl">
    <PageHeader title="Integrations" purpose="Connect the sources Growloop measures from. Only real data shows in your numbers." />
    {active ? <>
      <p className="mt-2 text-sm text-muted-foreground">{active.name} · {active.url}</p>
      <div id="tracking" className="scroll-mt-24"><WebsiteTracking key={active.id} product={active} /></div>
      <h2 className="mt-10 text-lg">AI engines</h2>
      <EngineCards key={`e-${active.id}`} product={active} />
    </> : <div className="mt-6">{data ? <EmptyState icon={Plug} text="Add a product to get its tracking snippet." action="Add product" to="/products/new" /> : <BlockSkeleton />}</div>}
    <h2 className="mt-10 text-lg">Coming next</h2>
    <ul className="mt-4 grid gap-4 sm:grid-cols-2">
      {COMING_INTEGRATIONS.map(i => <li key={i.name} aria-disabled="true" className="flex cursor-default flex-col gap-2 rounded-lg border bg-card p-5">
        <div className="flex items-center gap-3"><h3 className="flex-1 text-base">{i.name}</h3><span className="status-chip status-coming">Coming next</span></div>
        <p className="text-sm text-muted-foreground">{i.gives}</p>
      </li>)}
    </ul>
  </div>;
}

function EngineCards({ product }: { product: Product }) {
  const statusFn = useServerFn(getSovEngineStatus);
  const testFn = useServerFn(testEngineConnection);
  const { data } = useQuery({ queryKey: ['sov-engine-status', product.id], queryFn: () => statusFn({ data: { productId: product.id } }) });
  const [results, setResults] = useState<Record<string, { ok: boolean | null; text: string }>>({});
  async function runTest(engine: EngineId) {
    setResults(m => ({ ...m, [engine]: { ok: null, text: 'Testing…' } }));
    try {
      const r = await testFn({ data: { productId: product.id, engine } });
      setResults(m => ({ ...m, [engine]: { ok: r.ok, text: r.ok ? 'Test passed just now' : (r.error ?? 'The connection test failed. Try again later.') } }));
    } catch {
      setResults(m => ({ ...m, [engine]: { ok: false, text: 'The connection test failed. Try again later.' } }));
    }
  }
  const engines = data?.engines ?? ENGINES.map(e => ({ id: e.id, label: e.label, connected: false, testsToday: 0 }));
  return <ul className="mt-4 grid gap-4 sm:grid-cols-3">
    {engines.map(e => <li key={e.id} className="grid grid-rows-[auto_1fr_auto_auto] gap-2 rounded-lg border bg-card p-5">
      <div className="flex flex-wrap items-center gap-2"><h3 className="flex-1 text-base">{e.label}</h3>{data && <span className={`status-chip ${e.connected ? 'status-live' : 'status-coming'}`}>{e.connected ? 'Connected' : 'Not connected'}</span>}</div>
      <p className="text-sm text-muted-foreground">{ENGINE_GIVES[e.id as EngineId]}</p>
      <p className="min-h-5 break-words text-xs text-muted-foreground" aria-live="polite">{results[e.id]?.text ?? (data && !e.connected ? 'Add its key in Project Settings → Secrets.' : '')}</p>
      <ActionRow>{e.connected && <Button variant="link" disabled={results[e.id]?.ok === null} onClick={() => runTest(e.id as EngineId)}>Test connection</Button>}</ActionRow>
    </li>)}
  </ul>;
}
