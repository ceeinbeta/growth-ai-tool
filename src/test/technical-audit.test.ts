// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AI_CRAWLERS, hasVisiblePrice, jsonLdTypes, pricingPath, robotsBlockedAgents, robotsSitemaps,
  withinTechnicalAuditLimit, MIN_READABLE_TEXT,
} from '@/lib/technical-audit';
import { runTechnicalChecks, visibleText } from '@/lib/technical-audit.server';

const goodHtml = `<html lang="en"><head><title>Fixture — a tool for founders</title><meta name="description" content="Fixture helps solo founders measure where visitors drop off and fix it."><meta name="viewport" content="width=device-width"><link rel="canonical" href="https://publicsite.net/"><meta property="og:title" content="Fixture"><meta property="og:description" content="Measure drop-offs."><meta property="og:image" content="https://publicsite.net/og.png"><script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"Fixture"}</script><script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"SoftwareApplication","name":"Fixture"}]}</script></head><body><h1>Measure your funnel</h1><p>${'Real product copy for founders. '.repeat(40)}</p><a href="/pricing">Pricing</a></body></html>`;
const goodRobots = 'User-agent: *\nAllow: /\nSitemap: https://publicsite.net/sitemap.xml\n';
const pricingHtml = `<html><body><h1>Pricing</h1><p>${'Simple plans. '.repeat(20)} $12 per month or $120 per year.</p></body></html>`;

const html = (body: string) => new Response(body, { headers: { 'content-type': 'text/html' } });
const text = (body: string) => new Response(body, { headers: { 'content-type': 'text/plain' } });

