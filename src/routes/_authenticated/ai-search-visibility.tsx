import { ActionRow, ActionHeader } from '@/components/ActionRow';
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveProduct } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { engineChoiceKey, readEngineChoice, engineFailedAllRuns, defaultEngineChoice } from "@/lib/sov-engine-choice";
import { estimateCheckCost, usd, ENGINES, type EngineId } from "@/lib/engine-prices";
import { shareOfVoice, questionStats, youPercent, usableSovRuns, unusableEngineReason, type SovRunRow, type SovMentionRow } from "@/lib/sov";
import { getSovEngineStatus, testEngineConnection, startSovCheck, advanceSovCheckFn, setSovSchedule } from "@/lib/sov.functions";
import { relativeTime } from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/ai-search-visibility")({
  head: () => ({
    meta: [
      { title: "AI search visibility — Growloop" },
      { name: "description", content: "How often AI assistants recommend your product, measured from real runs." },
      { property: "og:title", content: "AI search visibility — Growloop" },
      { property: "og:description", content: "How often AI assistants recommend your product, measured from real runs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AiSearchVisibility,
});

const sovDataQuery = (productId: string) =>
  queryOptions({
    queryKey: ["sov-data", productId],
    refetchInterval: (q) => {
      const checks = q.state.data?.checks ?? [];
      return checks.some((c) => c.status === "running") ? 5000 : false;
    },
    queryFn: async () => {
      const [checks, questions, schedule] = await Promise.all([
        supabase
          .from("sov_checks")
          .select("id, status, runs_per_question, engines, started_at, finished_at, estimated_cost_usd")
          .eq("product_id", productId)
          .order("started_at", { ascending: false })
          .limit(20),
        supabase.from("sov_questions").select("id, question").eq("product_id", productId).eq("active", true).order("created_at"),
        supabase.from("sov_schedule").select("enabled, per_week").eq("product_id", productId).maybeSingle(),
      ]);
      if (checks.error) throw checks.error;
      if (questions.error) throw questions.error;
      const checkIds = (checks.data ?? []).map((c) => c.id);
      if (!checkIds.length) {
        return { checks: [], questions: questions.data ?? [], schedule: schedule.data ?? null, runs: [], mentions: [], fixes: [] };
      }
      const runs = await supabase.from("sov_runs").select("id, check_id, engine, question, status, answer_excerpt, error").in("check_id", checkIds);
      if (runs.error) throw runs.error;
      const runIds = (runs.data ?? []).map((r) => r.id);
      const [mentions, fixes] = await Promise.all([
        runIds.length
          ? supabase.from("sov_mentions").select("run_id, name, rank, kind").in("run_id", runIds)
          : Promise.resolve({ data: [], error: null }),
        supabase.from("sov_fixes").select("check_id, text, created_at").in("check_id", checkIds).order("created_at", { ascending: false }),
      ]);
      if (mentions.error) throw mentions.error;
      if (fixes.error) throw fixes.error;
      return {
        checks: checks.data ?? [],
        questions: questions.data ?? [],
        schedule: schedule.data ?? null,
        runs: usableSovRuns(runs.data ?? []),
        mentions: mentions.data ?? [],
        fixes: fixes.data ?? [],
      };
    },
  });

function AiSearchVisibility() {
  const { active } = useActiveProduct();
  if (!active) return <p className="text-sm text-muted-foreground">Add a product first.</p>;
  return <VisibilityPage key={active.id} productId={active.id} productName={active.name} />;
}

function VisibilityPage({ productId, productName }: { productId: string; productName: string }) {
  const qc = useQueryClient();
  const { data } = useQuery(sovDataQuery(productId));
  const statusFn = useServerFn(getSovEngineStatus);
  const testFn = useServerFn(testEngineConnection);
  const startFn = useServerFn(startSovCheck);
  const advanceFn = useServerFn(advanceSovCheckFn);
  const scheduleFn = useServerFn(setSovSchedule);

  const { data: engineStatus } = useQuery({
    queryKey: ["sov-engine-status", productId],
    queryFn: () => statusFn({ data: { productId } }),
  });

  const [engineFilter, setEngineFilter] = useState<"all" | EngineId>("all");
  const [runsPerQuestion, setRunsPerQuestion] = useState(3);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean | null; text: string }>>({});
  const [engineChoice, setEngineChoice] = useState<EngineId[] | null>(null);
  const [progress, setProgress] = useState<{ finished: number; total: number } | null>(null);

  const checks = data?.checks ?? [];
  const latestDone = checks.find((c) => c.status === "done" || c.status === "stopped");
  const running = checks.find((c) => c.status === "running");
  const questions = data?.questions ?? [];
  const connected = (engineStatus?.engines ?? []).filter((e) => e.connected).map((e) => e.id);
  const chosenEngines = connected.filter((id) => engineChoice === null || engineChoice.includes(id));
  const estimate = estimateCheckCost(Math.min(questions.length, 10), runsPerQuestion, chosenEngines);
  const callCount = Math.min(questions.length, 10) * runsPerQuestion * chosenEngines.length;
  const lastCheck = checks.find((c) => c.status !== "running");
  const lastCheckRuns = (data?.runs ?? []).filter((r) => r.check_id === lastCheck?.id);

  useEffect(() => {
    try { setEngineChoice(readEngineChoice(localStorage.getItem(engineChoiceKey(productId)))); } catch { /* Storage is optional. */ }
  }, [productId]);

  function toggleEngine(id: EngineId, checked: boolean) {
    const next = checked ? [...chosenEngines, id] : chosenEngines.filter((engine) => engine !== id);
    setEngineChoice(next);
    try { localStorage.setItem(engineChoiceKey(productId), JSON.stringify(next)); } catch { /* Storage is optional. */ }
  }

  function openConfirmation() {
    const failed = connected.filter((id) => testResults[id]?.ok === false || engineFailedAllRuns(id, lastCheckRuns));
    setEngineChoice(defaultEngineChoice(connected, engineChoice, failed));
    setConfirming(true);
  }

  // While a check is running, drive it forward: one advance at a time, about
  // every second, until it finishes. Resumes automatically after a reload,
  // because the running check is read back from the database.
  useEffect(() => {
    if (!running) {
      setProgress(null);
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const step = async () => {
      try {
        const result = await advanceFn({ data: { checkId: running.id } });
        if (cancelled) return;
        setProgress({ finished: result.finished, total: result.total });
        qc.invalidateQueries({ queryKey: ["sov-data", productId] });
        if (result.status !== "running") return;
      } catch {
        if (cancelled) return;
      }
      timer = setTimeout(step, 1000);
    };
    void step();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running?.id]);

  const latestRuns = useMemo(
    () => (data?.runs ?? []).filter((r) => r.check_id === latestDone?.id) as unknown as SovRunRow[],
    [data, latestDone],
  );
  const runIds = useMemo(() => new Set(latestRuns.map((r) => r.id)), [latestRuns]);
  const latestMentions = useMemo(
    () => (data?.mentions ?? []).filter((m) => runIds.has(m.run_id)) as unknown as SovMentionRow[],
    [data, runIds],
  );
  const share = useMemo(
    () => shareOfVoice(latestRuns, latestMentions, engineFilter === "all" ? undefined : engineFilter),
    [latestRuns, latestMentions, engineFilter],
  );
  const stats = useMemo(() => questionStats(latestRuns, latestMentions), [latestRuns, latestMentions]);
  const youShare = share.find((s) => s.kind === "you");
  const others = share.filter((s) => s.kind === "other").slice(0, 5);
  const latestFixes = data?.fixes?.find((f) => f.check_id === latestDone?.id);
  const usableEngines = ENGINES.filter(e => latestRuns.some(r => r.engine === e.id && r.status === 'done'));
  const unusableEngines = ENGINES.filter(e => latestDone?.engines.includes(e.id) && !usableEngines.some(usable => usable.id === e.id));

  const trend = useMemo(() => {
    const done = checks.filter((c) => c.status === "done" || c.status === "stopped");
    return done
      .map((c) => {
        const runs = (data?.runs ?? []).filter((r) => r.check_id === c.id) as unknown as SovRunRow[];
        const ids = new Set(runs.map((r) => r.id));
        const mentions = (data?.mentions ?? []).filter((m) => ids.has(m.run_id)) as unknown as SovMentionRow[];
        return { date: c.started_at, pct: youPercent(runs, mentions) };
      })
      .reverse();
  }, [checks, data]);

  async function runTest(engine: EngineId) {
    setTestResults((m) => ({ ...m, [engine]: { ok: null, text: "Testing…" } }));
    try {
      const result = await testFn({ data: { productId, engine } });
      setTestResults((m) => ({ ...m, [engine]: { ok: result.ok, text: result.ok ? "Test passed just now" : (result.error ?? "The connection test failed. Try again later.") } }));
    } catch {
      setTestResults((m) => ({ ...m, [engine]: { ok: false, text: "The connection test failed. Try again later." } }));
    }
  }

  async function runCheck() {
    setBusy(true);
    setMessage(null);
    const result = await startFn({ data: { productId, runsPerQuestion, engines: chosenEngines } });
    setBusy(false);
    setConfirming(false);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setMessage("Check started. Results appear below as runs finish.");
    qc.invalidateQueries({ queryKey: ["sov-data", productId] });
  }

  async function saveSchedule(enabled: boolean, perWeek: number) {
    const result = await scheduleFn({ data: { productId, enabled, perWeek } });
    if (!result.ok) setMessage(result.error);
    qc.invalidateQueries({ queryKey: ["sov-data", productId] });
  }

  async function addCompetitor(name: string) {
    const { count } = await supabase.from("competitors").select("id", { count: "exact", head: true }).eq("product_id", productId);
    if ((count ?? 0) >= 8) {
      setMessage("You already have 8 competitors. Remove one on the product profile first.");
      return;
    }
    const { error } = await supabase.from("competitors").insert({ product_id: productId, name, source: "founder" });
    setMessage(error ? "We couldn't add that competitor. Please try again." : `Added ${name} to your competitors.`);
  }

  const budget = engineStatus?.budget;

  return (
    <div className="mx-auto max-w-3xl">
      <ActionHeader action={running ? <Button disabled>{progress ? `${progress.finished} of ${progress.total} runs finished` : "Check running…"}</Button> : <Button variant={confirming ? "outline" : "default"} onClick={openConfirmation} disabled={!connected.length || !questions.length}>Run a check</Button>}>
        <h1 className="text-3xl font-extrabold">AI search visibility</h1>
        <p className="mt-1 text-sm text-muted-foreground">See how often AI assistants recommend {productName} when buyers ask.</p>
        {latestDone && (
          <span className="text-sm text-muted-foreground">Last checked {relativeTime(latestDone.started_at)}</span>
        )}
      </ActionHeader>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {(engineStatus?.engines ?? ENGINES.map((e) => ({ id: e.id, label: e.label, connected: false, testsToday: 0 }))).map((e) => (
          <div key={e.id} className="grid min-w-0 grid-rows-[auto_auto_1fr_auto] gap-2 rounded-lg border bg-card p-4 text-xs">
            <span className="font-semibold">{e.label}</span>
            <span className={e.connected ? "text-foreground" : "text-muted-foreground"}>{e.connected ? "Connected" : "Not connected"}</span>
            <div className="min-h-5">{testResults[e.id] && <span className="break-words text-muted-foreground">{testResults[e.id]?.text}</span>}</div>
            {e.connected && (
              <Button variant="link" className="justify-self-start" size="sm" disabled={testResults[e.id]?.ok === null} onClick={() => runTest(e.id as EngineId)}>
                Test connection
              </Button>
            )}
          </div>
        ))}
      </div>
      {budget?.scope === "platform" && (
        <p className="mt-2 text-sm text-muted-foreground">
          <span className="status-chip status-estimated">Estimated</span> Spent this month {usd(budget.spent_usd)} of ${budget.budget_usd} (estimated)
          {budget.spent_usd >= budget.budget_usd * 0.8 && (
            <span className="ml-2 font-medium text-warning">Near the monthly budget.</span>
          )}
        </p>
      )}
      {budget?.scope === "product" && (
        <p className="mt-2 text-sm text-muted-foreground">
          <span className="status-chip status-estimated">Estimated</span> This product's estimated spend this month: {usd(budget.own_spend_usd)} — {budget.status}.
        </p>
      )}

      {message && <p className="mt-4 rounded-lg border bg-card p-3 text-sm">{message}</p>}

      {confirming && !running && (
        <div className="mt-4 rounded-xl border bg-card p-5">
          <h2 className="text-lg">Confirm this check</h2>
          <fieldset className="my-3 space-y-2">
            <legend className="mb-2 text-sm font-medium">Engines</legend>
            {(engineStatus?.engines ?? []).filter((e) => e.connected).map((e) => (
              <label key={e.id} className="flex flex-wrap items-center gap-2 text-sm">
                <Checkbox checked={chosenEngines.includes(e.id)} onCheckedChange={(checked) => toggleEngine(e.id, checked === true)} />
                {e.label}
                {testResults[e.id]?.ok === false || engineFailedAllRuns(e.id, lastCheckRuns) ? (
                  <span className="text-xs text-muted-foreground">Failed last time. Tick to try again.</span>
                ) : null}
              </label>
            ))}
          </fieldset>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="status-chip status-estimated">Estimated</span> This will make about {callCount} calls, estimated cost about {usd(estimate)}. Costs are estimates from
            published prices, not exact bills.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Also uses about {callCount + 1} small Lovable AI calls to read the answers.
          </p>
          <label className="mt-3 flex items-center gap-2 text-sm">
            Runs per question
            <select
              className="rounded-sm border bg-card px-2 py-1"
              value={runsPerQuestion}
              onChange={(e) => setRunsPerQuestion(Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          <ActionRow className="mt-4">
            <Button onClick={runCheck} disabled={busy || !chosenEngines.length}>{busy ? "Starting…" : "Run the check"}</Button>
            <Button variant="outline" onClick={() => setConfirming(false)}>Cancel</Button>
          </ActionRow>
        </div>
      )}

      {!questions.length && (
        <p className="mt-6 rounded-xl border bg-card p-5 text-sm">
          Add the questions buyers ask on your product profile first.{" "}
          <Link to="/overview" className="font-medium text-foreground hover:underline">Open your product profile</Link>
        </p>
      )}
      {engineStatus && !connected.length && (
        <div className="mt-6 rounded-xl border bg-card p-5 text-sm">
          <p className="font-semibold">No engine is connected yet.</p>
          <p className="mt-1 text-muted-foreground">
            Growloop asks OpenAI, Perplexity and Claude your buyer questions. Each engine needs its own API key, added
            by you in Project Settings → Secrets as OPENAI_API_KEY, PERPLEXITY_API_KEY and ANTHROPIC_API_KEY. Keys are
            stored encrypted and never shown in the browser. An engine without a key is skipped.
          </p>
        </div>
      )}

      {latestDone && (
        <>
          <section className="mt-8 rounded-xl border bg-card p-6">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-lg">Share of voice</h2>
              <div className="ml-auto flex gap-1">
                {(["all", "openai", "perplexity", "claude"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setEngineFilter(f)}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${engineFilter === f ? "bg-selected text-foreground selected-state" : "text-muted-foreground hover:bg-sunken"}`}
                  >
                    {f === "all" ? "All engines" : f === "openai" ? "OpenAI" : f === "perplexity" ? "Perplexity" : "Claude"}
                  </button>
                ))}
              </div>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              <span className="status-chip status-measured">Measured</span> {usableEngines.length ? `from usable answers by asking ${usableEngines.map(e => e.label).join(', ')} your buyer questions ${latestDone.runs_per_question} times each` : 'No engine returned usable answers'} on{" "}
              {new Date(latestDone.started_at).toLocaleDateString()}. AI answers vary, so treat this as a sample of usable answers, not a
              ranking.
            </p>
            {unusableEngines.map(engine => <p key={engine.id} className="mt-2 text-sm">{engine.label}: {unusableEngineReason(latestRuns.filter(r => r.engine === engine.id))}</p>)}
            <p className="mt-1 text-xs text-muted-foreground">
              {latestRuns.filter((r) => r.status === "done").length} of {latestRuns.length} runs succeeded.
            </p>
            {engineFilter !== "all" && !latestRuns.some((r) => r.engine === engineFilter && r.status === "done") ? (
              <div className="mt-4 text-sm"><p>No usable answers in this check</p><p className="mt-1">{ENGINES.find(e => e.id === engineFilter)?.label}: {unusableEngineReason(latestRuns.filter(r => r.engine === engineFilter))}</p></div>
            ) : latestRuns.some((r) => r.status === "done" && (engineFilter === "all" || r.engine === engineFilter)) && !youShare && (
              <p className="mt-4 text-sm">
                {productName} was not recommended in these usable answers. That is common for a new product.
              </p>
            )}
            <div className="mt-4 space-y-3">
              {share.map((s) => (
                <div key={`${s.kind}:${s.name}`}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-medium">
                      {s.name}
                      {s.kind === "you" && <Badge className="ml-2" variant="secondary">You</Badge>}
                    </span>
                    <span className="text-muted-foreground">{s.pct}% ({s.count} of {s.runs} runs)</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-sunken">
                    <div
                      className={`h-2 rounded-full ${s.kind === "you" ? "border border-foreground bg-primary" : "bg-chart-other"}`}
                      style={{ width: `${s.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-6 rounded-xl border bg-card p-6">
            <h2 className="text-lg">Per question</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="pb-2 pr-4 font-semibold">Question</th>
                    {stats[0]?.engines.map((e) => (
                      <th key={e.engine} className="pb-2 pr-4 font-semibold capitalize">{e.engine}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.map((row) => (
                    <tr key={row.question} className="border-t">
                      <td className="py-2 pr-4">{row.question}</td>
                      {row.engines.map((e) => (
                        <td key={e.engine} className="py-2 pr-4 text-muted-foreground">
                          {e.total === 0
                            ? "—"
                            : e.mentioned === 0
                              ? `0 of ${e.total} runs`
                              : `${e.mentioned} of ${e.total} runs, avg rank ${e.avgRank?.toFixed(1)}`}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-6 rounded-xl border bg-card p-6">
            <h2 className="text-lg">Trend</h2>
            {trend.length < 2 ? (
              <p className="mt-2 text-sm text-muted-foreground">A trend appears after your second check.</p>
            ) : (
              <div className="mt-3 flex items-end gap-3">
                {trend.map((t) => (
                  <div key={t.date} className="flex flex-col items-center gap-1">
                    <span className="text-xs font-medium">{t.pct}%</span>
                    <div className="w-8 rounded-sm border border-foreground bg-primary" style={{ height: `${Math.max(4, t.pct)}px` }} />
                    <span className="text-xs text-muted-foreground">
                      {new Date(t.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-2 text-xs text-muted-foreground">Percentage of successful runs mentioning you, per check.</p>
          </section>

          {others.length > 0 && (
            <section className="mt-6 rounded-xl border bg-card p-6">
              <h2 className="text-lg">Recommended instead of you</h2>
              <p className="mt-1 text-xs text-muted-foreground">Recommended in these runs but not on your competitor list.</p>
              <ul className="mt-3 space-y-2">
                {others.map((o) => (
                  <li key={o.name} className="flex items-center justify-between text-sm">
                    <span>{o.name} <span className="text-muted-foreground">({o.count}×)</span></span>
                    <Button variant="outline" size="sm" onClick={() => addCompetitor(o.name)}>Add to competitors</Button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {latestFixes && (
            <section className="mt-6 rounded-xl border bg-card p-6 learning-block">
              <h2 className="text-lg">How to get cited</h2>
              <p className="mt-1 text-xs text-muted-foreground"><span className="status-chip status-ai">AI-written</span> from your results. Check it before you use it.</p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
                {((latestFixes.text as { suggestions?: string[] })?.suggestions ?? []).map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {checks.length > 0 && (
        <section className="mt-6 border-t pt-6">
          <h2 className="text-lg">Checks — measured successful runs</h2>
          <ul className="mt-3 space-y-4">
            {checks.map((check) => {
              const runs = (data?.runs ?? []).filter((run) => run.check_id === check.id);
              return (
                <li key={check.id} className="border-b pb-3 text-sm">
                  <p className="font-medium">{new Date(check.started_at).toLocaleString()} — {check.status}</p>
                  <ul className="mt-1 space-y-1 text-muted-foreground">
                    {(check.engines as EngineId[] ?? []).map((engine) => {
                      const engineRuns = runs.filter((run) => run.engine === engine);
                      const succeeded = engineRuns.filter((run) => run.status === "done").length;
                      return <li key={engine}>{ENGINES.find((e) => e.id === engine)?.label ?? engine}: {succeeded} of {engineRuns.length} runs succeeded{!succeeded && check.status !== "running" ? " — No usable answers in this check" : ""}</li>;
                    })}
                  </ul>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="mt-6 rounded-xl border bg-card p-6">
        <h2 className="text-lg">Automatic checks</h2>
        <label className="mt-2 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={data?.schedule?.enabled ?? false}
            onChange={(e) => saveSchedule(e.target.checked, data?.schedule?.per_week ?? 2)}
          />
          Check automatically
        </label>
        {data?.schedule?.enabled && (
          <label className="mt-2 flex items-center gap-2 text-sm">
            Checks per week
            <select
              className="rounded-sm border bg-card px-2 py-1"
              value={data.schedule.per_week}
              onChange={(e) => saveSchedule(true, Number(e.target.value))}
            >
              {[1, 2, 3].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Automatic checks use the same limits and monthly budget as manual ones.
        </p>
      </section>
    </div>
  );
}
