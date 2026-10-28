import { createFileRoute } from '@tanstack/react-router';
import { Logo, Button, Input, DomainInput, ActionRow, ActionHeader, PageShell, PageGrid } from '@/index';

export const Route = createFileRoute('/design-system')({
  head: () => ({ meta: [
    { title: 'Design system — Brambly' },
    { name: 'description', content: 'Brambly foundations, supplied artwork and shared controls.' },
    { property: 'og:title', content: 'Design system — Brambly' },
    { property: 'og:description', content: 'Brambly foundations and shared controls.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
    { name: 'robots', content: 'noindex,nofollow' },
  ] }),
  component: Showcase,
});

function Showcase() {
  return <main className="public-container py-10"><PageShell>
    <ActionHeader action={<Button asChild variant="outline"><a href="/">Home</a></Button>}><Logo /><h1 className="text-3xl">Brambly design system</h1></ActionHeader>
    <PageGrid main={<>
      <section className="compact-panel"><h2 className="text-xl">Artwork</h2><div className="flex flex-wrap items-center gap-4 py-4"><Logo /><Logo variant="symbol" /></div><div className="bg-sidebar rounded-app p-4"><Logo tone="inverse" /><Logo variant="symbol" tone="inverse" /></div></section>
      <section className="compact-panel"><h2 className="text-xl">Actions</h2>{(['default', 'outline', 'secondary', 'ghost', 'link', 'destructive'] as const).map(variant => <ActionRow key={variant} layout="section" className="py-2"><Button variant={variant}>{variant}</Button><Button variant={variant} disabled>Disabled</Button></ActionRow>)}<ActionRow layout="section"><Button size="sm">Small</Button><Button size="lg">Large</Button></ActionRow></section>
      <section className="compact-panel"><h2 className="text-xl">Fields</h2><label htmlFor="library-name">Product name</label><Input id="library-name" placeholder="Your product" /><label htmlFor="library-site">Website</label><DomainInput id="library-site" placeholder="yourapp.com" action={<Button type="button" size="sm">Analyze</Button>} /><label htmlFor="library-disabled">Unavailable field</label><Input id="library-disabled" disabled /></section>
    </>} context={<>
      <section className="compact-panel"><h2 className="text-xl">Status</h2><div className="flex flex-wrap gap-2 py-4"><span className="status-chip">Connected</span><span className="status-chip">Analyzing</span><span className="status-chip">Draft</span><span className="status-chip status-attention">Needs attention</span><span className="status-chip status-coming">Soon</span></div></section>
      <section className="compact-panel"><h2 className="text-xl">Typography</h2><p className="font-display text-3xl">Manrope</p><p>DM Sans reading text</p><p className="eyebrow">Metadata</p><p className="font-display text-2xl">28</p></section>
      <section className="compact-panel"><h2 className="text-xl">Surfaces</h2><div className="flex gap-2 py-4" aria-label="Forest, cream, white and forest tint"><span className="bg-primary size-10 rounded-sm" /><span className="bg-background size-10 rounded-sm border" /><span className="bg-card size-10 rounded-sm border" /><span className="bg-selected size-10 rounded-sm border" /></div></section>
    </>} />
  </PageShell></main>;
}