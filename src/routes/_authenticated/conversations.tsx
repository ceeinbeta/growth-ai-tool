import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Search, Save, LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';
import { PageShell, PageGrid } from '@/components/PageLayout';
import { PageHeader } from '@/components/PageHeader';
import { ActionRow } from '@/components/ActionRow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { PageSkeleton, ErrorState } from '@/components/States';
import { ConversationList } from '@/components/ConversationList';
import { useActiveProduct } from '@/components/AppShell';
import { profileQuery } from '@/lib/profile-data';
import { conversationsQuery } from '@/lib/conversations-data';
import { conversationStatuses, defaultConversationTerms, termsSchema, SCORE_EXPLANATION } from '@/lib/conversations';
import { scanConversations, saveConversationTerms, changeConversation, draftConversationReply, editConversationDraft } from '@/lib/conversations.functions';
import { relativeTime } from '@/lib/setup-checklist';
export const Route=createFileRoute('/_authenticated/conversations')({head:()=>({meta:[{title:'Finding conversations · Growloop'},{name:'description',content:'Find public Hacker News posts with transparent rule-based scores and replies you post yourself.'},{property:'og:title',content:'Finding conversations · Growloop'},{property:'og:description',content:'Hacker News public posts, transparent scoring and manual replies.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'},{name:'robots',content:'noindex,nofollow'}]}),component:Conversations});
function Conversations(){
 const {active:product}=useActiveProduct(); const qc=useQueryClient();
 const data=useQuery({...conversationsQuery(product?.id ?? ''),enabled:!!product});
 const profile=useQuery({...profileQuery(product?.id ?? ''),enabled:!!product});
 const scan=useServerFn(scanConversations),saveTerms=useServerFn(saveConversationTerms),change=useServerFn(changeConversation),draft=useServerFn(draftConversationReply),edit=useServerFn(editConversationDraft);
 const [terms,setTerms]=useState(''),[dirty,setDirty]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[status,setStatus]=useState('new'),[min,setMin]=useState(0);
 useEffect(()=>{setDirty(false);setTerms('');setError('');},[product?.id]);
 useEffect(()=>{if(!product || !data.data || dirty) return;setTerms((data.data.terms ?? defaultConversationTerms({name:product.name,category:product.category,audience:product.audience,competitors:profile.data?.competitors.map(c=>c.name) ?? [],questions:profile.data?.questions.map(q=>q.question) ?? []})).join('\n'));},[data.data,profile.data,product,dirty]);
 async function action(work:()=>Promise<{ok:boolean;error?:string|null}>){if(busy)return;setBusy(true);setError('');try{const r=await work();if(r.error)setError(r.error);await Promise.all([qc.invalidateQueries({queryKey:['conversations',product?.id]}),qc.invalidateQueries({queryKey:['overview',product?.id]})]);if(r.ok)toast.success('Saved');}catch{setError('This action could not finish. Please try again.');}finally{setBusy(false);}}
 function parsedTerms(){const r=termsSchema.safeParse(terms.split('\n').map(t=>t.trim()).filter(Boolean));if(!r.success){setError('Use 1–10 plain-text search terms, up to 120 characters each.');return null;}return r.data;}
 if(!product)return <PageShell><PageHeader title="Finding conversations" purpose="Hacker News, public posts"/><p className="text-sm text-muted-foreground">Add a product before scanning for conversations.</p></PageShell>;
 if(data.isPending || profile.isPending)return <PageShell><PageHeader title="Finding conversations" purpose="Hacker News, public posts"/><PageSkeleton variant="conversations" embedded/></PageShell>;
 if(data.error || profile.error)return <PageShell><ErrorState text="Couldn't load conversations" onRetry={()=>{void data.refetch();void profile.refetch();}}/></PageShell>;
 const results=data.data;const items=results.opportunities.filter(o=>(status==='all'||o.status===status)&&o.score>=min);
 const last=results.scans[0];
 return <PageShell>
 <PageHeader title="Finding conversations" purpose="Hacker News, public posts" meta={<p className="mt-1 text-xs text-muted-foreground">{last ? `Last scanned ${relativeTime(last.created_at)} · ${last.status}`:'Not scanned yet'}</p>} action={<Button disabled={busy} onClick={()=>{const t=parsedTerms();if(t)void action(()=>scan({data:{productId:product.id,terms:t}}));}}>{busy?<LoaderCircle className="animate-spin motion-reduce:animate-none"/>:<Search/>}Scan Hacker News</Button>}/>
 {error && <p role="alert" className="rounded-sm bg-danger-soft p-3 text-sm">{error}</p>}
 <div className="card-grid" data-cols="3">{(['new','saved','replied'] as const).map(s=><div key={s} className="compact-panel"><p className="text-xs capitalize text-muted-foreground">{s}</p><p className="mt-1 text-2xl font-semibold">{results.opportunities.filter(o=>o.status===s).length}</p></div>)}</div>
 <PageGrid main={<><div className="flex flex-wrap items-end gap-3"><div><Label htmlFor="conversation-status">Status</Label><select id="conversation-status" className="mt-1 block h-10 rounded-sm border bg-card px-3 text-sm" value={status} onChange={e=>setStatus(e.target.value)}><option value="all">All statuses</option>{conversationStatuses.map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}</select></div><div><Label htmlFor="conversation-score">Minimum score</Label><Input id="conversation-score" type="number" min={0} max={100} value={min} onChange={e=>setMin(Math.max(0,Math.min(100,Number(e.target.value)||0)))} className="mt-1 w-24"/></div><p className="text-xs text-muted-foreground">{items.length} conversations</p></div>{items.length ? <ConversationList items={items} drafts={results.drafts} busy={busy} onChange={(id,s,notes)=>action(()=>change({data:{productId:product.id,opportunityId:id,...(s ? {status:s as typeof conversationStatuses[number]} : {}),...(notes!==undefined ? {notes}: {})}}))} onDraft={id=>action(()=>draft({data:{productId:product.id,opportunityId:id}}))} onEdit={(id,text)=>action(()=>edit({data:{productId:product.id,draftId:id,text}}))}/> : <div className="compact-panel"><h2 className="text-base">{results.opportunities.length?'No conversations match these filters':'No conversations yet'}</h2><p className="mt-1 text-sm text-muted-foreground">{results.opportunities.length?'Try another status or minimum score.':'Choose search terms and scan Hacker News. No reply drafts are created during a scan.'}</p></div>}</>} context={<><section className="compact-panel"><h2 className="text-xl">Search terms</h2><Label htmlFor="hn-terms" className="mt-3 block">One term per line · up to 10</Label><Textarea id="hn-terms" rows={6} value={terms} onChange={e=>{setTerms(e.target.value);setDirty(true);}} className="mt-2"/><ActionRow className="mt-3"><Button variant="outline" disabled={busy} onClick={()=>{const t=parsedTerms();if(t)void action(()=>saveTerms({data:{productId:product.id,terms:t}}));}}><Save/>Save terms</Button></ActionRow></section><section className="compact-panel"><h2 className="text-xl">Sources</h2><div className="mt-3 flex flex-wrap gap-2"><span className="status-chip status-live">Hacker News · Live</span><span className="status-chip status-coming">Reddit · Soon</span><span className="status-chip status-coming">X · Soon</span></div></section><section className="compact-panel"><h2 className="text-xl">Scan history</h2>{results.scans.length ? <ol className="mt-3 divide-y">{results.scans.map(s=><li key={s.id} className="py-2 text-sm"><time dateTime={s.created_at}>{new Date(s.created_at).toLocaleString()}</time><p className="text-xs text-muted-foreground">{s.status} · {s.found} found · {s.new_count} new</p>{s.note&&<p className="text-xs text-muted-foreground">{s.note}</p>}</li>)}</ol>:<p className="mt-2 text-sm text-muted-foreground">No scans yet.</p>}</section><section className="compact-panel"><h2 className="text-xl">You post it yourself.</h2><p className="mt-2 text-sm">Growloop never posts for you.</p><p className="mt-2 text-xs text-muted-foreground">6 scans per hour, 30 per rolling day. 5 reply drafts per rolling day, within the shared daily AI cap. Scheduled scanning is off.</p><details className="mt-3 text-sm"><summary className="cursor-pointer">Rule-based score</summary><p className="mt-2 text-xs text-muted-foreground">{SCORE_EXPLANATION}</p></details></section></>}/>
 </PageShell>;
}
