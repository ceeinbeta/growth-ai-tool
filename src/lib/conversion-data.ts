import { queryOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { funnelSummarySchema } from './funnel';
export const conversionQuery = (id: string, days = 30) => queryOptions({
  queryKey: ['conversion', id, days], refetchInterval: 30000,
  queryFn: async () => {
    const [summary, steps, audit, events] = await Promise.all([
      supabase.rpc('funnel_summary', { pid: id, days }),
      supabase.from('funnel_steps').select('*').eq('product_id', id).order('position'),
      supabase.from('audits').select('*').eq('product_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('events').select('id', { count: 'exact', head: true }).eq('product_id', id),
    ]);
    for (const r of [summary, steps, audit, events]) if (r.error) throw r.error;
    const leaks = audit.data ? await supabase.from('leaks').select('*').eq('audit_id', audit.data.id).order('created_at').order('id') : { data: [], error: null };
    if (leaks.error) throw leaks.error;
    return { summary: funnelSummarySchema.parse(summary.data), steps: steps.data ?? [], audit: audit.data, leaks: leaks.data ?? [], hasEvents: (events.count ?? 0) > 0 };
  },
});
export const openLeaksQuery = (id: string) => queryOptions({ queryKey: ['open-leaks', id], queryFn: async () => {
  const r = await supabase.from('leaks').select('id,area,impact').eq('product_id', id).eq('status', 'open');
  if (r.error) throw r.error;
  return (r.data ?? []).sort((a, b) => ['high', 'medium', 'low'].indexOf(a.impact) - ['high', 'medium', 'low'].indexOf(b.impact));
} });