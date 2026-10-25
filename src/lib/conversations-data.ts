import { queryOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
export const conversationsQuery=(id:string)=>queryOptions({queryKey:['conversations',id],queryFn:async()=>{
 const [opportunities,drafts,scans,terms]=await Promise.all([
 supabase.from('opportunities').select('*').eq('product_id',id).order('score',{ascending:false}).order('posted_at',{ascending:false}),
 supabase.from('reply_drafts').select('*').eq('product_id',id).order('created_at',{ascending:false}),
 supabase.from('scan_runs').select('*').eq('product_id',id).order('created_at',{ascending:false}).limit(5),
 supabase.from('conversation_terms').select('terms').eq('product_id',id).maybeSingle()]);
 for(const r of [opportunities,drafts,scans,terms]) if(r.error) throw r.error;
 return {opportunities:opportunities.data ?? [],drafts:drafts.data ?? [],scans:scans.data ?? [],terms:terms.data?.terms ?? null};
}});
