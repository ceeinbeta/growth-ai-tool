import { useState } from 'react';
import { ExternalLink, Bookmark, X, Check, MessageSquare, Copy, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ActionRow } from '@/components/ActionRow';
import { relativeTime } from '@/lib/setup-checklist';
import { SCORE_EXPLANATION, type ScoreParts } from '@/lib/conversations';
import type { Database } from '@/integrations/supabase/types';
type Opportunity=Database['public']['Tables']['opportunities']['Row'];
type Draft=Database['public']['Tables']['reply_drafts']['Row'];
export function ConversationList({items,drafts,busy,onChange,onDraft,onEdit}:{items:Opportunity[];drafts:Draft[];busy:boolean;onChange:(id:string,status?:string,notes?:string)=>Promise<void>;onDraft:(id:string)=>Promise<void>;onEdit:(id:string,text:string)=>Promise<void>}) {
 return <div className="space-y-4">{items.map(o=><ConversationItem key={o.id} item={o} draft={drafts.find(d=>d.opportunity_id===o.id)} busy={busy} onChange={onChange} onDraft={onDraft} onEdit={onEdit}/>)}</div>;
}
function ConversationItem({item:o,draft,busy,onChange,onDraft,onEdit}:{item:Opportunity;draft?:Draft;busy:boolean;onChange:(id:string,status?:string,notes?:string)=>Promise<void>;onDraft:(id:string)=>Promise<void>;onEdit:(id:string,text:string)=>Promise<void>}){
 const [open,setOpen]=useState(false),[text,setText]=useState(draft?.edited_text ?? draft?.text ?? ''),[notes,setNotes]=useState(o.notes),[copied,setCopied]=useState(false);
 const parts=o.score_parts as unknown as ScoreParts;
 return <article className="compact-panel" aria-label={o.title}>
  <div className="flex flex-wrap items-start justify-between gap-2"><h2 className="min-w-0 flex-1 break-words text-base font-semibold">{o.title}</h2><span className="status-chip" title={SCORE_EXPLANATION}>Rule-based score {o.score}</span></div>
  <p className="mt-2 break-words text-sm text-muted-foreground">{o.excerpt || 'Open the post to read the conversation.'}</p>
  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">{(['intent','fit','reach','ease'] as const).map(k=><div key={k}><div className="flex justify-between text-xs"><span className="capitalize">{k}</span><span>{parts[k]} / 100</span></div><progress aria-label={`${k} sub-score`} value={parts[k]} max={100} className="budget-progress mt-1 h-1.5 w-full"/></div>)}</div>
  <p className="mt-2 text-xs text-muted-foreground"><time dateTime={o.posted_at}>{relativeTime(o.posted_at)}</time> · {o.points} points · {o.comments} comments{ o.author_handle ? ` · ${o.author_handle}` : ''} · {o.status}</p>
  <ActionRow layout="section" className="mt-3"><Button variant="outline" asChild><a href={o.url} target="_blank" rel="noopener noreferrer"><ExternalLink/>Open on Hacker News</a></Button><Button variant="ghost" disabled={busy || o.status==='saved'} onClick={()=>void onChange(o.id,'saved')}><Bookmark/>Save</Button><Button variant="ghost" disabled={busy || o.status==='dismissed'} onClick={()=>void onChange(o.id,'dismissed')}><X/>Dismiss</Button><Button variant="ghost" disabled={busy || o.status==='replied'} onClick={()=>void onChange(o.id,'replied')}><Check/>I replied</Button><Button variant="outline" disabled={busy} onClick={()=>{setOpen(true);if(!draft) void onDraft(o.id);}}><MessageSquare/>{draft ? 'Edit reply' : 'Draft a reply'}</Button></ActionRow>
  <details className="mt-3 text-sm"><summary className="cursor-pointer">Notes</summary><Textarea aria-label={`Notes for ${o.title}`} value={notes} maxLength={2000} onChange={e=>setNotes(e.target.value)} className="mt-2"/><ActionRow className="mt-2"><Button variant="outline" disabled={busy} onClick={()=>void onChange(o.id,undefined,notes)}><Save/>Save notes</Button></ActionRow></details>
  {open && draft && <div className="mt-4 border-t pt-4"><Label htmlFor={`draft-${o.id}`}>AI-written. Edit before you post.</Label><Textarea id={`draft-${o.id}`} value={text || draft.edited_text || draft.text} onChange={e=>setText(e.target.value)} maxLength={4000} rows={7} className="mt-2"/><p className="mt-2 text-xs text-muted-foreground">Read the community rules before replying. You post it yourself. Growloop never posts for you.</p><ActionRow className="mt-3"><Button variant="ghost" onClick={()=>setOpen(false)}>Close reply</Button><Button variant="outline" disabled={busy} onClick={()=>void onEdit(draft.id,text || draft.edited_text || draft.text)}><Save/>Save edits</Button><Button variant="outline" onClick={async()=>{try{await navigator.clipboard.writeText(text || draft.edited_text || draft.text);setCopied(true);}catch{setCopied(false);}}}><Copy/>{copied?'Copied':'Copy'}</Button></ActionRow></div>}
 </article>;
}
