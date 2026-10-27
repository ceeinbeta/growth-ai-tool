import { ActionRow } from '@/components/ActionRow';
import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowRight, Check, Mail, Globe } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { campaignFromSearch, WAITLIST_CONSENT, WAITLIST_SUCCESS, waitlistInputSchema } from '@/lib/waitlist';

const STAGES = [['live', 'Live product'], ['prelaunch', 'Pre-launch'], ['idea', 'Just an idea']] as const;

/** One waitlist behavior, two layouts: the hero pill and the full bottom form. */
export function WaitlistForm({ variant = 'full', idPrefix = 'waitlist' }: { variant?: 'hero' | 'full'; idPrefix?: string }) {
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [stage, setStage] = useState('');
  const [consent, setConsent] = useState(false);
  const [company, setCompany] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const id = (name: string) => `${idPrefix}-${name}`;
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const input = { email, website, ...(stage ? { stage } : {}), consent, company, ...campaignFromSearch(window.location.search) };
    const result = waitlistInputSchema.safeParse(input);
    if (!result.success) { setError(result.error.issues[0]?.message ?? 'Please check your details.'); return; }
    setError(''); setBusy(true);
    try {
      const response = await fetch('/api/public/waitlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
      const data = await response.json();
      if (response.ok) setSuccess(true); else setError(data.message ?? 'Please try again.');
    } catch { setError('We couldn’t save your details. Please try again.'); }
    finally { setBusy(false); }
  }
  const honeypot = <div aria-hidden="true" className="hidden"><label htmlFor={id('company')}>Company</label><input id={id('company')} type="text" tabIndex={-1} autoComplete="off" value={company} onChange={e => setCompany(e.target.value)} /></div>;
  const errorBox = error && <p id={id('error')} role="alert" className="rounded-sm bg-danger-soft p-3 text-sm text-destructive">{error}</p>;
  const stageGroup = (compact: boolean) => <RadioGroup value={stage} onValueChange={setStage} className={`flex flex-wrap ${compact ? 'gap-x-4 gap-y-2' : 'gap-x-6 gap-y-3'}`}>{STAGES.map(([value, text]) => <div key={value} className="flex items-center gap-2"><RadioGroupItem value={value} id={id(`stage-${value}`)} /><Label htmlFor={id(`stage-${value}`)}>{text}</Label></div>)}</RadioGroup>;

  if (success) return <div role="status" className={`flex gap-4 ${variant === 'hero' ? 'mx-auto max-w-[640px] justify-center rounded-public border bg-card px-6 py-5 text-left' : 'py-10'}`}><Check className="mt-1 h-6 w-6 shrink-0 text-foreground" /><p className="max-w-md text-xl leading-relaxed">{WAITLIST_SUCCESS}</p></div>;

  if (variant === 'hero') return <form onSubmit={submit} noValidate aria-label="Join the beta waitlist" className="mx-auto flex w-full max-w-[640px] flex-col gap-3 text-left">
    <div className="hero-pill flex flex-col gap-2 border bg-card p-2 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-2 pl-3">
        <Mail className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <Label htmlFor={id('email')} className="sr-only">Email (required)</Label>
        <Input id={id('email')} type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} onFocus={() => setExpanded(true)}
          aria-describedby={error ? id('error') : undefined} className="h-11 min-w-0 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0" placeholder="you@yourcompany.com" />
      </div>
      <Button type="submit" disabled={busy} size="lg" className="hero-pill-button w-full sm:w-auto">{busy ? 'Joining…' : 'Join the beta waitlist'}<ArrowRight /></Button>
    </div>
    {expanded && <div className="grid gap-3 rounded-app border bg-card p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="domain-field"><Globe aria-hidden="true"/><Label htmlFor={id('website')} className="sr-only">Your website (optional)</Label><Input id={id('website')} autoComplete="url" value={website} onChange={e => setWebsite(e.target.value)} className="h-10 bg-background" placeholder="Your website (optional)" /></div>
      <fieldset className="min-w-0"><legend className="sr-only">Where is your product? (optional)</legend>{stageGroup(true)}</fieldset>
    </div>}
    {honeypot}
    <div className="flex items-start justify-center gap-2"><Checkbox id={id('consent')} checked={consent} onCheckedChange={value => setConsent(value === true)} aria-required="true" className="mt-0.5" /><Label htmlFor={id('consent')} className="text-sm font-normal leading-snug text-muted-foreground">{WAITLIST_CONSENT}</Label></div>
    {errorBox}
  </form>;

  return <form onSubmit={submit} noValidate className="space-y-6">
    <div><Label htmlFor={id('email')}>Email <span className="text-muted-foreground">(required)</span></Label><Input id={id('email')} type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} className="mt-2 h-12 bg-card" placeholder="you@yourapp.com" /></div>
    <div><Label htmlFor={id('website')}>Your website <span className="text-muted-foreground">(optional)</span></Label><Input id={id('website')} autoComplete="url" value={website} onChange={e => setWebsite(e.target.value)} className="mt-2 h-12 bg-card" placeholder="yourapp.com" /></div>
    <fieldset><legend className="mb-3 text-sm font-medium">Where is your product? <span className="text-muted-foreground">(optional)</span></legend>{stageGroup(false)}</fieldset>
    {honeypot}
    <div className="flex items-start gap-3"><Checkbox id={id('consent')} checked={consent} onCheckedChange={value => setConsent(value === true)} aria-required="true" className="mt-1" /><Label htmlFor={id('consent')} className="text-sm leading-relaxed">{WAITLIST_CONSENT}</Label></div>
    {errorBox}
    <ActionRow><Button type="submit" disabled={busy} size="lg">{busy ? 'Joining…' : 'Join the beta waitlist'}<ArrowRight /></Button></ActionRow>
    <p className="text-xs text-muted-foreground">Free during the beta. <Link to="/privacy" className="text-foreground underline underline-offset-4">How we use your details</Link></p>
  </form>;
}
