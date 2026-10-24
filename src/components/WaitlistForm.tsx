import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowRight, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { campaignFromSearch, WAITLIST_CONSENT, WAITLIST_SUCCESS, waitlistInputSchema } from '@/lib/waitlist';

export function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [stage, setStage] = useState('');
  const [consent, setConsent] = useState(false);
  const [company, setCompany] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
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
  if (success) return <div role="status" className="flex gap-4 py-10"><Check className="mt-1 h-6 w-6 shrink-0 text-primary" /><p className="max-w-md text-xl leading-relaxed">{WAITLIST_SUCCESS}</p></div>;
  return <form onSubmit={submit} noValidate className="space-y-6">
    <div><Label htmlFor="waitlist-email">Email <span className="text-muted-foreground">(required)</span></Label><Input id="waitlist-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} className="mt-2 h-12 bg-card" placeholder="you@yourapp.com" /></div>
    <div><Label htmlFor="waitlist-website">Your website <span className="text-muted-foreground">(optional)</span></Label><Input id="waitlist-website" autoComplete="url" value={website} onChange={e => setWebsite(e.target.value)} className="mt-2 h-12 bg-card" placeholder="yourapp.com" /></div>
    <fieldset><legend className="mb-3 text-sm font-medium">Where is your product? <span className="text-muted-foreground">(optional)</span></legend><RadioGroup value={stage} onValueChange={setStage} className="flex flex-wrap gap-x-6 gap-y-3">{[['live', 'Live product'], ['prelaunch', 'Pre-launch'], ['idea', 'Just an idea']].map(([value, text]) => <div key={value} className="flex items-center gap-2"><RadioGroupItem value={value} id={`stage-${value}`} /><Label htmlFor={`stage-${value}`}>{text}</Label></div>)}</RadioGroup></fieldset>
    <div aria-hidden="true" className="hidden"><label htmlFor="waitlist-company">Company</label><input id="waitlist-company" type="text" tabIndex={-1} autoComplete="off" value={company} onChange={e => setCompany(e.target.value)} /></div>
    <div className="flex items-start gap-3"><Checkbox id="waitlist-consent" checked={consent} onCheckedChange={value => setConsent(value === true)} aria-required="true" className="mt-1" /><Label htmlFor="waitlist-consent" className="text-sm leading-relaxed">{WAITLIST_CONSENT}</Label></div>
    {error && <p id="waitlist-error" role="alert" className="rounded-sm bg-danger-soft p-3 text-sm text-destructive">{error}</p>}
    <Button type="submit" disabled={busy} className="h-12 w-full sm:w-auto" size="lg">{busy ? 'Joining…' : 'Join the beta waitlist'}<ArrowRight /></Button>
    <p className="text-xs text-muted-foreground">Free during the beta. <Link to="/privacy" className="text-primary underline underline-offset-4">How we use your details</Link></p>
  </form>;
}