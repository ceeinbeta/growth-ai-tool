import { z } from 'zod';

export const MAX_BODY_BYTES = 4096;
export const eventName = z.string().regex(/^[a-z][a-z0-9_]{0,31}$/);
const text = z.string().max(160).regex(/^[^@\r\n]*$/).nullable().optional();
const host = z.string().max(253).regex(/^(localhost|[a-z0-9.-]+)$/i).nullable().optional();
export const collectSchema = z.object({
  key: z.string().regex(/^gl_[a-zA-Z0-9_-]{24,}$/).max(100),
  visitor_id: z.string().regex(/^[a-zA-Z0-9_-]{24,80}$/),
  name: eventName,
  hostname: host.unwrap().unwrap(),
  path: z.string().max(1024).regex(/^\/[^?#@\r\n]*$/),
  referrer_host: host,
  utm_source: text, utm_medium: text, utm_campaign: text, utm_term: text, utm_content: text,
  first_touch_source: text, first_touch_medium: text, first_touch_campaign: text, first_touch_referrer_host: host,
}).strict();
export function parseCollect(body: string) {
  if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) return null;
  try { const result = collectSchema.safeParse(JSON.parse(body)); return result.success ? result.data : null; } catch { return null; }
}
export function allowedHost(candidate: string, website: string) {
  try {
    const target = new URL(`https://${website}`).hostname.toLowerCase().replace(/^www\./, '');
    const h = candidate.toLowerCase().replace(/^www\./, '');
    return h === 'localhost' || h === target || h.endsWith(`.${target}`);
  } catch { return false; }
}
export function allowedOrigin(origin: string | null, hostname: string, website: string) {
  let originHost = '';
  try { if (origin) originHost = new URL(origin).hostname; } catch { /* invalid origin */ }
  return allowedHost(originHost, website) || allowedHost(hostname, website);
}
export function withinRateLimit(visitorEvents: number, productEvents: number) { return visitorEvents < 60 && productEvents < 5000; }
export function eventSource(e: { first_touch_source?: string | null; first_touch_referrer_host?: string | null }) { return e.first_touch_source || e.first_touch_referrer_host || 'Direct / unknown'; }