import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useState } from 'react';
import { Wrench } from 'lucide-react';
import { PageSkeleton, EmptyState, ErrorState } from '@/components/States';
import { useActiveProduct } from '@/components/AppShell';
import { PageShell, PageGrid } from '@/components/PageLayout';
import { PageHeader } from '@/components/PageHeader';
import { ActionRow } from '@/components/ActionRow';
import { Button } from '@/components/ui/button';
import { SourceChip } from '@/components/SourceChip';
import { runTechnicalAudit } from '@/lib/technical-audit.functions';
import { technicalAuditQuery } from '@/lib/technical-audit-data';
import { statusLabel, type TechnicalStatus } from '@/lib/technical-audit';
import type { Tables } from '@/integrations/supabase/types';
import type { Product } from '@/lib/workspace';

export const Route = createFileRoute('/_authenticated/technical-audit')({
  head: () => ({ meta: [{ title: 'Technical audit — Growloop' }, { name: 'description', content: 'Rule-based checks that remove common blockers for Google and AI assistants reading your site.' }, { property: 'og:title', content: 'Technical audit — Growloop' }, { property: 'og:description', content: 'Check whether Google and AI assistants can find, read and understand your site.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }, { name: 'robots', content: 'noindex' }] }),
  component: TechnicalAudit,
});

const chipClass: Record<TechnicalStatus, string> = { pass: 'status-chip status-live', attention: 'status-chip status-attention', unknown: 'status-chip status-coming' };

function TechnicalAudit() {
  const { active, data } = useActiveProduct();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = useServerFn(runTechnicalAudit);
  const qc = useQueryClient();

  async function start(productId: string) {
    setBusy(true); setError('');
    try {
      const r = await run({ data: { productId } });
      if (!r.ok) setError(r.error ?? "The audit couldn't finish. Please try again.");
      else await qc.invalidateQueries({ queryKey: ['technical-audit', productId] });
    } catch { setError("The audit couldn't finish. Please try again."); }
    finally { setBusy(false); }
  }

  const action = active ? <Button disabled={busy} onClick={() => void start(active.id)}>{busy ? 'Running audit...' : 'Run technical audit'}</Button> : undefined;
  return (
    <PageShell>
      <PageHeader title="Technical audit" purpose="Check whether Google and AI assistants can find, read and understand your site. These checks remove common blockers; they do not by themselves improve rankings or recommendations." action={action} />
      {error && <p role="alert" className="mt-4 rounded-sm bg-danger-soft p-3 text-sm text-destructive">{error}</p>}
      {active ? <TechnicalProduct key={active.id} product={active} busy={busy} onRerun={() => void start(active.id)} /> : <div className="mt-6">{data ? <EmptyState icon={Wrench} text="Add a product to check its site." action="Add product" to="/products/new" /> : <PageSkeleton variant="technical" />}</div>}
    </PageShell>
  );
}

function TechnicalProduct({ product, busy, onRerun }: { product: Product; busy: boolean; onRerun: () => void }) {
  const { data, error, refetch } = useQuery(technicalAuditQuery(product.id));
  if (error) return <div className="mt-6"><ErrorState text="We couldn't load the technical audit." onRetry={() => void refetch()} /></div>;
  if (!data) return <PageSkeleton variant="technical" />;
  if (!data.latest) return <div className="mt-6"><EmptyState icon={Wrench} text={`No technical audit yet for ${product.name}. Run one to check ${product.url}.`} action="Run technical audit" onClick={onRerun} /></div>;

  const attention = data.findings.filter(f => f.status === 'attention');
  const first = attention[0];
  return (
    <PageGrid main={<>
      <p className="break-words text-sm text-muted-foreground">Audited <a href={data.latest.fetched_url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center text-foreground underline sm:min-h-0">{data.latest.fetched_url}</a> on {new Date(data.latest.fetched_at).toLocaleString()}</p>
      <section aria-labelledby="tech-summary" className="rounded-lg border border-foreground bg-card p-5">
        <h2 id="tech-summary" className="text-lg">Summary</h2>
        <p className="mt-2 text-sm"><SourceChip text="Measured from your site's own pages" />{attention.length === 0 ? 'All checks passed.' : `${attention.length} check${attention.length === 1 ? '' : 's'} need${attention.length === 1 ? 's' : ''} attention.`}{data.latest.unknown_count > 0 ? ` ${data.latest.unknown_count} could not be checked.` : ''}</p>
        {first && <p className="mt-3 text-sm"><strong>Most important fix:</strong> {first.title} — {first.fix}</p>}
      </section>
      <section aria-label="Checks" className="card-grid">
        {data.findings.map(f => <FindingCard key={f.id} finding={f} />)}
      </section>
    </>} context={
      <section aria-labelledby="tech-history">
        <h2 id="tech-history" className="text-lg">Recent runs</h2>
        <ul className="mt-3 divide-y rounded-lg border bg-card">
          {data.runs.map(r => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
              <span className="min-w-0 flex-1 break-all">{r.fetched_url}</span>
              <span className="text-muted-foreground">{new Date(r.fetched_at).toLocaleString()}</span>
              <span className="text-muted-foreground">{r.attention_count} need attention</span>
            </li>
          ))}
        </ul>
        <ActionRow className="mt-4"><Button variant="outline" disabled={busy} onClick={onRerun}>{busy ? 'Running audit...' : 'Re-run after your fixes'}</Button></ActionRow>
      </section>
    } />
  );
}

function FindingCard({ finding: f }: { finding: Tables<'technical_audit_findings'> }) {
  const status = f.status as TechnicalStatus;
  return (
    <article className="rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className={chipClass[status] ?? chipClass.unknown}>{statusLabel[status] ?? statusLabel.unknown}</span>
        <h3 className="min-w-0 flex-1 text-base">{f.title}</h3>
      </div>
      <p className="mt-3 text-sm">{f.detail}</p>
      <p className="mt-2 text-sm text-muted-foreground">{f.why}</p>
      {status !== 'pass' && <p className="mt-3 text-sm"><strong>How to fix:</strong> {f.fix}</p>}
    </article>
  );
}
