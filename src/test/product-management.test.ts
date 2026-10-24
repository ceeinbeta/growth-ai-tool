import { afterEach, describe, expect, it, vi } from 'vitest';
import { validateProduct, deleteConfirmed } from '@/lib/product-form';
import { iconCandidates, sniffImage, sniffUpload } from '@/lib/logo';
import { fetchSiteLogo } from '@/lib/logo.server';
import { buildChecklist, nextAction, progress } from '@/lib/setup-checklist';

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
const SVG = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>');

describe('edit validation', () => {
  it('normalizes the website like creation', () => {
    const r = validateProduct({ name: 'App', url: 'https://www.Example.com/', description: 'Does things', stage: 'live' });
    expect(r.ok && r.data.url).toBe('www.example.com');
  });
  it('rejects a non-website and empty name', () => {
    const r = validateProduct({ name: ' ', url: 'not a site', description: 'x', stage: 'live' });
    expect(r.ok).toBe(false);
    if (!r.ok) { expect(r.errors.url).toBe('Enter a website like yourapp.com'); expect(r.errors.name).toBe('Enter a product name.'); }
  });
  it('rejects names over 80 characters', () => {
    expect(validateProduct({ name: 'a'.repeat(81), url: 'a.com', description: 'x', stage: 'live' }).ok).toBe(false);
  });
});

describe('delete confirmation', () => {
  it('requires the exact product name', () => {
    expect(deleteConfirmed('pdfeye', 'pdfeye')).toBe(true);
    expect(deleteConfirmed('PDFeye', 'pdfeye')).toBe(false);
    expect(deleteConfirmed('', 'pdfeye')).toBe(false);
  });
});

describe('logo sniffing', () => {
  it('rejects svg', () => { expect(sniffImage(SVG)).toBeNull(); expect(sniffUpload(SVG)).toBeNull(); });
  it('accepts a png by its bytes even if named .jpg', () => {
    const file = new File([PNG], 'logo.jpg', { type: 'image/jpeg' });
    expect(file.name.endsWith('.jpg')).toBe(true);
    expect(sniffUpload(PNG)?.mime).toBe('image/png');
  });
  it('accepts ico from sites but not as an upload', () => {
    const ico = new Uint8Array([0, 0, 1, 0, 1, 0]);
    expect(sniffImage(ico)?.ext).toBe('ico');
    expect(sniffUpload(ico)).toBeNull();
  });
  it('orders icons apple-touch-icon, icon, favicon and skips svg', () => {
    const html = '<link rel="icon" href="/i.svg"><link rel="icon" href="/i.png"><link rel="apple-touch-icon" href="/a.png">';
    expect(iconCandidates(html, 'https://x.com/')).toEqual(['https://x.com/a.png', 'https://x.com/i.png', 'https://x.com/favicon.ico']);
  });
});

describe('logo fetch reuses the install-check validator', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('never follows a redirect to another site', async () => {
    const calls: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string) => { calls.push(url); return new Response(null, { status: 302, headers: { location: 'https://evil.com/' } }); }));
    expect(await fetchSiteLogo('example.com')).toBeNull();
    expect(calls.every(u => new URL(u).hostname === 'example.com')).toBe(true);
  });
  it('refuses non-public hosts without fetching', async () => {
    const f = vi.fn(); vi.stubGlobal('fetch', f);
    expect(await fetchSiteLogo('intranet.local')).toBeNull();
    expect(f).not.toHaveBeenCalled();
  });
  it('stores an icon identified by bytes, not the declared type', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => url.endsWith('/') ? new Response('<link rel="icon" href="/x.jpg">') : new Response(PNG, { headers: { 'content-type': 'image/svg+xml' } })));
    expect((await fetchSiteLogo('example.com'))?.type.ext).toBe('png');
  });
  it('rejects an svg icon', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => url.endsWith('/') ? new Response('') : new Response(SVG, { headers: { 'content-type': 'image/png' } })));
    expect(await fetchSiteLogo('example.com')).toBeNull();
  });
});

describe('setup checklist', () => {
  const base = { profiled: false, profileReviewed: false, eventCount: 0, lastEventAt: null, visitors30d: 0, hasAudit: false, lastCheck: null };
  it('counts 5 items and never the coming-next item', () => {
    const items = buildChecklist(base);
    expect(progress(items)).toEqual({ done: 0, total: 5 });
    expect(nextAction(items)?.key).toBe('profile');
  });
  it('needs a review, not just an AI profile', () => {
    expect(buildChecklist({ ...base, profiled: true })[0]!.done).toBe(false);
    expect(buildChecklist({ ...base, profiled: true, profileReviewed: true })[0]!.done).toBe(true);
  });
  it('needs 100 visitors and shows N of 100', () => {
    const v = buildChecklist({ ...base, visitors30d: 99 })[2]!;
    expect(v.done).toBe(false); expect(v.result).toBe('99 of 100 in the last 30 days');
    expect(buildChecklist({ ...base, visitors30d: 100 })[2]!.done).toBe(true);
  });
  it('counts a visibility check only with a usable run', () => {
    expect(buildChecklist({ ...base, lastCheck: { date: '2026-10-01', usableRuns: 0, pct: 0 } })[4]!.done).toBe(false);
    expect(buildChecklist({ ...base, lastCheck: { date: '2026-10-01', usableRuns: 3, pct: 33 } })[4]!.done).toBe(true);
  });
  it('has no next action when all five are done', () => {
    const items = buildChecklist({ profiled: true, profileReviewed: true, eventCount: 5, lastEventAt: new Date().toISOString(), visitors30d: 150, hasAudit: true, lastCheck: { date: '2026-10-01', usableRuns: 3, pct: 33 } });
    expect(progress(items)).toEqual({ done: 5, total: 5 });
    expect(nextAction(items)).toBeNull();
  });
});
