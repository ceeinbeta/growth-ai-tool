import { CONTACT_EMAIL } from './public-config';

// Single source for the landing FAQ: the accordion and the FAQPage JSON-LD
// are both built from this list so they can never drift apart.
export type Faq = { q: string; a: string };

export const FAQS: Faq[] = [
  { q: 'What is Brambly?', a: 'Brambly is a growth app for solo founders that finds what’s holding your product back, helps you clear it, and measures what happens next.' },
  { q: 'Who is it for?', a: 'Solo founders with a live product, and founders collecting a waitlist before launch. Pre-launch products count waitlist joins instead of signups.' },
  { q: 'How is it different from posting and scheduling tools?', a: 'Brambly helps you find what to fix: where visitors drop off, whether AI assistants recommend you, and what your visits and signups look like over time.' },
  { q: 'Does it post or reply for me?', a: 'No. You always post from your own account. Brambly never posts, sends or publishes anything for you.' },
  { q: 'What does it cost?', a: 'Free while we are in beta. A paid plan may come later; beta users will hear about it before anything changes. No card is needed to join the waitlist.' },
  { q: 'What data does it collect?', a: 'The tracking snippet records page paths, events such as signups or waitlist joins, campaign sources and referrer hostnames, linked to a random visitor ID. No names, email addresses, IP addresses or tracking cookies, and it honors Do Not Track and Global Privacy Control. Details are on the privacy page.' },
  { q: 'Which AI assistants does it check?', a: 'It is built to check ChatGPT, Perplexity and Claude. Each one is available once its connection is set up, so some may show as not connected.' },
  { q: 'How accurate is the AI visibility score?', a: 'It is a sample from repeated runs, not a ranking. AI answers vary, so Brambly shows trends and labels the numbers as samples.' },
  { q: 'Does it work before I launch?', a: 'Yes. Pre-launch products track waitlist joins instead of signups, and every audit works the same way.' },
  { q: 'How do I delete my details?', a: `Email ${CONTACT_EMAIL} and ask. We'll delete your details. More on the privacy page.` },
];

export function faqPageJsonLd() {
  return {
    '@type': 'FAQPage',
    mainEntity: FAQS.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  };
}

export function landingJsonLd(origin: string) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', name: 'Brambly', url: origin, email: CONTACT_EMAIL, logo: new URL('/favicon.svg', origin).href },
      { '@type': 'WebSite', name: 'Brambly', url: origin },
      {
        '@type': 'SoftwareApplication',
        name: 'Brambly',
        description: 'A growth app for solo founders that finds what’s holding a product back, helps clear it, and measures what happens next.',
        applicationCategory: 'BusinessApplication',
        url: origin,
        offers: { '@type': 'Offer', price: 0, priceCurrency: 'USD', description: 'Free while in beta' },
      },
      faqPageJsonLd(),
    ],
  });
}
