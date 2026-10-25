// Rule-based technical audit: shared constants, parsers and hand-written copy.
// No AI calls anywhere in this slice; every "why" and "fix" text below is written by us.
export const TECHNICAL_AUDIT_LIMIT = 10;
export const MIN_READABLE_TEXT = 300;
export const AI_CRAWLERS = ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended', 'CCBot'] as const;
export const KNOWN_SCHEMA_TYPES = ['Organization', 'Product', 'SoftwareApplication', 'FAQPage', 'WebSite', 'WebPage', 'BreadcrumbList', 'Article', 'LocalBusiness'] as const;

export type TechnicalStatus = 'pass' | 'attention' | 'unknown';
export type TechnicalFinding = { key: string; status: TechnicalStatus; title: string; detail: string; why: string; fix: string };

export function withinTechnicalAuditLimit(count: number) { return count < TECHNICAL_AUDIT_LIMIT; }

export const statusLabel: Record<TechnicalStatus, string> = { pass: 'Pass', attention: 'Needs attention', unknown: 'Could not check' };

const WHY = {
  reachable: 'If your page cannot be reached over a secure connection, neither Google nor AI assistants can read it.',
  tags: 'Titles, descriptions and headings are the main text Google and AI assistants use to understand what a page is about.',
  social: 'Social preview tags control how your page looks when it is shared or quoted.',
  structured: 'Structured data tells search engines and AI assistants, in a standard format, what your product and organization are.',
  robots: 'Your robots.txt file decides which crawlers may read your site, including Google and the common AI crawlers.',
  llms: 'An llms.txt file is an emerging convention, not a Google requirement, that gives AI assistants a short map of your site.',
  pricing: 'Buyers and AI assistants look for prices; if they only appear after JavaScript runs, many readers never see them.',
  readable: 'If a page shows little text without JavaScript, crawlers and AI assistants that do not run JavaScript see an empty page.',
} as const;

const UNREACHABLE_FIX = 'Make sure your site answers at its secure https address and returns a success status.';

function finding(key: keyof typeof WHY, status: TechnicalStatus, title: string, detail: string, fix: string): TechnicalFinding {
  return { key, status, title, detail, why: WHY[key], fix };
}

export function reachableFinding(ok: boolean, detail: string): TechnicalFinding {
  return ok
    ? finding('reachable', 'pass', 'Page reachable', detail, 'No action needed.')
    : finding('reachable', 'attention', 'Page reachable', detail, UNREACHABLE_FIX);
}

export function unreachableDetail(): string {
  return 'We could not reach your page over a secure connection.';
}

export function tagsFinding(parts: { title: string; description: string; h1Count: number; canonical: boolean; viewport: boolean; lang: boolean }): TechnicalFinding {
  const problems: string[] = [];
  if (!parts.title) problems.push('the title tag is missing');
  else if (parts.title.length < 10) problems.push('the title tag is very short');
  else if (parts.title.length > 70) problems.push('the title tag is longer than about 70 characters');
  if (!parts.description) problems.push('the meta description is missing');
  else if (parts.description.length < 50) problems.push('the meta description is very short');
  else if (parts.description.length > 170) problems.push('the meta description is longer than about 170 characters');
  if (parts.h1Count === 0) problems.push('there is no main heading (h1)');
  if (parts.h1Count > 1) problems.push(`there are ${parts.h1Count} main headings (h1) instead of one`);
  if (!parts.canonical) problems.push('the canonical link is missing');
  if (!parts.viewport) problems.push('the viewport tag is missing');
  if (!parts.lang) problems.push('the language attribute is missing');
  if (!problems.length) return finding('tags', 'pass', 'Title, description and headings', 'Title, description, one main heading, canonical link, viewport and language are all in place.', 'No action needed.');
  return finding('tags', 'attention', 'Title, description and headings', `Some basics need work: ${problems.join('; ')}.`, 'Add the missing tags in your page head, keep the title under about 70 characters and the description under about 170, and use exactly one main heading per page.');
}

export function socialFinding(tags: { title: boolean; description: boolean; image: boolean }): TechnicalFinding {
  const missing = [!tags.title && 'og:title', !tags.description && 'og:description', !tags.image && 'og:image'].filter(Boolean) as string[];
  if (!missing.length) return finding('social', 'pass', 'Social preview tags', 'og:title, og:description and og:image are all present.', 'No action needed.');
  return finding('social', 'attention', 'Social preview tags', `Missing: ${missing.join(', ')}.`, 'Add the missing Open Graph tags to your page head so shared links show a proper title, description and image.');
}

export function structuredFinding(types: string[]): TechnicalFinding {
  if (types.length) return finding('structured', 'pass', 'Structured data', `Found structured data of type: ${types.join(', ')}.`, 'No action needed.');
  return finding('structured', 'attention', 'Structured data', 'No JSON-LD structured data was found on the page.', 'Add JSON-LD markup that matches your page, for example Organization and Product or SoftwareApplication, and FAQPage if you have a FAQ. Only mark up content that is actually on the page.');
}

export function robotsFinding(robots: string | null, sitemapReachable: boolean | null): TechnicalFinding {
  if (robots === null) return finding('robots', 'unknown', 'robots.txt and AI crawlers', 'We could not read a robots.txt file from your site.', 'Check that https://your-site/robots.txt answers in a browser.');
  const blocked = robotsBlockedAgents(robots, ['Googlebot', ...AI_CRAWLERS]);
  const sitemaps = robotsSitemaps(robots);
  const problems: string[] = [];
  if (blocked.length) problems.push(`it blocks these crawlers site-wide: ${blocked.join(', ')}`);
  if (!sitemaps.length) problems.push('it does not reference a sitemap');
  else if (sitemapReachable === false) problems.push('the sitemap it references could not be read');
  if (!problems.length) return finding('robots', 'pass', 'robots.txt and AI crawlers', `robots.txt exists, does not block Google or the common AI crawlers site-wide, and references a reachable sitemap.`, 'No action needed.');
  return finding('robots', 'attention', 'robots.txt and AI crawlers', `Your robots.txt needs a look: ${problems.join('; ')}.`, 'Remove site-wide blocks for crawlers you want to read your site, and add a Sitemap: line pointing at your sitemap.xml.');
}

