import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const page = readFileSync('src/routes/_authenticated/overview.tsx', 'utf8');

describe('overview layout', () => {
  it('has no more than 4 top-level sections on desktop', () => {
    const count = page.match(/data-overview-section/g)?.length ?? 0;
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(4);
  });
  it('keeps the profile reachable by #profile and expanded when arriving there', () => {
    expect(page).toContain('id="profile"');
    expect(page).toContain('location.hash === "profile"');
  });
  it('drops the full-width Find/Fix/Prove card and the duplicate Set up card', () => {
    expect(page).not.toContain('loop-heading');
    expect(page).not.toContain('setup-missing-heading');
  });
  it('shows recent activity capped at 5 rows', () => {
    expect(page).toContain('.slice(0, 5)');
  });
});
