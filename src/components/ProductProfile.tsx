import { ActionRow, ActionHeader } from '@/components/ActionRow';
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LoaderCircle, Plus, RefreshCw, X, Check, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { profileProduct } from "@/lib/profile-product.functions";
import { profileQuery } from "@/lib/profile-data";
import { summaryValidators, type SummaryField } from "@/lib/profile-schema";
import { workspaceQuery, type Product } from "@/lib/workspace";

function Editable({ label, value, disabled, save, multiline = false }: { label: string; value: string; disabled: boolean; save: (v: string) => Promise<void>; multiline?: boolean }) {
  const [draft, setDraft] = useState(value);
  const [status, setStatus] = useState("");
  useEffect(() => { setDraft(value); }, [value]);
  async function blur() {
    if (draft.trim() === value) return;
    setStatus("Saving…");
    try { await save(draft.trim()); setStatus("Saved"); } catch (error) { setStatus(error instanceof Error ? error.message : "Couldn't save. Please try again."); }
  }
  return <div className="min-w-0"><Label className="mb-2 block">{label}</Label>
    {multiline ? <Textarea aria-label={label} value={draft} disabled={disabled} maxLength={500} onChange={e => { setDraft(e.target.value); setStatus(""); }} onBlur={blur} rows={2} /> : <Input aria-label={label} value={draft} disabled={disabled} onChange={e => { setDraft(e.target.value); setStatus(""); }} onBlur={blur} />}
    <p role="status" className={`mt-1 min-h-5 text-xs ${status === "Saved" ? "text-foreground" : "text-muted-foreground"}`}>{status === "Saved" && <Check className="mr-1 inline h-3 w-3" />}{status}</p>
  </div>;
}

