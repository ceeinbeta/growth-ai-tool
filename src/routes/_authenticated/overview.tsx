import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { stageLabel, useActiveProduct } from "@/components/AppShell";
import { ProductProfile } from "@/components/ProductProfile";
import { TrackingOverview } from "@/components/TrackingOverview";

export const Route = createFileRoute("/_authenticated/overview")({
  head: () => ({
    meta: [
      { title: "Overview — Growloop" },
      { name: "description", content: "Your product at a glance and what Growloop does next." },
      { property: "og:title", content: "Overview — Growloop" },
      { property: "og:description", content: "Your product at a glance and what Growloop does next." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Overview,
});

const steps = [
  { title: "Profile your product", body: "Growloop reads your website and writes a short profile you can check." },
  { title: "Find your biggest leak", body: "See the step where most visitors drop off." },
  { title: "Check AI search visibility", body: "See whether AI assistants mention your product." },
  { title: "Find people asking for your kind of product", body: "You post the reply yourself. Growloop never posts for you." },
];

function Overview() {
  const { data, active } = useActiveProduct();
  if (!data) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const max = data.workspace?.max_products ?? 3;
  const used = data.products.length;

  if (!active) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border bg-card p-10 text-center">
        <h1 className="text-2xl">Add your first product</h1>
        <p className="mt-2 text-sm text-muted-foreground">Tell Growloop what you're building. It takes about a minute.</p>
        <Button asChild className="mt-6"><Link to="/products/new">Add product</Link></Button>
        <p className="mt-6 text-xs text-muted-foreground">{used} of {max} products used on the Standard plan</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-extrabold">{active.name}</h1>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${active.stage === "live" ? "bg-selected text-primary" : "bg-sunken text-muted-foreground"}`}>
          {stageLabel(active.stage)}
        </span>
      </div>
      <a href={`https://${active.url}`} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-sm font-medium text-primary hover:underline">
        {active.url}
      </a>
      <p className="mt-4 whitespace-pre-line text-foreground">{active.description}</p>

      <TrackingOverview key={`tracking-${active.id}`} product={active} />

      <ProductProfile key={active.id} product={active} />

      <section className="mt-8 rounded-xl border bg-card p-6">
        <h2 className="text-lg">What happens next</h2>
        <ol className="mt-4 space-y-4">
          {steps.filter((_, i) => i !== 0 || !active.profiled_at).map((s, i) => (
            <li key={s.title} className="flex gap-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-display text-sm font-bold text-muted-foreground">{i + 1}</span>
              <div>
                <p className="font-semibold">{s.title}</p>
                <p className="text-sm text-muted-foreground">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <p className="mt-6 text-sm text-muted-foreground">{used} of {max} products used on the Standard plan</p>
    </div>
  );
}
