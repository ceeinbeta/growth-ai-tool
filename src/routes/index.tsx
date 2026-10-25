import { ActionRow } from '@/components/ActionRow';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { ArrowRight, ChartNoAxesColumn, Droplets, ScanText, Search, MessageCircle, Target, Wrench, Users, ListChecks } from 'lucide-react';
import { PublicShell } from '@/components/PublicShell';
import { WaitlistForm } from '@/components/WaitlistForm';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { getPublicOrigin } from '@/lib/public-origin.functions';
import { publicHead } from '@/lib/public-head';
import { CONTACT_EMAIL, GROWLOOP_TRACKING_KEY } from '@/lib/public-config';
import { supabase } from '@/integrations/supabase/client';
import { hasSignInParams, landingRedirectTarget } from '@/lib/auth-redirect';
import { PublicProductIllustration } from '@/components/PublicProductIllustration';
import { PublicStatus } from '@/components/PublicStatus';
import { FAQS, landingJsonLd } from '@/lib/public-faq';

const TITLE = 'Growloop — Find the leak. Fix it. Prove it worked.';
const DESCRIPTION = "Growloop finds why your product isn't growing, helps you fix it, and measures what happens next. Free while in beta, invite-only.";

export const Route = createFileRoute('/')({
  loader: () => getPublicOrigin(),
  head: ({ loaderData }) => {
    const origin = loaderData ?? 'https://growloop-mcads.lovable.app';
    return { ...publicHead(origin, '/', TITLE, DESCRIPTION), scripts: [{ type: 'application/ld+json', children: landingJsonLd(origin) }] };
  },
  component: LandingPage,
});

const todayFeatures = [
  { icon: Droplets, id: 'conversion', name: 'Conversion leak finder', text: 'Follow your funnel step by step and see exactly where visitors leave, measured from real visits.' },
  { icon: ScanText, id: 'audit', name: 'Page audit by address', text: 'Point at a page on your site; Growloop reads the real copy and gives you an AI-written list of fixes and rewrites.' },
  { icon: Wrench, id: 'technical', name: 'Technical audit', text: 'Eight rule-based checks that Google and AI assistants can find, read and understand your site, with plain how-to-fix notes.' },
  { icon: Search, id: 'visibility', name: 'AI search visibility', text: 'See how often ChatGPT, Perplexity and Claude recommend you next to competitors, from repeated sample runs; engines are connected one by one during the beta.' },
  { icon: ChartNoAxesColumn, id: 'tracking', name: 'Website tracking', text: 'One script line measures real visits, signups and waitlist joins — no cookies, no personal data.' },
  { icon: Users, id: 'profile', name: 'Product profile', text: 'Your audience, competitors and buyer questions in one editable place, so every check knows your product.' },
] as const;

function FaqAnswer({ q, a }: { q: string; a: string }) {
  if (!q.startsWith('How do I delete')) return <>{a}</>;
  return <>Email <a href={`mailto:${CONTACT_EMAIL}`} className="text-foreground underline">{CONTACT_EMAIL}</a> and ask. We'll delete your details. More on the <Link to="/privacy" className="text-foreground underline">privacy page</Link>.</>;
}

