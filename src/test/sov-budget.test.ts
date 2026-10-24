import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), callEngine: vi.fn() }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: mocks.from, rpc: mocks.rpc } }));
vi.mock("@/lib/sov-engines.server", () => ({ callEngine: mocks.callEngine, engineKeyStatus: () => ({}), EngineError: class extends Error {} }));
import { advanceSovCheck } from "@/lib/sov-run.server";

describe("mid-run visibility budget", () => {
  it("stops when loaded actual costs plus other month spend reach the cap", async () => {
    const selected: string[] = [];
    const finished = { id: "run", engine: "openai", question: "q", run_index: 1, status: "failed", cost_usd: 2 };
    mocks.rpc.mockImplementation(async (name: string) => ({ data: name === "sov_month_spend" ? { budget_usd: 20, spent_usd: 19 } : null }));
    mocks.from.mockImplementation((table: string) => {
      let columns = "";
      const query: any = {
        select: (value: string) => { columns = value; if (table === "sov_runs") selected.push(value); return query; },
        eq: () => query, lt: () => query, order: () => query, limit: () => query,
        update: () => query, upsert: () => query,
        maybeSingle: async () => ({ data: table === "sov_checks"
          ? { id: "check", product_id: "product", status: "running", engines: ["openai"], runs_per_question: 2 }
          : { id: "product", name: "Test", url: "test.example", aliases: [] } }),
        then: (resolve: (value: unknown) => unknown) => resolve({ data: table === "sov_questions" ? [{ question: "q" }]
          : table === "sov_runs" ? [{ ...finished, cost_usd: columns.split(",").map((c) => c.trim()).includes("cost_usd") ? 2 : undefined }]
          : [] }),
      };
      return query;
    });
    expect((await advanceSovCheck("check")).status).toBe("stopped");
    expect(selected).toContain("id, engine, question, run_index, status, cost_usd");
    expect(mocks.rpc).toHaveBeenCalledWith("sov_month_spend", { p_exclude_check: "check" });
    expect(mocks.rpc).toHaveBeenCalledWith("finish_sov_check", { check_id: "check", new_status: "stopped", final_cost: 2 });
    expect(mocks.callEngine).not.toHaveBeenCalled();
  });
});