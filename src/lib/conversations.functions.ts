import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { termsSchema, conversationStatuses } from './conversations';
import { scanHn } from './hn.server';
import { generateReply } from './reply-draft.server';
const productInput=z.object({productId:z.string().uuid()});
export const scanConversations=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>productInput.extend({terms:termsSchema}).parse(v)).handler(async({data,context})=>{
 const p=await context.supabase.from('products').select('id,name,category,audience').eq('id',data.productId).maybeSingle();
 if(p.error || !p.data) return {ok:false,error:'This product is not available in your workspace.'};
 const [cs,qs]=await Promise.all([context.supabase.from('competitors').select('name').eq('product_id',data.productId),context.supabase.from('sov_questions').select('question').eq('product_id',data.productId)]);
 if(cs.error || qs.error) return {ok:false,error:'We could not read the product profile.'};
 const {supabaseAdmin:admin}=await import('@/integrations/supabase/client.server');
 const r=await admin.rpc('reserve_conversation_scan',{pid:data.productId,query_terms:data.terms});
 if(r.error || !r.data) return {ok:false,error:r.error?.message.includes('scan_hour_limit_reached') ? 'You have used the 6 scans for this product in the last hour. Try again later.' : r.error?.message.includes('scan_day_limit_reached') ? 'You have used the 30 scans for this product in the last 24 hours. Try again later.' : 'We could not start the scan.'};
 const results=await scanHn(data.terms,{...p.data,competitors:cs.data.map(c=>c.name),questions:qs.data.map(q=>q.question)});
 const saved=await admin.rpc('save_conversation_scan',{rid:r.data,hits:results.hits,outcome:results.status,safe_note:results.note ?? ''});
 if(saved.error) return {ok:false,error:'The scan could not be saved. Try again later.'};
 return {ok:results.status!=='failed',error:results.note};
});
export const saveConversationTerms=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>productInput.extend({terms:termsSchema}).parse(v)).handler(async({data,context})=>{
 const p=await context.supabase.from('products').select('id').eq('id',data.productId).maybeSingle(); if(p.error || !p.data) return {ok:false,error:'This product is not available.'};
 const {supabaseAdmin:admin}=await import('@/integrations/supabase/client.server'); const r=await admin.rpc('save_conversation_terms',{pid:data.productId,query_terms:data.terms}); return {ok:!r.error,error:r.error ? 'Could not save search terms.' : null};
});
export const changeConversation=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>productInput.extend({opportunityId:z.string().uuid(),status:z.enum(conversationStatuses).optional(),notes:z.string().max(2000).optional()}).parse(v)).handler(async({data,context})=>{
 const p=await context.supabase.from('opportunities').select('id').eq('id',data.opportunityId).eq('product_id',data.productId).maybeSingle(); if(p.error || !p.data) return {ok:false,error:'This conversation is not available.'};
 const {supabaseAdmin:admin}=await import('@/integrations/supabase/client.server'); const r=await admin.rpc('update_conversation',{pid:data.productId,oid:data.opportunityId,new_status:data.status ?? null,new_notes:data.notes ?? null}); return {ok:!r.error,error:r.error ? 'Could not save this change.' : null};
});
export const draftConversationReply=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>productInput.extend({opportunityId:z.string().uuid()}).parse(v)).handler(async({data,context})=>{
 const [p,o]=await Promise.all([context.supabase.from('products').select('id,name,description,category,audience').eq('id',data.productId).maybeSingle(),context.supabase.from('opportunities').select('*').eq('id',data.opportunityId).eq('product_id',data.productId).maybeSingle()]);
 if(p.error || !p.data || o.error || !o.data) return {ok:false,error:'This conversation is not available in your workspace.'};
 return generateReply({...p.data,competitors:[],questions:[]},o.data);
});
export const editConversationDraft=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>productInput.extend({draftId:z.string().uuid(),text:z.string().trim().min(1).max(4000)}).parse(v)).handler(async({data,context})=>{
 const d=await context.supabase.from('reply_drafts').select('id').eq('id',data.draftId).eq('product_id',data.productId).maybeSingle(); if(d.error || !d.data) return {ok:false,error:'This draft is not available.'};
 const {supabaseAdmin:admin}=await import('@/integrations/supabase/client.server'); const r=await admin.rpc('edit_reply_draft',{pid:data.productId,did:data.draftId,draft_text:data.text}); return {ok:!r.error,error:r.error ? 'Could not save draft edits.' : null};
});
