// Exact founder-provided geometry. Colors always come from the shared theme.
export const BRAND_MARK_PATHS = [
  'M46.5 21.5C42.9 16.8 37.2 14 31 14C20.5 14 12 22.5 12 33C12 43.5 20.5 52 31 52C41.5 52 50 43.5 50 33V17',
  'M50 17C50 25.8 42.8 33 34 33H26',
] as const;
export const BRAND_MARK_CIRCLES = [{ cx: 50, cy: 14, r: 5 }, { cx: 24, cy: 33, r: 5 }] as const;
// Retained for a later decision; never rendered by Logo.
export const LIVING_INFINITY_PATHS = [
  'M36 29C30 19 24.5 14 17.5 14C9.5 14 5 20.5 5 28C5 35.5 9.5 42 17.5 42C26 42 31 34 36 27C41 20 46 14 54.5 14C62.5 14 67 20.5 67 28C67 35.5 62.5 42 54.5 42C47.5 42 42 37 36 27',
  'M47 13C48.5 6.5 53.5 3 61 4C60.5 11 56 15 49 16',
] as const;

export function brandMarkSvg(stroke = 'var(--brand-green)', fill = 'var(--brand-bright)') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">${BRAND_MARK_PATHS.map(d => `<path d="${d}" stroke="${stroke}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}${BRAND_MARK_CIRCLES.map(c => `<circle cx="${c.cx}" cy="${c.cy}" r="${c.r}" fill="${fill}"/>`).join('')}</svg>`;
}