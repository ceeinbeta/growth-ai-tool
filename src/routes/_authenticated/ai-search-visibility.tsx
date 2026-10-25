import { ActionRow } from '@/components/ActionRow';
import { PageShell } from '@/components/PageLayout';
import { PageSkeleton } from '@/components/States';
import { VisibilityResults } from '@/components/VisibilityResults';
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveProduct } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { engineChoiceKey, readEngineChoice, engineFailedAllRuns, defaultEngineChoice } from "@/lib/sov-engine-choice";
import { estimateCheckCost, usd, ENGINES, type EngineId } from "@/lib/engine-prices";
import { usableSovRuns } from "@/lib/sov";
import { getSovEngineStatus, testEngineConnection, startSovCheck, advanceSovCheckFn, setSovSchedule } from "@/lib/sov.functions";

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
      const runs = await supabase.from("sov_runs").select("id, check_id, engine, question, status, answer_excerpt, error, cited_hosts, cost_usd").in("check_id", checkIds);
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

  const [runsPerQuestion, setRunsPerQuestion] = useState(3);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean | null; text: string }>>({});
  const [engineChoice, setEngineChoice] = useState<EngineId[] | null>(null);
  const [progress, setProgress] = useState<{ finished: number; total: number } | null>(null);

  const checks = data?.checks ?? [];
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

  if (!data || !engineStatus) return <PageSkeleton variant="visibility" />;

  return (
    <PageShell>
      <header><h1 className="text-3xl font-extrabold">AI search visibility</h1></header>
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

      <VisibilityResults
        productName={productName} checks={checks} runs={data?.runs ?? []} mentions={data?.mentions ?? []}
        fixes={data?.fixes ?? []} budget={budget} onAddCompetitor={addCompetitor}
        action={running ? <Button disabled>{progress ? `${progress.finished} of ${progress.total} runs finished` : "Check running…"}</Button> : <Button variant={confirming ? "outline" : "default"} onClick={openConfirmation} disabled={!connected.length || !questions.length}>Run a check</Button>}
        connections={
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {(engineStatus?.engines ?? ENGINES.map((e) => ({ id: e.id, label: e.label, connected: false, testsToday: 0 }))).map((e) => (
          <div key={e.id} className="flex min-w-0 flex-wrap items-center gap-2 rounded-lg border bg-card p-3 text-xs">
            <span className="font-semibold">{e.label}</span>
            <span className={e.connected ? "text-foreground" : "text-muted-foreground"}>{e.connected ? "Connected" : "Not connected"}</span>
            {testResults[e.id] && <div><span className="break-words text-muted-foreground">{testResults[e.id]?.text}</span></div>}
            {e.connected && (
              <Button variant="link" className="justify-self-start" size="sm" disabled={testResults[e.id]?.ok === null} onClick={() => runTest(e.id as EngineId)}>
                Test connection
              </Button>
            )}
          </div>
        ))}
      </div>}
        settings={<>
      <section className="mt-4 border-t pt-3">
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
        </>}
      />
    </PageShell>
  );
}
