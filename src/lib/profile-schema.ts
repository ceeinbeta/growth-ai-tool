import { z } from "zod";

export const PROFILE_LIMIT_MESSAGE = "You have used today's 5 profile checks for this product. Try again tomorrow.";
export const PROFILE_MODEL = "openai/gpt-6-astra";
export const wordCount = (value: string) => value.trim().split(/\s+/).filter(Boolean).length;
export const profileShape = z.object({
  one_liner: z.string(), audience: z.string(), category: z.string(),
  competitors: z.array(z.string()), questions: z.array(z.string()),
}).strict();
export const summaryValidators = {
  one_liner: z.string().trim().min(1).max(240).refine(v => wordCount(v) < 14, "Use fewer than 14 words."),
  audience: z.string().trim().min(1).max(240).refine(v => wordCount(v) < 16, "Use fewer than 16 words."),
  category: z.string().trim().min(1).max(120).refine(v => wordCount(v) >= 3 && wordCount(v) <= 7, "Use 3–7 words.").refine(v => v === v.toLowerCase(), "Use lowercase words."),
};
export const profileSchema = z.object({
  ...summaryValidators,
  competitors: z.array(z.string().trim().min(1).max(120)).max(4).refine(v => new Set(v.map(s => s.toLowerCase())).size === v.length),
  questions: z.array(z.string().trim().min(1).max(500)).length(5).refine(v => new Set(v.map(s => s.toLowerCase())).size === v.length),
}).strict();
export type ProfileOutput = z.infer<typeof profileSchema>;
export type SummaryField = keyof typeof summaryValidators;

export function profileWindowAvailable(times: string[], now: number) {
  return times.filter(t => Date.parse(t) > now - 24 * 60 * 60 * 1000).length < 5;
}