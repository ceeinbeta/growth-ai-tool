import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PageGrid } from '@/components/PageLayout';
import { ENGINES, usd, type EngineId } from '@/lib/engine-prices';
import { shareOfVoice, youPercent, unusableEngineReason, type SovRunRow, type SovMentionRow } from '@/lib/sov';
import { relativeTime } from '@/lib/admin';
import { ChevronDown, ChevronRight, Info } from 'lucide-react';

type Run = Omit<SovRunRow, 'status'> & { status: string; check_id: string; cited_hosts?: string[] | null; cost_usd?: number | null };
type Check = { id: string; status: string; started_at: string; engines: string[]; runs_per_question?: number; estimated_cost_usd?: number | null };
type Budget = { scope: 'platform'; spent_usd: number; budget_usd: number } | { scope: 'product'; own_spend_usd: number; status: string };
const label = (id: string) => ENGINES.find(e => e.id === id)?.label ?? id;
const filters = ['all', 'openai', 'perplexity', 'claude'] as const;

export function VisibilityResults({ productName, checks, runs, mentions, fixes, budget, action, settings, connections, onAddCompetitor }: {
  productName: string; checks: Check[]; runs: Run[]; mentions: { run_id: string; name: string; rank: number; kind: string }[];
  fixes: { check_id: string; text: unknown }[]; budget?: Budget | null | undefined; action: ReactNode; settings: ReactNode; connections?: ReactNode;
  onAddCompetitor: (name: string) => void;
}) {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => { const mq = window.matchMedia('(min-width: 1024px)'); const update = () => setDesktop(mq.matches); update(); mq.addEventListener('change', update); return () => mq.removeEventListener('change', update); }, []);
  const safeMentions = mentions.filter((m): m is SovMentionRow => m.kind === 'you' || m.kind === 'competitor' || m.kind === 'other');
  const [filter, setFilter] = useState<'all' | EngineId>('all');
  const [allNames, setAllNames] = useState(false);
  const [allQuestions, setAllQuestions] = useState(false);
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);
  const latest = checks.find(c => c.status === 'done' || c.status === 'stopped');
  const previous = checks.filter(c => c.status === 'done' || c.status === 'stopped')[1];
  const latestRuns = runs.filter(r => r.check_id === latest?.id);
  const filtered = latestRuns.filter(r => filter === 'all' || r.engine === filter) as SovRunRow[];
  const usable = filtered.filter(r => r.status === 'done');
  const ids = new Set(filtered.map(r => r.id));
  const selectedMentions = safeMentions.filter(m => ids.has(m.run_id));
  const share = shareOfVoice(filtered, selectedMentions);
  const pct = youPercent(filtered, selectedMentions);
  const mentioned = new Set(selectedMentions.filter(m => m.kind === 'you').map(m => m.run_id));
  const previousRuns = runs.filter(r => r.check_id === previous?.id && (filter === 'all' || r.engine === filter)) as SovRunRow[];
  const change = previousRuns.some(r => r.status === 'done') && usable.length ? pct - youPercent(previousRuns, safeMentions) : null;
  const engineScores = ENGINES.filter(e => latestRuns.some(r => r.engine === e.id && r.status === 'done')).map(e => ({ ...e, pct: youPercent(latestRuns.filter(r => r.engine === e.id) as SovRunRow[], safeMentions) })).sort((a,b) => b.pct-a.pct);
  const yours = share.find(s => s.kind === 'you') ?? { name: productName, kind: 'you', count: 0, pct: 0, runs: usable.length };
  const competitors = share.filter(s => s.kind !== 'you');
  const names = [yours, ...(allNames ? competitors : competitors.slice(0,5))];
  const questions = [...new Set(filtered.map(r => r.question))];
  const shownQuestions = allQuestions ? questions : questions.slice(0,5);
  const fix = fixes.find(f => f.check_id === latest?.id)?.text as { suggestions?: string[] } | undefined;
  const history = <details open={desktop} className="compact-panel responsive-details"><summary className="font-semibold">History and cost <span className="text-xs text-muted-foreground"> · {Math.min(checks.length,5)} checks</span></summary>
    <div className="mt-3 space-y-3">
      {budget && <div className="text-sm"><span className="status-chip status-estimated">Estimated</span>{budget.scope === 'platform' ? <><p className="mt-2">Spent this month {usd(budget.spent_usd)} of ${budget.budget_usd}</p><progress className="mt-2 h-2 w-full budget-progress" value={budget.spent_usd} max={budget.budget_usd} aria-label="Monthly budget used" />{budget.spent_usd >= budget.budget_usd * .8 && <p className="text-warning">Near the monthly budget.</p>}</> : <p className="mt-2">This product: {usd(budget.own_spend_usd)} this month — {budget.status}.</p>}</div>}
      <ul className="space-y-3">{checks.slice(0,5).map(c => { const cr = runs.filter(r => r.check_id === c.id); const costRows = cr.filter(r => r.cost_usd != null); return <li key={c.id} className="border-t pt-2 text-xs"><div className="flex flex-wrap justify-between gap-1"><time>{new Date(c.started_at).toLocaleDateString()}</time><span>{c.status}</span></div><p>{c.engines.map(label).join(', ')} · {cr.filter(r=>r.status==='done').length} of {cr.length} runs</p><p className="text-muted-foreground">{costRows.length ? usd(costRows.reduce((sum,r)=>sum+(r.cost_usd ?? 0),0)) : c.estimated_cost_usd != null ? usd(c.estimated_cost_usd) : 'Cost unavailable'} <span className="status-chip status-estimated">Estimated</span></p><details><summary className="mt-1 cursor-pointer">Per-engine results</summary>{c.engines.map(e => { const er = cr.filter(r=>r.engine===e); const ok=er.filter(r=>r.status==='done').length; return <p key={e}>{label(e)}: {ok} of {er.length} runs succeeded{!ok && c.status !== 'running' ? ' — No usable answers in this check' : ''}</p>; })}</details></li>; })}</ul>
    </div>
  </details>;
  const fixesPanel = <section className="compact-panel learning-block"><h2 className="text-xl">How to get cited</h2><p className="my-2 text-xs text-muted-foreground"><span className="status-chip status-ai">AI-written</span> Check before use.</p>{fix?.suggestions?.length ? fix.suggestions.map((text,i) => <details key={i} className="border-t py-2"><summary className="flex cursor-pointer items-center gap-2 text-sm"><ChevronRight className="size-4 shrink-0" /><span className="min-w-0 truncate">{text}</span><span className="shrink-0 rounded border px-1 text-xs text-muted-foreground">Impact unassessed</span></summary><p className="mt-2 break-words text-sm">{text}</p></details>) : <p className="text-sm text-muted-foreground">No saved suggestions yet.</p>}</section>;

  return <>
    <section className="compact-panel flex flex-wrap items-center justify-between gap-4" aria-label="Visibility summary">
      <div><div className="text-sm">Your share <span className="status-chip status-sample">Sample runs</span></div><div className="flex items-baseline gap-3"><strong className="text-3xl">{usable.length ? `${pct}%` : '—'}</strong><span className="text-xs text-muted-foreground">{usable.filter(r=>mentioned.has(r.id)).length} of {usable.length} usable runs</span></div>{change !== null && <p className="text-xs text-muted-foreground">{change > 0 ? '+' : ''}{change} percentage points vs previous check</p>}</div>
      <div className="text-xs text-muted-foreground">{engineScores.length === 1 ? <p>Usable engine: {engineScores[0]?.label}</p> : engineScores.length > 1 && <p>Best: {engineScores[0]?.label} · Worst: {engineScores.at(-1)?.label}</p>}<p>{latest ? `Last checked ${relativeTime(latest.started_at)}` : 'No checks yet'}</p><TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="link" size="sm" aria-label="About sample results"><Info className="size-4" />Samples, not rankings</Button></TooltipTrigger><TooltipContent>AI answers vary. Share is the percentage of usable runs recommending you, not a search ranking.</TooltipContent></Tooltip></TooltipProvider></div>
      {action}
    </section>
    {connections}
    <Tabs value={filter} onValueChange={v => { if (filters.includes(v as typeof filter)) { setFilter(v as typeof filter); setAllNames(false); setAllQuestions(false); setOpenQuestion(null); } }}>
      <div className="sticky top-[var(--app-sticky-offset)] z-10 bg-background py-2"><TabsList aria-label="AI engines" className="flex h-auto w-full justify-start overflow-x-auto">{filters.map(f => <TabsTrigger key={f} value={f} className="min-h-10 flex-1">{f==='all'?'All engines':label(f)}</TabsTrigger>)}</TabsList></div>
      {filters.map(f => <TabsContent key={f} value={f}>
        <PageGrid main={<>
          <section className="compact-panel"><h2 className="text-xl">Share of voice</h2><p className="mt-1 text-xs text-muted-foreground"><span className="status-chip status-measured">Measured</span> {usable.length ? `from usable answers by asking ${(filter === 'all' ? engineScores : engineScores.filter(e=>e.id===filter)).map(e=>e.label).join(', ')} your buyer questions` : 'No engine returned usable answers'}.</p>
            {filter === 'all' ? ENGINES.filter(e => latest?.engines.includes(e.id) && !engineScores.some(s=>s.id===e.id)).map(e=><p key={e.id} className="mt-2 text-sm">{e.label}: {unusableEngineReason(latestRuns.filter(r=>r.engine===e.id))}</p>) : !usable.length && <div className="mt-3 text-sm"><p>No usable answers in this check</p><p>{label(filter)}: {unusableEngineReason(filtered)}</p></div>}
            {!!usable.length && <><div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-2">{names.map(s => <div key={`${s.kind}:${s.name}`} className="min-w-0"><div className="flex h-5 items-center justify-between gap-2 text-xs"><span className="truncate font-medium" title={s.name}>{s.name}{s.kind==='you'?' · You':''}</span><span className="shrink-0 text-muted-foreground">{s.pct}% · {s.count} of {s.runs} runs</span></div><div className="h-1 rounded-full bg-selected"><div className={`h-full rounded-full ${s.kind==='you'?'border border-foreground bg-primary':'bg-chart-other'}`} style={{width:`${s.pct}%`}} /></div></div>)}</div>{competitors.length > 5 && <Button variant="link" size="sm" aria-expanded={allNames} onClick={()=>setAllNames(!allNames)}>{allNames?'Show less':`Show all ${share.length}`}</Button>}</>}
          </section>
          <section className="compact-panel"><h2 className="text-xl">Per question</h2><div className="table-scroll question-scroll mt-3"><table className="w-full table-fixed text-sm min-w-96"><thead><tr className="text-left"><th className="w-2/5 p-2">Question</th><th className="p-2">Your share</th><th className="p-2">Top competitor</th><th className="p-2">Engines</th></tr></thead><tbody>{shownQuestions.map(q => { const qr=filtered.filter(r=>r.question===q); const qshare=shareOfVoice(qr,selectedMentions); const top=qshare.find(s=>s.kind!=='you'); const ok=qr.filter(r=>r.status==='done'); const open=openQuestion===q; return <Fragment key={q}><tr className="border-t"><td className="px-2 py-0"><Button variant="ghost" size="sm" className="w-full justify-start px-0 text-left" aria-expanded={open} aria-controls={`question-${questions.indexOf(q)}`} onClick={()=>setOpenQuestion(open?null:q)}><ChevronDown className="size-4 shrink-0" /><span className="min-w-0 truncate" title={q}>{q}</span></Button></td><td className="px-2 py-0">{ok.length ? `${youPercent(qr,selectedMentions)}%`:'—'}</td><td className="truncate px-2 py-0 text-xs" title={top?.name}>{top?.name ?? '—'}</td><td className="px-2 py-0"><div className="flex flex-nowrap gap-1">{ENGINES.filter(e=>qr.some(r=>r.engine===e.id)).map(e=><span key={e.id} title={`${e.label}: ${qr.filter(r=>r.engine===e.id&&r.status==='done').length} usable runs`} aria-label={`${e.label}: ${qr.some(r=>r.engine===e.id&&r.status==='done') ? `${youPercent(qr.filter(r=>r.engine===e.id),selectedMentions)}%` : 'no usable answers'}`} className="shrink-0 whitespace-nowrap rounded border px-1 text-xs">{e.id==='openai'?'O':e.id==='perplexity'?'P':'C'}: {qr.some(r=>r.engine===e.id&&r.status==='done') ? `${youPercent(qr.filter(r=>r.engine===e.id),selectedMentions)}%` : '—'}</span>)}</div></td></tr>{open && <tr><td colSpan={4} id={`question-${questions.indexOf(q)}`} className="bg-selected p-3">{qr.map(r=><article key={r.id} className="mb-3 text-sm"><h3 className="font-semibold">{label(r.engine)} · {r.status==='done'?'Usable answer':unusableEngineReason([r])}</h3>{r.status==='done' && <><p className="mt-1 whitespace-pre-wrap break-words">{r.answer_excerpt || 'No saved excerpt.'}</p><p className="mt-1 text-xs text-muted-foreground">Cited sites: {(r as Run).cited_hosts?.join(', ') || 'None recorded'}</p><p className="text-xs">Recommended: {selectedMentions.filter(m=>m.run_id===r.id).map(m=>`${m.rank}. ${m.name}`).join(' · ') || 'No names recorded'}</p></>}</article>)}</td></tr>}</Fragment>; })}</tbody></table></div>{questions.length>5 && <Button variant="link" size="sm" aria-expanded={allQuestions} onClick={()=>setAllQuestions(!allQuestions)}>{allQuestions?'Show fewer questions':`Show all ${questions.length} questions`}</Button>}{!questions.length && <p className="mt-2 text-sm text-muted-foreground">No saved results for this engine.</p>}</section>
        </>} context={<><div className="order-2 lg:order-1">{history}</div><div className="order-1 lg:order-2">{fixesPanel}</div><details className="compact-panel order-3"><summary className="cursor-pointer font-semibold">Connections and automatic checks</summary>{settings}</details>{share.some(s=>s.kind==='other') && <details className="compact-panel order-4"><summary className="cursor-pointer font-semibold">Other recommendations</summary><ul className="mt-2 space-y-2">{share.filter(s=>s.kind==='other').slice(0,5).map(s=><li key={s.name} className="text-sm"><span>{s.name}</span><Button variant="link" size="sm" onClick={()=>onAddCompetitor(s.name)}>Add to competitors</Button></li>)}</ul></details>}</>} />
      </TabsContent>)}
    </Tabs>
  </>;
}