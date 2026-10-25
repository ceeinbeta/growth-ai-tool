import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { render } from '@testing-library/react';
import { Logo } from '@/components/Logo';
import { BRAND_MARK_PATHS, BRAND_MARK_CIRCLES } from '@/lib/brand-mark';
import { publicHead } from '@/lib/public-head';
import { landingJsonLd } from '@/lib/public-faq';

describe('d15 exact brand assets', () => {
  it('uses the supplied paths and circles for every logo tone and variant', () => {
    expect(BRAND_MARK_PATHS).toEqual(['M46.5 21.5C42.9 16.8 37.2 14 31 14C20.5 14 12 22.5 12 33C12 43.5 20.5 52 31 52C41.5 52 50 43.5 50 33V17', 'M50 17C50 25.8 42.8 33 34 33H26']);
    expect(BRAND_MARK_CIRCLES).toEqual([{ cx: 50, cy: 14, r: 5 }, { cx: 24, cy: 33, r: 5 }]);
    for (const tone of ['default','inverse','ink'] as const) {
      const { container, unmount } = render(<Logo tone={tone} variant="mark-only" />);
      expect([...container.querySelectorAll('path')].map(p => p.getAttribute('d'))).toEqual([...BRAND_MARK_PATHS]);
      expect(container.querySelector('.logo-wordmark')).toBeNull();
      unmount();
    }
    const favicon = readFileSync('public/favicon.svg','utf8');
    for (const d of BRAND_MARK_PATHS) expect(favicon).toContain(d);
  });
  it('tags one absolute shared social image only on leaf content metadata', () => {
    for (const path of ['/', '/features', '/privacy']) {
      const meta = publicHead('https://growloop-mcads.lovable.app',path,'Growloop','Growloop').meta;
      expect(meta.find(m => m.property === 'og:image')?.content).toBe('https://growloop-mcads.lovable.app/brand-social.jpg');
      expect(meta.find(m => m.name === 'twitter:image')?.content).toBe('https://growloop-mcads.lovable.app/brand-social.jpg');
    }
    expect(readFileSync('src/routes/__root.tsx','utf8')).not.toMatch(/og:image|twitter:image/);
    const graph = JSON.parse(landingJsonLd('https://growloop-mcads.lovable.app'))['@graph'];
    expect(graph.find((n: { '@type': string }) => n['@type'] === 'Organization').logo).toBe('https://growloop-mcads.lovable.app/favicon.svg');
  });
});