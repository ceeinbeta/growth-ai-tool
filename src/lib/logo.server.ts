import { allowedFetchUrl, FETCH_TIMEOUT_MS, MAX_HTML_BYTES, MAX_REDIRECTS, websiteHost } from './install-check';
import { iconCandidates, MAX_LOGO_BYTES, sniffImage, type LogoType } from './logo';

async function readCapped(res: Response, cap: number): Promise<Uint8Array | null> {
  const reader = res.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = []; let length = 0;
  while (true) {
    const { value, done } = await reader.read(); if (done) break;
    length += value.byteLength;
    if (length > cap) { await reader.cancel().catch(() => {}); return null; }
    chunks.push(value);
  }
  const out = new Uint8Array(length); let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.byteLength; }
  return out;
}

/** Same rules as the install check: https, public host, same site, every redirect re-validated, no cookies. */
async function safeGet(start: string, website: string, signal: AbortSignal, accept: string): Promise<{ res: Response; url: URL } | null> {
  let url = allowedFetchUrl(start, website);
  if (!url) return null;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await fetch(url.href, { redirect: 'manual', signal, credentials: 'omit', headers: { 'User-Agent': 'GrowloopLogoFetch', Accept: accept } });
    if (res.status >= 300 && res.status < 400) {
      await res.body?.cancel().catch(() => {});
      const loc = res.headers.get('location');
      if (!loc || hop === MAX_REDIRECTS) return null;
      url = allowedFetchUrl(new URL(loc, url).href, website);
      if (!url) return null;
      continue;
    }
    if (!res.ok) { await res.body?.cancel().catch(() => {}); return null; }
    return { res, url };
  }
  return null;
}

/** Finds and downloads the site's own icon. Returns null on any failure. */
export async function fetchSiteLogo(website: string): Promise<{ bytes: Uint8Array; type: LogoType } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const host = websiteHost(website);
    const page = await safeGet(`https://${host}/`, website, controller.signal, 'text/html');
    let candidates = [`https://${host}/favicon.ico`];
    if (page) {
      const html = await readCapped(page.res, MAX_HTML_BYTES);
      if (html) candidates = iconCandidates(new TextDecoder().decode(html), page.url.href);
    }
    for (const c of candidates) {
      const r = await safeGet(c, website, controller.signal, 'image/*').catch(() => null);
      if (!r) continue;
      const bytes = await readCapped(r.res, MAX_LOGO_BYTES).catch(() => null);
      const type = bytes && bytes.length ? sniffImage(bytes) : null;
      if (bytes && type) return { bytes, type };
    }
    return null;
  } catch { return null; } finally { clearTimeout(timer); }
}
