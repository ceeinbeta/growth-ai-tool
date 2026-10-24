import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

// Hourly job for AI search visibility checks:
// 1. Advance every 'running' check in small batches within the time budget
//    (covers scheduled checks and stale manual ones — a check can never be
//    stranded, because advancing is resumable and idempotent).
// 2. Sweep checks with no new run row for 15 minutes: finalize 'stopped' when
//    some runs finished, otherwise 'failed'.
// 3. Start due opt-in scheduled checks (same limits and budget as manual ones).
// Does nothing when no schedule is enabled and no check is running.

const JOB_TIME_BUDGET_MS = 40_000;
const SOV_MAX_CHECKS_PER_WEEK = 10;

function nextDueAt(lastStartedAt: string | null, perWeek: number): Date | null {
  const intervalMs = (7 * 24 * 60 * 60 * 1000) / perWeek;
  if (!lastStartedAt) return new Date(); // never checked: due now
  return new Date(new Date(lastStartedAt).getTime() + intervalMs);
}

export const Route = createFileRoute("/api/public/jobs/sov-scheduled")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;

        const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
        const started = Date.now();
        const timeLeft = () => started + JOB_TIME_BUDGET_MS - Date.now();

        // 1 + 2. Advance running checks in batches, then sweep stale ones.
        let advanced = 0;
        try {
          const { advanceSovCheck, sweepStaleSovChecks } = await import("@/lib/sov-run.server");
          const { data: running } = await admin.from("sov_checks").select("id").eq("status", "running");
          for (const check of running ?? []) {
            while (timeLeft() > 8_000) {
              const progress = await advanceSovCheck(check.id);
              if (progress.status !== "running") break;
            }
            advanced += 1;
          }
          await sweepStaleSovChecks(admin);
        } catch (error) {
          console.error("sov-scheduled advance failed", error instanceof Error ? error.message : "unknown");
        }

        // 3. Start due scheduled checks.
        const { data: schedules } = await admin.from("sov_schedule").select("product_id, per_week").eq("enabled", true);
        let startedChecks = 0;
        if (schedules?.length && timeLeft() > 10_000) {
          const { connectedEngines } = await import("@/lib/sov-run.server");
          const engines = connectedEngines();
          if (engines.length) {
            const { estimateCheckCost } = await import("@/lib/engine-prices");
            for (const schedule of schedules) {
              if (timeLeft() < 8_000) break;
              const { data: product } = await admin
                .from("products")
                .select("id, name, url, aliases")
                .eq("id", schedule.product_id)
                .maybeSingle();
              if (!product) continue;

              const { data: lastCheck } = await admin
                .from("sov_checks")
                .select("started_at")
                .eq("product_id", schedule.product_id)
                .order("started_at", { ascending: false })
                .limit(1)
                .maybeSingle();
              const due = nextDueAt(lastCheck?.started_at ?? null, schedule.per_week);
              if (!due || due > new Date()) continue;

              const { data: questionRows } = await admin
                .from("sov_questions")
                .select("question")
                .eq("product_id", schedule.product_id)
                .eq("active", true)
                .order("created_at")
                .limit(10);
              const questions = (questionRows ?? []).map((q) => q.question as string);
              if (!questions.length) continue;

              const runsPerQuestion = 3;
              const estimate = estimateCheckCost(questions.length, runsPerQuestion, engines);
              const reserved = await admin.rpc("reserve_sov_check", {
                pid: schedule.product_id,
                p_runs_per_question: runsPerQuestion,
                p_engines: engines,
                p_estimated_cost: estimate,
              });
              if (reserved.error) {
                // Not due per the database limits (hourly/weekly/budget) — skip quietly.
                continue;
              }
              startedChecks += 1;
              // Advance the first batch now; the next hourly run continues.
              try {
                const { advanceSovCheck } = await import("@/lib/sov-run.server");
                await advanceSovCheck(reserved.data as string);
              } catch (error) {
                console.error("sov-scheduled first advance failed", error instanceof Error ? error.message : "unknown");
              }
            }
          }
        }

        return Response.json({ success: true, advanced, started: startedChecks, limits: { perWeek: SOV_MAX_CHECKS_PER_WEEK } });
      },
    },
  },
});
