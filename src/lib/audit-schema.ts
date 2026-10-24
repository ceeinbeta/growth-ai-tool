import { z } from 'zod';
export const AUDIT_MODEL = 'openai/gpt-6-astra';
export const AUDIT_LIMIT_MESSAGE = "You have used today's 5 audits for this product. Try again tomorrow.";
export const AI_LIMIT_MESSAGE = 'AI checks are paused for today. Try again tomorrow.';
export const pageCopySchema = z.object({ path: z.string(), headline: z.string(), subheadline: z.string(), button: z.string(), notes: z.string() }).strict()
  .refine(v => Object.values(v).reduce((n, s) => n + s.length, 0) <= 2000, 'Keep all fields together under 2000 characters.')
  .refine(v => [v.headline, v.subheadline, v.button, v.notes].some(s => s.trim()), 'Paste some page copy to audit.')
  .refine(v => !v.path || /^\/[^?#]*$/.test(v.path), 'Enter a page path like /pricing, not a full address.');
export type PageCopy = z.infer<typeof pageCopySchema>;
export const emptyCopy: PageCopy = { path: '', headline: '', subheadline: '', button: '', notes: '' };
const leakShape = z.object({ area: z.string(), impact: z.enum(['high', 'medium', 'low']), issue: z.string(), fix: z.string(), rewrite: z.string() }).strict();
export const auditShape = z.object({ leaks: z.array(leakShape) }).strict();
export const auditSchema = z.object({ leaks: z.array(leakShape.extend({ area: z.string().trim().min(1).max(80), issue: z.string().trim().min(1).max(700), fix: z.string().trim().min(1).max(500), rewrite: z.string().max(1200) })).min(3).max(5) }).strict();
export function auditReservationError(message: string) {
  if (message.includes('platform_profile_run_limit_reached')) return AI_LIMIT_MESSAGE;
  if (message.includes('audit_run_limit_reached')) return AUDIT_LIMIT_MESSAGE;
  return "We couldn't start this audit. Please try again.";
}