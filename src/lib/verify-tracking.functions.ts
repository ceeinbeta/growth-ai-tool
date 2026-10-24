import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { INSTALL_CHECK_LIMIT_MESSAGE, snippetMessage } from './install-check';
import { checkSnippet } from './install-check.server';

export const verifyTracking = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ productId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    // RLS decides access: non-members get no row.
    const { data: product } = await context.supabase.from('products').select('id,url,tracking_key').eq('id', data.productId).maybeSingle();
    if (!product) return { ok: false as const, error: "This product isn't available in your workspace." };
    const { supabaseAdmin: admin } = await import('@/integrations/supabase/client.server');
    const { error: limitError } = await admin.rpc('reserve_install_check', { pid: product.id });
    if (limitError) return { ok: false as const, error: limitError.message.includes('install_check_limit_reached') ? INSTALL_CHECK_LIMIT_MESSAGE : "We couldn't start the check. Please try again." };

    const request = getRequest();
    const origin = request.headers.get('origin');
    let appHost = new URL(request.url).hostname;
    try { if (origin) appHost = new URL(origin).hostname; } catch { /* keep request host */ }

    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const [snippet, count, latest] = await Promise.all([
      checkSnippet(product.url, product.tracking_key, appHost),
      context.supabase.from('events').select('id', { count: 'exact', head: true }).eq('product_id', product.id).gte('created_at', since),
      context.supabase.from('events').select('created_at').eq('product_id', product.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    return {
      ok: true as const,
      snippet: { status: snippet.status, message: snippetMessage(snippet) },
      eventsLast24h: count.count ?? 0,
      lastEventAt: latest.data?.created_at ?? null,
    };
  });
