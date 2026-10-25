import { ActionRow, ActionHeader } from '@/components/ActionRow';
import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQueryClient } from '@tanstack/react-query';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { auditPage } from '@/lib/audit-page.functions';
import { emptyCopy, pageCopySchema, type PageCopy } from '@/lib/audit-schema';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
export function PageAudit({ productId, name, website, days, audit, leaks }: { productId: string; name: string; website: string; days: 7 | 30 | 90; audit: Tables<'audits'> | null; leaks: Tables<'leaks'>[] }) {
  const previous = pageCopySchema.safeParse(audit?.page_copy);
  const [copy, setCopy] = useState<PageCopy>(previous.success ? previous.data : emptyCopy);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [copied, setCopied] = useState(''), [saving, setSaving] = useState('');
  const [path, setPath] = useState(''), [paste, setPaste] = useState(false);
  const run = useServerFn(auditPage), qc = useQueryClient();
  const count = Object.values(copy).reduce((n, v) => n + v.length, 0);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); const parsed = pageCopySchema.safeParse(copy);
    if (paste && !parsed.success) return setError(parsed.error.issues[0]?.message ?? 'Check the copy.');
    setBusy(true); setError('');
    try { const r = await run({ data: { productId, ...(paste && parsed.success ? { copy: parsed.data } : { path }), days } }); if (!r.ok) { setError(r.error ?? "The audit couldn't finish."); if ('fallback' in r && r.fallback) setPaste(true); } else { await qc.invalidateQueries({ queryKey: ['conversion', productId] }); await qc.invalidateQueries({ queryKey: ['open-leaks', productId] }); } }
    catch { setError("The audit couldn't finish. Please try again."); }
    finally { setBusy(false); }
  }
  async function status(id: string, value: string) {
    setSaving(id); setError(''); const r = await supabase.from('leaks').update({ status: value }).eq('id', id);
    if (r.error) setError("We couldn't save this status. Please try again.");
    else { await qc.invalidateQueries({ queryKey: ['conversion', productId] }); await qc.invalidateQueries({ queryKey: ['open-leaks', productId] }); }
    setSaving('');
  }
  return <><section className="mt-6 rounded-lg border bg-card p-5 sm:p-6"><h2 className="text-xl">Page audit</h2><form onSubmit={submit} className="mt-5 space-y-4">
    {!paste && <div><Label htmlFor="audit-page-path">Page to audit</Label><p className="mt-2 break-all text-sm text-muted-foreground">https://{website}</p><Input id="audit-page-path" className="mt-2" placeholder="/pricing (optional)" maxLength={500} value={path} disabled={busy} onChange={e => setPath(e.target.value)} /></div>}
    {paste && <>
    {([{ key: 'path', label: 'Page address path (optional)', placeholder: '/pricing' }, { key: 'headline', label: 'Headline' }, { key: 'subheadline', label: 'Subheadline' }, { key: 'button', label: 'Main button text' }, { key: 'notes', label: 'Other notes' }] as const).map(field => <div key={field.key}><Label htmlFor={`audit-${field.key}`}>{field.label}</Label>{field.key === 'notes' ? <Textarea id={`audit-${field.key}`} className="mt-2" rows={4} maxLength={2000} value={copy[field.key]} onChange={e => setCopy(old => ({ ...old, [field.key]: e.target.value }))} /> : <Input id={`audit-${field.key}`} className="mt-2" maxLength={2000} placeholder={'placeholder' in field ? field.placeholder : undefined} value={copy[field.key]} onChange={e => setCopy(old => ({ ...old, [field.key]: e.target.value }))} />}</div>)}
    <p className={`text-right text-xs ${count > 2000 ? 'text-destructive' : 'text-muted-foreground'}`}>{count}/2000 characters</p>
    </>}
    {error && <p role="alert" className="rounded-sm bg-danger-soft p-3 text-sm text-destructive">{error}</p>}
    <ActionRow><Button type="submit" disabled={busy || (paste && count > 2000)}>{busy ? `Auditing ${name}...` : paste ? 'Run audit' : 'Audit this page'}</Button><Button type="button" variant="link" disabled={busy} onClick={() => { setPaste(!paste); setError(''); }}>{paste ? 'Choose a page instead' : 'Paste page copy instead'}</Button></ActionRow>
  </form></section>
  {leaks.length > 0 && <section className="mt-8"><h2 className="text-xl">Leaks from the latest audit</h2>{audit?.audited_url && audit.fetched_at && <p className="mt-2 break-words text-sm text-muted-foreground">Audited from <a href={audit.audited_url} target="_blank" rel="noreferrer" className="text-foreground underline">{audit.audited_url}</a> on {new Date(audit.fetched_at).toLocaleString()}</p>}<p className="mt-2 text-sm text-muted-foreground"><span className="status-chip status-ai">AI-written</span> from {audit?.audited_url ? 'the page text we read' : 'the copy you pasted'}. Check it before you use it.</p><div className="mt-5 space-y-4">{leaks.map(leak => <article key={leak.id} className="rounded-lg border bg-card p-5 learning-block"><div className="flex flex-wrap items-center gap-3"><span className={`rounded-sm px-2 py-1 text-xs font-semibold capitalize ${leak.impact === 'high' ? 'bg-danger-soft text-destructive' : leak.impact === 'medium' ? 'bg-sunken text-foreground' : 'bg-selected text-foreground selected-state'}`}>{leak.impact} impact</span><h3 className="min-w-0 flex-1 text-base">{leak.area}</h3><select aria-label={`Status for ${leak.area}`} disabled={saving === leak.id} value={leak.status} onChange={e => status(leak.id, e.target.value)} className="h-9 rounded-sm border bg-card px-2 text-sm">{['open', 'doing', 'done', 'dismissed'].map(s => <option key={s} value={s}>{s[0]?.toUpperCase()}{s.slice(1)}</option>)}</select></div><p className="mt-4 whitespace-pre-line text-sm">{leak.issue}</p><p className="mt-3 text-sm"><strong>Fix:</strong> {leak.fix}</p>{leak.rewrite && <div className="mt-4 border-t pt-4"><div className="flex items-start gap-3"><p className="min-w-0 flex-1 whitespace-pre-line text-sm">{leak.rewrite}</p><Button variant="ghost" size="icon" title={copied === leak.id ? 'Copied' : 'Copy rewrite'} aria-label={`Copy rewrite for ${leak.area}`} onClick={async () => { try { await navigator.clipboard.writeText(leak.rewrite); setCopied(leak.id); } catch { setError("Couldn't copy this rewrite."); } }}>{copied === leak.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</Button></div></div>}</article>)}</div></section>}
  </>;
}