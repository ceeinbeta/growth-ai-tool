import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { COMING_INTEGRATIONS, requestIntegrationHref } from '@/lib/integrations';

describe('coming-next integrations list', () => {
  it('keeps the promised order', () => {
    expect(COMING_INTEGRATIONS.map(i => i.name)).toEqual([
      'Google Search Console', 'Google Analytics', 'PostHog', 'Stripe',
      'Bing Webmaster Tools', 'Slack', 'Notion / CSV export',
    ]);
  });
  it('every entry has a one-line benefit', () => {
    for (const i of COMING_INTEGRATIONS) expect(i.gives.length).toBeGreaterThan(10);
  });
});

describe('request an integration', () => {
  it('is a mailto to hello@mcads.co with the integration name, no form or storage', () => {
    const href = requestIntegrationHref('Slack');
    expect(href).toBe('mailto:hello@mcads.co?subject=Integration%20request%3A%20Slack');
    expect(href.startsWith('mailto:hello@mcads.co')).toBe(true);
  });
});

describe('integrations page honesty', () => {
  const page = readFileSync('src/routes/_authenticated/integrations.tsx', 'utf8');
  it('coming-next cards are not links and carry the visible label', () => {
    expect(page).toContain('aria-disabled="true"');
    expect(page).toContain('Soon');
    const comingSection = page.slice(page.indexOf('Soon'));
    expect(comingSection).not.toContain('<Link');
  });
  it('states nothing connects today', () => {
    expect(page).toContain('Nothing here connects to your accounts today');
  });
});