export function ProductProfile({ product }: { product: Product }) {
  const qc = useQueryClient();
  const profiler = useServerFn(profileProduct);
  const { data, error: loadError } = useQuery(profileQuery(product.id));
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [competitor, setCompetitor] = useState("");
  const [question, setQuestion] = useState("");
  async function refresh() {
    await Promise.all([qc.invalidateQueries({ queryKey: workspaceQuery.queryKey }), qc.invalidateQueries({ queryKey: profileQuery(product.id).queryKey })]);
  }
  async function run() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const result = await profiler({ data: { productId: product.id } });
      if (!result.ok) setError(result.error ?? "The profile couldn't finish. Please try again.");
      else await refresh();
    } catch { setError("The profile couldn't finish. Please try again."); }
    finally { setBusy(false); }
  }
  useEffect(() => {
    if (qc.getQueryData(["profile-auto-start", product.id])) {
      qc.removeQueries({ queryKey: ["profile-auto-start", product.id], exact: true });
      void run();
    }
  }, [product.id]);

  async function mutate(work: () => PromiseLike<{ error: { message: string } | null }>, toastOnSave = false) {
    setEditing(true); setError("");
    try {
      const result = await work();
      if (result.error) {
        const msg = result.error.message.includes("profile_item_limit_reached") ? "This product has reached its item limit. Remove one before adding another." : result.error.message.includes("unique") ? "That competitor is already listed." : "Couldn't save this change. Please try again.";
        throw new Error(msg);
      }
      await refresh();
      if (toastOnSave) toast.success("Saved");
    } finally { setEditing(false); }
  }
  async function saveSummary(field: SummaryField, value: string) {
    const parsed = summaryValidators[field].safeParse(value);
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Check this value.");
    const patch: Partial<Record<SummaryField, string>> = { [field]: parsed.data };
    await mutate(() => supabase.from("products").update(patch).eq("id", product.id));
  }
  async function add(kind: "competitor" | "question") {
    const value = (kind === "competitor" ? competitor : question).trim();
    if (!value) return;
    try {
      await mutate(() => kind === "competitor" ? supabase.from("competitors").insert({ product_id: product.id, name: value, source: "user" }) : supabase.from("sov_questions").insert({ product_id: product.id, question: value, source: "user" }), true);
      if (kind === "competitor") setCompetitor(""); else setQuestion("");
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn't add this item."); }
  }
  async function remove(table: "competitors" | "sov_questions", id: string) {
    try { await mutate(() => supabase.from(table).delete().eq("id", id).eq("product_id", product.id), true); }
    catch (e) { setError(e instanceof Error ? e.message : "Couldn't remove this item."); }
  }
  async function confirmProfile() {
    try { await mutate(() => supabase.from("products").update({ profile_confirmed_at: new Date().toISOString() }).eq("id", product.id), true); }
    catch (e) { setError(e instanceof Error ? e.message : "Couldn't save this change."); }
  }
  const disabled = busy || editing;
  return <section aria-label="Product profile" className="mt-8 rounded-lg border bg-card p-5 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg">Product profile</h2>{product.profiled_at && <span className="status-chip status-ai">{product.profile_source === "edited" ? "AI-written · Edited by you" : "AI-written"}</span>}</div>
    {busy && <p role="status" className="mt-4 flex items-center gap-2 text-sm text-foreground"><LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" />Profiling {product.name}…</p>}
    {(error || loadError) && <div role="alert" className="mt-4 rounded-sm bg-danger-soft p-3 text-sm text-destructive">{error || "Couldn't load the saved profile. Please refresh and try again."}</div>}
    {product.profiled_at && <>
      <p className="mt-3 text-sm text-muted-foreground">Written by AI from what you told us. Check it and fix anything that is off.</p>
      <div className="mt-5 space-y-2">
        {([['one_liner', 'One-line summary'], ['audience', "Who it's for"], ['category', 'Category']] as const).map(([field, label]) => <Editable key={field} label={label} value={product[field] ?? ""} disabled={disabled} save={value => saveSummary(field, value)} />)}
      </div>
      <div className="mt-4"><h3 className="text-sm font-semibold">Competitors</h3>
        <div className="mt-3 flex flex-wrap gap-2">{data?.competitors.map(c => <div key={c.id} className="flex max-w-full items-center gap-1 rounded-sm border bg-sunken pl-3">
          <span className="min-w-0 break-words text-sm">{c.name}<span className={c.source === "ai" ? "ml-2 status-chip status-ai" : "ml-2 font-label text-xs"}>{c.source === "ai" ? "AI-WRITTEN" : "You"}</span></span>
          <Button variant="ghost" size="icon" disabled={disabled} aria-label={`Remove ${c.name}`} title={`Remove ${c.name}`} onClick={() => remove("competitors", c.id)}><X className="h-3 w-3" /></Button>
        </div>)}</div>
        <form className="mt-3 flex gap-2" onSubmit={e => { e.preventDefault(); void add("competitor"); }}><Input aria-label="Add competitor" placeholder="Add competitor" maxLength={120} value={competitor} onChange={e => setCompetitor(e.target.value)} disabled={disabled || (data?.competitors.length ?? 0) >= 8} /><Button type="submit" variant="outline" size="icon" aria-label="Add competitor" title="Add competitor" disabled={disabled || !competitor.trim() || (data?.competitors.length ?? 0) >= 8}><Plus className="h-4 w-4" /></Button></form>
        {(data?.competitors.length ?? 0) >= 8 && <p className="mt-2 text-xs text-muted-foreground">8 competitors used. Remove one to add another.</p>}
      </div>
      <div className="mt-6"><h3 className="text-sm font-semibold">Questions buyers ask AI assistants</h3><ol className="mt-4 space-y-3">{data?.questions.map((q, i) => <li key={q.id} className="flex gap-3"><span className="pt-8 text-xs text-muted-foreground">{i + 1}.</span><div className="min-w-0 flex-1"><Editable label={q.source === "ai" ? "AI-written question" : "Your question"} value={q.question} multiline disabled={disabled} save={async value => { if (!value) throw new Error("Enter a question."); await mutate(() => supabase.from("sov_questions").update({ question: value, source: "user" }).eq("id", q.id).eq("product_id", product.id)); }} /></div><Button className="self-center" variant="ghost" size="icon" disabled={disabled} aria-label={`Remove question ${i + 1}`} title="Remove question" onClick={() => remove("sov_questions", q.id)}><X className="h-4 w-4" /></Button></li>)}</ol>
        <form className="mt-2 flex gap-2" onSubmit={e => { e.preventDefault(); void add("question"); }}><Textarea aria-label="Add question" placeholder="Add a buyer question" rows={2} maxLength={500} value={question} onChange={e => setQuestion(e.target.value)} disabled={disabled || (data?.questions.length ?? 0) >= 10} /><Button type="submit" variant="outline" size="icon" aria-label="Add question" title="Add question" disabled={disabled || !question.trim() || (data?.questions.length ?? 0) >= 10}><Plus className="h-4 w-4" /></Button></form>
        {(data?.questions.length ?? 0) >= 10 && <p className="mt-2 text-xs text-muted-foreground">10 questions used. Remove one to add another.</p>}
      </div>
    </>}
    <ActionRow className="mt-5">{product.profiled_at && !busy && (product.profile_confirmed_at ? <p className="mt-5 flex items-center gap-2 text-sm text-foreground"><Check className="h-4 w-4" />You confirmed this profile.</p> : <Button variant="outline" disabled={disabled} onClick={() => void confirmProfile()}><ThumbsUp />Looks right</Button>)}
    {!busy && <Button variant="outline" disabled={editing} onClick={() => product.profiled_at ? setConfirm(true) : void run()}><RefreshCw />{error ? "Try again" : product.profiled_at ? "Run the profile again" : "Profile this product"}</Button>}</ActionRow>
    <AlertDialog open={confirm} onOpenChange={setConfirm}><AlertDialogContent><AlertDialogTitle>Run the profile again?</AlertDialogTitle><AlertDialogDescription>This replaces AI-written fields and items. Anything you added or edited stays.</AlertDialogDescription><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => void run()}>Run profile</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </section>;
}