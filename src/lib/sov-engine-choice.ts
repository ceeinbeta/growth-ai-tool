import { ENGINES, type EngineId } from "./engine-prices";

export const engineChoiceKey = (productId: string) => `growloop:sov-engines:${productId}`;

export function readEngineChoice(saved: string | null): EngineId[] | null {
  if (saved === null) return null;
  try {
    const value: unknown = JSON.parse(saved);
    if (!Array.isArray(value) || !value.every((id) => ENGINES.some((e) => e.id === id))) return null;
    return [...new Set(value)] as EngineId[];
  } catch {
    return null;
  }
}

export function validateEngineChoice(chosen: EngineId[], connected: EngineId[]): string | null {
  if (!chosen.length) return "Choose at least one connected engine.";
  if (new Set(chosen).size !== chosen.length) return "Choose each engine only once.";
  if (chosen.some((id) => !connected.includes(id))) return "An engine is no longer connected. Choose connected engines and try again.";
  return null;
}

export function engineFailedAllRuns(engine: EngineId, runs: { engine: string; status: string }[]): boolean {
  const matching = runs.filter((run) => run.engine === engine);
  return matching.length > 0 && matching.every((run) => run.status === "failed");
}