import { engineById, type EngineId } from "./engine-prices";

// Server-only calls to the three AI engines. Keys come from project secrets and
// never reach the browser. Only the buyer question text is sent — no emails,
// visitor data, or workspace/user identifiers. Error details from providers
// are never stored or shown: only a short code ("HTTP 401", "timeout").

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
    code: string,
  ) {
    super(code); // message is only ever a short code, never a response body
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
  if (!res.ok) throw new EngineError(res.status, `HTTP ${res.status}`);
  const data = (await res.json()) as {
    output?: {
      type?: string;
      content?: { type?: string; text?: string; annotations?: { type?: string; url?: string }[] }[];
    }[];
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  const searchCalls = (data.output ?? []).filter((i) => i.type === "web_search_call").length;
  // Cited websites come from url_citation annotations on the message content.
  const citationUrls = (data.output ?? [])
    .filter((i) => i.type === "message")
    .flatMap((i) => i.content ?? [])
    .flatMap((c) => c.annotations ?? [])
    .filter((a) => a.type === "url_citation")
    .map((a) => a.url);
  return {
    text: (data.output ?? [])
      .filter((item) => item.type === "message")
      .flatMap((item) => item.content ?? [])
      .filter((part) => part.type === "output_text")
      .map((part) => part.text ?? "")
      .join("\n"),
    citedHosts: hostList(citationUrls),
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
  if (!res.ok) throw new EngineError(res.status, `HTTP ${res.status}`);
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
  if (!res.ok) throw new EngineError(res.status, `HTTP ${res.status}`);
  const data = (await res.json()) as {
    content?: { type?: string; text?: string; content?: { type?: string; url?: string }[] }[];
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  const blocks = data.content ?? [];
  const searchCalls = blocks.filter((b) => b.type === "server_tool_use").length;
  // Cited websites come from web_search_tool_result blocks.
  const resultUrls = blocks
    .filter((b) => b.type === "web_search_tool_result")
    .flatMap((b) => (Array.isArray(b.content) ? b.content : []))
    .map((c) => c.url);
  return {
    text: blocks
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("\n"),
    citedHosts: hostList(resultUrls),
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
  if (!price) throw new EngineError(400, "not_connected");
  if (engine === "openai") {
    const key = process.env["OPENAI_API_KEY"];
    if (!key) throw new EngineError(400, "not_connected");
    return callOpenAI(key, price.model, question);
  }
  if (engine === "perplexity") {
    const key = process.env["PERPLEXITY_API_KEY"];
    if (!key) throw new EngineError(400, "not_connected");
    return callPerplexity(key, price.model, question);
  }
  const key = process.env["ANTHROPIC_API_KEY"];
  if (!key) throw new EngineError(400, "not_connected");
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
