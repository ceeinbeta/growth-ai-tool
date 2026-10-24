import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const script = readFileSync('public/t.js', 'utf8');
function run(privacy: Record<string, unknown> = {}) {
  const events: Record<string, unknown>[] = [];
  const stored = new Map<string, string>();
  const location = { search: '?utm_source=newsletter', pathname: '/pricing', hostname: 'example.com', href: 'https://example.com/pricing' };
  const context: Record<string, any> = { URL, URLSearchParams, Uint8Array, Blob, crypto: { getRandomValues: (a: Uint8Array) => a.fill(7) }, document: { currentScript: { src: 'https://growloop.example/t.js', getAttribute: () => `gl_${'k'.repeat(36)}` }, referrer: 'https://search.example/?private=yes' }, navigator: { ...privacy, sendBeacon: () => false }, location, localStorage: { getItem: (k: string) => stored.get(k) ?? null, setItem: (k: string, v: string) => stored.set(k, v) }, history: { pushState: (_a: unknown, _b: unknown, path: string) => { location.pathname = path; location.href = `https://example.com${path}`; }, replaceState: (_a: unknown, _b: unknown, path: string) => { location.pathname = path; location.href = `https://example.com${path}`; } }, addEventListener: () => {}, fetch: (_url: string, init: { body: string }) => { events.push(JSON.parse(init.body)); return Promise.resolve(); } };
  context.window = context;
  runInNewContext(script, context);
  return { context, events, location };
}
it('sends no events or storage for DNT or GPC', () => { expect(run({ doNotTrack: '1' }).events).toHaveLength(0); expect(run({ globalPrivacyControl: true }).events).toHaveLength(0); });
it('tracks SPA routes and custom events with unchanged first touch', () => { const { context, events, location } = run(); location.search = '?utm_source=second'; context.history.pushState({}, '', '/signup'); context.growloop.track('signup'); context.growloop.track('Bad event'); expect(events.map(e => e.name)).toEqual(['pageview', 'pageview', 'signup']); expect(events[2]?.first_touch_source).toBe('newsletter'); expect(events[2]?.utm_source).toBe('second'); expect(events[0]?.referrer_host).toBe('search.example'); expect(events[2]?.path).toBe('/signup'); expect(events[2]?.visitor_id).toBe(events[0]?.visitor_id); });
it('does not throw on storage or browser failures', () => { expect(() => runInNewContext(script, { document: { currentScript: null } })).not.toThrow(); });