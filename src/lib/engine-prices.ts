// Engine models and prices for AI search visibility checks.
// Last checked: 2026-10-24 against the official pricing pages named below.
// All costs shown in the app are ESTIMATES computed from these numbers.

export type EngineId = "openai" | "perplexity" | "claude";

export type EnginePrice = {
  id: EngineId;
  label: string;
  model: string;
  // USD per 1M tokens.
  inputPerMillion: number;
  outputPerMillion: number;
  // USD per 1,000 web search calls/requests.
  searchPerThousand: number;
  source: string;
};

export const ENGINES: EnginePrice[] = [
  {
    id: "openai",
    label: "OpenAI",
    // gpt-5.6-luna: current low-cost OpenAI model that supports the Responses API
    // web search tool (gpt-5-mini is deprecated).
    model: "gpt-5.6-luna",
    inputPerMillion: 0.1,
    outputPerMillion: 0.5,
    // Official pricing page: https://developers.openai.com/api/docs/pricing
    // Web search on reasoning models: $10 per 1,000 calls, plus search content tokens.
    searchPerThousand: 10,
    source: "https://developers.openai.com/api/docs/pricing",
  },
  {
    id: "perplexity",
    label: "Perplexity",
    model: "sonar",
    inputPerMillion: 1,
    outputPerMillion: 1,
    // Official pricing page: https://docs.perplexity.ai/docs/getting-started/pricing
    // Request fee is $5/$8/$12 per 1,000 requests by search context size
    // (low/medium/high). We use the conservative top end until verified.
    searchPerThousand: 12,
    source: "https://docs.perplexity.ai/docs/getting-started/pricing",
  },
  {
    id: "claude",
    label: "Claude",
    // claude-haiku-5-5 exists and is the current low-cost Claude model.
    model: "claude-haiku-5-5",
    // Official pricing page: https://platform.claude.com/docs/en/about-claude/pricing
    // Haiku 5.5 is listed as "from $0.10 / $0.50" per MTok.
    inputPerMillion: 0.1,
    outputPerMillion: 0.5,
    // Anthropic docs: web search is $10 per 1,000 searches.
    searchPerThousand: 10,
    source: "https://platform.claude.com/docs/en/about-claude/pricing",
  },
];

export const engineById = (id: string) => ENGINES.find((e) => e.id === id);

// Assumed per-run shape for estimates: one web search per run plus a short answer.
const EST_INPUT_TOKENS = 2000;
const EST_OUTPUT_TOKENS = 800;

export function estimateRunCost(engine: EnginePrice): number {
  return (
    (EST_INPUT_TOKENS * engine.inputPerMillion) / 1_000_000 +
    (EST_OUTPUT_TOKENS * engine.outputPerMillion) / 1_000_000 +
    engine.searchPerThousand / 1_000
  );
}

// Estimated cost of one check: questions x runs per question x connected engines.
export function estimateCheckCost(questionCount: number, runsPerQuestion: number, engineIds: string[]): number {
  const perRun = engineIds.reduce((sum, id) => {
    const engine = engineById(id);
    return engine ? sum + estimateRunCost(engine) : sum;
  }, 0);
  return questionCount * runsPerQuestion * perRun;
}

// Actual cost of one recorded run from real usage numbers.
export function runCost(engine: EnginePrice, inputTokens: number | null, outputTokens: number | null, searchCalls: number | null): number {
  return (
    ((inputTokens ?? 0) * engine.inputPerMillion) / 1_000_000 +
    ((outputTokens ?? 0) * engine.outputPerMillion) / 1_000_000 +
    ((searchCalls ?? 1) * engine.searchPerThousand) / 1_000
  );
}

export const usd = (n: number) => (n < 0.01 ? `<$0.01` : `$${n.toFixed(2)}`);
