import { queryOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
const summary = z.object({ visits: z.number(), visitors: z.number(), signups: z.number(), waitlist: z.number(), sources: z.array(z.object({ source: z.string(), count: z.number() })) });
export const trackingQuery = (id: string) => queryOptions({
  queryKey: ['tracking', id], refetchInterval: 30000,
  queryFn: async () => {
    const [recent, totals] = await Promise.all([
      supabase.from('events').select('id,name,path,first_touch_source,first_touch_referrer_host,created_at').eq('product_id', id).order('created_at', { ascending: false }).limit(20),
      supabase.rpc('tracking_summary', { pid: id }),
    ]);
    if (recent.error) throw recent.error;
    if (totals.error) throw totals.error;
    return { recent: recent.data, totals: summary.parse(totals.data) };
  },
});