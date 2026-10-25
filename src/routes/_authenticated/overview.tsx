import { ActionRow, ActionHeader } from '@/components/ActionRow';
import { createFileRoute, Link, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Activity, ArrowRight, Check, Package } from "lucide-react";
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
import { trackingQuery, type TrackingSummary } from "@/lib/tracking-data";
import { conversionQuery } from "@/lib/conversion-data";
import { profileQuery } from "@/lib/profile-data";
import { buildChecklist, progress, relativeTime, type ChecklistItem } from "@/lib/setup-checklist";
import { pickNextStep, loopSteps, loopStatusText, type NextStepFacts } from "@/lib/next-step";
import { worstStep, type FunnelSummary } from "@/lib/funnel";
import { KPI_PERIODS, parsePeriod, changeVsPrevious, conversionRate, formatPct, type Change, type KpiPeriod } from "@/lib/kpi";
import type { Product } from "@/lib/workspace";

export const Route = createFileRoute("/_authenticated/overview")({
  validateSearch: (search: Record<string, unknown>) => ({ days: parsePeriod(search.days) }),
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

const MEASURED = "Measured by your tracking snippet";

function ProductOverview({ product, footer, onDeleted }: { product: Product; footer: string; onDeleted: () => void }) {
  const { days } = Route.useSearch();
  const overview = useQuery(overviewQuery(product.id));
  const tracking = useQuery(trackingQuery(product.id, days));
  const funnel = useQuery(conversionQuery(product.id, days));
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

  const stamps = overview.data ? [
    overview.data.lastEventAt, overview.data.audit?.created_at,
    (overview.data.technicalAudit as { created_at?: string } | null)?.created_at, overview.data.lastCheck?.date,
  ].filter((s): s is string => !!s) : [];
  const lastUpdated = stamps.length ? stamps.reduce((a, b) => (Date.parse(a) > Date.parse(b) ? a : b)) : null;

  return (
    <div className="mx-auto max-w-[1200px]">
      <ActionHeader action={<EditProductDialog product={product} onDeleted={onDeleted} />}><div className="flex min-w-0 items-start gap-4">
        <ProductLogo name={product.name} path={product.logo_path} size={56} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="min-w-0 break-words text-3xl font-extrabold">{product.name}</h1>
            <span className={`status-chip ${product.stage === "live" ? "status-live" : "status-coming"}`}>{stageLabel(product.stage)}</span>
          </div>
          <a href={`https://${product.url}`} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex min-h-11 items-center break-all text-sm font-medium text-foreground hover:underline sm:min-h-0">{product.url}</a>
          {lastUpdated && <p className="mt-1 text-xs text-muted-foreground">Last activity {relativeTime(lastUpdated)}</p>}
        </div>
      </div>
      </ActionHeader>
      <p className={`mt-4 whitespace-pre-line text-foreground ${more ? "" : "line-clamp-2"}`}>{product.description}</p>
      {product.description.length > 140 && <Button variant="link" onClick={() => setMore(m => !m)} aria-expanded={more}>{more ? "Show less" : "Show more"}</Button>}

      {overview.error ? <div className="mt-6"><ErrorState text="We couldn't load your setup progress." onRetry={() => void overview.refetch()} /></div>
        : !facts ? <div className="mt-6"><Skeleton className="h-36 w-full" /></div>
        : <NextStepCard facts={facts} onProfile={() => setEditProfile(true)} />}

      <section className="mt-6" aria-labelledby="numbers-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="numbers-heading" className="text-xl">Your numbers</h2>
          <PeriodControl days={days} />
        </div>
        {tracking.error || funnel.error ? <div className="mt-4"><ErrorState text="We couldn't load your numbers." onRetry={() => { void tracking.refetch(); void funnel.refetch(); }} /></div>
          : !tracking.data || !funnel.data ? <div className="mt-4 grid grid-cols-2 gap-6 lg:grid-cols-4">{[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}</div>
          : <KpiRow product={product} days={days} totals={tracking.data.totals} summary={funnel.data.summary} hasEvents={overview.data ? overview.data.eventCount > 0 : tracking.data.recent.length > 0} />}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          {funnel.error ? <ErrorState text="We couldn't load your funnel." onRetry={() => void funnel.refetch()} />
            : !funnel.data ? <Skeleton className="h-64 w-full" />
            : <FunnelCard product={product} summary={funnel.data.summary} days={days} />}
        </div>
        <div className="lg:col-span-5">
          {!overview.data ? <Skeleton className="h-64 w-full" /> : <RecentActivity data={overview.data} />}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          {!items ? <Skeleton className="h-48 w-full" /> : <Checklist items={items} onProfile={() => setEditProfile(true)} />}
        </div>
        <div className="lg:col-span-5">{facts && <LoopStrip facts={facts} />}</div>
      </div>

      <div id="profile" className="mt-6">
        {editProfile ? <ProductProfile product={product} /> : <ProfileSummary product={product} onEdit={() => setEditProfile(true)} />}
      </div>

      <p className="mt-8 border-t pt-4 text-xs text-muted-foreground">{footer}</p>
    </div>
  );
}

function PeriodControl({ days }: { days: KpiPeriod }) {
  return (
    <div role="group" aria-label="Time period" className="inline-flex rounded-md border bg-card p-1">
      {KPI_PERIODS.map(d => (
        <Link key={d} to="." search={{ days: d }} aria-pressed={d === days} aria-current={d === days ? "true" : undefined}
          className={`inline-flex min-h-11 items-center rounded-sm px-3 text-sm font-medium sm:min-h-0 ${d === days ? "bg-selected selected-state" : "text-muted-foreground hover:text-foreground"}`}>
          {d} days
        </Link>
      ))}
    </div>
  );
}

function ChangeLine({ change }: { change: Change }) {
  if (change.kind === "none") return <p className="mt-2 text-xs text-muted-foreground">Not enough data yet — {change.reason}</p>;
  return <p className="mt-2 text-xs text-muted-foreground tabular-nums">{change.text}</p>;
}

function KpiTile({ label, value, change, source, empty }: { label: string; value: string | undefined; change?: Change | undefined; source: string; empty?: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <p className="nav-group-label text-muted-foreground">{label}</p>
      {value !== undefined ? <p className="mt-2 font-display text-3xl font-bold tabular-nums">{value}</p> : <p className="mt-3 text-sm font-semibold">No data yet</p>}
      {value !== undefined && change && <ChangeLine change={change} />}
      <p className="mt-2 text-xs text-muted-foreground">{value !== undefined ? <><SourceChip text={source} /> {source}</> : empty}</p>
    </div>
  );
}

function KpiRow({ product, days, totals, summary, hasEvents }: { product: Product; days: KpiPeriod; totals: TrackingSummary; summary: FunnelSummary; hasEvents: boolean }) {
  const install = <Link to="/integrations" className="text-foreground underline">Install tracking</Link>;
  const conversions = product.stage === "prelaunch" ? totals.waitlist : totals.signups;
  const prevConversions = product.stage === "prelaunch" ? totals.prev_waitlist : totals.prev_signups;
  const rate = conversionRate(conversions, totals.visitors);
  const prevRate = conversionRate(prevConversions, totals.prev_visitors);
  const rateChange: Change = rate !== null && prevRate !== null
    ? changeVsPrevious(Math.round(rate * 1000), Math.round(prevRate * 1000))
    : { kind: "none", reason: "No visitors in one of the periods." };
  const worst = worstStep(summary, product.stage);
  const fmt = (n: number) => n.toLocaleString();
  return (
    <div className="mt-4 grid grid-cols-2 gap-6 lg:grid-cols-4">
      <KpiTile label={`Visitors · ${days} days`} value={hasEvents ? fmt(totals.visitors) : undefined} change={changeVsPrevious(totals.visitors, totals.prev_visitors)} source={MEASURED} empty={install} />
      <KpiTile label={product.stage === "prelaunch" ? `Waitlist joins · ${days} days` : `Signups · ${days} days`} value={hasEvents ? fmt(conversions) : undefined} change={changeVsPrevious(conversions, prevConversions)} source={MEASURED} empty={install} />
      <KpiTile label={`Conversion rate · ${days} days`} value={hasEvents && rate !== null ? formatPct(rate) : undefined} change={rateChange} source={MEASURED} empty={install} />
      <KpiTile label="Biggest leak step" value={worst ? worst.step.label : undefined} source={worst?.benchmark ? "Benchmark" : MEASURED}
        empty={summary.total_visitors < 100 ? <span>Not enough data yet — fewer than 100 visitors at the first step. <Link to="/conversion-leaks" className="text-foreground underline">See your funnel</Link></span> : <Link to="/conversion-leaks" className="text-foreground underline">See your funnel</Link>} />
    </div>
  );
}

function FunnelCard({ product, summary, days }: { product: Product; summary: FunnelSummary; days: KpiPeriod }) {
  const worst = worstStep(summary, product.stage);
  return (
    <section aria-labelledby="funnel-heading" className="rounded-lg border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="funnel-heading" className="text-xl">Funnel · {days} days</h2>
        <SourceChip text={MEASURED} />
      </div>
      {summary.total_visitors === 0 ? (
        <div className="mt-4">
          <p className="text-sm text-muted-foreground">No visitors recorded in this period yet.</p>
          <ActionRow className="mt-4"><Button asChild variant="outline"><Link to="/integrations">Install tracking</Link></Button></ActionRow>
        </div>
      ) : (
        <ol className="mt-4 divide-y">
          {summary.steps.map(s => (
            <li key={s.position} className="flex items-center gap-3 py-3">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{s.label}{worst?.step.position === s.position && <span className="status-chip status-warning ml-2">Biggest drop-off</span>}</span>
                {s.position > 1 && <span className="block text-xs text-muted-foreground tabular-nums">{formatPct(s.rate_from_previous)} of the previous step</span>}
              </span>
              <span className="font-display text-lg font-bold tabular-nums">{s.visitors.toLocaleString()}</span>
            </li>
          ))}
        </ol>
      )}
      {summary.total_visitors > 0 && summary.total_visitors < 100 && <p className="mt-3 text-xs text-muted-foreground">Not enough data yet to flag a worst step — that needs 100 visitors at the first step.</p>}
      <ActionRow className="mt-4"><Button asChild variant="outline"><Link to="/conversion-leaks">Open conversion leaks</Link></Button></ActionRow>
    </section>
  );
}

function RecentActivity({ data }: { data: { lastEventAt: string | null; audit: { created_at: string } | null; technicalAudit: unknown; lastCheck: { date: string } | null } }) {
  const tech = data.technicalAudit as { created_at?: string } | null;
  const rows: { label: string; at: string | null; to: string; action: string }[] = [
    { label: "Tracking snippet last seen", at: data.lastEventAt, to: "/integrations", action: "Install tracking" },
    { label: "Last page audit", at: data.audit?.created_at ?? null, to: "/conversion-leaks", action: "Run a page audit" },
    { label: "Last technical audit", at: tech?.created_at ?? null, to: "/technical-audit", action: "Run a technical audit" },
    { label: "Last AI visibility check", at: data.lastCheck?.date ?? null, to: "/ai-search-visibility", action: "Run a check" },
  ];
  return (
    <section aria-labelledby="activity-heading" className="rounded-lg border bg-card p-6">
      <div className="flex items-center gap-2"><Activity className="size-5 text-muted-foreground" aria-hidden /><h2 id="activity-heading" className="text-xl">Recent activity</h2></div>
      <ul className="mt-4 divide-y">
        {rows.map(r => (
          <li key={r.label} className="flex items-center justify-between gap-3 py-3">
            <span className="min-w-0">
              <span className="block text-sm font-medium">{r.label}</span>
              <span className="block text-xs text-muted-foreground">{r.at ? relativeTime(r.at) : "Not yet"}</span>
            </span>
            {!r.at && <Link to={r.to} className="shrink-0 text-sm font-medium text-foreground underline">{r.action}</Link>}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ItemLink({ item, className, children, onProfile }: { item: ChecklistItem; className?: string; children: React.ReactNode; onProfile: () => void }) {
  if (item.key === "profile") return <button type="button" className={className} onClick={() => { onProfile(); requestAnimationFrame(() => document.getElementById("profile")?.scrollIntoView({ behavior: "smooth" })); }}>{children}</button>;
  return <Link to={item.to} className={className}>{children}</Link>;
}

function NextStepCard({ facts, onProfile }: { facts: NextStepFacts; onProfile: () => void }) {
  const next = pickNextStep(facts);
  const button = next.key === "profile"
    ? <Button onClick={() => { onProfile(); requestAnimationFrame(() => document.getElementById("profile")?.scrollIntoView({ behavior: "smooth" })); }}>{next.action}<ArrowRight /></Button>
    : <Button asChild><Link to={next.to.split("#")[0]!} {...(next.to.includes("#") ? { hash: next.to.split("#")[1]! } : {})}>{next.action}<ArrowRight /></Link></Button>;
  return (
    <section aria-labelledby="next-step-heading" className="mt-6 rounded-lg border border-foreground bg-card p-6">
      <p className="nav-group-label text-foreground">Next best step</p>
      <h2 id="next-step-heading" className="mt-1 text-xl">{next.title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{next.text}</p>
      <ActionRow className="mt-4">{button}</ActionRow>
    </section>
  );
}

function LoopStrip({ facts }: { facts: NextStepFacts }) {
  const loop = loopSteps(facts);
  return (
    <section aria-labelledby="loop-heading" className="rounded-lg border bg-card p-6">
      <h2 id="loop-heading" className="text-xl">Find the leak, fix it, prove it worked</h2>
      <ol className="mt-4 grid gap-2">
        {loop.map((step, i) => (
          <li key={step.key} aria-current={step.status === "current" ? "step" : undefined} className={`flex items-center justify-between gap-3 rounded-sm border px-3 py-2 ${step.status === "current" ? "bg-selected selected-state" : ""}`}>
            <span className="text-sm font-semibold">{i + 1}. {step.label}</span>
            <span className={`status-chip ${step.status === "done" ? "status-live" : "status-coming"}`}>{loopStatusText[step.status]}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Checklist({ items, onProfile }: { items: ChecklistItem[]; onProfile: () => void }) {
  const p = progress(items);
  const complete = p.done === p.total;
  const [open, setOpen] = useState(false);
  const collapsed = complete && !open;
  return (
    <section aria-labelledby="setup-heading" className="rounded-lg border bg-card p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 id="setup-heading" className="text-xl">Setup</h2>
        {complete
          ? <Button variant="link" onClick={() => setOpen(o => !o)} aria-expanded={open}>{collapsed ? `All ${p.total} done — show` : "Hide"}</Button>
          : <span className="text-sm font-medium tabular-nums">{p.done} of {p.total} done</span>}
      </div>
      {collapsed ? <p className="mt-2 text-sm text-muted-foreground">You're set up. Next: run an AI visibility check weekly.</p> : <>
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
      </>}
    </section>
  );
}

function ProfileSummary({ product, onEdit }: { product: Product; onEdit: () => void }) {
  const { data } = useQuery(profileQuery(product.id));
  return (
    <section aria-label="Product profile" className="rounded-lg border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl">Product profile</h2>
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
