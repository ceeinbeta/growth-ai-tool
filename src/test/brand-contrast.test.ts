import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
const theme = readFileSync('src/styles.css', 'utf8');
const palette = Object.fromEntries([...theme.matchAll(/--([\w-]+):\s*(#[\da-f]{6});/gi)].map(m => [m[1], m[2]]));
function luminance(color: string) {
  const rgb = [1, 3, 5].map(i => Number.parseInt(color.slice(i, i + 2), 16) / 255).map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4);
  return rgb.reduce((sum, c, i) => sum + c * ([.2126, .7152, .0722][i] ?? 0), 0);
}
function contrast(a: string, b: string) { const [lo, hi] = [luminance(a), luminance(b)].sort((x, y) => x - y); return ((hi ?? 0) + .05) / ((lo ?? 0) + .05); }
function files(dir: string): string[] { return readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(`${dir}/${e.name}`) : /\.(tsx?|css|js)$/.test(e.name) ? [`${dir}/${e.name}`] : []); }
const hex = /#[\da-f]{3,8}\b/i;
describe('d15 contrast and centralized palette', () => {
  it('keeps exact founder tokens in the theme', () => {
    expect(palette).toMatchObject({ canvas: '#F3F5EE', paper: '#FBFCF8', white: '#FFFFFF', ink: '#17352C', 'palette-muted': '#687A72', 'brand-green': '#39A875', 'brand-bright': '#A8E063', 'brand-deep': '#237A55', line: '#DCE4DA', 'muted-text': '#62746E' });
  });
  it('passes AA for every permitted plain text surface', () => {
    for (const [fg, bg] of [['ink','paper'],['ink','canvas'],['ink','white'],['ink','brand-bright'],['ink','primary-hover'],['brand-deep','paper'],['brand-deep','canvas'],['muted-text','paper'],['muted-text','canvas'],['white','ink'],['ink','danger-soft'],['ink','warning-soft']]) {
      expect(contrast(palette[fg] ?? '', palette[bg] ?? '')).toBeGreaterThanOrEqual(4.5);
    }
  });
  it('rejects normal-text use of green and confirms the lightest muted family step', () => {
    expect(contrast(palette['brand-green'] ?? '', palette.paper ?? '')).toBeLessThan(4.5);
    expect(contrast(palette.white ?? '', palette['brand-green'] ?? '')).toBeLessThan(4.5);
    expect(contrast(palette.ink ?? '', palette['brand-green'] ?? '')).toBeLessThan(4.5);
    const brighter = (palette['muted-text'] ?? '').replace(/[\da-f]{2}/gi, channel => (Number.parseInt(channel, 16) + 1).toString(16).padStart(2, '0'));
    expect(contrast(brighter, palette.canvas ?? '')).toBeLessThan(4.5);
  });
  it('forbids authored hardcoded hex outside the shared theme', () => {
    expect([...files('src'), ...files('scripts')].filter(path => path !== 'src/styles.css' && !path.includes('/test/') && hex.test(readFileSync(path, 'utf8')))).toEqual([]);
    expect(hex.test('color: #39A875')).toBe(true);
    expect(hex.test('color: var(--brand-green)')).toBe(false);
  });
});