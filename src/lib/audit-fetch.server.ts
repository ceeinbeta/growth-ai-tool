import { parseHTML } from 'linkedom';
import { readCapped, safeGet } from './logo.server';
import { FETCH_TIMEOUT_MS, MAX_HTML_BYTES } from './install-check';
import { auditPageUrl, MAX_AUDIT_TEXT, MIN_AUDIT_TEXT } from './audit-fetch';
import type { PageCopy } from './audit-schema';

export function extractAuditText(html: string): string {
  const { document } = parseHTML(html);
  const clean = (value: string | null | undefined) => (value ?? '').replace(/\s+/g, ' ').trim();
  const title = clean(document.querySelector('title')?.textContent);
  const description = clean(document.querySelector('meta[name="description"]')?.getAttribute('content'));
  document.querySelectorAll('script,style,nav,header,footer,noscript,template,svg,[hidden],[aria-hidden="true"],[style*="display:none"],[style*="display: none"],[style*="visibility:hidden"],[style*="visibility: hidden"]').forEach(el => el.remove());
  const main = document.querySelector('main,[role="main"]') ?? document.body;
  const headings = [...main.querySelectorAll('h1,h2,h3')].map(el => clean(el.textContent)).filter(Boolean);
  const actions = [...main.querySelectorAll('button,a,input[type="submit"]')].map(el => clean(el.textContent || el.getAttribute('value') || el.getAttribute('aria-label'))).filter(Boolean);
  // Keep word boundaries between adjacent DOM blocks before reading body text.
  main.querySelectorAll('p,div,section,article,li,h1,h2,h3,button,a,br').forEach(el => el.appendChild(document.createTextNode(' ')));
  return [title && `Title: ${title}`, description && `Description: ${description}`, headings.length && `Headings: ${headings.join(' | ')}`, actions.length && `Buttons and links: ${actions.join(' | ')}`, clean(main.textContent)].filter(Boolean).join('\n').slice(0, MAX_AUDIT_TEXT);
}

export type FetchedAuditPage =
  | { ok: true; copy: PageCopy; url: string; fetchedAt: string; characters: number }
  | { ok: false; error: string; fallback: boolean };

export async function fetchAuditPage(website: string, path = ''): Promise<FetchedAuditPage> {
  const url = auditPageUrl(website, path);
  if (!url) return { ok: false, error: "Enter a path on your product's website, like /pricing.", fallback: false };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const page = await safeGet(url.href, website, controller.signal, 'text/html');
    if (!page || !/text\/html|application\/xhtml\+xml/i.test(page.res.headers.get('content-type') ?? '')) {
      await page?.res.body?.cancel().catch(() => {});
      return { ok: false, error: "We couldn't read this page. Paste its page copy instead.", fallback: true };
    }
    const bytes = await readCapped(page.res, MAX_HTML_BYTES);
    if (!bytes) return { ok: false, error: 'This page is too large to read. Paste its page copy instead.', fallback: true };
    const text = extractAuditText(new TextDecoder().decode(bytes));
    if (text.length < MIN_AUDIT_TEXT) return { ok: false, error: `We could only read ${text.length} characters; this page may load its content with JavaScript. Paste its page copy instead.`, fallback: true };
    return { ok: true, copy: { path: page.url.pathname, headline: '', subheadline: '', button: '', notes: text }, url: page.url.href, fetchedAt: new Date().toISOString(), characters: text.length };
  } catch {
    return { ok: false, error: "We couldn't read this page. Paste its page copy instead.", fallback: true };
  } finally { clearTimeout(timer); }
}