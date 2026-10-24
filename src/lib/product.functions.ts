import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import type { Database } from '@/integrations/supabase/types';
import { MAX_LOGO_BYTES, sniffUpload, type LogoType } from './logo';

const BUCKET = 'product-logos';
const idInput = z.object({ productId: z.string().uuid() });
type Db = SupabaseClient<Database>;

async function storeLogo(db: Db, productId: string, oldPath: string | null, bytes: Uint8Array, type: LogoType) {
  const path = `${productId}/logo-${Date.now()}.${type.ext}`;
  const up = await db.storage.from(BUCKET).upload(path, bytes, { contentType: type.mime, upsert: true });
  if (up.error) return false;
  const upd = await db.from('products').update({ logo_path: path }).eq('id', productId);
  if (upd.error) { await db.storage.from(BUCKET).remove([path]); return false; }
  if (oldPath && oldPath !== path) await db.storage.from(BUCKET).remove([oldPath]);
  return true;
}

/** Fetches the product's own site icon. Failure is silent (the letter tile stays). */
export const refreshLogo = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => idInput.parse(i))
  .handler(async ({ data, context }) => {
    const db = context.supabase as Db;
    const { data: p } = await db.from('products').select('id,url,logo_path').eq('id', data.productId).maybeSingle();
    if (!p) return { ok: false as const, error: "This product isn't available in your workspace." };
    const lim = await db.rpc('reserve_logo_fetch', { pid: p.id });
    if (lim.error) return { ok: false as const, error: lim.error.message.includes('logo_fetch_limit_reached') ? 'Too many logo refreshes. Try again in an hour.' : "We couldn't refresh the logo." };
    const { fetchSiteLogo } = await import('./logo.server');
    const found = await fetchSiteLogo(p.url);
    if (!found) return { ok: true as const, found: false };
    return { ok: true as const, found: await storeLogo(db, p.id, p.logo_path, found.bytes, found.type) };
  });

export const uploadLogo = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => idInput.extend({ base64: z.string().max(Math.ceil(MAX_LOGO_BYTES / 3) * 4 + 8) }).parse(i))
  .handler(async ({ data, context }) => {
    const db = context.supabase as Db;
    const { data: p } = await db.from('products').select('id,logo_path').eq('id', data.productId).maybeSingle();
    if (!p) return { ok: false as const, error: "This product isn't available in your workspace." };
    let bytes: Uint8Array;
    try { bytes = Uint8Array.from(atob(data.base64), c => c.charCodeAt(0)); } catch { return { ok: false as const, error: 'Choose a PNG, JPEG or WebP image.' }; }
    if (bytes.length > MAX_LOGO_BYTES) return { ok: false as const, error: 'The image must be 300 KB or smaller.' };
    const type = sniffUpload(bytes);
    if (!type) return { ok: false as const, error: 'Choose a PNG, JPEG or WebP image.' };
    return (await storeLogo(db, p.id, p.logo_path, bytes, type)) ? { ok: true as const } : { ok: false as const, error: "We couldn't save the logo. Please try again." };
  });

export const removeLogo = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => idInput.parse(i))
  .handler(async ({ data, context }) => {
    const db = context.supabase as Db;
    const { data: p } = await db.from('products').select('id,logo_path').eq('id', data.productId).maybeSingle();
    if (!p) return { ok: false as const, error: "This product isn't available in your workspace." };
    const upd = await db.from('products').update({ logo_path: null }).eq('id', p.id);
    if (upd.error) return { ok: false as const, error: "We couldn't remove the logo. Please try again." };
    if (p.logo_path) await db.storage.from(BUCKET).remove([p.logo_path]);
    return { ok: true as const };
  });

/** Owner-only delete; database cascades remove every dependent row. */
export const deleteProduct = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => idInput.extend({ confirmName: z.string() }).parse(i))
  .handler(async ({ data, context }) => {
    const db = context.supabase as Db;
    const { data: p } = await db.from('products').select('id,name,logo_path').eq('id', data.productId).maybeSingle();
    if (!p) return { ok: false as const, error: "This product isn't available in your workspace." };
    if (data.confirmName.trim() !== p.name) return { ok: false as const, error: 'Type the product name exactly to confirm.' };
    const files = await db.storage.from(BUCKET).list(p.id);
    const r = await db.rpc('delete_product_as_owner', { pid: p.id });
    if (r.error) return { ok: false as const, error: r.error.message.includes('forbidden') ? 'Only the workspace owner can delete a product.' : "We couldn't delete this product. Please try again." };
    const paths = (files.data ?? []).map(f => `${p.id}/${f.name}`);
    if (paths.length) { const { supabaseAdmin } = await import('@/integrations/supabase/client.server'); await supabaseAdmin.storage.from(BUCKET).remove(paths); }
    return { ok: true as const };
  });
