import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { youPercent, type SovRunRow, type SovMentionRow } from "@/lib/sov";

// One measured line on Overview: mention share from the latest finished check.
export function SovLine({ productId }: { productId: string }) {
  const { data } = useQuery({
    queryKey: ["sov-line", productId],
    queryFn: async () => {
      const { data: check } = await supabase
        .from("sov_checks")
        .select("id, started_at")
        .eq("product_id", productId)
        .in("status", ["done", "stopped"])
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!check) return null;
      const { data: runs } = await supabase.from("sov_runs").select("id, engine, question, status").eq("check_id", check.id);
      const runIds = (runs ?? []).map((r) => r.id);
      const { data: mentions } = runIds.length
        ? await supabase.from("sov_mentions").select("run_id, name, rank, kind").in("run_id", runIds)
        : { data: [] };
      return {
        pct: youPercent((runs ?? []) as SovRunRow[], (mentions ?? []) as SovMentionRow[]),
        date: check.started_at,
      };
    },
  });
  if (!data) return null;
  return (
    <p className="mt-4 text-sm">
      <Link to="/ai-search-visibility" className="font-medium text-primary hover:underline">
        AI search visibility: mentioned in {data.pct}% of runs on{" "}
        {new Date(data.date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
      </Link>
    </p>
  );
}
