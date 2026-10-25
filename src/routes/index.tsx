import { ActionRow, ActionHeader } from '@/components/ActionRow';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { ArrowRight, ChartNoAxesColumn, Droplets, ScanText, Search, MessageCircle, Target, Check } from 'lucide-react';
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
import { upcomingFeatures } from '@/lib/public-features';

export const Route = createFileRoute('/')({
  loader: () => getPublicOrigin(),
  head: ({ loaderData }) => publicHead(loaderData ?? 'https://growloop-mcads.lovable.app', '/', 'Growloop — a growth app for solo founders', 'See where visitors drop off, get help fixing it, and measure what happens next with real visits and signups. Join the free beta waitlist.'),
  component: LandingPage,
});

const faqs: [string, string][] = [
  ['Who is it for?', 'Solo founders building a live product, collecting a waitlist, or working toward their first launch.'],
  ['Does it cost anything?', "Free during the beta. We'll tell you well before anything changes."],
  ['Will it post for me?', 'No. You always post from your own account.'],
  ['What data does the snippet collect?', 'Page paths, events such as signups or waitlist joins, campaign sources and referrer hostnames, linked to a random visitor ID. No names, email addresses, IP addresses or tracking cookies. It honors Do Not Track and Global Privacy Control.'],
  ['Does it work before I launch?', 'Yes. Collecting a waitlist? Growloop counts joins instead of revenue.'],
];

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
      <div><p className="public-eyebrow">Growth for solo founders</p><h1 className="mt-5 text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">Find the leak.<br />Fix it.<br />Prove it worked.</h1><p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">Growloop is a growth app for solo founders. It shows where visitors drop off, helps you fix it, and measures what happens next, so you stop guessing what to work on.</p><ActionRow layout="section" className="mt-8"><Button asChild size="lg"><a href="#waitlist">Join the beta waitlist<ArrowRight /></a></Button><Button asChild size="lg" variant="outline"><Link to="/features">Explore features</Link></Button></ActionRow><p className="mt-4 text-sm text-muted-foreground">Free during beta. Invite-only. No automatic posting.</p></div><PublicProductIllustration />
    </div></section>
    <section className="public-section bg-card"><div className="public-container"><p className="public-eyebrow">The hard part comes next</p><h2 className="public-heading"><em className="human-phrase">Shipping was the easy part.</em></h2><div className="mt-10 grid gap-5 md:grid-cols-3">{[
      [Droplets, 'Visitors arrive. Then leave.', 'More traffic does not fix a signup step that loses people. First, find where they drop off.'],
      [Search, 'Buyers ask AI. Are you there?', 'AI assistants answer “what should I use?” Your product may not be in the answer.'],
      [Target, 'Busy is not the same as growing.', 'You can publish, launch and post all week without knowing whether your numbers changed.'],
    ].map(([Icon, title, text]) => { const I = Icon as typeof Droplets; return <article key={String(title)} className="border-t py-6"><I className="mb-6 size-6 text-foreground" /><h3 className="text-xl">{String(title)}</h3><p className="mt-3 leading-relaxed text-muted-foreground">{String(text)}</p></article>; })}</div></div></section>
    <section className="public-section"><div className="public-container"><p className="public-eyebrow">Diagnose. Act. Measure.</p><h2 className="public-heading">One loop, three jobs.</h2><div className="mt-10 grid gap-8 md:grid-cols-3">{[
      [Droplets, 'Find the leak', 'Follow your funnel, find the biggest drop-off and check the page copy behind it.'],
      [ScanText, 'Fix it', 'Review AI-written findings and suggested rewrites. Make the changes yourself.'],
      [ChartNoAxesColumn, 'Prove it worked', 'Follow real visits and signups after you make a change.'],
    ].map(([Icon, title, text], i) => { const I = Icon as typeof Droplets; return <div key={String(title)} className="relative border-t-2 border-foreground pt-6"><div className="flex items-center justify-between"><I className="size-7 text-foreground" /><PublicStatus /></div><h3 className="mt-6 text-2xl">{String(title)}</h3><p className="mt-3 leading-relaxed text-muted-foreground">{String(text)}</p>{i === 2 && <p className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground"><PublicStatus upcoming />Which action brought signups</p>}{i < 2 && <ArrowRight aria-hidden="true" className="absolute -right-6 top-12 hidden size-5 text-foreground md:block" />}</div>; })}</div></div></section>
    <section className="public-section border-y bg-card"><div className="public-container"><p className="public-eyebrow">Beyond buying more traffic</p><h2 className="public-heading">Get discovered. Grow organically.</h2><p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">Help the right people find your product, then turn those visits into signups. Start with what works today; the rest is coming next.</p><div className="mt-10 grid gap-5 sm:grid-cols-2">{[
      [Search, 'AI search visibility', 'See how often ChatGPT, Perplexity and Claude recommend you, and get suggestions for how to get cited.', false],
      [ChartNoAxesColumn, 'Google search growth', 'Understand organic searches and improve the pages that could bring visitors.', true],
      [MessageCircle, 'Find your audience', 'Find conversations on Reddit, Hacker News and X. You will post replies yourself.', true],
      [Droplets, 'Convert your visitors', 'Measure your funnel and get an AI page audit with suggested rewrites.', false],
    ].map(([Icon, title, text, upcoming]) => { const I = Icon as typeof Search; return <article key={String(title)} className="rounded-md border p-6"><div className="flex items-center justify-between"><I className="size-6 text-foreground" /><PublicStatus upcoming={Boolean(upcoming)} /></div><h3 className="mt-6 text-xl">{String(title)}</h3><p className="mt-3 leading-relaxed text-muted-foreground">{String(text)}</p></article>; })}</div></div></section>
    <section id="how-it-works" className="public-section"><div className="public-container"><p className="public-eyebrow">A clear place to start</p><h2 className="public-heading">See it work.</h2><ol className="mt-10 grid gap-8 md:grid-cols-3">{[
      ['Add your product', 'Review your AI-written audience, competitors and buyer questions.'],
      ['Connect your website', 'Install the snippet, check it, and start collecting real visits and signups.'],
      ['Find your next fix', 'Review your funnel, audit your copy, and check your AI search visibility.'],
    ].map(([title, text], i) => <li key={title}><span className="font-display text-3xl font-bold text-foreground">0{i + 1}</span><h3 className="mt-4 text-xl">{title}</h3><p className="mt-3 leading-relaxed text-muted-foreground">{text}</p></li>)}</ol><ActionRow layout="section" className="mt-10"><Button asChild variant="outline" size="lg"><Link to="/features">How it works in detail<ArrowRight /></Link></Button></ActionRow></div></section>
    <section className="public-section border-y bg-background"><div className="public-container"><h2 className="public-heading">Our rules.</h2><div className="mt-10 grid gap-8 md:grid-cols-3">{[
      ['You approve everything.', 'Growloop drafts, you post. Nothing is sent or published without your yes.'],
      ['Every number has a source.', 'Numbers are labeled measured, estimated, benchmark or sample. AI-written content is labeled too.'],
      ['No personal visitor data.', 'The snippet uses a random ID, not names or emails. It sends nothing when Do Not Track or Global Privacy Control is on.'],
    ].map(([title, text]) => <div key={title}><Check className="mb-4 size-5 text-foreground" /><h3 className="text-xl">{title}</h3><p className="mt-3 leading-relaxed text-muted-foreground">{text}</p></div>)}</div></div></section>
    <section className="public-container flex flex-col justify-between gap-5 py-14 md:flex-row md:items-center"><h2 className="text-2xl">For live products.<br />And the ones not launched yet.</h2><p className="max-w-md text-lg leading-relaxed text-muted-foreground">Collecting a waitlist? Growloop counts joins instead of revenue.</p></section>
    <section id="waitlist" className="public-section border-y bg-card"><div className="public-container grid gap-10 md:grid-cols-2"><div><p className="public-eyebrow">Growloop beta</p><h2 className="public-heading">Get a beta seat.</h2><p className="mt-5 max-w-sm text-lg leading-relaxed text-muted-foreground">Free while we're in beta. We'll email you when there's a seat.</p></div><WaitlistForm /></div></section>
    <section id="faq" className="public-section"><div className="mx-auto max-w-3xl px-5 sm:px-8"><p className="public-eyebrow">Before you join</p><h2 className="public-heading mb-8">A few questions.</h2><Accordion type="single" collapsible>{faqs.map(([title, text]) => <AccordionItem key={title} value={title}><AccordionTrigger className="text-base">{title}</AccordionTrigger><AccordionContent className="leading-relaxed text-muted-foreground">{text}</AccordionContent></AccordionItem>)}<AccordionItem value="delete"><AccordionTrigger className="text-base">How do I delete my waitlist entry?</AccordionTrigger><AccordionContent className="leading-relaxed text-muted-foreground">Email <a href={`mailto:${CONTACT_EMAIL}`} className="text-foreground underline">{CONTACT_EMAIL}</a> and ask. We'll delete your details. More on the <Link to="/privacy" className="text-foreground underline">privacy page</Link>.</AccordionContent></AccordionItem><AccordionItem value="future"><AccordionTrigger className="text-base">What does Growloop not do yet?</AccordionTrigger><AccordionContent><ul className="space-y-3">{upcomingFeatures.map(feature => <li key={feature.name} className="flex flex-wrap items-center gap-2"><PublicStatus upcoming /><span>{feature.name}</span></li>)}</ul><p className="mt-4 text-muted-foreground">These are not available today. Growloop never posts replies for you.</p></AccordionContent></AccordionItem></Accordion></div></section>
  </main></PublicShell>;
}
