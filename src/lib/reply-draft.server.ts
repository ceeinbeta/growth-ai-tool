import { getRequest } from '@tanstack/react-start/server';
import { createResponsesCall } from './ai/reply-responses.server';
import { replyInput, replyInstructions, validateReply } from './reply-guards.server';
import type { ConversationProfile, HnPost } from './conversations';
export const REPLY_MODEL='openai/gpt-6-astra';
export async function generateReply(product: ConversationProfile & {id:string;description:string}, post:HnPost & {id:string}) {
 const {supabaseAdmin:admin}=await import('@/integrations/supabase/client.server');
 const key=process.env['LOVABLE_API_KEY']; if(!key) return {ok:false,error:'AI drafting is not connected yet.'};
 const state=await admin.from('profile_ai_state').select('blocked,message').eq('model',REPLY_MODEL).maybeSingle();
 if(state.error) return {ok:false,error:'We could not check AI access. Try again later.'};
 if(state.data?.blocked) return {ok:false,error:state.data.message ?? 'AI drafting is paused until access is restored.'};
 const reserved=await admin.rpc('reserve_ai_run',{pid:product.id,feature:'reply-draft'});
 if(reserved.error) return {ok:false,error:reserved.error.message.includes('reply_draft_limit_reached') ? 'You have used the 5 reply drafts for this product in the last 24 hours. Try again later.' : reserved.error.message.includes('platform_profile_run_limit_reached') ? 'AI checks are paused for today. Try again tomorrow.' : 'We could not start this draft.'};
 let terminal:string|undefined;
 const call=createResponsesCall(getRequest(),{baseURL:'https://ai.gateway.lovable.dev/v1',apiKey:key,model:REPLY_MODEL},[{role:'user',content:replyInput(product,post)}],replyInstructions(product.name),async(status,message)=>{
  terminal=message;
  if(status===402 || status===403){const paused=await admin.from('profile_ai_state').upsert({model:REPLY_MODEL,blocked:true,message,updated_at:new Date().toISOString()}); if(paused.error) throw new Error('Could not persist paused AI access.');}
 });
 let text=''; let failure=false;
 try{text=await call.result.text;}catch{failure=true;}
 const usage=await Promise.resolve(call.result.usage).catch(()=>null);
 const logged=await admin.from('ai_usage').insert({product_id:product.id,feature:'reply-draft',model:REPLY_MODEL,input_tokens:usage?.inputTokens ?? null,output_tokens:usage?.outputTokens ?? null,cost_usd:null});
 if(logged.error) return {ok:false,error:'We could not record this draft. Try again later.'};
 if(terminal) return {ok:false,error:terminal};
 const finish=await Promise.resolve(call.result.finishReason).catch(()=>null);
 if(finish==='content-filter') return {ok:false,error:'The AI declined to write a reply for this post.'};
 if(failure || !validateReply(text,product.name,post)) return {ok:false,error:'The AI did not return a safe, usable reply. No draft was saved.'};
 const saved=await admin.rpc('save_reply_draft',{pid:product.id,oid:post.id,draft_text:text.trim(),model_name:REPLY_MODEL});
 return saved.error ? {ok:false,error:'The reply could not be saved.'} : {ok:true,error:null};
}
