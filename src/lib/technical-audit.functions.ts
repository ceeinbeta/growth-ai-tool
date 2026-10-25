import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { runTechnicalChecks } from './technical-audit.server';

export const runTechnicalAudit = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ productId: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const product = await context.supabase.from('products').select('id,name,url').eq('id', data.productId).maybeSingle();
    if (product.error || !product.data) return { ok: false, error: "This product isn't available in your workspace." };
    const { supabaseAdmin: admin } = await import('@/integrations/supabase/client.server');
    const reserved = await admin.rpc('reserve_technical_audit', { pid: data.productId });
    if (reserved.error) return { ok: false, error: reserved.error.message.includes('technical_audit_limit_reached') ? 'You have used the 10 technical audits for this product in the last hour. Try again later.' : "We couldn't start the audit. Please try again." };
    const result = await runTechnicalChecks(product.data.url);
    if (!result.ok) return { ok: false, error: result.error };
    const saved = await admin.rpc('save_technical_audit', { pid: data.productId, page_url: result.url, fetch_time: result.fetchedAt, findings: result.findings });
    if (saved.error) return { ok: false, error: "The audit finished, but couldn't be saved. Please try again." };
    return { ok: true, error: null };
  });
