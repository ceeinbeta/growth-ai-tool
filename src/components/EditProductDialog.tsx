import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ProductLogo } from "@/components/ProductLogo";
import { deleteConfirmed, validateProduct, type ProductFormErrors } from "@/lib/product-form";
import { deleteProduct, refreshLogo, removeLogo, uploadLogo } from "@/lib/product.functions";
import { profileProduct } from "@/lib/profile-product.functions";
import { workspaceQuery, type Product } from "@/lib/workspace";

const toBase64 = async (file: File) => { const b = new Uint8Array(await file.arrayBuffer()); let s = ""; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(s); };

export function EditProductDialog({ product, onDeleted }: { product: Product; onDeleted: () => void }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: product.name, url: product.url, description: product.description, stage: product.stage as string });
  const [errors, setErrors] = useState<ProductFormErrors>({});
  const [busy, setBusy] = useState(false);
  const [savedUrlChange, setSavedUrlChange] = useState(false);
  const [opts, setOpts] = useState({ logo: false, profile: false });
  const [typed, setTyped] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [logoMsg, setLogoMsg] = useState("");
  const fetchLogo = useServerFn(refreshLogo), upload = useServerFn(uploadLogo), clearLogo = useServerFn(removeLogo), del = useServerFn(deleteProduct), profiler = useServerFn(profileProduct);
  const refresh = () => qc.invalidateQueries({ queryKey: workspaceQuery.queryKey });

  function reset(o: boolean) {
    setOpen(o);
    if (o) { setForm({ name: product.name, url: product.url, description: product.description, stage: product.stage }); setErrors({}); setSavedUrlChange(false); setOpts({ logo: false, profile: false }); setTyped(""); setDeleteError(""); setLogoMsg(""); }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const v = validateProduct(form);
    if (!v.ok) return setErrors(v.errors);
    setErrors({}); setBusy(true);
    const urlChanged = v.data.url !== product.url;
    const { error } = await supabase.from("products").update(v.data).eq("id", product.id);
    setBusy(false);
    if (error) return setErrors({ form: "We couldn't save these changes. Please try again." });
    await refresh();
    toast.success("Saved");
    if (urlChanged) setSavedUrlChange(true); else setOpen(false);
  }

  async function applyOptions() {
    setBusy(true);
    try {
      if (opts.logo) await fetchLogo({ data: { productId: product.id } }).catch(() => null);
      if (opts.profile) { const r = await profiler({ data: { productId: product.id } }).catch(() => null); if (r && !r.ok) toast.error(r.error ?? "The profile couldn't finish. Please try again."); }
      await Promise.all([refresh(), qc.invalidateQueries({ queryKey: ["product-profile", product.id] })]);
    } finally { setBusy(false); setOpen(false); }
  }

  async function logoAction(work: () => Promise<{ ok: boolean; error?: string; found?: boolean }>, success: string) {
    setBusy(true); setLogoMsg("");
    try {
      const r = await work();
      if (!r.ok) setLogoMsg(r.error ?? "That didn't work. Please try again.");
      else if (r.found === false) setLogoMsg("No usable icon was found on your website. The letter tile stays.");
      else { await refresh(); toast.success(success); }
    } catch { setLogoMsg("That didn't work. Please try again."); } finally { setBusy(false); }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    if (file.size > 300 * 1024) return setLogoMsg("The image must be 300 KB or smaller.");
    const base64 = await toBase64(file);
    await logoAction(() => upload({ data: { productId: product.id, base64 } }), "Logo saved");
  }

  async function remove() {
    if (!deleteConfirmed(typed, product.name)) return setDeleteError("Type the product name exactly to confirm.");
    setBusy(true); setDeleteError("");
    try {
      const r = await del({ data: { productId: product.id, confirmName: typed } });
      if (!r.ok) return setDeleteError(r.error);
      setOpen(false); onDeleted(); await refresh(); toast.success("Product deleted");
    } catch { setDeleteError("We couldn't delete this product. Please try again."); } finally { setBusy(false); }
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
  const err = (k: keyof ProductFormErrors) => errors[k] ? <p id={`edit-${k}-error`} className="mt-1.5 text-sm text-destructive">{errors[k]}</p> : null;

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogTrigger asChild><Button variant="outline" size="sm"><Pencil className="mr-2 h-4 w-4" />Edit product</Button></DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>Edit product</DialogTitle><DialogDescription>The tracking key stays the same, so your installed snippet keeps working.</DialogDescription></DialogHeader>
        {savedUrlChange ? (
          <div className="space-y-4">
            <p className="text-sm">Your website changed. Do you want to update anything else?</p>
            <label className="flex items-center gap-3 text-sm"><Checkbox checked={opts.logo} onCheckedChange={c => setOpts(o => ({ ...o, logo: c === true }))} />Refresh logo</label>
            <label className="flex items-center gap-3 text-sm"><Checkbox checked={opts.profile} onCheckedChange={c => setOpts(o => ({ ...o, profile: c === true }))} />Re-run the profile (anything you edited stays)</label>
            <DialogFooter><Button disabled={busy} onClick={applyOptions}>{opts.logo || opts.profile ? "Continue" : "Done"}</Button></DialogFooter>
          </div>
        ) : (<>
          <form onSubmit={save} noValidate className="space-y-4">
            <div><Label htmlFor="edit-name">Product name</Label><Input id="edit-name" className="mt-2" maxLength={80} value={form.name} onChange={set("name")} aria-invalid={!!errors.name} aria-describedby="edit-name-error" />{err("name")}</div>
            <div><Label htmlFor="edit-url">Website</Label><Input id="edit-url" className="mt-2" value={form.url} onChange={set("url")} aria-invalid={!!errors.url} aria-describedby="edit-url-error" />{err("url")}</div>
            <fieldset><legend className="text-sm font-medium">Stage</legend><div className="mt-2 space-y-2">
              {[{ v: "live", l: "Live product" }, { v: "prelaunch", l: "Pre-launch, collecting a waitlist" }].map(o => <label key={o.v} className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm ${form.stage === o.v ? "border-foreground bg-selected" : ""}`}><input type="radio" name="edit-stage" value={o.v} checked={form.stage === o.v} onChange={() => setForm(f => ({ ...f, stage: o.v }))} className="accent-foreground" />{o.l}</label>)}
            </div>{err("stage")}</fieldset>
            <div><Label htmlFor="edit-description">What does it do, and for whom?</Label><Textarea id="edit-description" rows={4} maxLength={1000} className="mt-2" value={form.description} onChange={set("description")} aria-invalid={!!errors.description} aria-describedby="edit-description-error" />{err("description")}</div>
            {errors.form && <p role="alert" className="rounded-sm bg-danger-soft p-3 text-sm text-destructive">{errors.form}</p>}
            <DialogFooter><Button type="submit" disabled={busy}>Save changes</Button></DialogFooter>
          </form>

          <section className="border-t pt-4" aria-label="Logo">
            <h3 className="text-sm font-semibold">Logo</h3>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <ProductLogo name={product.name} path={product.logo_path} size={56} />
              <Button variant="outline" size="sm" disabled={busy} onClick={() => logoAction(() => fetchLogo({ data: { productId: product.id } }), "Logo refreshed")}>Refresh logo</Button>
              <Button variant="outline" size="sm" disabled={busy} asChild><label className="cursor-pointer">Change logo<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={onFile} /></label></Button>
              {product.logo_path && <Button variant="ghost" size="sm" disabled={busy} onClick={() => logoAction(() => clearLogo({ data: { productId: product.id } }), "Logo removed")}>Remove logo</Button>}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">PNG, JPEG or WebP, up to 300 KB.</p>
            {logoMsg && <p role="status" className="mt-2 text-sm text-muted-foreground">{logoMsg}</p>}
          </section>

          <section className="rounded-lg border border-destructive/40 p-4" aria-label="Danger zone">
            <h3 className="text-sm font-semibold text-destructive">Danger zone</h3>
            <p className="mt-2 text-sm text-muted-foreground">Deleting removes this product and everything saved for it: the profile, competitors, buyer questions, tracking events, AI visibility checks, page audits and leaks. This cannot be undone. It frees one product slot.</p>
            <Label htmlFor="delete-confirm" className="mt-3 block">Type <span className="font-semibold">{product.name}</span> to confirm</Label>
            <Input id="delete-confirm" className="mt-2" value={typed} onChange={e => { setTyped(e.target.value); setDeleteError(""); }} aria-describedby="delete-error" />
            {deleteError && <p id="delete-error" role="alert" className="mt-1.5 text-sm text-destructive">{deleteError}</p>}
            <Button variant="destructive" className="mt-3" disabled={busy || !deleteConfirmed(typed, product.name)} onClick={remove}>Delete product</Button>
          </section>
        </>)}
      </DialogContent>
    </Dialog>
  );
}
