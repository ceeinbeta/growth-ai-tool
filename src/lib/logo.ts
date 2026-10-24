export const MAX_LOGO_BYTES = 300 * 1024;
export type LogoType = { ext: 'png' | 'jpg' | 'webp' | 'ico'; mime: string };

/** Identifies an image by its first bytes; the declared type and file name are ignored. SVG and everything else return null. */
export function sniffImage(bytes: Uint8Array): LogoType | null {
  const b = (i: number) => bytes[i];
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => b(i) === v)) return { ext: 'png', mime: 'image/png' };
  if (bytes.length >= 3 && b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff) return { ext: 'jpg', mime: 'image/jpeg' };
  if (bytes.length >= 12 && String.fromCharCode(...bytes.subarray(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.subarray(8, 12)) === 'WEBP') return { ext: 'webp', mime: 'image/webp' };
  if (bytes.length >= 4 && b(0) === 0 && b(1) === 0 && b(2) === 1 && b(3) === 0) return { ext: 'ico', mime: 'image/x-icon' };
  return null;
}

/** Uploads allow png, jpeg and webp only. */
export function sniffUpload(bytes: Uint8Array): LogoType | null {
  const t = sniffImage(bytes);
  return t && t.ext !== 'ico' ? t : null;
}

/** Icon candidates in priority order: apple-touch-icon, then icon link, then /favicon.ico. */
export function iconCandidates(html: string, pageUrl: string): string[] {
  const links = html.match(/<link\b[^>]*>/gi) ?? [];
  const pick = (re: RegExp) => links.filter(l => re.test(l.match(/\srel\s*=\s*["']?([^"'>]+)/i)?.[1] ?? '')).map(l => l.match(/\shref\s*=\s*["']?([^"'\s>]+)/i)?.[1]).filter((h): h is string => !!h);
  const out: string[] = [];
  for (const href of [...pick(/apple-touch-icon/i), ...pick(/(^|\s)icon(\s|$)/i), '/favicon.ico']) {
    if (/\.svg(\?|#|$)/i.test(href) || href.startsWith('data:')) continue;
    try { const abs = new URL(href.replace(/&amp;/g, '&'), pageUrl).href; if (!out.includes(abs)) out.push(abs); } catch { /* skip */ }
  }
  return out;
}
