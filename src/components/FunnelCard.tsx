import { ActionRow, ActionHeader } from '@/components/ActionRow';
import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowUp, ArrowDown, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { BENCHMARK_LABEL, benchmark, defaultSteps, stepsSchema, worstStep, type FunnelStep, type FunnelSummary } from '@/lib/funnel';
type Props = { productId: string; stage: string; days: 7 | 30 | 90; setDays: (d: 7 | 30 | 90) => void; summary: FunnelSummary; saved: FunnelStep[]; hasEvents: boolean };
const percent = (n: number) => `${(n * 100).toFixed(1)}%`;
export function FunnelCard({ productId, stage, days, setDays, summary, saved, hasEvents }: Props) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false), [draft, setDraft] = useState<FunnelStep[]>([]), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const worst = worstStep(summary, stage), b = benchmark(stage);
  async function save(reset = false) {
    const parsed = stepsSchema.safeParse(draft);
    if (!reset && !parsed.success) return setError(parsed.error.issues[0]?.message ?? 'Check the steps.');
    setBusy(true); setError('');
    const r = await supabase.rpc('replace_funnel_steps', { pid: productId, steps: reset ? [] : parsed.success ? parsed.data : [] });
    setBusy(false);
    if (r.error) return setError("We couldn't save these steps. Please try again.");
    await qc.invalidateQueries({ queryKey: ['conversion', productId] }); setEditing(false);
  }
  function move(i: number, delta: number) { setDraft(old => { const next = [...old], a = next[i], other = next[i + delta]; if (!a || !other) return old; next[i] = other; next[i + delta] = a; return next; }); }
  function update(i: number, change: Partial<FunnelStep>) { setDraft(old => old.map((s, j) => j === i ? { ...s, ...change } : s)); }
  return <section className="mt-6 rounded-lg border bg-card p-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl">Funnel</h2><div className="flex gap-1" aria-label="Measurement window">{([7, 30, 90] as const).map(d => <Button key={d} size="sm" variant={d === days ? 'default' : 'outline'} onClick={() => setDays(d)} aria-pressed={d === days}>{d} days</Button>)}</div></div>
    {!hasEvents ? <p className="mt-5 text-sm">No visits yet. <Link to="/integrations" hash="tracking" className="text-foreground underline">Install tracking first</Link></p> : <>
      {summary.total_visitors < 100 && <p className="mt-5 rounded-sm bg-sunken p-3 text-sm">Not enough data yet ({summary.total_visitors} of 100 visitors). Numbers below are what we have measured so far.</p>}
      <div className="table-scroll mt-4"><table className="w-full text-left text-sm"><thead className="border-b text-xs text-muted-foreground"><tr><th className="py-2 pr-4">Step</th><th className="py-2 pr-4 text-right">Visitors</th><th className="py-2 pr-4 text-right">% of previous step</th><th className="py-2 text-right">Benchmark</th></tr></thead><tbody>{summary.steps.map((s, i) => <tr key={s.position} className={`border-b last:border-0 ${worst?.step.position === s.position ? 'bg-danger-soft' : ''}`}><td className="py-1 pr-4 font-medium">{i + 1}. {s.label}</td><td className="py-1 pr-4 text-right tabular-nums">{s.visitors}</td><td className="py-1 pr-4 text-right tabular-nums">{i ? percent(s.rate_from_previous) : '—'}</td><td className="py-1 text-right text-muted-foreground">{summary.is_default && i === 1 ? <>{percent(b.rate)}<span className="block whitespace-nowrap text-xs">Typical {percent(b.low)}–{percent(b.high)}</span></> : '-'}</td></tr>)}</tbody></table></div>
      <p className="mt-3 text-xs text-muted-foreground"><span className="status-chip status-measured">Measured</span> by the Growloop snippet on your site</p>
      {summary.is_default && <p className="mt-3 text-xs text-muted-foreground"><span className="status-chip status-benchmark">Benchmark</span> {BENCHMARK_LABEL}</p>}
      {worst && <div className={`mt-5 border-l-4 p-3 ${worst.benchmark ? 'border-destructive bg-danger-soft' : 'border-signal bg-sunken'}`}><p className="font-semibold">{worst.benchmark ? 'Worst step' : 'Biggest drop-off'}: {worst.step.label}</p><p className="mt-1 text-sm">{percent(1 - worst.step.rate_from_previous)} lost from the previous step · measured</p>{worst.benchmark && <p className="mt-1 text-sm font-medium">Fix this before buying traffic.</p>}</div>}
    </>}
    {!editing ? <ActionRow className="mt-5"><Button variant="outline" onClick={() => { setDraft(saved.length ? saved.map(({ label, kind, match }) => ({ label, kind, match })) : defaultSteps(stage)); setError(''); setEditing(true); }}>Customize steps</Button></ActionRow> : <div className="mt-5 border-t pt-5"><h3 className="text-base">Customize steps</h3><div className="mt-3 space-y-3">{draft.map((s, i) => <div key={i} className="grid grid-cols-1 gap-2 border-b py-2 sm:grid-cols-[1fr_100px_1fr_auto]">
      <Input aria-label={`Step ${i + 1} label`} value={s.label} maxLength={120} onChange={e => update(i, { label: e.target.value })} />
      <select aria-label={`Step ${i + 1} kind`} value={s.kind} className="h-9 rounded-sm border bg-card px-2 text-sm" onChange={e => update(i, { kind: e.target.value === 'page' ? 'page' : 'event', match: e.target.value === 'page' ? '/' : 'signup' })}><option value="page">Page</option><option value="event">Event</option></select>
      <Input aria-label={`Step ${i + 1} match`} value={s.match} onChange={e => update(i, { match: e.target.value })} placeholder={s.kind === 'page' ? '/pricing*' : 'signup'} />
      <div className="flex gap-1"><Button size="icon" variant="ghost" aria-label={`Move step ${i + 1} up`} title="Move up" disabled={!i} onClick={() => move(i, -1)}><ArrowUp className="h-4 w-4" /></Button><Button size="icon" variant="ghost" aria-label={`Move step ${i + 1} down`} title="Move down" disabled={i === draft.length - 1} onClick={() => move(i, 1)}><ArrowDown className="h-4 w-4" /></Button><Button size="icon" variant="ghost" aria-label={`Remove step ${i + 1}`} title="Remove step" disabled={draft.length === 1} onClick={() => setDraft(old => old.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button></div>
    </div>)}</div><ActionRow className="mt-4"><Button variant="outline" disabled={draft.length >= 6 || busy} onClick={() => setDraft(old => [...old, { label: '', kind: 'page', match: '/' }])}><Plus className="h-4 w-4" />Add step</Button><Button disabled={busy} onClick={() => save()}>{busy ? 'Saving…' : 'Save steps'}</Button><Button variant="link" disabled={busy} onClick={() => save(true)}>Reset to default</Button><Button variant="outline" disabled={busy} onClick={() => setEditing(false)}>Cancel</Button></ActionRow>{error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}</div>}
  </section>;
}