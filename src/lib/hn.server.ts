import { parseHTML } from 'linkedom';
import { termsSchema, scorePost, type ConversationProfile, type HnPost } from './conversations';
export const HN_MAX_BYTES = 1024*1024;
export const HN_TIMEOUT_MS = 8000;
export function allowedHnUrl(value: string) { try { const u = new URL(value); return u.protocol==='https:' && u.hostname==='hn.algolia.com' && !u.port && !u.username && !u.password && u.pathname==='/api/v1/search_by_date' ? u : null; } catch { return null; } }
function plain(s: unknown, cap: number) { if(typeof s!=='string') return ''; const {document}=parseHTML(`<div>${s}</div>`); document.querySelectorAll('script,style').forEach(n=>n.remove()); return (document.querySelector('div')?.textContent ?? '').replace(/\s+/g,' ').trim().slice(0,cap); }
export function parseHnResponse(value: unknown): HnPost[] {
 if(!value || typeof value!=='object' || !('hits' in value) || !Array.isArray(value.hits)) throw new Error('Hacker News returned an unreadable response.');
 return value.hits.slice(0,50).flatMap((v: unknown)=>{
  if(!v || typeof v!=='object') return []; const h=v as Record<string,unknown>;
  if(h.dead || h.deleted || h.locked || !/^\d+$/.test(String(h.objectID))) return [];
  const title=plain(h.title ?? h.story_title,300); const posted=String(h.created_at ?? '');
  if(!title || !Number.isFinite(Date.parse(posted))) return [];
  const count=(x:unknown)=>typeof x==='number' && Number.isFinite(x) ? Math.max(0,Math.min(2147483647,Math.floor(x))) : 0;
  return [{external_id:String(h.objectID),url:`https://news.ycombinator.com/item?id=${h.objectID}`,title,excerpt:plain(h.story_text ?? h.comment_text,500),author_handle:plain(h.author,80),posted_at:new Date(posted).toISOString(),points:count(h.points),comments:count(h.num_comments)}];
 });
}
export async function fetchHn(query: string, fetcher: typeof fetch = fetch) {
 const url=new URL('https://hn.algolia.com/api/v1/search_by_date'); url.searchParams.set('query',query); url.searchParams.set('tags','story'); url.searchParams.set('hitsPerPage','50');
 if(!allowedHnUrl(url.href)) throw new Error('This search address is not allowed.');
 const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),HN_TIMEOUT_MS);
 try {
  const res=await fetcher(url.href,{redirect:'manual',credentials:'omit',signal:controller.signal,headers:{Accept:'application/json','User-Agent':'Growloop/1.0 (read-only; hello@mcads.co)'}});
  if(!res.ok) { await res.body?.cancel(); throw new Error(res.status>=300 && res.status<400 ? 'Hacker News redirected the search. Nothing was followed.' : 'Hacker News could not complete the search. Try again later.'); }
  if(Number(res.headers.get('content-length') ?? 0)>HN_MAX_BYTES) {await res.body?.cancel(); throw new Error('Hacker News returned too much data.');}
  const reader=res.body?.getReader(); if(!reader) throw new Error('Hacker News returned no response.');
  let size=0; const chunks: Uint8Array[]=[];
  while(true){const r=await reader.read(); if(r.done) break; size+=r.value.byteLength; if(size>HN_MAX_BYTES){await reader.cancel();throw new Error('Hacker News returned too much data.');} chunks.push(r.value);}
  const bytes=new Uint8Array(size); let at=0; for(const c of chunks){bytes.set(c,at);at+=c.length;}
  return parseHnResponse(JSON.parse(new TextDecoder().decode(bytes)));
 } catch(e) { if(controller.signal.aborted) throw new Error('Hacker News took longer than 8 seconds. Try again later.'); throw e; } finally {clearTimeout(timer);}
}
export async function scanHn(terms: string[], profile: ConversationProfile, fetcher: typeof fetch = fetch) {
 const unique=termsSchema.parse(terms); const hits=new Map<string,HnPost>(); const errors:string[]=[];
 for(const term of unique){try {for(const post of await fetchHn(term,fetcher)) hits.set(post.external_id,post);} catch(e){errors.push(e instanceof Error ? e.message : 'Hacker News search failed.');}}
 return {hits:[...hits.values()].map(p=>scorePost(p,profile)),status:errors.length===unique.length ? 'failed' as const : errors.length ? 'partial' as const : 'done' as const,note:errors.length ? `${errors.length} of ${unique.length} searches failed. ${errors[0]}` : null};
}
