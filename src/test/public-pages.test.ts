import { describe, expect, it } from 'vitest';

describe.skipIf(process.env['PROFILE_INTEGRATION_TEST'] !== '1')('public pages without a session', () => {
  for (const [path, title] of [['/', 'Find the leak.'], ['/privacy', 'Privacy']]) {
    it(`renders ${path} without redirecting to sign-in`, async () => {
      const response = await fetch(`http://localhost:8080${path}`, { redirect: 'manual' });
      expect(response.status).toBe(200);
      const html = await response.text();
      expect(html).toContain(title);
      expect(html).toContain('rel="canonical"');
      expect(html).not.toMatch(/name="robots"[^>]*noindex/);
    });
  }
});