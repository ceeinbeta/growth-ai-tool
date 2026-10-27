import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { FAQS, faqPageJsonLd, landingJsonLd } from '@/lib/public-faq';
import { liveFeatures, upcomingFeatures } from '@/lib/public-features';

describe('landing SEO and GEO metadata', () => {
  it('keeps the title under 60 and the description under 155 characters', () => {
    const source = readFileSync('src/routes/index.tsx', 'utf8');
    const title = /const TITLE = '([^']+)'/.exec(source)?.[1] ?? '';
    const description = /const DESCRIPTION = "([^"]+)"/.exec(source)?.[1] ?? '';
    expect(title.length).toBeGreaterThan(0);
    expect(title.length).toBeLessThan(60);
    expect(description.length).toBeGreaterThan(0);
    expect(description.length).toBeLessThan(155);
  });
  it('builds FAQPage JSON-LD from the same data the accordion renders', () => {
    const graph = JSON.parse(landingJsonLd('https://growloop-mcads.lovable.app'))['@graph'];
    const faq = graph.find((node: { '@type': string }) => node['@type'] === 'FAQPage');
    expect(faq.mainEntity).toHaveLength(FAQS.length);
    expect(faq.mainEntity.map((q: { name: string }) => q.name)).toEqual(FAQS.map(f => f.q));
    expect(faq.mainEntity.map((q: { acceptedAnswer: { text: string } }) => q.acceptedAnswer.text)).toEqual(FAQS.map(f => f.a));
    expect(faqPageJsonLd().mainEntity).toHaveLength(FAQS.length);
  });
  it('describes the app honestly: free in beta, business category, no ratings or reviews', () => {
    const graph = JSON.parse(landingJsonLd('https://growloop-mcads.lovable.app'))['@graph'];
    const app = graph.find((node: { '@type': string }) => node['@type'] === 'SoftwareApplication');
    expect(app.applicationCategory).toBe('BusinessApplication');
    expect(app.offers).toMatchObject({ price: 0, description: 'Free while in beta' });
    expect(JSON.stringify(graph)).not.toMatch(/aggregateRating|review/i);
    expect(graph.some((node: { '@type': string }) => node['@type'] === 'Organization')).toBe(true);
    expect(graph.some((node: { '@type': string }) => node['@type'] === 'WebSite')).toBe(true);
  });
  it('asks 8 to 10 answer-first questions including cost, posting and accuracy', () => {
    expect(FAQS.length).toBeGreaterThanOrEqual(8);
    expect(FAQS.length).toBeLessThanOrEqual(10);
    const all = FAQS.map(f => `${f.q} ${f.a}`).join(' ');
    expect(all).toContain('Free while we are in beta');
    expect(all).toContain('You always post from your own account');
    expect(all).toContain('sample');
    expect(all).toContain('hello@mcads.co');
  });
  it('ships an llms.txt that names live and coming-next features and the contact', () => {
    const llms = readFileSync('public/llms.txt', 'utf8');
    expect(llms).toContain('# Brambly');
    expect(llms).toContain('hello@mcads.co');
    expect(llms).toContain('Technical audit');
    expect(llms).toContain('Soon');
    expect(llms).toContain('[Features](https://growloop-mcads.lovable.app/features)');
  });
  it('lists the technical audit and page audit by address as live features', () => {
    const ids = liveFeatures.map(f => f.id);
    expect(ids).toContain('technical');
    expect(liveFeatures.find(f => f.id === 'audit')?.name).toBe('Page audit by address');
    expect(upcomingFeatures.map(f => f.name)).toContain('Google search growth');
  });
});
