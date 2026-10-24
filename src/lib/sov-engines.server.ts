import { engineById, type EngineId } from "./engine-prices";

// Server-only calls to the three AI engines. Keys come from project secrets and
// never reach the browser. Only the buyer question text is sent — no emails,
// visitor data, or workspace/user identifiers.

export type EngineAnswer = {
  text: string;
  citedHosts: string[];
  inputTokens: number | null;
  outputTokens: number | null;
  searchCalls: number | null;
};

export class EngineError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const TIMEOUT_MS = 30_000;
const SYSTEM = "Answer the user's question.";

const hostList = (urls: unknown): string[] => {
  if (!Array.isArray(urls)) return [];
  const hosts = new Set<string>();
  for (const u of urls) {
    if (typeof u !== "string") continue;
    try {
      hosts.add(new URL(u).hostname.replace(/^www\./, ""));
    } catch {
      // skip unparseable citation
    }
  }
  return [...hosts].slice(0, 20);
};

async function callOpenAI(key: string, model: string, question: string): Promise<EngineAnswer> {
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      instructions: SYSTEM,
      input: question,
      tools: [{ type: "web_search" }],
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new EngineError(res.status, await res.text().catch(() => ""));
  const data = (await res.json()) as {
    output_text?: string;
    output?: { type?: string }[];
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  const searchCalls = (data.output ?? []).filter((i) => i.type === "web_search_call").length;
  return {
    text: data.output_text ?? "",
    citedHosts: [],
    inputTokens: data.usage?.input_tokens ?? null,
    outputTokens: data.usage?.output_tokens ?? null,
    searchCalls: searchCalls || null,
  };
}

async function callPerplexity(key: string, model: string, question: string): Promise<EngineAnswer> {
  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: question },
      ],
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new EngineError(res.status, await res.text().catch(() => ""));
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    citations?: string[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  return {
    text: data.choices?.[0]?.message?.content ?? "",
    citedHosts: hostList(data.citations),
    inputTokens: data.usage?.prompt_tokens ?? null,
    outputTokens: data.usage?.completion_tokens ?? null,
    searchCalls: 1,
  };
}

async function callClaude(key: string, model: string, question: string): Promise<EngineAnswer> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1500,
      system: SYSTEM,
      messages: [{ role: "user", content: question }],
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 1 }],
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new EngineError(res.status, await res.text().catch(() => ""));
  const data = (await res.json()) as {
    content?: { type?: string; text?: string }[];
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  const blocks = data.content ?? [];
  const searchCalls = blocks.filter((b) => b.type === "server_tool_use").length;
  return {
    text: blocks
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("\n"),
    citedHosts: [],
    inputTokens: data.usage?.input_tokens ?? null,
    outputTokens: data.usage?.output_tokens ?? null,
    searchCalls: searchCalls || null,
  };
}

export function engineKeyStatus(): Record<EngineId, boolean> {
  return {
    openai: Boolean(process.env["OPENAI_API_KEY"]),
    perplexity: Boolean(process.env["PERPLEXITY_API_KEY"]),
    claude: Boolean(process.env["ANTHROPIC_API_KEY"]),
  };
}

async function callEngineOnce(engine: EngineId, question: string): Promise<EngineAnswer> {
  const price = engineById(engine);
  if (!price) throw new EngineError(400, "unknown engine");
  if (engine === "openai") {
    const key = process.env["OPENAI_API_KEY"];
    if (!key) throw new EngineError(400, "not connected");
    return callOpenAI(key, price.model, question);
  }
  if (engine === "perplexity") {
    const key = process.env["PERPLEXITY_API_KEY"];
    if (!key) throw new EngineError(400, "not connected");
    return callPerplexity(key, price.model, question);
  }
  const key = process.env["ANTHROPIC_API_KEY"];
  if (!key) throw new EngineError(400, "not connected");
  return callClaude(key, price.model, question);
}

// One retry on timeout or 5xx; never retry 4xx.
export async function callEngine(engine: EngineId, question: string): Promise<EngineAnswer> {
  let last: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await callEngineOnce(engine, question);
    } catch (error) {
      last = error;
      const retryable =
        (error instanceof EngineError && error.status >= 500) ||
        (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError"));
      if (!retryable || attempt === 1) throw error;
    }
  }
  throw last;
}
