// Integrations that are not built yet; shown as Soon, never as links.
// Order is part of the product page and covered by tests.
export const COMING_INTEGRATIONS = [
  { name: 'Google Search Console', gives: 'See which Google searches bring visitors to your site.' },
  { name: 'Google Analytics', gives: 'Bring in visits you already measure in Google Analytics.' },
  { name: 'PostHog', gives: 'Use your existing PostHog events in your funnel.' },
  { name: 'Stripe', gives: 'See revenue per channel: which visitors became paying customers.' },
  { name: 'Bing Webmaster Tools', gives: 'See which Bing searches bring visitors to your site.' },
  { name: 'Slack', gives: 'A weekly summary and alerts you approve, in your Slack.' },
  { name: 'Notion / CSV export', gives: 'Take your reports with you.' },
];

/** Mailto only: no form, nothing stored. */
export const requestIntegrationHref = (name: string) =>
  `mailto:hello@mcads.co?subject=${encodeURIComponent(`Integration request: ${name}`)}`;
