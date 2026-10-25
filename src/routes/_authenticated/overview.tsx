import { ActionRow } from '@/components/ActionRow';
import { createFileRoute, Link, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Activity, ArrowRight, Package, Users } from "lucide-react";
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
import { buildChecklist, progress, relativeTime, type ChecklistItem } from "@/lib/setup-checklist";
import { pickNextStep, loopSteps, loopStatusText, type NextStep, type NextStepFacts } from "@/lib/next-step";
import { worstStep, type FunnelSummary } from "@/lib/funnel";
import { KPI_PERIODS, parsePeriod, changeVsPrevious, conversionRate, formatPct, type Change, type KpiPeriod } from "@/lib/kpi";
import type { Product } from "@/lib/workspace";

export const Route = createFileRoute("/_authenticated/overview")({
  validateSearch: (search: Record<string, unknown>): { days?: KpiPeriod } => (search['days'] === undefined ? {} : { days: parsePeriod(search['days']) }),
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

// Desktop layout is at most four top-level sections (data-overview-section):
// header + next step, KPIs, funnel | activity + setup, product profile.
function ProductOverview({ product, footer, onDeleted }: { product: Product; footer: string; onDeleted: () => void }) {
  const days = parsePeriod(Route.useSearch().days);
  const overview = useQuery(overviewQuery(product.id));
  const tracking = useQuery(trackingQuery(product.id, days));
  const funnel = useQuery(conversionQuery(product.id, days));
  const [profileOpen, setProfileOpen] = useState(false);
  const location = useLocation();
  useEffect(() => { if (location.hash === "profile") setProfileOpen(true); }, [location.hash]);
  const openProfile = () => { setProfileOpen(true); requestAnimationFrame(() => { const el = document.getElementById("profile"); el?.scrollIntoView({ behavior: "smooth" }); el?.focus({ preventScroll: true }); }); };

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
  const next = facts ? pickNextStep(facts) : null;
  const setupDone = items ? progress(items) : null;
  const setupComplete = !!setupDone && setupDone.done === setupDone.total;

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-4">
      <section data-overview-section aria-label="Product and next step" className="flex flex-col gap-3">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <ProductLogo name={product.name} path={product.logo_path} size={40} />
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h1 className="min-w-0 truncate text-2xl">{product.name}</h1>
                <span className={`status-chip ${product.stage === "live" ? "status-live" : "status-coming"}`}>{stageLabel(product.stage)}</span>
                {setupComplete && <span className="status-chip status-live">Setup complete</span>}
              </div>
              <p className="flex min-w-0 flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
                <a href={`https://${product.url}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center break-all font-medium text-foreground hover:underline sm:min-h-0">{product.url}</a>
                <span aria-hidden>·</span><span>{footer}</span>
              </p>
            </div>
          </div>
          <ActionRow className="shrink-0"><PeriodControl days={days} /><EditProductDialog product={product} onDeleted={onDeleted} /></ActionRow>
        </header>
        {overview.error ? <ErrorState text="We couldn't load your setup progress." onRetry={() => void overview.refetch()} />
          : !facts || !next ? <Skeleton className="h-16 w-full" />
          : <NextStepBar facts={facts} next={next} onProfile={openProfile} />}
      </section>

      <section data-overview-section aria-labelledby="numbers-heading">
        <h2 id="numbers-heading" className="sr-only">Your numbers · {days} days</h2>
        {tracking.error || funnel.error ? <ErrorState text="We couldn't load your numbers." onRetry={() => { void tracking.refetch(); void funnel.refetch(); }} />
          : !tracking.data || !funnel.data ? <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-[88px]" />)}</div>
          : <KpiRow product={product} days={days} totals={tracking.data.totals} summary={funnel.data.summary} hasEvents={overview.data ? overview.data.eventCount > 0 : tracking.data.recent.length > 0} />}
      </section>

      <section data-overview-section aria-label="Funnel, activity and setup" className="grid items-start gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          {funnel.error ? <ErrorState text="We couldn't load your funnel." onRetry={() => void funnel.refetch()} />
            : !funnel.data ? <Skeleton className="h-48 w-full" />
            : <FunnelCard product={product} summary={funnel.data.summary} days={days} />}
        </div>
        <div className="flex flex-col gap-4 lg:col-span-5">
          {!overview.data ? <Skeleton className="h-48 w-full" /> : <RecentActivity data={overview.data} events={tracking.data?.recent ?? []} />}
          {items && !setupComplete && <Checklist items={items.filter(i => i.key !== next?.key)} all={items} onProfile={openProfile} />}
        </div>
      </section>

      <section data-overview-section id="profile" tabIndex={-1} aria-label="Product profile" className="scroll-mt-24 focus:outline-none">
        {profileOpen
          ? <div data-profile-expanded className="flex flex-col gap-2"><ProductProfile product={product} /><ActionRow><Button variant="link" onClick={() => setProfileOpen(false)} aria-expanded="true" aria-controls="profile">Collapse profile</Button></ActionRow></div>
          : <ProfileSummary product={product} onEdit={() => setProfileOpen(true)} />}
      </section>
    </div>
  );
}

function PeriodControl({ days }: { days: KpiPeriod }) {
  return (
    <div role="group" aria-label="Time period" className="inline-flex rounded-md border bg-card p-1">
      {KPI_PERIODS.map(d => (
        <Link key={d} to="." search={{ days: d }} aria-pressed={d === days} aria-current={d === days ? "true" : undefined}
          className={`inline-flex min-h-11 items-center rounded-sm px-3 text-sm font-medium sm:min-h-8 ${d === days ? "bg-selected selected-state" : "text-muted-foreground hover:text-foreground"}`}>
          {d} days
        </Link>
      ))}
    </div>
  );
}

function KpiTile({ label, value, change, source, empty }: { label: string; value: string | undefined; change?: Change | undefined; source: string; empty?: React.ReactNode }) {
  const changeText = change ? (change.kind === "none" ? undefined : change.text) : undefined;
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-lg border bg-card p-4">
      <p className="truncate text-xs font-semibold text-muted-foreground" title={label}>{label}</p>
      {value !== undefined ? <p className="truncate font-display text-2xl font-semibold tabular-nums" title={value}>{value}</p> : <p className="text-sm font-semibold">No data yet</p>}
      <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {value !== undefined ? <span title={source}><SourceChip text={source} inline /></span> : empty}
        {value !== undefined && changeText && <span className="tabular-nums" title={change?.kind === "none" ? undefined : `${changeText} vs previous ${label.split(" · ")[1] ?? "period"}`}>{changeText}</span>}
      </div>
    </div>
  );
}

function KpiRow({ product, days, totals, summary, hasEvents }: { product: Product; days: KpiPeriod; totals: TrackingSummary; summary: FunnelSummary; hasEvents: boolean }) {
  const install = <Link to="/integrations" hash="tracking" className="text-foreground underline">Install tracking</Link>;
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
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <KpiTile label={`Visitors · ${days} days`} value={hasEvents ? fmt(totals.visitors) : undefined} change={changeVsPrevious(totals.visitors, totals.prev_visitors)} source={MEASURED} empty={install} />
      <KpiTile label={product.stage === "prelaunch" ? `Waitlist joins · ${days} days` : `Signups · ${days} days`} value={hasEvents ? fmt(conversions) : undefined} change={changeVsPrevious(conversions, prevConversions)} source={MEASURED} empty={install} />
      <KpiTile label={`Conversion rate · ${days} days`} value={hasEvents && rate !== null ? formatPct(rate) : undefined} change={rateChange} source={MEASURED} empty={install} />
      <KpiTile label="Biggest leak step" value={worst ? worst.step.label : undefined} source={worst?.benchmark ? "Benchmark" : MEASURED}
        empty={<Link to="/conversion-leaks" className="text-foreground underline" title={summary.total_visitors < 100 ? "Needs 100 visitors at the first step" : undefined}>{summary.total_visitors < 100 ? "Needs 100 visitors" : "See your funnel"}</Link>} />
    </div>
  );
}

function FunnelCard({ product, summary, days }: { product: Product; summary: FunnelSummary; days: KpiPeriod }) {
  const worst = worstStep(summary, product.stage);
  return (
    <section aria-labelledby="funnel-heading" className="rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="funnel-heading" className="text-xl">Funnel · {days} days</h2>
        <span className="ml-auto flex shrink-0 items-center gap-3"><SourceChip text={MEASURED} inline /><Link to="/conversion-leaks" className="text-sm font-medium text-foreground underline">Open conversion leaks</Link></span>
      </div>
      {summary.total_visitors === 0 ? (
        <div className="mt-2 flex min-w-0 flex-wrap items-center gap-3">
          <Users className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <p className="min-w-0 flex-1 text-sm text-muted-foreground">No visitors recorded in this period yet.</p>
          <Link to="/integrations" hash="tracking" className="shrink-0 text-sm font-medium text-foreground underline">Install tracking</Link>
        </div>
      ) : (
        <ol className="mt-2 divide-y">
          {summary.steps.map(s => (
            <li key={s.position} className="flex min-h-10 items-center gap-3 py-2">
              <span className="min-w-0 flex-1 truncate text-sm font-medium" title={s.label}>{s.label}{worst?.step.position === s.position && <span className="status-chip status-warning ml-2">Biggest drop-off</span>}</span>
              {s.position > 1 && <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{formatPct(s.rate_from_previous)} of previous</span>}
              <span className="w-16 shrink-0 text-right font-display text-md font-semibold tabular-nums">{s.visitors.toLocaleString()}</span>
            </li>
          ))}
        </ol>
      )}
      {summary.total_visitors > 0 && summary.total_visitors < 100 && <p className="mt-2 text-xs text-muted-foreground">A worst step is flagged after 100 visitors at the first step.</p>}
    </section>
  );
}

type RecentEvent = { id: string; name: string; path: string | null; created_at: string };
function RecentActivity({ data, events }: { data: { audit: { created_at: string } | null; technicalAudit: unknown; lastCheck: { date: string } | null }; events: RecentEvent[] }) {
  const tech = data.technicalAudit as { created_at?: string } | null;
  const rows = [
    ...events.slice(0, 5).map(e => ({ key: e.id, label: e.name === "pageview" ? `Visit ${e.path ?? "/"}` : `Event: ${e.name}`, at: e.created_at })),
    ...(data.audit ? [{ key: "audit", label: "Page audit saved", at: data.audit.created_at }] : []),
    ...(tech?.created_at ? [{ key: "tech", label: "Technical audit run", at: tech.created_at }] : []),
    ...(data.lastCheck ? [{ key: "ai", label: "AI visibility check", at: data.lastCheck.date }] : []),
  ].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 5);
  return (
    <section aria-labelledby="activity-heading" className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id="activity-heading" className="flex items-center gap-2 text-xl"><Activity className="size-4 text-muted-foreground" aria-hidden />Recent activity</h2>
        <Link to="/integrations" hash="tracking" className="text-sm font-medium text-foreground underline">View all</Link>
      </div>
      {rows.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Nothing recorded yet.</p> : (
        <ul className="mt-1 divide-y">
          {rows.map(r => (
            <li key={r.key} className="flex h-10 items-center justify-between gap-3">
              <span className="min-w-0 truncate text-sm" title={r.label}>{r.label}</span>
              <time dateTime={r.at} title={new Date(r.at).toLocaleString()} className="shrink-0 text-xs text-muted-foreground">{relativeTime(r.at)}</time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ItemLink({ item, className, children, onProfile }: { item: ChecklistItem; className?: string; children: React.ReactNode; onProfile: () => void }) {
  if (item.key === "profile") return <button type="button" className={className} onClick={onProfile}>{children}</button>;
  return <Link to={item.to} className={className}>{children}</Link>;
}

function NextStepBar({ facts, next, onProfile }: { facts: NextStepFacts; next: NextStep; onProfile: () => void }) {
  const loop = loopSteps(facts);
  const button = next.key === "profile"
    ? <Button onClick={onProfile}>{next.action}<ArrowRight /></Button>
    : <Button asChild><Link to={next.to.split("#")[0]!} {...(next.to.includes("#") ? { hash: next.to.split("#")[1]! } : {})}>{next.action}<ArrowRight /></Link></Button>;
  return (
    <div aria-labelledby="next-step-heading" role="region" className="flex flex-col gap-3 rounded-lg border border-foreground bg-card px-4 py-3 lg:flex-row lg:items-center">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 lg:flex-row lg:items-baseline lg:gap-3">
        <p className="nav-group-label shrink-0 text-foreground">Next best step</p>
        <h2 id="next-step-heading" className="shrink-0 text-md font-semibold">{next.title}</h2>
        <p className="min-w-0 truncate text-sm text-muted-foreground" title={next.text}>{next.text}</p>
      </div>
      <ol aria-label="Find, fix, prove" className="flex shrink-0 flex-wrap items-center gap-1.5">
        {loop.map(step => (
          <li key={step.key} aria-current={step.status === "current" ? "step" : undefined}
            className={`status-chip ${step.status === "done" ? "status-live" : "status-coming"} ${step.status === "current" ? "border-foreground" : ""}`}
            title={`${step.label}: ${loopStatusText[step.status]}`}>
            {step.label}: {loopStatusText[step.status]}
          </li>
        ))}
      </ol>
      <ActionRow className="shrink-0">{button}</ActionRow>
    </div>
  );
}

function Checklist({ items, all, onProfile }: { items: ChecklistItem[]; all: ChecklistItem[]; onProfile: () => void }) {
  const p = progress(all);
  const [open, setOpen] = useState(false);
  const pending = items.filter(i => !i.done);
  return (
    <section aria-labelledby="setup-heading" className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id="setup-heading" className="text-md font-semibold">Setup <span className="font-normal tabular-nums text-muted-foreground">{p.done} of {p.total} done</span></h2>
        {pending.length > 0 && <Button variant="link" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-controls="setup-list">{open ? "Hide" : "Show steps"}</Button>}
      </div>
      <Progress value={(p.done / p.total) * 100} className="mt-2 h-1.5" aria-label={`${p.done} of ${p.total} done`} />
      {open && <ul id="setup-list" className="mt-2 divide-y">
        {pending.map(item => {
          const body = <>
            <span className="h-4 w-4 shrink-0 rounded-full border" aria-hidden />
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{item.title}<span className="sr-only">{item.soon ? "" : " (not done)"}</span></span>{item.result && <span className="block truncate text-xs text-muted-foreground">{item.result}</span>}</span>
            {item.soon && <span className="status-chip status-coming">Soon</span>}
          </>;
          return <li key={item.key}>{item.soon
            ? <div aria-disabled="true" className="flex min-h-10 items-center gap-3 py-1.5 text-muted-foreground">{body}</div>
            : <ItemLink item={item} onProfile={onProfile} className="flex min-h-10 w-full items-center gap-3 rounded-sm py-1.5 text-left hover:bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{body}</ItemLink>}</li>;
        })}
      </ul>}
    </section>
  );
}

function ProfileSummary({ product, onEdit }: { product: Product; onEdit: () => void }) {
  const confirmed = !!product.profile_confirmed_at || product.profile_edited_fields.length > 0;
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-md font-semibold">Product profile</h2>
          {product.profiled_at
            ? <><span className="status-chip status-ai">{product.profile_source === "edited" ? "AI-written · Edited by you" : "AI-written"}</span><span className={`status-chip ${confirmed ? "status-live" : "status-coming"}`}>{confirmed ? "Confirmed" : "Not confirmed"}</span></>
            : <span className="status-chip status-coming">Not profiled yet</span>}
        </div>
        <p className="truncate text-sm text-muted-foreground" title={[product.one_liner, product.audience].filter(Boolean).join(" · ")}>
          {product.profiled_at ? <>{product.one_liner || product.description}{product.audience && <> · For {product.audience}</>}</> : product.description}
        </p>
      </div>
      <ActionRow className="shrink-0"><Button variant="outline" onClick={onEdit} aria-expanded="false" aria-controls="profile">{product.profiled_at ? "Edit profile" : "Open profile"}</Button></ActionRow>
    </div>
  );
}
