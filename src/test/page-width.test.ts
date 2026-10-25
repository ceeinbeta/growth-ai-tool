import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';

const dir = 'src/routes/_authenticated';
const pages = readdirSync(dir).filter(f => f.endsWith('.tsx') && f !== 'route.tsx' && f !== 'products.new.tsx');

describe('signed-in page width', () => {
  it('every signed-in page uses the shared PageShell', () => {
    for (const f of pages) expect(readFileSync(`${dir}/${f}`, 'utf8'), f).toContain('<PageShell');
  });
  it('no signed-in page wraps content in a narrow centered max-w container', () => {
    const narrow = /mx-auto[^"]*max-w-(?:sm|md|xl|2xl|3xl|4xl|5xl|6xl|7xl|\[\d+px\])/;
    for (const f of pages) expect(narrow.test(readFileSync(`${dir}/${f}`, 'utf8')), f).toBe(false);
  });
  it('caps the shared frame at the 1600px token', () => {
    const css = readFileSync('src/styles.css', 'utf8');
    expect(css).toContain('--page-max: 1600px');
    expect(css).toMatch(/\.page-shell \{[^}]*max-width: var\(--page-max\)/);
  });
});
