import { afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), callEngine: vi.fn(), streamText: vi.fn() }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: mocks.from, rpc: mocks.rpc } }));
vi.mock("@/lib/sov-engines.server", () => ({ callEngine: mocks.callEngine, engineKeyStatus: () => ({}), EngineError: class extends Error {} }));
vi.mock("ai", () => ({ Output: {}, streamText: mocks.streamText }));
import { advanceSovCheck } from "@/lib/sov-run.server";
import { shareOfVoice, youPercent } from "@/lib/sov";

afterEach(() => vi.clearAllMocks());
describe("empty engine answers", () => {
  it.each(["openai", "claude", "perplexity"])("fails %s while retaining spent tokens and cost without an AI reading call", async (engine) => {
    let run: any = null;
    const usage: unknown[] = [];
    mocks.callEngine.mockResolvedValue({ text: " \n ", citedHosts: [], inputTokens: 1000, outputTokens: 100, searchCalls: 1 });
    mocks.rpc.mockImplementation(async (name: string) => ({ data: name === "sov_month_spend" ? { budget_usd: 20, spent_usd: 0 } : null }));
    mocks.from.mockImplementation((table: string) => {
      const query: any = {
        select: () => query, eq: () => query, lt: () => query, order: () => query, limit: () => query,
        update: (value: any) => { if (run && table === "sov_runs" && value.cost_usd !== undefined) run = { ...run, ...value }; return query; },
        upsert: (value: any) => { run = { id: "run", ...value }; return query; },
        insert: (value: any) => { if (table === "ai_usage") usage.push(value); return query; },
        maybeSingle: async () => ({ data: table === "sov_checks"
          ? { id: "check", product_id: "product", status: "running", engines: [engine], runs_per_question: 1 }
          : { id: "product", name: "Test", url: "test.example", aliases: [] } }),
        then: (resolve: (value: unknown) => unknown) => resolve({ data: table === "sov_questions" ? [{ question: "q" }] : table === "sov_runs" && run ? [run] : [] }),
      }; return query;
    });
    const result = await advanceSovCheck("check");
    expect(result.status).toBe("failed");
    expect(run).toMatchObject({ status: "failed", error: "empty answer — The engine returned no answer text.", input_tokens: 1000, output_tokens: 100, search_calls: 1 });
    expect(run.cost_usd).toBeGreaterThan(0);
    expect(usage).toEqual([expect.objectContaining({ feature: "sov-run", cost_usd: run.cost_usd, input_tokens: 1000, output_tokens: 100 })]);
    expect(mocks.rpc).toHaveBeenCalledWith("finish_sov_check", { check_id: "check", new_status: "failed", final_cost: run.cost_usd });
    expect(mocks.streamText).not.toHaveBeenCalled();
    expect(shareOfVoice([run], [{ run_id: "run", name: "Test", kind: "you", rank: 1 }])).toEqual([]);
    expect(youPercent([run], [{ run_id: "run", name: "Test", kind: "you", rank: 1 }])).toBe(0);
  });
});