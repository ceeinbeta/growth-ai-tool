import { parseHTML } from 'linkedom';
import { allowedFetchUrl, FETCH_TIMEOUT_MS, MAX_HTML_BYTES, MAX_REDIRECTS, websiteHost } from './install-check';
import { readCapped } from './logo.server';
import {
  hasVisiblePrice, jsonLdTypes, llmsFinding, pricingFinding, pricingPath, reachableFinding, readableFinding,
  robotsFinding, robotsSitemaps, socialFinding, structuredFinding, tagsFinding, unreachableDetail,
  type TechnicalFinding,
} from './technical-audit';

type Fetched = { url: URL; text: string; status: number; hops: number; ms: number };

/** Same rules as safeGet, plus redirect count and measured response time for the audit report. */
async function fetchText(start: string, website: string, signal: AbortSignal, accept: string): Promise<Fetched | null> {
  let url = allowedFetchUrl(start, website);
  if (!url) return null;
  const began = Date.now();
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await fetch(url.href, { redirect: 'manual', signal, credentials: 'omit', headers: { 'User-Agent': 'GrowloopTechnicalAudit', Accept: accept } });
    if (res.status >= 300 && res.status < 400) {
      await res.body?.cancel().catch(() => {});
      const loc = res.headers.get('location');
      if (!loc || hop === MAX_REDIRECTS) return null;
      url = allowedFetchUrl(new URL(loc, url).href, website);
      if (!url) return null;
      continue;
    }
    if (!res.ok) { await res.body?.cancel().catch(() => {}); return null; }
    const bytes = await readCapped(res, MAX_HTML_BYTES);
    if (!bytes) return null;
    return { url, text: new TextDecoder().decode(bytes), status: res.status, hops: hop, ms: Date.now() - began };
  }
  return null;
}

/** Visible text of a raw HTML page, without script/style/hidden noise. */
export function visibleText(html: string): string {
  const { document } = parseHTML(html);
  document.querySelectorAll('script,style,noscript,template,svg,[hidden],[aria-hidden="true"],[style*="display:none"],[style*="display: none"]').forEach(el => el.remove());
  document.querySelectorAll('p,div,section,article,li,h1,h2,h3,br').forEach(el => el.appendChild(document.createTextNode(' ')));
  return (document.body?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

export type TechnicalAuditResult =
  | { ok: true; url: string; fetchedAt: string; findings: TechnicalFinding[] }
  | { ok: false; error: string };

const BLOCKED_ERROR = "Enter a public website address for your product first.";

/** Runs all rule-based checks against the product's own site. At most 5 fetches, all same-site. */
export async function runTechnicalChecks(website: string): Promise<TechnicalAuditResult> {
  const host = websiteHost(website);
  if (!allowedFetchUrl(`https://${website}`, website)) return { ok: false, error: BLOCKED_ERROR };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS * 3);
  try {
    const home = await fetchText(`https://${website}`, website, controller.signal, 'text/html').catch(() => null);
    if (!home) {
      return {
        ok: true, url: `https://${website}`, fetchedAt: new Date().toISOString(),
        findings: [
          reachableFinding(false, unreachableDetail()),
          ...(['tags', 'social', 'structured', 'robots', 'llms', 'pricing', 'readable'] as const).map(key => {
            const unreachable = { key, status: 'unknown' as const, title: '', detail: 'We could not check this because the page could not be reached.', why: '', fix: '' };
            return unreachable;
          }),
        ].map((f, i) => ({ ...f, ...placeholderMeta(f.key, i) })),
      };
    }

    const { document } = parseHTML(home.text);
    const text = visibleText(home.text);
    const meta = (name: string) => document.querySelector(`meta[name="${name}"]`)?.getAttribute('content')?.trim() ?? '';
    const og = (p: string) => !!document.querySelector(`meta[property="og:${p}"]`)?.getAttribute('content')?.trim();

    const findings: TechnicalFinding[] = [
      reachableFinding(true, `Reached ${home.url.href} with status ${home.status} in ${home.ms.toLocaleString()} ms (measured)${home.hops ? ` after ${home.hops} redirect${home.hops === 1 ? '' : 's'}` : ''}.`),
      tagsFinding({
        title: document.querySelector('title')?.textContent?.trim() ?? '',
        description: meta('description'),
        h1Count: document.querySelectorAll('h1').length,
        canonical: !!document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
        viewport: !!meta('viewport'),
        lang: !!document.documentElement?.getAttribute('lang'),
      }),
      socialFinding({ title: og('title'), description: og('description'), image: og('image') }),
      structuredFinding(jsonLdTypes(home.text)),
    ];

    // robots.txt and its sitemap from the site root.
    const robots = await fetchText(`https://${host}/robots.txt`, website, controller.signal, 'text/plain').catch(() => null);
    let sitemapReachable: boolean | null = null;
    if (robots) {
      const sitemap = robotsSitemaps(robots.text)[0];
      if (sitemap && allowedFetchUrl(sitemap, website)) {
        sitemapReachable = !!(await fetchText(sitemap, website, controller.signal, 'application/xml,text/xml,text/plain').catch(() => null));
      } else if (sitemap) sitemapReachable = false;
    }
    findings.push(robotsFinding(robots?.text ?? null, sitemapReachable));

    // llms.txt from the site root.
    const llms = await fetchText(`https://${host}/llms.txt`, website, controller.signal, 'text/plain,text/markdown').catch(() => null);
    findings.push(llmsFinding(llms ? llms.text.trim().length > 0 : false));

    // Pricing page, only when the homepage links to it.
    const path = pricingPath(home.text);
    if (!path) findings.push(pricingFinding('no-link'));
    else {
      const pricing = await fetchText(`https://${host}${path}`, website, controller.signal, 'text/html').catch(() => null);
      if (!pricing) findings.push(pricingFinding('unreadable'));
      else {
        const ptext = visibleText(pricing.text);
        findings.push(pricingFinding(ptext.length < 100 ? 'thin' : hasVisiblePrice(ptext) ? 'ok' : 'no-prices'));
      }
    }

    findings.push(readableFinding(text.length));
    return { ok: true, url: home.url.href, fetchedAt: new Date().toISOString(), findings };
  } catch {
    return { ok: false, error: "We couldn't finish the technical audit. Please try again." };
  } finally { clearTimeout(timer); }
}

/** Fills title/why/fix for the not-reached fallback from the standard finding builders. */
function placeholderMeta(key: string, _i: number): { title: string; why: string; fix: string } {
  const meta: Record<string, { title: string }> = {
    tags: { title: 'Title, description and headings' }, social: { title: 'Social preview tags' },
    structured: { title: 'Structured data' }, robots: { title: 'robots.txt and AI crawlers' },
    llms: { title: 'llms.txt' }, pricing: { title: 'Pricing page' }, readable: { title: 'Readable without JavaScript' },
  };
  const sample = key === 'tags' ? tagsFinding({ title: '', description: '', h1Count: 0, canonical: false, viewport: false, lang: false })
    : key === 'social' ? socialFinding({ title: false, description: false, image: false })
    : key === 'structured' ? structuredFinding([])
    : key === 'robots' ? robotsFinding(null, null)
    : key === 'llms' ? llmsFinding(null)
    : key === 'pricing' ? pricingFinding('unreadable')
    : readableFinding(0);
  return { title: meta[key]?.title ?? sample.title, why: sample.why, fix: 'Fix the connection problem first, then re-run the audit.' };
}
