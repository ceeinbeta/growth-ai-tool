import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { allowedOrigin, parseCollect, withinRateLimit, eventSource } from '../lib/tracking';
const valid = { key: `gl_${'a'.repeat(36)}`, visitor_id: 'b'.repeat(36), name: 'pageview', hostname: 'example.com', path: '/pricing' };
describe('collect validation', () => {
  it('rejects malformed public tracking keys', () => { expect(parseCollect(JSON.stringify({ ...valid, key: 'secret' }))).toBeNull(); expect(parseCollect(JSON.stringify(valid))).not.toBeNull(); });
  it('only accepts matching hosts, subdomains or localhost', () => { expect(allowedOrigin('https://evil.com', 'evil.com', 'www.example.com')).toBe(false); expect(allowedOrigin('https://notexample.com', 'notexample.com', 'example.com')).toBe(false); expect(allowedOrigin('https://app.example.com', 'app.example.com', 'www.example.com')).toBe(true); expect(allowedOrigin(null, 'localhost', 'example.com')).toBe(true); });
  it('accepts a matching Origin even with a faked non-matching body hostname', () => {
    expect(allowedOrigin('https://pdfeye.net', 'evil.com', 'pdfeye.net')).toBe(true);
  });
  it('rejects a non-matching Origin even with a matching body hostname', () => {
    expect(allowedOrigin('https://evil.com', 'pdfeye.net', 'pdfeye.net')).toBe(false);
  });
  it('accepts a matching body hostname only when Origin is absent', () => {
    expect(allowedOrigin(null, 'pdfeye.net', 'pdfeye.net')).toBe(true);
  });
  it('rejects a non-matching body hostname when Origin is absent', () => {
    expect(allowedOrigin(null, 'evil.com', 'pdfeye.net')).toBe(false);
  });
  it.each([
    ['https://app.pdfeye.net', 'pdfeye.net'],
    ['https://deep.app.pdfeye.net', 'www.pdfeye.net'],
    ['https://www.pdfeye.net', 'pdfeye.net'],
    ['https://pdfeye.net', 'www.pdfeye.net'],
    ['https://localhost:3000', 'pdfeye.net'],
  ])('accepts matching www, subdomain or localhost Origin %s for %s', (origin, website) => {
    expect(allowedOrigin(origin, 'evil.com', website)).toBe(true);
  });
  it.each(['https://pdfeye.net.evil.com', 'https://evilpdfeye.net'])('rejects lookalike Origin %s even with a matching body', origin => {
    expect(allowedOrigin(origin, 'pdfeye.net', 'pdfeye.net')).toBe(false);
  });
  it.each(['', 'null', 'not a URL'])('rejects present invalid Origin %j without falling back to the body', origin => {
    expect(allowedOrigin(origin, 'pdfeye.net', 'pdfeye.net')).toBe(false);
  });
  it.each(['www.pdfeye.net', 'app.pdfeye.net'])('accepts matching body hostname %s without Origin', hostname => {
    expect(allowedOrigin(null, hostname, 'www.pdfeye.net')).toBe(true);
  });
  it.each(['pdfeye.net.evil.com', 'evilpdfeye.net'])('rejects lookalike body hostname %s without Origin', hostname => {
    expect(allowedOrigin(null, hostname, 'pdfeye.net')).toBe(false);
  });
  it('rejects bodies above 4 KB including multibyte input', () => { expect(parseCollect(' '.repeat(4097))).toBeNull(); expect(parseCollect(JSON.stringify({ ...valid, utm_campaign: 'é'.repeat(2100) }))).toBeNull(); });
  it('restricts event names to the specified pattern', () => { for (const name of ['Signup', 'joined-waitlist', 'a'.repeat(33), '1signup']) expect(parseCollect(JSON.stringify({ ...valid, name }))).toBeNull(); expect(parseCollect(JSON.stringify({ ...valid, name: 'joined_waitlist' }))).not.toBeNull(); });
  it('drops events at 60 per visitor or 5000 per product', () => { expect(withinRateLimit(59, 4999)).toBe(true); expect(withinRateLimit(60, 0)).toBe(false); expect(withinRateLimit(0, 5000)).toBe(false); });
  it('does not accept query strings or full URLs as paths', () => { expect(parseCollect(JSON.stringify({ ...valid, path: '/pricing?email=private' }))).toBeNull(); expect(parseCollect(JSON.stringify({ ...valid, path: 'https://example.com' }))).toBeNull(); });
  it('uses first touch then referrer then direct source', () => { expect(eventSource({ first_touch_source: 'newsletter', first_touch_referrer_host: 'search.example' })).toBe('newsletter'); expect(eventSource({ first_touch_referrer_host: 'search.example' })).toBe('search.example'); expect(eventSource({})).toBe('Direct / unknown'); });
});
it('ships dependency-free minified tracking below 5 KB', () => { expect(Buffer.byteLength(readFileSync('public/t.js'))).toBeLessThan(5 * 1024); });