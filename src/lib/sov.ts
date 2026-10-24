import { z } from "zod";

// Shared AI search visibility logic: name matching, extraction schema, share math.

export const extractionSchema = z.object({
  names: z.array(z.string().trim().min(1).max(120)).max(10),
});
export type Extraction = z.infer<typeof extractionSchema>;

export const fixesSchema = z.object({
  suggestions: z.array(z.string().trim().min(1).max(500)).length(3),
});

// Normalize a product or company name for comparison: lowercase, strip
// punctuation, common suffixes and TLDs.
export function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/https?:\/\//g, " ")
    .replace(/\b(inc|llc|ltd|gmbh|app|the|www)\b/g, " ")
    .replace(/\.(com|io|co|net|org|app|dev|ai|so|sh)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export const hostOf = (url: string) => url.replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#]/)[0] ?? "";

function matchesName(mention: string, candidate: string): boolean {
  const m = normalizeName(mention);
  const c = normalizeName(candidate);
  if (!m || !c) return false;
  if (m === c || m.includes(c) || c.includes(m)) return true;
  // Ignore spacing: "Small PDF" matches "Smallpdf".
  const mFlat = m.replace(/\s+/g, "");
  const cFlat = c.replace(/\s+/g, "");
  return mFlat === cFlat || mFlat.includes(cFlat) || cFlat.includes(mFlat);
}

export type MentionKind = "you" | "competitor" | "other";

// Classify one extracted name against the product, its aliases and competitors.
export function classifyMention(
  mention: string,
  product: { name: string; url: string },
  aliases: string[],
  competitors: string[],
): MentionKind {
  const yours = [product.name, hostOf(product.url), ...aliases];
  if (yours.some((c) => matchesName(mention, c))) return "you";
  if (competitors.some((c) => matchesName(mention, c))) return "competitor";
  return "other";
}

export type SovRunRow = {
  id: string;
  engine: string;
  question: string;
  status: "done" | "failed";
};
export type SovMentionRow = { run_id: string; name: string; rank: number; kind: MentionKind };

// Legacy empty answers remain untouched in storage, but cannot enter sample math.
export function usableSovRuns<T extends { status: string; answer_excerpt: string | null }>(runs: T[]): T[] {
  return runs.map((run) => run.status === "done" && !run.answer_excerpt?.trim()
    ? { ...run, status: "failed" }
    : run);
}

// Share of voice: for each recommended name, the percentage of successful runs
// that recommended it. Failed runs are excluded from the base.
export function shareOfVoice(runs: SovRunRow[], mentions: SovMentionRow[], engine?: string) {
  const okRuns = runs.filter((r) => r.status === "done" && (!engine || r.engine === engine));
  const base = okRuns.length;
  const okIds = new Set(okRuns.map((r) => r.id));
  const byKey = new Map<string, { name: string; kind: MentionKind; count: number }>();
  for (const m of mentions) {
    if (!okIds.has(m.run_id)) continue;
    const key = `${m.kind}:${normalizeName(m.name)}`;
    const entry = byKey.get(key) ?? { name: m.name, kind: m.kind, count: 0 };
    entry.count += 1;
    byKey.set(key, entry);
  }
  return [...byKey.values()]
    .map((e) => ({ ...e, pct: base ? Math.round((e.count / base) * 100) : 0 }))
    .sort((a, b) => b.count - a.count)
    .map((e) => ({ name: e.name, kind: e.kind, count: e.count, pct: e.pct, runs: base }));
}

// Per question and engine: mentioned in x of N successful runs, average rank.
export function questionStats(runs: SovRunRow[], mentions: SovMentionRow[]) {
  const okRuns = runs.filter((r) => r.status === "done");
  const byRun = new Map<string, SovMentionRow[]>();
  for (const m of mentions) {
    const list = byRun.get(m.run_id) ?? [];
    list.push(m);
    byRun.set(m.run_id, list);
  }
  const questions = [...new Set(okRuns.map((r) => r.question))];
  const engines = [...new Set(okRuns.map((r) => r.engine))];
  return questions.map((question) => ({
    question,
    engines: engines.map((engine) => {
      const cell = okRuns.filter((r) => r.question === question && r.engine === engine);
      const ranks = cell
        .flatMap((r) => byRun.get(r.id) ?? [])
        .filter((m) => m.kind === "you")
        .map((m) => m.rank);
      return {
        engine,
        mentioned: ranks.length,
        total: cell.length,
        avgRank: ranks.length ? ranks.reduce((a, b) => a + b, 0) / ranks.length : null,
      };
    }),
  }));
}

// Percentage of successful runs mentioning "you", per check (for the trend).
export function youPercent(runs: SovRunRow[], mentions: SovMentionRow[]): number {
  const ok = runs.filter((r) => r.status === "done");
  if (!ok.length) return 0;
  const youRuns = new Set(
    mentions.filter((m) => m.kind === "you").map((m) => m.run_id),
  );
  const count = ok.filter((r) => youRuns.has(r.id)).length;
  return Math.round((count / ok.length) * 100);
}

export function sovErrorMessage(message: string, budget?: number): string {
  if (message.includes("sov_budget_exceeded"))
    return `This check would go over your monthly budget of $${budget ?? ""}. Raise the budget in Admin or run fewer questions.`;
  if (message.includes("sov_check_running")) return "A check is already running for this product.";
  if (message.includes("sov_check_hour_limit_reached")) return "You can run one check per hour for a product. Try again later.";
  if (message.includes("sov_check_week_limit_reached")) return "You have used this week's 10 checks for this product.";
  return "We couldn't start the check. Please try again.";
}

// Plain engine error copy; never includes the key or any part of it.
export function engineErrorMessage(status: number, body: string): string {
  const text = body.toLowerCase();
  if (status === 401 || status === 403) return "The key was rejected or the account has no API credit. Check the key in Project Settings → Secrets and your balance with the provider.";
  if (status === 402 || text.includes("insufficient_quota") || text.includes("credit")) return "This provider account is out of credit. Top up with the provider.";
  if (status === 429) return "Rate limited by the provider. Try again in a minute.";
  if (status === 404) return "The model or endpoint was not found. The provider may have renamed it.";
  if (status >= 500) return "The provider had a server error. Try again later.";
  return "The connection test failed. Try again later.";
}
