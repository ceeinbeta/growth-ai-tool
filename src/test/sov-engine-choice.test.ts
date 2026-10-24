import { describe, expect, it } from "vitest";
import { engineChoiceKey, readEngineChoice, validateEngineChoice, engineFailedAllRuns, defaultEngineChoice } from "@/lib/sov-engine-choice";

describe("visibility engine choices", () => {
  it("defaults failed engines off even if remembered, keeping healthy preferences", () => {
    expect(defaultEngineChoice(["openai", "claude", "perplexity"], null, ["perplexity"])).toEqual(["openai", "claude"]);
    expect(defaultEngineChoice(["openai", "claude"], ["openai", "claude"], ["openai"])).toEqual(["claude"]);
    expect(defaultEngineChoice(["openai", "claude"], ["claude"], [])).toEqual(["claude"]);
  });
  it("defaults to all engines only when no valid preference exists", () => {
    expect(readEngineChoice(null)).toBeNull();
    expect(readEngineChoice('[]')).toEqual([]);
    expect(readEngineChoice('["claude"]')).toEqual(["claude"]);
    expect(readEngineChoice('["unknown"]')).toBeNull();
    expect(engineChoiceKey("one")).not.toBe(engineChoiceKey("two"));
  });
  it("rejects empty, duplicate and disconnected engine choices", () => {
    expect(validateEngineChoice([], ["openai"])).not.toBeNull();
    expect(validateEngineChoice(["openai", "openai"], ["openai"])).not.toBeNull();
    expect(validateEngineChoice(["claude"], ["openai"])).not.toBeNull();
    expect(validateEngineChoice(["openai"], ["openai", "claude"])).toBeNull();
  });
  it("flags only an engine with at least one run and all runs failed", () => {
    expect(engineFailedAllRuns("claude", [])).toBe(false);
    expect(engineFailedAllRuns("claude", [{ engine: "claude", status: "failed" }])).toBe(true);
    expect(engineFailedAllRuns("claude", [{ engine: "claude", status: "failed" }, { engine: "claude", status: "done" }])).toBe(false);
    expect(engineFailedAllRuns("claude", [{ engine: "claude", status: "pending" }])).toBe(false);
  });
});