/** Mock fetch routing by pathname for the standard success site. */
function stubSite(overrides: Record<string, Response | null> = {}) {
  const routes: Record<string, Response | null> = {
    '/': html(goodHtml), '/robots.txt': text(goodRobots), '/sitemap.xml': text('<urlset></urlset>'),
    '/llms.txt': text('# Fixture'), '/pricing': html(pricingHtml), ...overrides,
  };
  const fetch = vi.fn((input: unknown) => {
    const url = new URL(String(input));
    const r = routes[url.pathname];
    return Promise.resolve(r === null || r === undefined ? new Response('nope', { status: 404 }) : r.clone());
  });
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('technical audit checks', () => {
  it('enforces ten audits per rolling hour', () => {
    expect(withinTechnicalAuditLimit(9)).toBe(true);
    expect(withinTechnicalAuditLimit(10)).toBe(false);
  });

  it('passes a well-built site with all checks', async () => {
    const fetch = stubSite();
    const r = await runTechnicalChecks('publicsite.net');
    if (!r.ok) throw new Error('Expected a successful audit');
    expect(r.url).toBe('https://publicsite.net/');
    expect(r.findings.map(f => f.status)).toEqual(['pass', 'pass', 'pass', 'pass', 'pass', 'pass', 'pass', 'pass']);
    expect(r.findings[0]?.detail).toContain('ms (measured)');
    expect(r.findings[3]?.detail).toContain('Organization');
    expect(r.findings[3]?.detail).toContain('SoftwareApplication');
    expect(fetch).toHaveBeenCalledTimes(5);
    expect(Number.isFinite(Date.parse(r.fetchedAt))).toBe(true);
  });

  it('never fetches blocked or private hosts', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    for (const site of ['localhost', '127.0.0.1', 'private.internal', 'user:pass@publicsite.net', 'publicsite.net:8443']) {
      expect(await runTechnicalChecks(site)).toEqual({ ok: false, error: "Enter a public website address for your product first." });
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it('fails reachability when the redirect leaves the site', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 302, headers: { location: 'https://evil.net/' } }));
    vi.stubGlobal('fetch', fetch);
    const r = await runTechnicalChecks('publicsite.net');
    if (!r.ok) throw new Error('Expected a saved audit');
    expect(r.findings[0]?.status).toBe('attention');
    expect(r.findings.slice(1).every(f => f.status === 'unknown')).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('reports an oversized page as unreachable without leaking errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(html('x'.repeat(1024 * 1024 + 1))));
    const r = await runTechnicalChecks('publicsite.net');
    if (!r.ok) throw new Error('Expected a saved audit');
    expect(r.findings[0]).toMatchObject({ status: 'attention', detail: 'We could not reach your page over a secure connection.' });
  });

  it('warns when a page is readable only with JavaScript', async () => {
    stubSite({ '/': html('<html><body><main>Hello</main><script>dynamic</script></body></html>') });
    const r = await runTechnicalChecks('publicsite.net');
    if (!r.ok) throw new Error('Expected a successful audit');
    const readable = r.findings.find(f => f.key === 'readable');
    expect(readable?.status).toBe('attention');
    expect(readable?.detail).toContain('characters of visible text (measured)');
  });

  it('lists the AI crawlers a robots.txt blocks site-wide', async () => {
    stubSite({ '/robots.txt': text('User-agent: GPTBot\nDisallow: /\n\nUser-agent: ClaudeBot\nDisallow: /\n\nUser-agent: *\nAllow: /\nSitemap: https://publicsite.net/sitemap.xml\n') });
    const r = await runTechnicalChecks('publicsite.net');
    if (!r.ok) throw new Error('Expected a successful audit');
    const robots = r.findings.find(f => f.key === 'robots');
    expect(robots?.status).toBe('attention');
    expect(robots?.detail).toContain('GPTBot');
    expect(robots?.detail).toContain('ClaudeBot');
    expect(robots?.detail).not.toContain('PerplexityBot');
  });

  it('flags a wildcard block as blocking every AI crawler', () => {
    expect(robotsBlockedAgents('User-agent: *\nDisallow: /\n', [...AI_CRAWLERS])).toEqual([...AI_CRAWLERS]);
    expect(robotsBlockedAgents('User-agent: *\nDisallow: /\nAllow: /\n', ['GPTBot'])).toEqual([]);
    expect(robotsBlockedAgents('User-agent: GPTBot\nDisallow: /private\n', ['GPTBot'])).toEqual([]);
  });

  it('reports missing structured data without fabricating markup', async () => {
    stubSite({ '/': html(goodHtml.replace(/<script type="application\/ld\+json">.*?<\/script>/gs, '')) });
    const r = await runTechnicalChecks('publicsite.net');
    if (!r.ok) throw new Error('Expected a successful audit');
    const structured = r.findings.find(f => f.key === 'structured');
    expect(structured).toMatchObject({ status: 'attention', detail: 'No JSON-LD structured data was found on the page.' });
  });

  it('reports a missing llms.txt as an emerging convention, not a requirement', async () => {
    stubSite({ '/llms.txt': null });
    const r = await runTechnicalChecks('publicsite.net');
    if (!r.ok) throw new Error('Expected a successful audit');
    const llms = r.findings.find(f => f.key === 'llms');
    expect(llms?.status).toBe('attention');
    expect(llms?.detail).toContain('emerging convention, not a Google requirement');
  });

  it('reports prices that only load with JavaScript', async () => {
    stubSite({ '/pricing': html('<html><body><div id="app"></div><script>renderPrices()</script></body></html>') });
    const r = await runTechnicalChecks('publicsite.net');
    if (!r.ok) throw new Error('Expected a successful audit');
    expect(r.findings.find(f => f.key === 'pricing')?.status).toBe('attention');
  });

  it('marks the pricing check as not checkable when no pricing link exists', async () => {
    stubSite({ '/': html(goodHtml.replace('<a href="/pricing">Pricing</a>', '')) });
    const r = await runTechnicalChecks('publicsite.net');
    if (!r.ok) throw new Error('Expected a successful audit');
    expect(r.findings.find(f => f.key === 'pricing')?.status).toBe('unknown');
  });

  it('parses robots sitemaps, JSON-LD types, pricing links and prices', () => {
    expect(robotsSitemaps(goodRobots)).toEqual(['https://publicsite.net/sitemap.xml']);
    expect(jsonLdTypes(goodHtml)).toEqual(['Organization', 'SoftwareApplication']);
    expect(pricingPath(goodHtml)).toBe('/pricing');
    expect(pricingPath('<a href="https://evil.net/pricing">x</a>')).toBeNull();
    expect(hasVisiblePrice('Only $12 per month')).toBe(true);
    expect(hasVisiblePrice('Contact us for plans')).toBe(false);
    expect(MIN_READABLE_TEXT).toBe(300);
  });

  it('extracts visible text without script or hidden noise', () => {
    const t = visibleText('<html><body><nav>NAV</nav><script>SECRET</script><main><h1>Hello</h1><p>World</p></main><div hidden>HIDDEN</div></body></html>');
    expect(t).toContain('Hello');
    expect(t).toContain('World');
    expect(t).not.toContain('SECRET');
    expect(t).not.toContain('HIDDEN');
  });
});
