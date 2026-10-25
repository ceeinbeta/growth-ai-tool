import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const css = readFileSync('src/styles.css', 'utf8');
describe('uppercase label style is opt-in only', () => {
  it('no base rule uppercases label, legend, thead, dt or time', () => {
    for (const rule of css.match(/[^{}]+\{[^}]*text-transform:\s*uppercase[^}]*\}/g) ?? []) {
      const selectors = rule.split('{')[0]!.split(',').map(s => s.trim());
      for (const s of selectors) expect(s).not.toMatch(/^(label|legend|thead|dt|time)$/);
    }
  });
  it('form labels are 13px/500 sentence case and table headers muted 11px/600 without tracking', () => {
    expect(css).toMatch(/label, legend \{[^}]*font-size: 13px; font-weight: 500;[^}]*text-transform: none; letter-spacing: 0; color: var\(--foreground\)/);
    expect(css).toMatch(/thead, thead th \{[^}]*font-size: 11px; font-weight: 600; text-transform: none; letter-spacing: 0; color: var\(--muted-foreground\)/);
  });
  it('eyebrow classes keep the tracked uppercase style', () => {
    expect(css).toMatch(/\.eyebrow, \.brand-label, \.public-eyebrow, \.nav-group-label \{[^}]*text-transform: uppercase/);
  });
});
