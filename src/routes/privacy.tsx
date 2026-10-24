import { createFileRoute } from '@tanstack/react-router';
import { PublicShell } from '@/components/PublicShell';
import { CONTACT_EMAIL, PRIVACY_UPDATED } from '@/lib/public-config';
import { getPublicOrigin } from '@/lib/public-origin.functions';
import { publicHead } from '@/lib/public-head';

export const Route = createFileRoute('/privacy')({
  loader: () => getPublicOrigin(),
  head: ({ loaderData }) => publicHead(loaderData ?? 'https://growloop-mcads.lovable.app', '/privacy', 'Privacy — Growloop', 'How Growloop uses your beta waitlist details, what the tracking snippet records, and how to ask for deletion.'),
  component: PrivacyPage,
});

export function PrivacyPage() {
  return <PublicShell><main id="main-content" className="mx-auto max-w-3xl px-6 py-16 md:py-20">
    <p className="mb-3 text-sm font-semibold text-primary">Growloop</p><h1 className="text-4xl">Privacy</h1><p className="mt-4 text-sm text-muted-foreground">Last updated {PRIVACY_UPDATED}</p>
    <div className="mt-12 space-y-9 text-base leading-relaxed">
      <section><h2 className="mb-3 text-xl">What we collect</h2><p className="text-muted-foreground">When you join the beta waitlist, we collect your email, your website and product stage if you provide them, and any campaign source, medium or campaign name present in the link you came from. We also record the time you agreed and the consent wording you agreed to. We do not store your IP address or browser user agent.</p></section>
      <section><h2 className="mb-3 text-xl">Why we collect it</h2><p className="text-muted-foreground">To invite you to the beta and tell you about Growloop. Joining the waitlist does not create an account. The app does not automatically send a confirmation email.</p></section>
      <section><h2 className="mb-3 text-xl">Who sees it</h2><p className="text-muted-foreground">Only the founder can access the waitlist. Your details are not sold or shared.</p></section>
      <section><h2 className="mb-3 text-xl">How long we keep it</h2><p className="text-muted-foreground">Until you ask us to delete your details or the beta ends.</p></section>
      <section><h2 className="mb-3 text-xl">How to delete your details</h2><p className="text-muted-foreground">{CONTACT_EMAIL ? <>Email <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline">{CONTACT_EMAIL}</a> and ask for your waitlist details to be deleted.</> : 'Reply to any email from us and ask for your waitlist details to be deleted.'}</p></section>
      <section><h2 className="mb-3 text-xl">The Growloop tracking snippet</h2><p className="text-muted-foreground">On websites where it is installed, the snippet uses a random visitor ID stored in your browser to record page paths, visits, signups or waitlist joins, campaign sources and referrer hostnames. It records no names, email addresses or IP addresses, and uses no fingerprinting. It sends nothing when Do Not Track or Global Privacy Control is enabled. Tracking is not enabled on this landing page while its product key is unset.</p></section>
      <section><h2 className="mb-3 text-xl">Cookies</h2><p className="text-muted-foreground">Growloop uses no tracking cookies on this page.</p></section>
    </div>
  </main></PublicShell>;
}