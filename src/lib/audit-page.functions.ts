import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { pageCopySchema } from './audit-schema';
import { funnelSummarySchema } from './funnel';
import { generatePageAudit } from './audit-page.server';
import { fetchAuditPage } from './audit-fetch.server';
import { auditPageUrl } from './audit-fetch';
export const auditPage = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ productId: z.string().uuid(), copy: pageCopySchema.optional(), path: z.string().max(500).default(''), days: z.union([z.literal(7), z.literal(30), z.literal(90)]) }).parse(v))
  .handler(async ({ data, context }) => {
    const product = await context.supabase.from('products').select('id,name,url,one_liner,audience,category,stage').eq('id', data.productId).maybeSingle();
    if (product.error || !product.data) return { ok: false, error: "This product isn't available in your workspace." };
    const summary = await context.supabase.rpc('funnel_summary', { pid: data.productId, days: data.days });
    if (summary.error) return { ok: false, error: "We couldn't read the measured funnel. Please try again." };
    const funnel = funnelSummarySchema.parse(summary.data);
    if (data.copy) return generatePageAudit(product.data, data.copy, funnel.total_visitors >= 100 ? funnel : null);
    if (!auditPageUrl(product.data.url, data.path)) return { ok: false, error: "Enter a path on your product's website, like /pricing.", fallback: false };
    const { supabaseAdmin: admin } = await import('@/integrations/supabase/client.server');
    const reserved = await admin.rpc('reserve_audit_fetch', { pid: data.productId });
    if (reserved.error) return { ok: false, error: reserved.error.message.includes('audit_fetch_limit_reached') ? 'You have used the 10 page fetches for this product in the last hour. Try again later or paste the copy.' : "We couldn't start the page fetch. Please try again.", fallback: true };
    const page = await fetchAuditPage(product.data.url, data.path);
    if (!page.ok) return page;
    return generatePageAudit(product.data, page.copy, funnel.total_visitors >= 100 ? funnel : null, { url: page.url, fetchedAt: page.fetchedAt });
  });