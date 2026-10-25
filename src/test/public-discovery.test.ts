import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { upcomingFeatures, liveFeatures } from '@/lib/public-features';
import { publicHead } from '@/lib/public-head';
import { DISCOVERY_ORIGIN, DISCOVERY_LAST_UPDATED, PUBLIC_DISCOVERY_PATHS, discoveryRobots, discoverySitemap, discoveryLlms } from '@/lib/public-discovery';

describe('public discovery and feature availability', () => {
  it('keeps five unbuilt capabilities out of the live feature inventory', () => {
    expect(upcomingFeatures.map(f => f.name)).toEqual(['Google search growth', 'Listing optimization', 'Results', 'Competitor gaps', 'Experiments']);
    expect(liveFeatures.map(f => f.id)).toEqual(['conversations', 'conversion', 'audit', 'technical', 'tracking', 'visibility', 'profile', 'workspace']);
    expect(liveFeatures.some(f => /Google search|Listing optimization|Competitor gaps|Experiments/.test(f.name))).toBe(false);
  });
  it('sitemaps only the three public content pages, without fabricated timestamps', () => {
    const xml = readFileSync('public/sitemap.xml', 'utf8');
    const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
    expect(urls).toEqual(['https://growloop-mcads.lovable.app/', 'https://growloop-mcads.lovable.app/features', 'https://growloop-mcads.lovable.app/privacy']);
    expect(xml.includes('<lastmod>')).toBe(false);
  });
  it('has a wildcard User-agent line', () => {
    const robots = readFileSync('public/robots.txt', 'utf8');
    expect(robots.split('\n').filter(line => /^User-agent:/.test(line))).toEqual(['User-agent: *']);
  });
  it('has no duplicate nonempty crawler lines', () => {
    const lines = readFileSync('public/robots.txt', 'utf8').split('\n').map(line => line.trim()).filter(Boolean);
    expect(new Set(lines).size).toBe(lines.length);
  });
  it('disallows admin explicitly', () => {
    expect(readFileSync('public/robots.txt', 'utf8').split('\n')).toContain('Disallow: /admin');
  });
  it('allows public pages and blocks every requested private route', () => {
    const lines = readFileSync('public/robots.txt', 'utf8').split('\n');
    expect(lines).toContain('Allow: /');
    for (const path of ['/overview', '/settings', '/products', '/conversion-leaks', '/integrations', '/ai-search-visibility', '/auth', '/api/']) expect(lines).toContain(`Disallow: ${path}`);
    expect(lines).toContain('Sitemap: https://growloop-mcads.lovable.app/sitemap.xml');
  });
  it('keeps both static discovery files synchronized with one origin setting', () => {
    expect(readFileSync('public/robots.txt', 'utf8')).toBe(discoveryRobots());
    expect(readFileSync('public/sitemap.xml', 'utf8')).toBe(discoverySitemap());
    expect(readFileSync('public/llms.txt', 'utf8')).toBe(discoveryLlms());
  });
  it('lists exactly the live and coming feature inventories in llms.txt', () => {
    const llms = readFileSync('public/llms.txt', 'utf8');
    const names = (section: string) => [...section.matchAll(/^- \[([^\]]+)\]/gm)].map(m => m[1]);
    expect(names(llms.split('## Live today\n')[1]?.split('## Soon')[0] ?? '')).toEqual(liveFeatures.map(f => f.name));
    expect(names(llms.split('## Soon\n')[1]?.split('## Pages')[0] ?? '')).toEqual(upcomingFeatures.map(f => f.name));
  });
  it('uses the discovery origin for only public llms page links and includes its update date', () => {
    const llms = readFileSync('public/llms.txt', 'utf8');
    const pages = llms.split('## Pages\n')[1]?.split('## Contact')[0] ?? '';
    expect([...pages.matchAll(/\]\(([^)]+)\)/g)].map(m => m[1])).toEqual(PUBLIC_DISCOVERY_PATHS.map(path => `${DISCOVERY_ORIGIN}${path}`));
    expect(llms).toContain(`Last updated: ${DISCOVERY_LAST_UPDATED}`);
    expect(DISCOVERY_LAST_UPDATED).toBe('2026-10-25');
  });
  it('self-references Features with its own title and description', () => {
    const head = publicHead('https://growloop-mcads.lovable.app', '/features', 'Features — Growloop', 'Live Growloop features');
    expect(head.links[0]?.href).toBe('https://growloop-mcads.lovable.app/features');
    expect(head.meta.find(m => m.property === 'og:url')?.content).toBe('https://growloop-mcads.lovable.app/features');
  });
});
