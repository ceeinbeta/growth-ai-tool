import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { allowedOrigin, parseCollect, withinRateLimit, eventSource } from '../lib/tracking';
const valid = { key: `gl_${'a'.repeat(36)}`, visitor_id: 'b'.repeat(36), name: 'pageview', hostname: 'example.com', path: '/pricing' };
describe('collect validation', () => {
  it('rejects malformed public tracking keys', () => { expect(parseCollect(JSON.stringify({ ...valid, key: 'secret' }))).toBeNull(); expect(parseCollect(JSON.stringify(valid))).not.toBeNull(); });
  it('only accepts matching hosts, subdomains or localhost', () => { expect(allowedOrigin('https://evil.com', 'evil.com', 'www.example.com')).toBe(false); expect(allowedOrigin('https://notexample.com', 'notexample.com', 'example.com')).toBe(false); expect(allowedOrigin('https://app.example.com', 'app.example.com', 'www.example.com')).toBe(true); expect(allowedOrigin(null, 'localhost', 'example.com')).toBe(true); });
  it('rejects bodies above 4 KB including multibyte input', () => { expect(parseCollect(' '.repeat(4097))).toBeNull(); expect(parseCollect(JSON.stringify({ ...valid, utm_campaign: 'é'.repeat(2100) }))).toBeNull(); });
  it('restricts event names to the specified pattern', () => { for (const name of ['Signup', 'joined-waitlist', 'a'.repeat(33), '1signup']) expect(parseCollect(JSON.stringify({ ...valid, name }))).toBeNull(); expect(parseCollect(JSON.stringify({ ...valid, name: 'joined_waitlist' }))).not.toBeNull(); });
  it('drops events at 60 per visitor or 5000 per product', () => { expect(withinRateLimit(59, 4999)).toBe(true); expect(withinRateLimit(60, 0)).toBe(false); expect(withinRateLimit(0, 5000)).toBe(false); });
  it('does not accept query strings or full URLs as paths', () => { expect(parseCollect(JSON.stringify({ ...valid, path: '/pricing?email=private' }))).toBeNull(); expect(parseCollect(JSON.stringify({ ...valid, path: 'https://example.com' }))).toBeNull(); });
  it('uses first touch then referrer then direct source', () => { expect(eventSource({ first_touch_source: 'newsletter', first_touch_referrer_host: 'search.example' })).toBe('newsletter'); expect(eventSource({ first_touch_referrer_host: 'search.example' })).toBe('search.example'); expect(eventSource({})).toBe('Direct / unknown'); });
});
it('ships dependency-free minified tracking below 5 KB', () => { expect(Buffer.byteLength(readFileSync('public/t.js'))).toBeLessThan(5 * 1024); });