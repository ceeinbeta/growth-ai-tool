import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { pageCopySchema } from './audit-schema';
import { funnelSummarySchema } from './funnel';
import { generatePageAudit } from './audit-page.server';
export const auditPage = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ productId: z.string().uuid(), copy: pageCopySchema, days: z.union([z.literal(7), z.literal(30), z.literal(90)]) }).parse(v))
  .handler(async ({ data, context }) => {
    const product = await context.supabase.from('products').select('id,name,one_liner,audience,category,stage').eq('id', data.productId).maybeSingle();
    if (product.error || !product.data) return { ok: false, error: "This product isn't available in your workspace." };
    const summary = await context.supabase.rpc('funnel_summary', { pid: data.productId, days: data.days });
    if (summary.error) return { ok: false, error: "We couldn't read the measured funnel. Please try again." };
    const funnel = funnelSummarySchema.parse(summary.data);
    return generatePageAudit(product.data, data.copy, funnel.total_visitors >= 100 ? funnel : null);
  });