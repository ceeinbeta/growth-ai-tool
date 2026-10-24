import { createFileRoute, Link } from '@tanstack/react-router';
import { Plug } from 'lucide-react';
import { useActiveProduct } from '@/components/AppShell';
import { WebsiteTracking } from '@/components/WebsiteTracking';
import { Button } from '@/components/ui/button';
export const Route = createFileRoute('/_authenticated/integrations')({
  head: () => ({ meta: [
    { title: 'Integrations — Growloop' }, { name: 'description', content: 'Install Growloop website tracking and see real visits, sources and signup activity.' },
    { property: 'og:title', content: 'Integrations — Growloop' }, { property: 'og:description', content: 'Connect website tracking for real visits and signup activity.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }), component: Integrations,
});
function Integrations() {
  const { active, data } = useActiveProduct();
  return <div className="mx-auto max-w-3xl"><h1 className="text-3xl font-extrabold">Integrations</h1>{active ? <><p className="mt-2 text-sm text-muted-foreground">{active.name} · {active.url}</p><WebsiteTracking key={active.id} product={active} /></> : <div className="mt-6"><p className="text-sm text-muted-foreground">{data ? 'Add a product to get its tracking snippet.' : 'Loading…'}</p>{data && <Button asChild className="mt-4"><Link to="/products/new">Add product</Link></Button>}</div>}
  <div className="mt-6 grid gap-4 sm:grid-cols-2">{['PostHog', 'Google Analytics'].map(name => <section key={name} className="flex items-center gap-3 rounded-lg border bg-card p-5"><Plug className="h-5 w-5 text-muted-foreground" /><h2 className="flex-1 text-base">{name}</h2><span className="rounded-full bg-sunken px-2 py-0.5 text-xs font-semibold text-muted-foreground">Soon</span></section>)}</div></div>;
}