import { afterEach, describe, expect, it, vi } from "vitest";
import { callEngine } from "@/lib/sov-engines.server";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("raw OpenAI Responses answers", () => {
  it("reads message output_text parts without an SDK convenience field and extracts citation hosts", async () => {
    vi.stubEnv("OPENAI_API_KEY", "mock-only");
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      output: [
        { type: "web_search_call", id: "search", status: "completed" },
        { type: "message", role: "assistant", content: [
          { type: "output_text", text: "Try Example Tool.", annotations: [{ type: "url_citation", url: "https://www.example.com/tools?source=search" }] },
          { type: "output_text", text: "Another recommendation.", annotations: [{ type: "url_citation", url: "https://docs.example.org/guide" }] },
          { type: "other", text: "Ignore this" },
        ] },
      ], usage: { input_tokens: 19542, output_tokens: 1189 },
    })));
    vi.stubGlobal("fetch", request);
    const answer = await callEngine("openai", "Which tools should I use?");
    expect(answer.text).toBe("Try Example Tool.\nAnother recommendation.");
    expect(answer.citedHosts).toEqual(["example.com", "docs.example.org"]);
    expect(answer.inputTokens).toBe(19542);
    expect(answer.outputTokens).toBe(1189);
    expect(answer.searchCalls).toBe(1);
    expect(request).toHaveBeenCalledTimes(1);
  });
});