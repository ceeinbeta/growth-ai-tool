import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { hasSignInParams, landingRedirectTarget } from '@/lib/auth-redirect';

describe('sign-in redirect', () => {
  it('sends the one-time link to /overview, not the landing page', () => {
    const source = readFileSync('src/routes/auth.tsx', 'utf8');
    expect(source).toContain('emailRedirectTo: `${window.location.origin}/overview`');
  });

  it('redirects to /overview when the landing page loads with a code and a session', () => {
    expect(landingRedirectTarget('?code=abc123', '', true)).toBe('/overview');
    expect(landingRedirectTarget('', '#access_token=tok&refresh_token=ref', true)).toBe('/overview');
  });

  it('keeps a signed-in visitor on the landing page without sign-in parameters', () => {
    expect(landingRedirectTarget('', '', true)).toBeNull();
    expect(landingRedirectTarget('?utm_source=newsletter', '', true)).toBeNull();
  });

  it('does not redirect a signed-out visitor with an error parameter', () => {
    expect(landingRedirectTarget('', '#error=access_denied&error_description=Link+expired', false)).toBeNull();
    expect(landingRedirectTarget('?code=abc123', '', false)).toBeNull();
  });

  it('detects sign-in parameters in query and hash', () => {
    expect(hasSignInParams('?code=abc', '')).toBe(true);
    expect(hasSignInParams('', '#access_token=x')).toBe(true);
    expect(hasSignInParams('', '#error_description=x')).toBe(true);
    expect(hasSignInParams('?ref=footer', '')).toBe(false);
    expect(hasSignInParams('', '')).toBe(false);
  });
});
