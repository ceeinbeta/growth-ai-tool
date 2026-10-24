import { describe, expect, it } from 'vitest';
import { allowedFetchUrl, classifyHtml, isPublicHost, unreachableReason, withinCheckLimit } from '../lib/install-check';

const key = `gl_${'a'.repeat(30)}`;
describe('install check host validator', () => {
  it.each(['example.com', 'www.example.com'])('accepts %s', h => expect(allowedFetchUrl(`https://${h}/`, 'example.com')).not.toBeNull());
  it.each(['127.0.0.1', 'localhost', '10.0.0.1', '[::1]', 'example.com:8080', 'user@example.com', 'intranet', 'server.internal', 'printer.local'])('rejects %s', h => {
    expect(allowedFetchUrl(`https://${h}/`, h)).toBeNull();
  });
  it('rejects plain http', () => expect(allowedFetchUrl('http://example.com/', 'example.com')).toBeNull());
  it('rejects a redirect to a different site', () => {
    expect(allowedFetchUrl('https://evil.com/', 'example.com')).toBeNull();
    expect(allowedFetchUrl('https://example.com.evil.com/', 'example.com')).toBeNull();
    expect(allowedFetchUrl('https://app.example.com/', 'www.example.com')).not.toBeNull();
  });
  it('rejects IPs as hosts', () => expect(isPublicHost('10.0.0.1')).toBe(false));
});

describe('install check classification', () => {
  it('found with own domain', () => expect(classifyHtml(`<script async src="https://growloop.app/t.js" data-key="${key}"></script>`, key, 'growloop.app')).toEqual({ status: 'found', ownDomain: true }));
  it('found but other script address', () => expect(classifyHtml(`<script src="https://other.app/t.js" data-key="${key}"></script>`, key, 'growloop.app')).toEqual({ status: 'found', ownDomain: false }));
  it('different key', () => expect(classifyHtml(`<script data-key="gl_${'b'.repeat(30)}"></script>`, key, 'growloop.app').status).toBe('different_key'));
  it('not found', () => expect(classifyHtml('<html></html>', key, 'growloop.app').status).toBe('not_found'));
  it('unreachable reasons', () => {
    expect(unreachableReason(new DOMException('aborted', 'AbortError'))).toMatch(/8 seconds/);
    expect(unreachableReason(new Error('SSL certificate error'))).toMatch(/certificate/);
  });
});

describe('install check rate limit', () => {
  it('allows 10 checks per product per hour', () => { expect(withinCheckLimit(9)).toBe(true); expect(withinCheckLimit(10)).toBe(false); });
});
