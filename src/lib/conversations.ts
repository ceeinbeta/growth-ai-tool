import { z } from 'zod';
export const conversationStatuses = ['new', 'saved', 'drafted', 'replied', 'dismissed'] as const;
export const termsSchema = z.array(z.string().trim().min(1).max(120).refine(s => !/[\x00-\x1f<>]/.test(s), 'Use plain text.')).min(1).max(10).transform(terms => [...new Map(terms.map(t => [t.toLowerCase(), t])).values()]);
export type ConversationProfile = { name: string; category: string | null; audience: string | null; competitors: string[]; questions: string[] };
export type ScoreParts = { intent: number; fit: number; reach: number; ease: number };
export type HnPost = { external_id: string; url: string; title: string; excerpt: string; author_handle: string; posted_at: string; points: number; comments: number };
export type ScoredPost = HnPost & { score: number; score_parts: ScoreParts };
const stop = new Set('the a an is are to for of in on and or i my we you your with it this that how what which do can any hn ask tool tools looking'.split(' '));
export function words(s: string) { return new Set((s.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter(w => w.length > 2 && !stop.has(w))); }
export function defaultConversationTerms(p: ConversationProfile) { return [...new Set([p.category, ...p.competitors, ...p.questions].filter((s): s is string => !!s?.trim()).map(s => s.trim().slice(0,120)))].slice(0,10); }
export function scorePost(p: HnPost, profile: ConversationProfile, now = Date.now()): ScoredPost {
  const text = `${p.title} ${p.excerpt}`.toLowerCase();
  const intent = Math.min(100, (/\?|\b(what|which|where|why|how)\b/.test(text) ? 20 : 0) + (/(looking for|alternative to|recommend|how do i|any tool)/.test(text) ? 45 : 0) + (profile.competitors.some(c => c.trim() && text.includes(c.toLowerCase())) ? 20 : 0) + (/^ask hn\b/i.test(p.title) ? 15 : 0));
  const relevant = words([profile.category,profile.audience,...profile.questions].join(' '));
  const postWords = words(text); const overlap = [...relevant].filter(w => postWords.has(w)).length;
  const fit = relevant.size ? Math.round(100 * Math.min(1, overlap / Math.min(8,relevant.size))) : 0;
  // Saturation: 500 points and 100 comments. These are scoring thresholds, not audience measurements.
  const reach = Math.round(100 * (0.6*Math.min(1,Math.log1p(p.points)/Math.log1p(500)) + 0.4*Math.min(1,Math.log1p(p.comments)/Math.log1p(100))));
  const ageDays = Math.max(0,(now-Date.parse(p.posted_at))/86400000);
  const ease = Math.round(100*(0.7*Math.max(0,1-ageDays/30)+0.3*Math.max(0,1-p.comments/50)));
  const score_parts = {intent,fit,reach,ease};
  return {...p,score:Math.round(intent*.4+fit*.3+reach*.2+ease*.1),score_parts};
}
export function scanLimit(times: string[], now = Date.now()) { if(times.filter(t=>Date.parse(t)>now-3600000).length>=6) return 'hour'; if(times.filter(t=>Date.parse(t)>now-86400000).length>=30) return 'day'; return null; }
export const SCORE_EXPLANATION = 'Intent 40%: asking language and competitor mentions. Fit 30%: matching profile words. Reach 20%: log-scaled points (up to 500) and comments (up to 100). Ease 10%: age within 30 days and fewer than 50 comments. A rule of thumb, not measured conversion.';