export function LandingPage() {
  const navigate = useNavigate();
  // Safety net: a one-time sign-in link that lands here (with a code or
  // token in the address) sends a signed-in visitor on to the app.
  useEffect(() => {
    if (!hasSignInParams(window.location.search, window.location.hash)) return;
    let active = true;
    const go = (hasSession: boolean) => {
      const target = landingRedirectTarget(window.location.search, window.location.hash, hasSession);
      if (active && target) void navigate({ to: target, replace: true });
    };
    void supabase.auth.getSession().then(({ data }) => go(!!data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) go(true);
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [navigate]);
  useEffect(() => {
    if (!GROWLOOP_TRACKING_KEY) return;
    const script = document.createElement('script');
    script.async = true; script.src = `${window.location.origin}/t.js`; script.dataset['key'] = GROWLOOP_TRACKING_KEY;
    document.head.append(script);
    return () => script.remove();
  }, []);
  return <PublicShell><main id="main-content">
    <section className="border-b bg-background"><div className="public-container grid items-center gap-12 py-12 md:py-16 lg:grid-cols-2 lg:gap-16">
      <div><p className="public-eyebrow">Growth for solo founders</p><p className="public-lede mt-5 text-muted-foreground">Growloop is a growth app for solo founders that finds why your product isn't growing, helps you fix it, and measures what happens next.</p><h1 className="public-h1 mt-4">Find the leak.<br />Fix it.<br />Prove it worked.</h1><ActionRow layout="section" className="mt-8"><Button asChild size="lg"><a href="#waitlist">Join the beta waitlist<ArrowRight /></a></Button><Button asChild size="lg" variant="link"><Link to="/features">See what's included</Link></Button></ActionRow><p className="mt-4 text-sm text-muted-foreground">Free while we're in beta. Invite-only. No automatic posting.</p></div>
      <PublicProductIllustration />
    </div></section>
    <section className="public-section bg-card border-b"><div className="public-container"><p className="public-eyebrow">The problem</p><h2 className="public-heading"><em className="human-phrase">Shipping was the easy part.</em></h2><div className="mt-10 grid gap-5 md:grid-cols-3">{[
      [Droplets, 'Traffic is not the leak', 'More visitors do not fix a signup step that loses people. First find where they drop off.'],
      [Search, 'AI assistants now answer buyer questions', 'When buyers ask “what should I use?”, your product may not be in the answer at all.'],
      [Target, "You can't tell what worked", 'You can publish, launch and post all week without knowing whether your numbers changed.'],
    ].map(([Icon, title, text]) => { const I = Icon as typeof Droplets; return <article key={String(title)} className="border-t py-6"><I className="mb-6 size-6 text-foreground" /><h3 className="text-xl">{String(title)}</h3><p className="mt-3 text-md text-muted-foreground">{String(text)}</p></article>; })}</div></div></section>
    <section id="how-it-works" className="public-section"><div className="public-container"><p className="public-eyebrow">How it works</p><h2 className="public-heading">One loop, three jobs.</h2><div className="mt-10 grid gap-8 md:grid-cols-3">{[
      [Droplets, 'Find the leak', 'Follow your funnel, find the biggest drop-off and check the page copy behind it.', false],
      [ScanText, 'Fix it', 'Review AI-written findings and suggested rewrites. Make the changes yourself.', false],
      [ChartNoAxesColumn, 'Prove it worked', 'Follow real visits and signups after you make a change.', true],
    ].map(([Icon, title, text, upcoming]) => { const I = Icon as typeof Droplets; return <div key={String(title)} className="border-t-2 border-foreground pt-6"><div className="flex items-center justify-between gap-3"><I className="size-6 text-foreground" /><PublicStatus upcoming={Boolean(upcoming)} /></div><h3 className="mt-6 text-xl">{String(title)}</h3><p className="mt-3 text-md text-muted-foreground">{String(text)}</p></div>; })}</div></div></section>
    <section className="public-section border-y bg-card"><div className="public-container"><p className="public-eyebrow">Live today</p><h2 className="public-heading">What you can use today.</h2><div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{todayFeatures.map(({ icon: Icon, id, name, text }) => <article key={id} className="rounded-md border bg-background p-6"><div className="flex items-center justify-between gap-3"><Icon className="size-5 text-foreground" /><PublicStatus /></div><h3 className="mt-5 text-xl">{name}</h3><p className="mt-3 text-sm text-muted-foreground">{text}</p><p className="mt-4"><Link to="/features" hash={id} className="text-sm font-semibold text-foreground underline underline-offset-4">About {name.toLowerCase()}</Link></p></article>)}</div></div></section>
    <section className="public-section"><div className="public-container"><p className="public-eyebrow">Beyond buying more traffic</p><h2 className="public-heading">Get discovered. Grow organically.</h2><p className="public-lede mt-5 text-muted-foreground">Help the right people find your product on Google and in AI assistants, then turn those visits into signups. Start with what works today; the rest is coming next.</p><div className="mt-10 grid gap-5 sm:grid-cols-2">{[
      [Search, 'AI search visibility', 'See how often ChatGPT, Perplexity and Claude recommend you, and get suggestions for how to get cited; engines are connected one by one during the beta.', false],
      [ChartNoAxesColumn, 'Google search growth', 'Understand organic searches and improve the pages that could bring visitors.', true],
      [ListChecks, 'Listing optimization', 'Improve how your product appears in directories and listings.', true],
      [MessageCircle, 'Finding conversations', 'Find buyers asking on Reddit, Hacker News and X. You post the replies yourself.', true],
    ].map(([Icon, title, text, upcoming]) => { const I = Icon as typeof Search; return <article key={String(title)} className="rounded-md border p-6"><div className="flex items-center justify-between gap-3"><I className="size-6 text-foreground" /><PublicStatus upcoming={Boolean(upcoming)} /></div><h3 className="mt-6 text-xl">{String(title)}</h3><p className="mt-3 text-md text-muted-foreground">{String(text)}</p></article>; })}</div><p className="mt-8 text-sm text-muted-foreground">Integrations with Google Search Console, Google Analytics, PostHog, Stripe, Bing Webmaster Tools, Slack and Notion/CSV export are <span className="status-chip status-coming ml-1">Soon</span> — they are not connected today.</p></div></section>
    <section className="public-container flex flex-col justify-between gap-5 py-14 md:flex-row md:items-center"><h2 className="text-2xl">For live products.<br />And the ones not launched yet.</h2><p className="public-lede max-w-md text-muted-foreground">Collecting a waitlist? Growloop counts joins instead of signups, and every audit works the same way.</p></section>
    <section id="faq" className="public-section border-y bg-card"><div className="mx-auto max-w-3xl px-5 sm:px-8"><p className="public-eyebrow">Before you join</p><h2 className="public-heading mb-8">Questions, answered.</h2><Accordion type="single" collapsible>{FAQS.map(({ q, a }) => <AccordionItem key={q} value={q}><AccordionTrigger className="text-base">{q}</AccordionTrigger><AccordionContent className="text-md text-muted-foreground"><FaqAnswer q={q} a={a} /></AccordionContent></AccordionItem>)}</Accordion></div></section>
    <section id="waitlist" className="public-section"><div className="public-container grid gap-10 md:grid-cols-2"><div><p className="public-eyebrow">Growloop beta</p><h2 className="public-heading">Get a beta seat.</h2><p className="public-lede mt-5 text-muted-foreground">Free while we're in beta. We'll email you when there's a seat.</p></div><WaitlistForm /></div></section>
  </main></PublicShell>;
}
