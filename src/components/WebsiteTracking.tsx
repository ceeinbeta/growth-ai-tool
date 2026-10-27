import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Copy, Check, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trackingQuery } from '@/lib/tracking-data';
import { eventSource } from '@/lib/tracking';
import type { Product } from '@/lib/workspace';
import { Skeleton } from '@/components/ui/skeleton';
import { InstallCheck } from '@/components/InstallCheck';

function relative(date: string, now: number) {
  const minutes = Math.max(0, Math.floor((now - new Date(date).getTime()) / 60000));
  if (!minutes) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24); return `${days} day${days === 1 ? '' : 's'} ago`;
}
export function WebsiteTracking({ product }: { product: Product }) {
  const { data, error } = useQuery(trackingQuery(product.id));
  const [origin, setOrigin] = useState('');
  const [now, setNow] = useState(0);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');
  useEffect(() => { setOrigin(window.location.origin); setNow(Date.now()); const timer = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer); }, []);
  const install = `<script async src="${origin}/t.js" data-key="${product.tracking_key}"></script>`;
  async function copy() { try { await navigator.clipboard.writeText(install); setCopied(true); setCopyError(''); } catch { setCopyError('Copy failed. Select the code and copy it.'); } }
  const last = data?.recent[0];
  const calls = product.stage === 'prelaunch' ? ['joined_waitlist', 'signup'] : ['signup', 'joined_waitlist'];
  return <section aria-label="Website tracking" className="flex flex-col gap-4">
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
    <div className="compact-panel">
    <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg">Website tracking</h2>{data && (data.recent.length ? <span className="status-chip status-live">Working</span> : <span className="status-chip status-coming">Not verified yet</span>)}</div>
    <p className="mt-3 text-sm text-muted-foreground">Paste this in the &lt;head&gt; of your website. It records visits and where they came from. It stores no personal data and does nothing if a visitor has Do Not Track on.</p>
    <div className="mt-4 flex items-start gap-3 rounded-sm border bg-sunken p-4"><code className="min-w-0 flex-1 break-all text-sm">{origin ? install : 'Loading install code…'}</code><Button variant="ghost" size="icon" disabled={!origin} aria-label={copied ? 'Copied' : 'Copy install snippet'} title={copied ? 'Copied' : 'Copy install snippet'} onClick={copy}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</Button></div>
    {origin.includes('id-preview--') && <p className="mt-2 text-sm text-muted-foreground">This address is private until you publish Brambly. Your website cannot load the snippet until then.</p>}
    {copyError && <p role="alert" className="mt-2 text-sm text-destructive">{copyError}</p>}
    <p role="status" className="mt-4 flex items-center gap-2 text-sm"><Radio className={`h-4 w-4 ${last ? 'text-foreground' : 'text-muted-foreground'}`} />{error ? "Couldn't load tracking activity. Please try again." : !data ? 'Checking for visits…' : last ? `Receiving data. Last event ${relative(last.created_at, now)}.` : 'Waiting for the first visit'}</p>

    <div className="mt-6 space-y-2 text-sm">{calls.map(name => <p key={name}>Call <code className="rounded-sm bg-sunken px-1 py-0.5">growloop.track("{name}")</code> when someone {name === 'signup' ? 'signs up' : 'joins the waitlist'}.</p>)}</div>
    </div>
    <div className="compact-panel"><h2 className="text-xl">Installation check</h2><InstallCheck productId={product.id} /></div>
    </div>
    <div className="compact-panel"><h3 className="font-semibold">Recent activity</h3><p className="mt-1 text-sm text-muted-foreground">Real events from your website</p>
      {data?.recent.length ? <div className="table-scroll mt-4"><table className="w-full text-left text-sm"><thead><tr className="border-b text-xs text-muted-foreground"><th className="py-2 pr-4 font-semibold">Time</th><th className="py-2 pr-4 font-semibold">Event</th><th className="py-2 pr-4 font-semibold">Page path</th><th className="py-2 font-semibold">Source</th></tr></thead><tbody>{data.recent.map(e => <tr key={e.id} className="border-b last:border-0"><td className="whitespace-nowrap py-1 pr-4"><time dateTime={e.created_at} title={new Date(e.created_at).toLocaleString()}>{new Date(e.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time></td><td className="py-1 pr-4">{e.name}</td><td className="max-w-48 break-all py-1 pr-4">{e.path}</td><td className="max-w-40 break-words py-1">{eventSource(e)}</td></tr>)}</tbody></table></div> : !data && !error ? <Skeleton className="mt-4 h-40 w-full" /> : <p className="mt-4 text-sm text-muted-foreground">No events recorded yet.</p>}
    </div>
  </section>;
}