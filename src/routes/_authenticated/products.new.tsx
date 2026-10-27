import { ActionRow, ActionHeader } from '@/components/ActionRow';
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { productSchema as schema } from "@/lib/product-form";
import { refreshLogo } from "@/lib/product.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useActiveProduct } from "@/components/AppShell";
import { workspaceQuery } from "@/lib/workspace";

export const Route = createFileRoute("/_authenticated/products/new")({
  head: () => ({
    meta: [
      { title: "Add product — Brambly" },
      { name: "description", content: "Add a product to Brambly." },
      { property: "og:title", content: "Add product — Brambly" },
      { property: "og:description", content: "Add a product to Brambly." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NewProduct,
});

export const LIMIT_MESSAGE = "Your plan includes 3 products. Remove one to add another.";

type Errors = Partial<Record<"name" | "url" | "description" | "stage" | "form", string>>;

function NewProduct() {
  const { data, setActive } = useActiveProduct();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const fetchLogo = useServerFn(refreshLogo);
  const [form, setForm] = useState({ name: "", url: "", description: "", stage: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const max = data?.workspace?.max_products ?? 3;
  const full = !!data && data.products.length >= max;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const errs: Errors = {};
      for (const i of parsed.error.issues) {
        const k = i.path[0] as keyof Errors;
        if (!errs[k]) errs[k] = i.message;
      }
      return setErrors(errs);
    }
    if (!data?.workspace) return setErrors({ form: "Your workspace isn't ready yet. Refresh and try again." });
    setErrors({});
    setBusy(true);
    const { data: row, error } = await supabase
      .from("products")
      .insert({ ...parsed.data, workspace_id: data.workspace.id })
      .select("id")
      .single();
    setBusy(false);
    if (error) {
      return setErrors({
        form: error.message.includes("product_limit_reached") ? LIMIT_MESSAGE : "We couldn't save this product. Please try again.",
      });
    }
    await qc.invalidateQueries({ queryKey: workspaceQuery.queryKey });
    setActive(row.id);
    void fetchLogo({ data: { productId: row.id } }).then(() => qc.invalidateQueries({ queryKey: workspaceQuery.queryKey })).catch(() => {});
    qc.setQueryData(["profile-auto-start", row.id], true);
    navigate({ to: "/overview" });
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const err = (k: keyof Errors) =>
    errors[k] ? <p id={`${k}-error`} className="mt-1.5 text-sm text-destructive">{errors[k]}</p> : null;

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-3xl font-extrabold">Add product</h1>
      <p className="mt-1 text-sm text-muted-foreground">{data?.products.length ?? 0} of {max} products used on the Standard plan</p>

      {full ? (
        <div className="mt-6 rounded-lg bg-danger-soft px-4 py-3 text-sm text-destructive">{LIMIT_MESSAGE}</div>
      ) : (
        <form onSubmit={submit} noValidate className="mt-6 space-y-5 rounded-xl border bg-card p-6">
          <div>
            <Label htmlFor="name">Product name</Label>
            <Input id="name" className="mt-2" maxLength={80} value={form.name} onChange={set("name")} aria-invalid={!!errors.name} aria-describedby="name-error" />
            {err("name")}
          </div>
          <div>
            <Label htmlFor="url">Website</Label>
            <Input id="url" className="mt-2" placeholder="yourapp.com" value={form.url} onChange={set("url")} aria-invalid={!!errors.url} aria-describedby="url-error" />
            {err("url")}
          </div>
          <div>
            <Label htmlFor="description">What does it do, and for whom?</Label>
            <Textarea id="description" rows={5} maxLength={1000} className="mt-2" value={form.description} onChange={set("description")} aria-invalid={!!errors.description} aria-describedby="description-error" />
            <p className="mt-1 text-right text-xs text-muted-foreground">{form.description.length}/1000</p>
            {err("description")}
          </div>
          <fieldset>
            <legend className="text-sm font-medium">Stage</legend>
            <div className="mt-2 space-y-2">
              {[
                { v: "live", l: "Live product" },
                { v: "prelaunch", l: "Pre-launch, collecting a waitlist" },
              ].map((o) => (
                <label key={o.v} className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm ${form.stage === o.v ? "border-foreground bg-selected" : ""}`}>
                  <input type="radio" name="stage" value={o.v} checked={form.stage === o.v} onChange={() => setForm((f) => ({ ...f, stage: o.v }))} className="accent-foreground" />
                  {o.l}
                </label>
              ))}
            </div>
            {err("stage")}
          </fieldset>
          {errors.form && <div className="rounded-sm bg-danger-soft px-3 py-2 text-sm text-destructive">{errors.form}</div>}
          <ActionRow>
            <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Add product"}</Button>
            <Button asChild variant="outline"><Link to="/overview">Cancel</Link></Button>
          </ActionRow>
        </form>
      )}
    </div>
  );
}