export function llmsFinding(present: boolean | null): TechnicalFinding {
  if (present === null) return finding('llms', 'unknown', 'llms.txt', 'We could not check for an llms.txt file.', 'Check that https://your-site/llms.txt answers in a browser.');
  if (present) return finding('llms', 'pass', 'llms.txt', 'An llms.txt file is present. This is an emerging convention, not a Google requirement.', 'No action needed.');
  return finding('llms', 'attention', 'llms.txt', 'No llms.txt file was found. This is an emerging convention, not a Google requirement.', 'Optionally add a short llms.txt at your site root with links to your most important pages.');
}

export function pricingFinding(state: 'no-link' | 'ok' | 'no-prices' | 'thin' | 'unreadable'): TechnicalFinding {
  switch (state) {
    case 'no-link': return finding('pricing', 'unknown', 'Pricing page', 'No link to a pricing page was found on your homepage.', 'If you have a pricing page, link to it from your homepage.');
    case 'ok': return finding('pricing', 'pass', 'Pricing page', 'Your pricing page shows readable text with prices in its HTML.', 'No action needed.');
    case 'no-prices': return finding('pricing', 'attention', 'Pricing page', 'Your pricing page has readable text, but no prices were found in its HTML.', 'Put your prices in the page HTML itself, not only in JavaScript-loaded content.');
    case 'thin': return finding('pricing', 'attention', 'Pricing page', 'Your pricing page shows very little text without JavaScript, so prices may be invisible to crawlers.', 'Render the pricing content in the page HTML, for example with server-side rendering or a static page.');
    case 'unreadable': return finding('pricing', 'unknown', 'Pricing page', 'We found a pricing link but could not read the page.', 'Check that your pricing page answers at its address in a browser.');
  }
}

export function readableFinding(characters: number): TechnicalFinding {
  if (characters >= MIN_READABLE_TEXT) return finding('readable', 'pass', 'Readable without JavaScript', `Your homepage HTML contains about ${characters.toLocaleString()} characters of visible text (measured), readable without JavaScript.`, 'No action needed.');
  return finding('readable', 'attention', 'Readable without JavaScript', `Your homepage HTML contains only about ${characters.toLocaleString()} characters of visible text (measured). The page may load its content with JavaScript.`, 'Render your main content in the page HTML, for example with server-side rendering or a static site, so crawlers and AI assistants can read it.');
}

/** Parses robots.txt groups; returns the agents (from the given list) blocked site-wide by Disallow: /. */
export function robotsBlockedAgents(robots: string, agents: string[]): string[] {
  const lines = robots.split('\n').map(l => l.replace(/#.*$/, '').trim()).filter(Boolean);
  let current: string[] = [];
  const rules = new Map<string, string[]>();
  let seenRule = false;
  for (const line of lines) {
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const field = m[1]!.toLowerCase(), value = m[2]!.trim();
    if (field === 'user-agent') {
      if (seenRule) { current = []; seenRule = false; }
      current.push(value.toLowerCase());
      for (const a of current) if (!rules.has(a)) rules.set(a, []);
    } else if (field === 'disallow' || field === 'allow') {
      seenRule = true;
      for (const a of current) rules.get(a)?.push(`${field === 'disallow' ? 'D' : 'A'}:${value}`);
    }
  }
  const blocksAll = (agent: string) => {
    const own = rules.get(agent.toLowerCase());
    const star = rules.get('*') ?? [];
    const effective = own ?? star;
    // Site-wide block: a Disallow: / with no Allow: / after it.
    let blocked = false;
    for (const r of effective) {
      if (r === 'D:/') blocked = true;
      else if (r === 'A:/') blocked = false;
    }
    return blocked;
  };
  return agents.filter(blocksAll);
}

/** Sitemap URLs referenced by robots.txt. */
export function robotsSitemaps(robots: string): string[] {
  return [...robots.matchAll(/^sitemap:\s*(\S+)$/gim)].map(m => m[1]!).filter(Boolean);
}

/** @type values found in JSON-LD script blocks, including @graph entries and arrays. */
export function jsonLdTypes(html: string): string[] {
  const found = new Set<string>();
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    const obj = node as Record<string, unknown>;
    const t = obj['@type'];
    if (typeof t === 'string') found.add(t);
    else if (Array.isArray(t)) t.forEach(x => typeof x === 'string' && found.add(x));
    if (obj['@graph']) walk(obj['@graph']);
  };
  for (const m of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { walk(JSON.parse(m[1]!)); } catch { /* invalid JSON-LD block: ignore */ }
  }
  return [...found];
}

/** True when readable text contains a visible price. */
export function hasVisiblePrice(text: string): boolean {
  return /[$€£]\s?\d|\b\d+(?:\.\d{2})?\s?(?:USD|EUR|GBP|\/mo|\/month|per month|per year|\/yr)\b/i.test(text);
}

/** Finds a same-site /pricing link target in homepage HTML, if one exists. */
export function pricingPath(html: string): string | null {
  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)) {
    const href = m[1]!.trim();
    if (/^\/pricing\/?$/i.test(href)) return '/pricing';
  }
  return null;
}
