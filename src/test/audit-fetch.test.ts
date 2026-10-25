// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { auditPageUrl, withinAuditFetchLimit, MAX_AUDIT_TEXT } from '@/lib/audit-fetch';
import { extractAuditText, fetchAuditPage } from '@/lib/audit-fetch.server';
const html = `<html><head><title>Pricing</title><meta name="description" content="Plans for founders"></head><body><nav>NOISE</nav><script>SECRET</script><style>BAD</style><main><h1>Choose your plan</h1><p>${'Actual product copy for founders. '.repeat(30)}</p><button>Join now</button><a href="/signup">Start trial</a><div hidden>HIDDEN</div></main></body></html>`;
const reply = (body = html) => new Response(body, { headers: { 'content-type': 'text/html' } });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe('safe page audits', () => {
  it('enforces ten fetches per rolling hour', () => { expect(withinAuditFetchLimit(9)).toBe(true); expect(withinAuditFetchLimit(10)).toBe(false); });
  it('defaults to the saved URL and accepts only same-site paths', () => {
    expect(auditPageUrl('www.publicsite.net/app')?.href).toBe('https://www.publicsite.net/app');
    expect(auditPageUrl('publicsite.net/app', '/pricing')?.href).toBe('https://publicsite.net/pricing');
    for (const path of ['//evil.net', 'https://evil.net', '/\\evil.net', '/x?redirect=evil']) expect(auditPageUrl('publicsite.net', path)).toBeNull();
  });
  it('blocks private hosts and offsite input without any request', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    for (const site of ['localhost', '127.0.0.1', 'private.internal', 'user:pass@publicsite.net', 'publicsite.net:8443']) expect((await fetchAuditPage(site)).ok).toBe(false);
    expect((await fetchAuditPage('publicsite.net', '//evil.net')).ok).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('extracts actual text and action labels without script/style/navigation/hidden noise and caps it', () => {
    const text = extractAuditText(html);
    for (const s of ['Pricing', 'Plans for founders', 'Choose your plan', 'Join now', 'Start trial']) expect(text).toContain(s);
    for (const s of ['NOISE', 'SECRET', 'BAD', 'HIDDEN']) expect(text).not.toContain(s);
    expect(extractAuditText(html.replace('</main>', `<p>${'x'.repeat(20000)}</p></main>`))).toHaveLength(MAX_AUDIT_TEXT);
  });
  it('fetches successfully without cookies and returns final URL and time', async () => {
    const fetch = vi.fn().mockResolvedValue(reply()); vi.stubGlobal('fetch', fetch);
    const page = await fetchAuditPage('publicsite.net', '/pricing');
    expect(page).toMatchObject({ ok: true, url: 'https://publicsite.net/pricing' });
    if (!page.ok) throw new Error('Expected fetched copy');
    expect(page.copy.notes).toContain('Actual product copy'); expect(Number.isFinite(Date.parse(page.fetchedAt))).toBe(true);
    expect(fetch).toHaveBeenCalledWith('https://publicsite.net/pricing', expect.objectContaining({ credentials: 'omit', redirect: 'manual' }));
  });
  it('does not follow a redirect to another site or HTTP', async () => {
    for (const location of ['https://evil.net/', 'http://publicsite.net/']) {
      const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 302, headers: { location } })); vi.stubGlobal('fetch', fetch);
      expect(await fetchAuditPage('publicsite.net')).toMatchObject({ ok: false, fallback: true }); expect(fetch).toHaveBeenCalledTimes(1);
    }
  });
  it('allows three revalidated redirects but not four', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: '/a' } })).mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: '/b' } })).mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: '/c' } })).mockResolvedValueOnce(reply());
    vi.stubGlobal('fetch', fetch); expect(await fetchAuditPage('publicsite.net')).toMatchObject({ ok: true, url: 'https://publicsite.net/c' });
    fetch.mockReset().mockResolvedValue(new Response(null, { status: 302, headers: { location: '/loop' } }));
    expect(await fetchAuditPage('publicsite.net')).toMatchObject({ ok: false, fallback: true }); expect(fetch).toHaveBeenCalledTimes(4);
  });
  it('rejects bodies above 1 MB', async () => { vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply('x'.repeat(1024 * 1024 + 1)))); expect(await fetchAuditPage('publicsite.net')).toMatchObject({ ok: false, fallback: true, error: 'This page is too large to read. Paste its page copy instead.' }); });
  it('reports the actual thin-page character count', async () => {
    const thin = '<html><body><main>Hello</main><script>dynamic content</script></body></html>';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply(thin)));
    expect(await fetchAuditPage('publicsite.net')).toEqual({ ok: false, fallback: true, error: `We could only read ${extractAuditText(thin).length} characters; this page may load its content with JavaScript. Paste its page copy instead.` });
  });
  it('times out at eight seconds and never exposes fetch errors', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('raw secret fetch error'))))));
    const pending = fetchAuditPage('publicsite.net'); await vi.advanceTimersByTimeAsync(8000);
    expect(await pending).toEqual({ ok: false, fallback: true, error: "We couldn't read this page. Paste its page copy instead." });
  });
});