import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import { estimateCheckCost, type EngineId } from "@/lib/engine-prices";

// Scheduled AI search visibility checks. Runs daily; each product with an
// enabled schedule is checked when its per-week cadence is due, under the same
// per-product limits and monthly budget as manual checks.
export const Route = createFileRoute("/api/public/jobs/sov-scheduled")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;

        const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
        const { connectedEngines, executeSovCheck } = await import("@/lib/sov-run.server");

        // Sweep checks left 'running' by an interrupted invocation.
        const staleBefore = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        const { data: stale } = await admin
          .from("sov_checks")
          .select("id")
          .eq("status", "running")
          .lt("started_at", staleBefore);
        for (const check of stale ?? []) {
          await admin.rpc("finish_sov_check", { check_id: check.id, new_status: "failed", final_cost: null });
        }

        const engines = connectedEngines();
        if (!engines.length) return Response.json({ success: true, ran: 0 });

        const { data: schedules } = await admin.from("sov_schedule").select("product_id, per_week").eq("enabled", true);
        let ran = 0;
        for (const schedule of schedules ?? []) {
          const dueSince = new Date(Date.now() - (7 / schedule.per_week) * 24 * 60 * 60 * 1000).toISOString();
          const { count } = await admin
            .from("sov_checks")
            .select("id", { count: "exact", head: true })
            .eq("product_id", schedule.product_id)
            .gte("started_at", dueSince);
          if ((count ?? 0) > 0) continue;

          const { data: product } = await admin
            .from("products")
            .select("id, name, url, aliases")
            .eq("id", schedule.product_id)
            .maybeSingle();
          if (!product) continue;
          const { data: questionRows } = await admin
            .from("sov_questions")
            .select("question")
            .eq("product_id", product.id)
            .eq("active", true)
            .limit(10);
          const questionCount = (questionRows ?? []).length;
          if (!questionCount) continue;

          const runsPerQuestion = 3;
          const estimate = estimateCheckCost(questionCount, runsPerQuestion, engines);
          const reserved = await admin.rpc("reserve_sov_check", {
            pid: product.id,
            p_runs_per_question: runsPerQuestion,
            p_engines: engines,
            p_estimated_cost: estimate,
          });
          if (reserved.error) continue; // limit or budget reached; try again next run
          ran += 1;
          await executeSovCheck(
            reserved.data as string,
            { id: product.id, name: product.name, url: product.url, aliases: (product.aliases as string[]) ?? [] },
            runsPerQuestion,
            engines as EngineId[],
          ).catch(async () => {
            await admin.rpc("finish_sov_check", { check_id: reserved.data as string, new_status: "failed", final_cost: null });
          });
        }
        return Response.json({ success: true, ran });
      },
    },
  },
});
