import { ActionRow, ActionHeader } from '@/components/ActionRow';
import { createFileRoute, Link, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowRight, Check, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SourceChip } from "@/components/SourceChip";
import { Progress } from "@/components/ui/progress";
import { stageLabel, useActiveProduct } from "@/components/AppShell";
import { ProductProfile } from "@/components/ProductProfile";
import { ProductLogo } from "@/components/ProductLogo";
import { EditProductDialog } from "@/components/EditProductDialog";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/States";
import { Skeleton } from "@/components/ui/skeleton";
import { overviewQuery } from "@/lib/overview-data";
import { trackingQuery } from "@/lib/tracking-data";
import { openLeaksQuery } from "@/lib/conversion-data";
import { profileQuery } from "@/lib/profile-data";
import { buildChecklist, progress, type ChecklistItem } from "@/lib/setup-checklist";
import { pickNextStep, loopSteps, loopStatusText, type NextStepFacts } from "@/lib/next-step";
import type { Product } from "@/lib/workspace";

export const Route = createFileRoute("/_authenticated/overview")({
  head: () => ({
    meta: [
      { title: "Overview — Growloop" },
      { name: "description", content: "Your product at a glance and what Growloop does next." },
      { property: "og:title", content: "Overview — Growloop" },
      { property: "og:description", content: "Your product at a glance and what Growloop does next." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Overview,
});

function Overview() {
  const { data, active, setActive } = useActiveProduct();
  if (!data) return <PageSkeleton />;
  const max = data.workspace?.max_products ?? 3;
  const used = data.products.length;
  if (!active) {
    return (
      <div className="mx-auto max-w-lg">
        <h1 className="sr-only">Overview</h1>
        <EmptyState icon={Package} text="Add your first product. Growloop will show its setup steps and numbers here." action="Add product" to="/products/new" />
        <p className="mt-6 text-center text-xs text-muted-foreground">{used} of {max} products used on the Standard plan</p>
      </div>
    );
  }
  const next = data.products.find(p => p.id !== active.id);
  return <ProductOverview key={active.id} product={active} footer={`${used} of ${max} products used on the Standard plan`} onDeleted={() => next && setActive(next.id)} />;
}

function ProductOverview({ product, footer, onDeleted }: { product: Product; footer: string; onDeleted: () => void }) {
  const overview = useQuery(overviewQuery(product.id));
  const tracking = useQuery(trackingQuery(product.id));
  const leaks = useQuery(openLeaksQuery(product.id));
  const [more, setMore] = useState(false);
  const [editProfile, setEditProfile] = useState(false);
  const location = useLocation();
  useEffect(() => { if (location.hash === "profile") setEditProfile(true); }, [location.hash]);

  const items = overview.data ? buildChecklist({
    profiled: !!product.profiled_at,
    profileReviewed: !!product.profile_confirmed_at || product.profile_edited_fields.length > 0,
    eventCount: overview.data.eventCount, lastEventAt: overview.data.lastEventAt, visitors30d: overview.data.visitors30d,
    hasAudit: !!overview.data.audit, lastCheck: overview.data.lastCheck,
  }) : null;
  const facts: NextStepFacts | null = overview.data ? {
    profiled: !!product.profiled_at,
    profileReviewed: !!product.profile_confirmed_at || product.profile_edited_fields.length > 0,
    eventCount: overview.data.eventCount, funnelSteps: overview.data.funnelSteps, hasAudit: !!overview.data.audit,
    hasTechnicalAudit: !!overview.data.technicalAudit,
    usableVisibilityRuns: overview.data.lastCheck?.usableRuns ?? 0, leaksInProgressOrDone: overview.data.leaksWorked,
  } : null;

  return (
    <div className="mx-auto max-w-3xl">
      <ActionHeader action={<EditProductDialog product={product} onDeleted={onDeleted} />}><div className="flex min-w-0 items-start gap-4">
        <ProductLogo name={product.name} path={product.logo_path} size={56} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="min-w-0 break-words text-3xl font-extrabold">{product.name}</h1>
            <span className={`status-chip ${product.stage === "live" ? "status-live" : "status-coming"}`}>{stageLabel(product.stage)}</span>
          </div>
          <a href={`https://${product.url}`} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex min-h-11 items-center break-all text-sm font-medium text-foreground hover:underline sm:min-h-0">{product.url}</a>
        </div>
        </div>
      </ActionHeader>
      <p className={`mt-4 whitespace-pre-line text-foreground ${more ? "" : "line-clamp-2"}`}>{product.description}</p>
      {product.description.length > 140 && <Button variant="link" onClick={() => setMore(m => !m)} aria-expanded={more}>{more ? "Show less" : "Show more"}</Button>}

      {overview.error ? <div className="mt-8"><ErrorState text="We couldn't load your setup progress." onRetry={() => void overview.refetch()} /></div>
        : !items ? <div className="mt-8 space-y-4"><Skeleton className="h-28 w-full" /><Skeleton className="h-64 w-full" /></div>
        : <><NextStepCard facts={facts!} onProfile={() => setEditProfile(true)} /><Checklist items={items} onProfile={() => setEditProfile(true)} /></>}

      <section className="mt-8" aria-labelledby="numbers-heading">
        <h2 id="numbers-heading" className="text-lg">Your numbers</h2>
        {tracking.error || overview.error || leaks.error ? <div className="mt-4"><ErrorState text="We couldn't load your numbers." onRetry={() => { void tracking.refetch(); void overview.refetch(); void leaks.refetch(); }} /></div>
          : !tracking.data || !overview.data || !leaks.data ? <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">{[0, 1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}</div>
          : <Tiles product={product} hasEvents={tracking.data.recent.length > 0} totals={tracking.data.totals} check={overview.data.lastCheck} hasAudit={!!overview.data.audit} openLeaks={leaks.data.length} />}
      </section>

      <div id="profile">
        {editProfile ? <ProductProfile product={product} /> : <ProfileSummary product={product} onEdit={() => setEditProfile(true)} />}
      </div>

      <p className="mt-8 border-t pt-4 text-xs text-muted-foreground">{footer}</p>
    </div>
  );
}

function ItemLink({ item, className, children, onProfile }: { item: ChecklistItem; className?: string; children: React.ReactNode; onProfile: () => void }) {
  if (item.key === "profile") return <button type="button" className={className} onClick={() => { onProfile(); requestAnimationFrame(() => document.getElementById("profile")?.scrollIntoView({ behavior: "smooth" })); }}>{children}</button>;
  return <Link to={item.to} className={className}>{children}</Link>;
}

function NextStepCard({ facts, onProfile }: { facts: NextStepFacts; onProfile: () => void }) {
  const next = pickNextStep(facts);
  const loop = loopSteps(facts);
  const button = next.key === "profile"
    ? <Button onClick={() => { onProfile(); requestAnimationFrame(() => document.getElementById("profile")?.scrollIntoView({ behavior: "smooth" })); }}>{next.action}<ArrowRight /></Button>
    : <Button asChild><Link to={next.to.split("#")[0]!} {...(next.to.includes("#") ? { hash: next.to.split("#")[1]! } : {})}>{next.action}<ArrowRight /></Link></Button>;
  return (
    <section aria-labelledby="next-step-heading" className="mt-8 rounded-lg border border-foreground bg-card p-6">
      <p className="nav-group-label text-foreground">Next best step</p>
      <h2 id="next-step-heading" className="mt-1 text-xl">{next.title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{next.text}</p>
      <ActionRow className="mt-4">{button}</ActionRow>
      <ol aria-label="Find the leak, fix it, prove it worked" className="mt-6 grid gap-2 border-t pt-4 sm:grid-cols-3">
        {loop.map((step, i) => (
          <li key={step.key} aria-current={step.status === "current" ? "step" : undefined} className={`rounded-sm border px-3 py-2 ${step.status === "current" ? "bg-selected selected-state" : ""}`}>
            <span className="block text-sm font-semibold">{i + 1}. {step.label}</span>
            <span className={`status-chip mt-1 ${step.status === "done" ? "status-live" : "status-coming"}`}>{loopStatusText[step.status]}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Checklist({ items, onProfile }: { items: ChecklistItem[]; onProfile: () => void }) {
  const p = progress(items);
  return (
    <section aria-labelledby="setup-heading" className="mt-6 rounded-lg border bg-card p-5">
      <div className="flex items-center justify-between gap-3"><h2 id="setup-heading" className="text-lg">Setup</h2><span className="text-sm font-medium">{p.done} of {p.total} done</span></div>
      <Progress value={(p.done / p.total) * 100} className="mt-3 h-2" aria-label={`${p.done} of ${p.total} done`} />
      <ul className="mt-4 divide-y">
        {items.map(item => {
          const body = <>
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${item.done ? "border-foreground bg-primary text-primary-foreground" : ""}`} aria-hidden>{item.done && <Check className="h-3.5 w-3.5" />}</span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-medium">{item.title}<span className="sr-only">{item.done ? " (done)" : item.soon ? "" : " (not done)"}</span></span>{item.result && <span className="block text-xs text-muted-foreground">{item.result}</span>}</span>
            {item.soon && <span className="status-chip status-coming">Coming next</span>}
          </>;
          return <li key={item.key}>{item.soon
            ? <div aria-disabled="true" className="flex items-center gap-3 py-3 text-muted-foreground">{body}</div>
            : <ItemLink item={item} onProfile={onProfile} className="flex w-full items-center gap-3 rounded-sm py-3 text-left hover:bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{body}</ItemLink>}</li>;
        })}
      </ul>
    </section>
  );
}

function Tile({ label, value, source, empty }: { label: string; value: string | undefined; source: string; empty: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      {value !== undefined ? <p className="mt-1 font-display text-3xl font-bold tabular-nums">{value}</p> : <p className="mt-2 text-sm font-semibold">No data yet</p>}
      <p className="mt-2 text-xs text-muted-foreground">{value !== undefined && <SourceChip text={source} />}{value !== undefined ? source : empty}</p>
    </div>
  );
}

function Tiles({ product, hasEvents, totals, check, hasAudit, openLeaks }: { product: Product; hasEvents: boolean; totals: { visits: number; visitors: number; signups: number; waitlist: number }; check: { date: string; usableRuns: number; pct: number } | null; hasAudit: boolean; openLeaks: number }) {
  const measured = "Measured by your tracking snippet";
  const install = <Link to="/integrations" className="text-foreground underline">Install tracking</Link>;
  const date = check ? new Date(check.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";
  const fmt = (n: number) => n.toLocaleString();
  return (
    <div className="mt-4 grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 sm:grid-cols-3">
      <Tile label="Visits (7 days)" value={hasEvents ? fmt(totals.visits) : undefined} source={measured} empty={install} />
      <Tile label="Unique visitors (7 days)" value={hasEvents ? fmt(totals.visitors) : undefined} source={measured} empty={install} />
      <Tile label={product.stage === "prelaunch" ? "Waitlist joins (7 days)" : "Signups (7 days)"} value={hasEvents ? fmt(product.stage === "prelaunch" ? totals.waitlist : totals.signups) : undefined} source={measured} empty={install} />
      <Tile label="Mentioned by AI assistants" value={check && check.usableRuns > 0 ? `${check.pct}%` : undefined} source={`Sample of ${check?.usableRuns ?? 0} usable runs. From your last AI check on ${date}`} empty={<Link to="/ai-search-visibility" className="text-foreground underline">Run an AI visibility check</Link>} />
      <Tile label="Open leaks" value={hasAudit ? fmt(openLeaks) : undefined} source="From your latest page audit" empty={<Link to="/conversion-leaks" className="text-foreground underline">Run a page audit</Link>} />
    </div>
  );
}

function ProfileSummary({ product, onEdit }: { product: Product; onEdit: () => void }) {
  const { data } = useQuery(profileQuery(product.id));
  return (
    <section aria-label="Product profile" className="mt-8 rounded-lg border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg">Product profile</h2>
        {product.profiled_at && <span className="status-chip status-ai">{product.profile_source === "edited" ? "AI-written · Edited by you" : "AI-written"}</span>}
      </div>
      {product.profiled_at ? <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div className="sm:col-span-2"><dt className="text-muted-foreground">One-line summary</dt><dd className="mt-0.5">{product.one_liner || "—"}</dd></div>
        <div><dt className="text-muted-foreground">Who it's for</dt><dd className="mt-0.5">{product.audience || "—"}</dd></div>
        <div><dt className="text-muted-foreground">Category</dt><dd className="mt-0.5">{product.category || "—"}</dd></div>
        <div><dt className="text-muted-foreground">Competitors</dt><dd className="mt-0.5">{data ? data.competitors.length : "…"}</dd></div>
        <div><dt className="text-muted-foreground">Buyer questions</dt><dd className="mt-0.5">{data ? data.questions.length : "…"}</dd></div>
      </dl> : <p className="mt-3 text-sm text-muted-foreground">Not profiled yet. Growloop reads what you told us and writes a short profile you can check.</p>}
      <ActionRow className="mt-4"><Button variant="outline" onClick={onEdit}>{product.profiled_at ? "Edit profile" : "Open profile"}</Button></ActionRow>
    </section>
  );
}
