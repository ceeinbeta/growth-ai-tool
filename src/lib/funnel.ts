import { z } from 'zod';
export const stepSchema = z.object({
  label: z.string().trim().min(1, 'Enter a step label.').max(120),
  kind: z.enum(['page', 'event']), match: z.string().min(1).max(500),
}).refine(s => s.kind === 'event' ? /^[a-z][a-z0-9_]{0,31}$/.test(s.match) : s.match === '*' || /^\/[^?#*]*\*?$/.test(s.match), 'Use an event name or a path, optionally ending in *.');
export const stepsSchema = z.array(stepSchema).min(1).max(6);
export type FunnelStep = z.infer<typeof stepSchema>;
export const defaultSteps = (stage: string): FunnelStep[] => [
  { label: 'Visited your site', kind: 'page', match: '*' },
  { label: stage === 'prelaunch' ? 'Joined the waitlist' : 'Signed up', kind: 'event', match: stage === 'prelaunch' ? 'joined_waitlist' : 'signup' },
];
export const funnelSummarySchema = z.object({ total_visitors: z.number(), is_default: z.boolean(), steps: z.array(z.object({ position: z.number(), label: z.string(), visitors: z.number(), rate_from_previous: z.number(), rate_from_first: z.number() })) });
export type FunnelSummary = z.infer<typeof funnelSummarySchema>;
export const BENCHMARK_LABEL = 'Benchmark: a rule of thumb, not measured. Real rates vary a lot by traffic source.';
export const benchmark = (stage: string) => stage === 'prelaunch' ? { rate: .15, low: .08, high: .25 } : { rate: .03, low: .01, high: .05 };
export function worstStep(summary: FunnelSummary, stage: string) {
  if (summary.total_visitors < 100 || summary.steps.length < 2) return null;
  const candidates = summary.steps.slice(1);
  if (summary.is_default) {
    const b = benchmark(stage);
    const step = candidates.reduce((a, c) => c.rate_from_previous / b.rate < a.rate_from_previous / b.rate ? c : a);
    return step.rate_from_previous < b.low ? { step, benchmark: true } : null;
  }
  const step = candidates.reduce((a, c) => c.rate_from_previous < a.rate_from_previous ? c : a);
  return step.rate_from_previous < 1 ? { step, benchmark: false } : null;
}