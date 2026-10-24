import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usableSovRuns, youPercent, type SovMentionRow, type SovRunRow } from "@/lib/sov";

export const overviewQuery = (productId: string) => queryOptions({
  queryKey: ["overview", productId],
  refetchInterval: 30000,
  queryFn: async () => {
    const [events, latest, visitors, audit, check] = await Promise.all([
      supabase.from("events").select("id", { count: "exact", head: true }).eq("product_id", productId),
      supabase.from("events").select("created_at").eq("product_id", productId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.rpc("unique_visitors", { pid: productId, days: 30 }),
      supabase.from("audits").select("id, created_at").eq("product_id", productId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("sov_checks").select("id, started_at").eq("product_id", productId).in("status", ["done", "stopped"]).order("started_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    for (const r of [events, latest, visitors, audit, check]) if (r.error) throw r.error;
    let lastCheck: { date: string; usableRuns: number; pct: number } | null = null;
    if (check.data) {
      const runs = await supabase.from("sov_runs").select("id, engine, question, status, answer_excerpt").eq("check_id", check.data.id);
      if (runs.error) throw runs.error;
      const usable = usableSovRuns(runs.data ?? []).filter(r => r.status === "done");
      const ids = usable.map(r => r.id);
      const mentions = ids.length ? await supabase.from("sov_mentions").select("run_id, name, rank, kind").in("run_id", ids) : { data: [], error: null };
      if (mentions.error) throw mentions.error;
      lastCheck = { date: check.data.started_at, usableRuns: usable.length, pct: usable.length ? youPercent(usable as SovRunRow[], (mentions.data ?? []) as SovMentionRow[]) : 0 };
    }
    return { eventCount: events.count ?? 0, lastEventAt: latest.data?.created_at ?? null, visitors30d: Number(visitors.data ?? 0), audit: audit.data, lastCheck };
  },
});
