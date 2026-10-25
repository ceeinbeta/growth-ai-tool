import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { FAQS } from '@/lib/public-faq';
import { liveFeatures, upcomingFeatures } from '@/lib/public-features';

function unsafeClaims(text: string) {
  const banned = /guarantee|attribution|proves|increase your revenue|results in|moved your numbers/i;
  const unqualifiedRanking = text.split(/[.!?\n]+/).some(sentence => /\branking\b/i.test(sentence) && !/\bnot\b/i.test(sentence));
  return banned.test(text) || unqualifiedRanking;
}

describe('honest public claims', () => {
  it('rejects prohibited promises and unqualified ranking claims', () => {
    for (const phrase of ['guarantee', 'ranking', 'attribution', 'proves', 'increase your revenue', 'results in', 'moved your numbers']) {
      expect(unsafeClaims(phrase)).toBe(true);
    }
    expect(unsafeClaims('It is a sample, not a ranking.')).toBe(false);
    expect(unsafeClaims('Not connected. A ranking.')).toBe(true);
  });
  it('keeps FAQ, landing, Features and llms.txt free of prohibited claims', () => {
    const texts = [JSON.stringify(FAQS), JSON.stringify([...liveFeatures, ...upcomingFeatures]), ...['src/routes/index.tsx', 'src/routes/features.tsx', 'public/llms.txt'].map(path => readFileSync(path, 'utf8'))];
    for (const text of texts) expect(unsafeClaims(text)).toBe(false);
  });
  it('uses the requested FAQ answers without implying built experiments or fixed payment timing', () => {
    expect(FAQS.find(f => f.q === 'How is it different from posting and scheduling tools?')?.a).toBe('Growloop helps you find what to fix: where visitors drop off, whether AI assistants recommend you, and what your visits and signups look like over time.');
    expect(FAQS.find(f => f.q === 'Which AI assistants does it check?')?.a).toBe('It is built to check ChatGPT, Perplexity and Claude. Each one is available once its connection is set up, so some may show as not connected.');
    expect(FAQS.find(f => f.q === 'What does it cost?')?.a).toBe('Free while we are in beta. A paid plan may come later; beta users will hear about it before anything changes. No card is needed to join the waitlist.');
  });
});