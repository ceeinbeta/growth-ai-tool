import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { estimateCheckCost, engineById, type EngineId } from "./engine-prices";
import { sovErrorMessage, engineErrorMessage } from "./sov";

const productInput = (data: unknown) => z.object({ productId: z.string().uuid() }).parse(data);

// Read the product as the caller (RLS) before any privileged work.
async function readOwnProduct(supabase: any, productId: string) {
  const { data, error } = await supabase
    .from("products")
    .select("id, name, url, aliases")
    .eq("id", productId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Product not found.");
  return data as { id: string; name: string; url: string; aliases: string[] };
}

export const getSovEngineStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(productInput)
  .handler(async ({ data, context }) => {
    await readOwnProduct(context.supabase, data.productId);
    const { engineKeyStatus } = await import("./sov-engines.server");
    const keys = engineKeyStatus();
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const { data: budget } = await admin.rpc("sov_budget_info");
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: tests } = await admin
      .from("ai_usage")
      .select("model")
      .eq("feature", "sov-test")
      .gte("created_at", since);
    const testCounts: Record<string, number> = {};
    for (const row of tests ?? []) {
      const engine = String(row.model).split(":")[0] ?? "";
      testCounts[engine] = (testCounts[engine] ?? 0) + 1;
    }
    return {
      engines: (Object.keys(keys) as EngineId[]).map((id) => ({
        id,
        label: engineById(id)!.label,
        connected: keys[id],
        testsToday: testCounts[id] ?? 0,
      })),
      budget: {
        budget_usd: Number((budget as any)?.budget_usd ?? 20),
        spent_usd: Number((budget as any)?.spent_usd ?? 0),
      },
    };
  });

export const testEngineConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ productId: z.string().uuid(), engine: z.enum(["openai", "perplexity", "claude"]) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await readOwnProduct(context.supabase, data.productId);
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await admin
      .from("ai_usage")
      .select("id", { count: "exact", head: true })
      .eq("feature", "sov-test")
      .like("model", `${data.engine}:%`)
      .gte("created_at", since);
    if ((count ?? 0) >= 3) return { ok: false, error: "You can test each engine 3 times a day. Try again tomorrow." };
    const { callEngine } = await import("./sov-engines.server");
    const { EngineError } = await import("./sov-engines.server");
    const price = engineById(data.engine)!;
    try {
      await callEngine(data.engine, "What is the capital of France?");
      await admin.from("ai_usage").insert({
        product_id: data.productId,
        feature: "sov-test",
        model: `${data.engine}:${price.model}`,
        input_tokens: null,
        output_tokens: null,
        cost_usd: null,
      });
      return { ok: true, error: null };
    } catch (error) {
      await admin.from("ai_usage").insert({
        product_id: data.productId,
        feature: "sov-test",
        model: `${data.engine}:${price.model}`,
        input_tokens: null,
        output_tokens: null,
        cost_usd: null,
      });
      if (error instanceof EngineError) return { ok: false, error: engineErrorMessage(error.status, error.message) };
      return { ok: false, error: "The connection test failed. Try again later." };
    }
  });

export const startSovCheck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        productId: z.string().uuid(),
        runsPerQuestion: z.number().int().min(1).max(5),
        engines: z.array(z.enum(["openai", "perplexity", "claude"])).min(1),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const product = await readOwnProduct(context.supabase, data.productId);
    const { data: questionRows, error: qError } = await context.supabase
      .from("sov_questions")
      .select("question")
      .eq("product_id", data.productId)
      .eq("active", true)
      .order("created_at")
      .limit(10);
    if (qError) throw qError;
    const questions = (questionRows ?? []).map((q) => q.question as string);
    if (!questions.length) return { ok: false, error: "Add the questions buyers ask on your product profile first." };

    const estimate = estimateCheckCost(questions.length, data.runsPerQuestion, data.engines);
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const { data: budget } = await admin.rpc("sov_budget_info");
    const reserved = await admin.rpc("reserve_sov_check", {
      pid: data.productId,
      p_runs_per_question: data.runsPerQuestion,
      p_engines: data.engines,
      p_estimated_cost: estimate,
    });
    if (reserved.error) {
      return { ok: false, error: sovErrorMessage(reserved.error.message, Number((budget as any)?.budget_usd ?? 20)) };
    }
    const checkId = reserved.data as string;
    const { executeSovCheck } = await import("./sov-run.server");
    // The page polls for status; run the check to completion here.
    void executeSovCheck(checkId, { id: product.id, name: product.name, url: product.url, aliases: product.aliases ?? [] }, data.runsPerQuestion, data.engines).catch(
      async () => {
        await admin.rpc("finish_sov_check", { check_id: checkId, new_status: "failed", final_cost: null as unknown as number });
      },
    );
    return { ok: true, checkId, error: null };
  });

export const setSovSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({ productId: z.string().uuid(), enabled: z.boolean(), perWeek: z.number().int().min(1).max(3) })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await readOwnProduct(context.supabase, data.productId);
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const { error } = await admin.from("sov_schedule").upsert({
      product_id: data.productId,
      enabled: data.enabled,
      per_week: data.perWeek,
      updated_at: new Date().toISOString(),
    });
    if (error) return { ok: false, error: "We couldn't save the schedule. Please try again." };
    return { ok: true, error: null };
  });
