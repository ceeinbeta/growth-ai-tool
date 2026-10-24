import { allowedOrigin, MAX_BODY_BYTES, parseCollect } from './tracking';
const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Cache-Control': 'no-store' };
export function emptyCollect() { return new Response(null, { status: 204, headers }); }
export async function collect(request: Request) {
  try {
    if (/bot|crawler|spider|headless/i.test(request.headers.get('user-agent') ?? '')) return emptyCollect();
    if (Number(request.headers.get('content-length')) > MAX_BODY_BYTES) return emptyCollect();
    const reader = request.body?.getReader();
    if (!reader) return emptyCollect();
    const chunks: Uint8Array[] = []; let length = 0;
    while (true) { const { value, done } = await reader.read(); if (done) break; length += value.byteLength; if (length > MAX_BODY_BYTES) { await reader.cancel(); return emptyCollect(); } chunks.push(value); }
    const bytes = new Uint8Array(length); let offset = 0; for (const c of chunks) { bytes.set(c, offset); offset += c.length; }
    const payload = parseCollect(new TextDecoder().decode(bytes));
    if (!payload) return emptyCollect();
    const { supabaseAdmin: admin } = await import('@/integrations/supabase/client.server');
    const { data: product } = await admin.from('products').select('id,url').eq('tracking_key', payload.key).maybeSingle();
    if (!product || !allowedOrigin(request.headers.get('origin'), payload.hostname, product.url)) return emptyCollect();
    const { key, hostname, ...event } = payload;
    await admin.rpc('collect_tracking_event', { pid: product.id, payload: event });
  } catch { /* Invalid or dropped events never expose collection details. */ }
  return emptyCollect();
}