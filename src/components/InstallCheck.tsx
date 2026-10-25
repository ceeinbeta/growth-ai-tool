import { ActionRow, ActionHeader } from '@/components/ActionRow';
import { useEffect, useRef, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { verifyTracking } from '@/lib/verify-tracking.functions';
import { isAfter } from '@/lib/install-check';

type Result = { snippet: { status: string; message: string }; eventsLast24h: number; lastEventAt: string | null };
type Listen = 'idle' | 'waiting' | 'received' | 'timeout';

function ago(date: string) {
  const m = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60000));
  if (!m) return 'just now';
  if (m < 60) return `${m} minute${m === 1 ? '' : 's'} ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.floor(h / 24); return `${d} day${d === 1 ? '' : 's'} ago`;
}

export function InstallCheck({ productId }: { productId: string }) {
  const verify = useServerFn(verifyTracking);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [listen, setListen] = useState<Listen>('idle');
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  useEffect(() => () => clearInterval(timer.current), []);

  async function run() {
    clearInterval(timer.current);
    const clickedAt = Date.now();
    setBusy(true); setError(''); setListen('idle');
    try {
      const r = await verify({ data: { productId } });
      if (!r.ok) { setResult(null); setError(r.error); return; }
      setResult(r);
      if (isAfter(r.lastEventAt, clickedAt)) { setListen('received'); return; }
      setListen('waiting');
      const started = Date.now();
      timer.current = setInterval(async () => {
        const { data } = await supabase.from('events').select('created_at').eq('product_id', productId).order('created_at', { ascending: false }).limit(1);
        if (isAfter(data?.[0]?.created_at, clickedAt)) { clearInterval(timer.current); setListen('received'); }
        else if (Date.now() - started >= 60000) { clearInterval(timer.current); setListen('timeout'); }
      }, 3000);
    } catch { setError("We couldn't run the check. Please try again."); }
    finally { setBusy(false); }
  }

  return <div className="mt-5">
    <ActionRow><Button variant="outline" onClick={run} disabled={busy}>{busy ? 'Checking…' : result ? 'Check again' : 'Check installation'}</Button></ActionRow>
    {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
    {result && <ol className="mt-4 space-y-3 text-sm" aria-live="polite">
      <li><span className="font-semibold">Snippet on your website.</span> {result.snippet.message}</li>
      <li><span className="font-semibold">Visits arriving.</span> {result.eventsLast24h ? `Receiving data. ${result.eventsLast24h} event${result.eventsLast24h === 1 ? '' : 's'} in the last 24 hours.` : 'No visits yet.'}{result.lastEventAt && ` Last event ${ago(result.lastEventAt)}.`}</li>
      {listen !== 'idle' && <li><span className="font-semibold">Live listening.</span> {listen === 'waiting' ? 'Waiting for a visit… open your website now in a normal browser window.' : listen === 'received' ? 'Visit received.' : 'No visit in 60 seconds. If you have Do Not Track or an ad blocker on, the snippet sends nothing. Try another browser.'}</li>}
    </ol>}
  </div>;
}
