import { allowedFetchUrl, classifyHtml, FETCH_TIMEOUT_MS, httpReason, MAX_HTML_BYTES, MAX_REDIRECTS, unreachableReason, websiteHost, type SnippetResult } from './install-check';

async function readCapped(res: Response) {
  const reader = res.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = []; let length = 0;
  while (length < MAX_HTML_BYTES) {
    const { value, done } = await reader.read(); if (done) break;
    chunks.push(value); length += value.byteLength;
  }
  await reader.cancel().catch(() => {});
  const bytes = new Uint8Array(Math.min(length, MAX_HTML_BYTES)); let o = 0;
  for (const c of chunks) { const part = c.subarray(0, bytes.length - o); bytes.set(part, o); o += part.length; if (o >= bytes.length) break; }
  return new TextDecoder().decode(bytes);
}

async function fetchSite(start: string, website: string, signal: AbortSignal): Promise<{ html: string } | { reason: string }> {
  let url = allowedFetchUrl(start, website);
  if (!url) return { reason: 'Its address is not a public website address.' };
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await fetch(url.href, { redirect: 'manual', signal, credentials: 'omit', headers: { 'User-Agent': 'Brambly/1.0 (read-only; hello@mcads.co)', Accept: 'text/html' } });
    if (res.status >= 300 && res.status < 400) {
      await res.body?.cancel().catch(() => {});
      const loc = res.headers.get('location');
      if (!loc || hop === MAX_REDIRECTS) return { reason: 'It redirected too many times.' };
      const next = allowedFetchUrl(new URL(loc, url).href, website);
      if (!next) return { reason: 'It redirected to a different website.' };
      url = next; continue;
    }
    if (!res.ok) { await res.body?.cancel().catch(() => {}); return { reason: httpReason(res.status) }; }
    return { html: await readCapped(res) };
  }
  return { reason: 'It redirected too many times.' };
}

export async function checkSnippet(website: string, key: string, appHost: string): Promise<SnippetResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const host = websiteHost(website);
    const candidates = [`https://${host}/`, ...(host.startsWith('www.') ? [] : [`https://www.${host}/`])];
    let last: { reason: string } = { reason: 'The connection failed.' };
    for (const c of candidates) {
      try {
        const r = await fetchSite(c, website, controller.signal);
        if ('html' in r) return classifyHtml(r.html, key, appHost);
        last = r;
      } catch (e) { last = { reason: unreachableReason(e) }; if (controller.signal.aborted) break; }
    }
    return { status: 'unreachable', reason: last.reason };
  } finally { clearTimeout(timer); }
}
