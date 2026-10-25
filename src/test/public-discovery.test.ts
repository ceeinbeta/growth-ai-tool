import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { upcomingFeatures, liveFeatures } from '@/lib/public-features';
import { publicHead } from '@/lib/public-head';

describe('public discovery and feature availability', () => {
  it('keeps six unbuilt capabilities out of the live feature inventory', () => {
    expect(upcomingFeatures.map(f => f.name)).toEqual(['Google search growth', 'Listing optimization', 'Finding conversations', 'Results', 'Competitor gaps', 'Experiments']);
    expect(liveFeatures.map(f => f.id)).toEqual(['conversion', 'audit', 'tracking', 'visibility', 'profile', 'workspace']);
    expect(liveFeatures.some(f => /Google search|Listing optimization|Finding conversations|Competitor gaps|Experiments/.test(f.name))).toBe(false);
  });
  it('sitemaps only the three public content pages, without fabricated timestamps', () => {
    const xml = readFileSync('public/sitemap.xml', 'utf8');
    const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
    expect(urls).toEqual(['https://growloop-mcads.lovable.app/', 'https://growloop-mcads.lovable.app/features', 'https://growloop-mcads.lovable.app/privacy']);
    expect(xml.includes('<lastmod>')).toBe(false);
  });
  it('preserves crawler exclusions and allows Features in each block', () => {
    const robots = readFileSync('public/robots.txt', 'utf8');
    for (const block of robots.trim().split(/\n\s*\n/)) {
      expect(block.includes('Allow: /features')).toBe(true);
      for (const path of ['/auth', '/overview', '/products', '/conversion-leaks', '/integrations', '/admin', '/ai-search-visibility', '/api/']) expect(block.includes(`Disallow: ${path}`)).toBe(true);
    }
    expect(robots.includes('Sitemap: https://growloop-mcads.lovable.app/sitemap.xml')).toBe(true);
  });
  it('self-references Features with its own title and description', () => {
    const head = publicHead('https://growloop-mcads.lovable.app', '/features', 'Features — Growloop', 'Live Growloop features');
    expect(head.links[0]?.href).toBe('https://growloop-mcads.lovable.app/features');
    expect(head.meta.find(m => m.property === 'og:url')?.content).toBe('https://growloop-mcads.lovable.app/features');
  });
});
