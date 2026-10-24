import { describe, expect, it } from "vitest";
import { ENGINES, engineById, estimateCheckCost, estimateRunCost, runCost, usd } from "@/lib/engine-prices";
import {
  classifyMention,
  extractionSchema,
  fixesSchema,
  normalizeName,
  questionStats,
  shareOfVoice,
  sovErrorMessage,
  engineErrorMessage,
  youPercent,
  type SovRunRow,
  type SovMentionRow,
} from "@/lib/sov";

describe("engine prices", () => {
  it("defines the three engines with models and sources", () => {
    expect(ENGINES.map((e) => e.id)).toEqual(["openai", "perplexity", "claude"]);
    for (const e of ENGINES) {
      expect(e.model.length).toBeGreaterThan(0);
      expect(e.source).toMatch(/^https:\/\//);
      expect(e.inputPerMillion).toBeGreaterThan(0);
      expect(e.searchPerThousand).toBeGreaterThan(0);
    }
    expect(engineById("claude")?.model).toBe("claude-haiku-5-5");
    expect(engineById("perplexity")?.model).toBe("sonar");
  });

  it("estimates a run as tokens plus one search call", () => {
    const sonar = engineById("perplexity")!;
    // 2000 in + 800 out at $1/1M + $12/1k request = 0.002 + 0.0008 + 0.012
    expect(estimateRunCost(sonar)).toBeCloseTo(0.0148, 6);
  });

  it("estimates a check as questions x runs x engines", () => {
    const perRun = ENGINES.reduce((s, e) => s + estimateRunCost(e), 0);
    expect(estimateCheckCost(5, 3, ["openai", "perplexity", "claude"])).toBeCloseTo(15 * perRun, 6);
    expect(estimateCheckCost(5, 3, ["perplexity"])).toBeCloseTo(15 * estimateRunCost(engineById("perplexity")!), 6);
  });

  it("computes real run cost from usage numbers", () => {
    const openai = engineById("openai")!;
    expect(runCost(openai, 1_000_000, 1_000_000, 1)).toBeCloseTo(0.1 + 0.5 + 0.01, 6);
    expect(runCost(openai, null, null, null)).toBeCloseTo(0.01, 6);
  });

  it("formats tiny costs as <$0.01", () => {
    expect(usd(0.004)).toBe("<$0.01");
    expect(usd(1.2)).toBe("$1.20");
  });
});

describe("name matching", () => {
  const product = { name: "PDFeye", url: "pdfeye.net" };

  it("normalizes case, punctuation and suffixes", () => {
    expect(normalizeName("PDFeye, Inc.")).toBe("pdfeye");
    expect(normalizeName("https://www.PdfEye.net/")).toBe("pdfeye net");
    expect(normalizeName("The Example App")).toBe("example");
  });

  it("matches the product by name, host and alias", () => {
    expect(classifyMention("PDFeye", product, [], [])).toBe("you");
    expect(classifyMention("pdfeye.net", product, [], [])).toBe("you");
    expect(classifyMention("PDF Eye", product, ["PDF Eye"], [])).toBe("you");
  });

  it("matches saved competitors and treats the rest as other", () => {
    expect(classifyMention("Smallpdf", product, [], ["Smallpdf"])).toBe("competitor");
    expect(classifyMention("Small PDF", product, [], ["Smallpdf"])).toBe("competitor");
    expect(classifyMention("Adobe Acrobat", product, [], ["Smallpdf"])).toBe("other");
  });
});

describe("extraction schema", () => {
  it("accepts an ordered list of up to 10 names", () => {
    expect(extractionSchema.safeParse({ names: ["A", "B"] }).success).toBe(true);
    expect(extractionSchema.safeParse({ names: [] }).success).toBe(true);
  });

  it("rejects more than 10 names and empty names", () => {
    expect(extractionSchema.safeParse({ names: Array(11).fill("x") }).success).toBe(false);
    expect(extractionSchema.safeParse({ names: [""] }).success).toBe(false);
    expect(extractionSchema.safeParse({ names: "A" }).success).toBe(false);
  });

  it("requires exactly 3 fix suggestions", () => {
    expect(fixesSchema.safeParse({ suggestions: ["a", "b", "c"] }).success).toBe(true);
    expect(fixesSchema.safeParse({ suggestions: ["a", "b"] }).success).toBe(false);
  });
});

const run = (id: string, engine: string, question: string, status: "done" | "failed" = "done"): SovRunRow => ({
  id,
  engine,
  question,
  status,
});
const mention = (run_id: string, name: string, rank: number, kind: SovMentionRow["kind"]): SovMentionRow => ({
  run_id,
  name,
  rank,
  kind,
});

describe("share of voice math", () => {
  it("computes percentages over successful runs only", () => {
    const runs = [run("r1", "openai", "q"), run("r2", "openai", "q"), run("r3", "openai", "q"), run("r4", "openai", "q", "failed")];
    const mentions = [
      mention("r1", "PDFeye", 1, "you"),
      mention("r2", "PDFeye", 2, "you"),
      mention("r1", "Smallpdf", 2, "competitor"),
      mention("r4", "Ghost", 1, "other"), // failed run: excluded
    ];
    const share = shareOfVoice(runs, mentions);
    const you = share.find((s) => s.kind === "you")!;
    expect(you.pct).toBe(67); // 2 of 3 successful runs
    expect(you.runs).toBe(3);
    expect(share.find((s) => s.name === "Ghost")).toBeUndefined();
  });

  it("filters by engine", () => {
    const runs = [run("r1", "openai", "q"), run("r2", "claude", "q")];
    const mentions = [mention("r1", "PDFeye", 1, "you"), mention("r2", "PDFeye", 1, "you")];
    const share = shareOfVoice(runs, mentions, "claude");
    expect(share.find((s) => s.kind === "you")!.pct).toBe(100);
    expect(share.find((s) => s.kind === "you")!.runs).toBe(1);
  });

  it("computes per-question mention counts and average rank", () => {
    const runs = [run("r1", "openai", "best pdf tool?"), run("r2", "openai", "best pdf tool?"), run("r3", "claude", "best pdf tool?")];
    const mentions = [mention("r1", "PDFeye", 1, "you"), mention("r2", "PDFeye", 3, "you")];
    const stats = questionStats(runs, mentions);
    expect(stats).toHaveLength(1);
    const openai = stats[0]!.engines.find((e) => e.engine === "openai")!;
    expect(openai.mentioned).toBe(2);
    expect(openai.total).toBe(2);
    expect(openai.avgRank).toBeCloseTo(2);
    const claude = stats[0]!.engines.find((e) => e.engine === "claude")!;
    expect(claude.mentioned).toBe(0);
    expect(claude.avgRank).toBeNull();
  });

  it("computes the trend percentage with failed runs excluded", () => {
    const runs = [run("r1", "openai", "q"), run("r2", "openai", "q", "failed")];
    expect(youPercent(runs, [mention("r1", "PDFeye", 1, "you")])).toBe(100);
    expect(youPercent([], [])).toBe(0);
  });
});

describe("error copy", () => {
  it("explains the budget stop with the budget amount", () => {
    expect(sovErrorMessage("sov_budget_exceeded", 20)).toBe(
      "This check would go over your monthly budget of $20. Raise the budget in Admin or run fewer questions.",
    );
  });

  it("maps engine failures to plain messages without key material", () => {
    expect(engineErrorMessage(401, "invalid api key sk-abc")).toContain("Check it in Project Settings");
    expect(engineErrorMessage(401, "invalid api key sk-abc")).not.toContain("sk-abc");
    expect(engineErrorMessage(429, "")).toContain("Rate limited");
    expect(engineErrorMessage(402, "insufficient_quota")).toContain("out of credit");
  });
});
