import { CONTACT_EMAIL } from './public-config';

// Single source for the landing FAQ: the accordion and the FAQPage JSON-LD
// are both built from this list so they can never drift apart.
export type Faq = { q: string; a: string };

export const FAQS: Faq[] = [
  { q: 'What is Growloop?', a: 'Growloop is a growth app for solo founders. It finds why your product is not growing, helps you fix it, and measures what happens next.' },
  { q: 'Who is it for?', a: 'Solo founders with a live product, and founders collecting a waitlist before launch. Pre-launch products count waitlist joins instead of signups.' },
  { q: 'How is it different from posting and scheduling tools?', a: 'Those tools help you publish more. Growloop helps you find what to fix: where visitors drop off, whether AI assistants recommend you, and whether your changes moved your numbers.' },
  { q: 'Does it post or reply for me?', a: 'No. You always post from your own account. Growloop never posts, sends or publishes anything for you.' },
  { q: 'What does it cost?', a: 'Free while we are in beta. A paid plan will come later, and we will tell you well before anything changes. No card is needed to join the waitlist.' },
  { q: 'What data does it collect?', a: 'The tracking snippet records page paths, events such as signups or waitlist joins, campaign sources and referrer hostnames, linked to a random visitor ID. No names, email addresses, IP addresses or tracking cookies, and it honors Do Not Track and Global Privacy Control. Details are on the privacy page.' },
  { q: 'Which AI assistants does it check?', a: 'ChatGPT, Perplexity and Claude. It asks your saved buyer questions several times and measures how often your product is recommended.' },
  { q: 'How accurate is the AI visibility score?', a: 'It is a sample from repeated runs, not a ranking or a guarantee. AI answers vary, so Growloop shows trends and labels the numbers as samples.' },
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
      { '@type': 'Organization', name: 'Growloop', url: origin, email: CONTACT_EMAIL },
      { '@type': 'WebSite', name: 'Growloop', url: origin },
      {
        '@type': 'SoftwareApplication',
        name: 'Growloop',
        description: 'A growth app for solo founders that finds why a product is not growing, helps fix it, and measures what happens next.',
        applicationCategory: 'BusinessApplication',
        url: origin,
        offers: { '@type': 'Offer', price: 0, priceCurrency: 'USD', description: 'Free while in beta' },
      },
      faqPageJsonLd(),
    ],
  });
}
