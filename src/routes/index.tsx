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
import loopImage from '@/assets/growloop-loop.jpg';

export const Route = createFileRoute('/')({
  loader: () => getPublicOrigin(),
  head: ({ loaderData }) => publicHead(loaderData ?? 'https://growloop-mcads.lovable.app', '/', 'Growloop — a growth app for solo founders', 'See where visitors drop off, get help fixing it, and measure what happens next with real visits and signups. Join the free beta waitlist.'),
  component: LandingPage,
});

const today = [
  { icon: Droplets, title: 'Find your biggest leak', text: 'See where visitors drop off, compared with a rule-of-thumb benchmark (labeled as one), and get an AI audit of your page copy with rewrites.' },
  { icon: ChartNoAxesColumn, title: 'Know your numbers', text: 'A small tracking snippet records visits, where they came from and signups, with no personal data.' },
  { icon: ScanText, title: 'A profile of your product', text: 'Audience, category, competitors and the questions buyers ask AI assistants, written by AI for you to check and edit.' },
];
const next = [
  { icon: Search, title: 'AI search visibility', text: 'How often ChatGPT, Perplexity and Claude recommend you next to your competitors.' },
  { icon: MessageCircle, title: 'Opportunities', text: 'People asking for your kind of product on Reddit, Hacker News and X, with a reply draft you post yourself.' },
  { icon: Target, title: 'Results', text: 'Which actions brought signups.' },
];
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
    <section className="landing-hero relative isolate overflow-hidden border-b">
      <img src={loopImage} alt="" width={1536} height={1024} fetchPriority="high" className="absolute inset-0 -z-10 h-full w-full object-cover" />
      <div className="mx-auto max-w-6xl px-6 py-16 md:px-10 md:py-24">
        <p className="mb-5 flex items-center gap-2 text-sm font-semibold text-primary"><span className="h-2 w-2 rounded-full bg-signal" />Growloop · For solo founders</p>
        <h1 className="max-w-xl text-4xl font-extrabold leading-tight md:text-6xl">Find the leak.<br />Fix it.<br />Prove it worked.</h1>
        <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground md:text-lg">Growloop is a growth app for solo founders. It shows where visitors drop off, helps you fix it, and measures what happens next, so you stop guessing what to work on.</p>
        <Button asChild size="lg" className="mt-8 h-12"><a href="#waitlist">Join the beta waitlist<ArrowRight /></a></Button>
        <p className="mt-3 text-sm text-muted-foreground">Free while we're in beta.</p>
      </div>
    </section>
    <section className="mx-auto max-w-6xl px-6 py-16 md:px-10 md:py-20">
      <h2 className="max-w-2xl text-3xl leading-snug">Most early products don't have a traffic problem.</h2>
      <div className="mt-9 grid gap-8 md:grid-cols-3">{[
        'Visitors arrive, then leave at the same step. More traffic just leaks faster.',
        "AI assistants now answer 'what should I use?' and you may not be in the answer.",
        "Tasks get counted, results don't. Growloop tracks users, not posts.",
      ].map(text => <p key={text} className="border-t-2 border-primary pt-5 text-base leading-relaxed text-muted-foreground">{text}</p>)}</div>
    </section>
    <section className="border-y bg-card"><div className="mx-auto max-w-6xl px-6 py-16 md:px-10 md:py-20">
      <p className="mb-3 text-sm font-semibold text-primary">Built and ready to use</p><h2 className="text-3xl">What works today</h2>
      <div className="mt-8 grid gap-5 md:grid-cols-3">{today.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-md border bg-background p-6"><Icon className="mb-7 h-7 w-7 text-primary" /><h3 className="text-xl">{title}</h3><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</p></article>)}</div>
      <h2 className="mt-16 text-3xl">Coming next</h2>
      <div className="mt-8 grid gap-5 md:grid-cols-3">{next.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-md border p-6"><div className="mb-6 flex items-center justify-between gap-3"><Icon className="h-6 w-6 text-muted-foreground" /><span className="rounded-full bg-sunken px-3 py-1 text-xs font-medium text-muted-foreground">Coming next</span></div><h3 className="text-lg">{title}</h3><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</p></article>)}</div>
    </div></section>
    <section className="mx-auto max-w-6xl px-6 py-16 md:px-10 md:py-20"><h2 className="text-3xl">How Growloop works</h2>
      <ol className="mt-10 grid gap-8 sm:grid-cols-2 md:grid-cols-4">{([
        ['Diagnose', 'See where visitors drop off and check the copy behind that step.'],
        ['Act', 'Review the suggested fix and make the change yourself.'],
        ['Measure', 'Follow real visits, signups or waitlist joins.'],
        ['Learn', 'Use what you measured to decide what to work on next.'],
      ] as const).map(([title, text], i) => <li key={title}><span className="text-sm font-semibold text-primary">0{i + 1}</span><h3 className="mt-3 text-xl">{title}</h3><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</p></li>)}</ol>
    </section>
    <section className="border-y bg-selected"><div className="mx-auto max-w-6xl px-6 py-16 md:px-10"><h2 className="text-3xl">Our rules</h2><div className="mt-8 grid gap-8 md:grid-cols-3">{[
      ['You approve everything.', 'Growloop drafts, you post. Nothing is sent or published without your yes.'],
      ['Every number has a source.', 'Every number says where it came from: measured, estimated, or benchmark.'],
      ['No personal visitor data.', 'The snippet uses a random ID, not names or emails. It also records visits and sources, and does nothing if a visitor has Do Not Track on.'],
    ].map(([title, text]) => <div key={title}><Check className="mb-4 h-5 w-5 text-primary" /><h3 className="text-lg">{title}</h3><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</p></div>)}</div></div></section>
    <section className="mx-auto max-w-6xl px-6 py-14 md:px-10"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-center"><h2 className="max-w-md text-2xl">For live products.<br />And the ones not launched yet.</h2><p className="max-w-md text-base leading-relaxed text-muted-foreground">Collecting a waitlist? Growloop counts joins instead of revenue.</p></div></section>
    <section id="waitlist" className="scroll-mt-6 border-y bg-card"><div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-2 md:px-10 md:py-20"><div><p className="mb-3 text-sm font-semibold text-primary">Growloop beta</p><h2 className="max-w-sm text-4xl leading-tight">Join the beta waitlist.</h2><p className="mt-5 max-w-sm leading-relaxed text-muted-foreground">Free while we're in beta. We'll email you when there's a seat.</p></div><WaitlistForm /></div></section>
    <section className="mx-auto max-w-3xl px-6 py-16 md:py-20"><h2 className="mb-7 text-3xl">A few questions</h2><Accordion type="single" collapsible>{faqs.map(([title, text]) => <AccordionItem key={title} value={title}><AccordionTrigger className="text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">{title}</AccordionTrigger><AccordionContent className="leading-relaxed text-muted-foreground">{text}</AccordionContent></AccordionItem>)}<AccordionItem value="delete"><AccordionTrigger className="text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">How do I delete my waitlist entry?</AccordionTrigger><AccordionContent className="leading-relaxed text-muted-foreground">Email <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline">{CONTACT_EMAIL}</a> and ask. We'll delete your details. More on the <Link to="/privacy" className="text-primary underline">privacy page</Link>.</AccordionContent></AccordionItem></Accordion></section>
  </main></PublicShell>;
}
