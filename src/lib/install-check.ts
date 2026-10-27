export const INSTALL_CHECK_LIMIT = 10;
export const INSTALL_CHECK_LIMIT_MESSAGE = 'Too many checks. Try again in a few minutes.';
export const MAX_HTML_BYTES = 1024 * 1024;
export const FETCH_TIMEOUT_MS = 8000;
export const MAX_REDIRECTS = 3;

const LABEL = '[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?';
const HOST_RE = new RegExp(`^(?:${LABEL}\\.)+[a-z]{2,24}$`);
const INTERNAL_TLDS = new Set(['local', 'localhost', 'internal', 'intranet', 'lan', 'home', 'corp', 'test', 'invalid', 'example', 'localdomain', 'arpa']);

/** A plain public hostname: no IPs, ports, credentials, localhost or internal names. */
export function isPublicHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h.length > 253 || !HOST_RE.test(h)) return false;
  const tld = h.split('.').pop()!;
  return !INTERNAL_TLDS.has(tld);
}

/** Host part of a saved website such as "www.example.com/app". */
export function websiteHost(website: string) { return website.toLowerCase().split(/[/?#]/)[0] ?? ''; }

export function sameSite(candidate: string, website: string) {
  const base = websiteHost(website).replace(/^www\./, '');
  const h = candidate.toLowerCase();
  return h === base || h.endsWith(`.${base}`);
}

/** Validates an absolute URL (initial or redirect hop). Returns the URL or null. */
export function allowedFetchUrl(url: string, website: string): URL | null {
  let u: URL;
  try { u = new URL(url); } catch { return null; }
  if (u.protocol !== 'https:' || u.username || u.password || u.port) return null;
  if (!isPublicHost(u.hostname) || !sameSite(u.hostname, website)) return null;
  return u;
}

export function withinCheckLimit(checksLastHour: number) { return checksLastHour < INSTALL_CHECK_LIMIT; }

export type SnippetResult =
  | { status: 'found'; ownDomain: boolean }
  | { status: 'different_key' }
  | { status: 'not_found' }
  | { status: 'unreachable'; reason: string };

/**
 * The script host counts as ours when it equals the app host, or when both are
 * *.lovable.app addresses: the preview and published addresses both serve this app.
 */
export function isAppHost(host: string, appHost: string) {
  const h = host.toLowerCase(), a = appHost.toLowerCase();
  return h === a || (h.endsWith('.lovable.app') && a.endsWith('.lovable.app'));
}

export function classifyHtml(html: string, key: string, appHost: string): SnippetResult {
  const tags = html.match(/<script\b[^>]*>/gi) ?? [];
  const ours = tags.filter(t => t.includes(key));
  if (ours.length || html.includes(key)) {
    const tagMatch = ours.some(t => {
      const src = t.match(/\ssrc\s*=\s*["']?([^"'\s>]+)/i)?.[1];
      try { return !!src && isAppHost(new URL(src).hostname, appHost); } catch { return false; }
    });
    // Framework page data (e.g. Next.js) holds the script address as text, sometimes with escaped slashes.
    const textMatch = [...html.matchAll(/\\?\/\\?\/([a-z0-9.-]+)\\?\/t\.js/gi)].some(m => isAppHost(m[1] ?? '', appHost));
    return { status: 'found', ownDomain: tagMatch || textMatch };
  }
  if (/gl_[a-zA-Z0-9_-]{24,}/.test(html)) return { status: 'different_key' };
  return { status: 'not_found' };
}

/** True when the event time is strictly after the reference time, whatever ISO format each uses. */
export function isAfter(eventAt: string | null | undefined, reference: string | number) {
  if (!eventAt) return false;
  const e = Date.parse(eventAt), r = typeof reference === 'number' ? reference : Date.parse(reference);
  return Number.isFinite(e) && Number.isFinite(r) && e > r;
}

export function unreachableReason(error: unknown): string {
  const msg = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  if (/abort|timeout/i.test(msg)) return 'It took longer than 8 seconds to respond.';
  if (/cert|ssl|tls|handshake/i.test(msg)) return 'Its security certificate could not be verified.';
  return 'The connection failed.';
}

export function httpReason(status: number): string {
  if (status === 401 || status === 403 || status === 429) return `It blocked our request (error ${status}).`;
  return `It returned an error (error ${status}).`;
}

export function snippetMessage(r: SnippetResult): string {
  switch (r.status) {
    case 'found': return r.ownDomain ? 'Found. Your page loads the Brambly snippet.' : 'Found, but the script address does not point at this Brambly address. Copy the install code again.';
    case 'different_key': return 'Found, but it uses a different tracking key.';
    case 'not_found': return "Not found in your page's HTML. Some sites add scripts after the page loads, so this is not proof it is missing. Open your site in a normal browser window and press Check again to see if a visit arrives.";
    case 'unreachable': return `We couldn't reach your website. ${r.reason}`;
  }
}
