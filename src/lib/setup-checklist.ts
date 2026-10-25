export type SetupFacts = {
  profiled: boolean;
  profileReviewed: boolean;
  eventCount: number;
  lastEventAt: string | null;
  visitors30d: number;
  hasAudit: boolean;
  lastCheck: { date: string; usableRuns: number; pct: number } | null;
};

export type ChecklistItem = { key: string; title: string; done: boolean; result?: string | undefined; to: string; action: string; soon?: boolean };

export const VISITOR_GOAL = 100;

export function relativeTime(iso: string, now = Date.now()) {
  const m = Math.max(0, Math.round((now - Date.parse(iso)) / 60000));
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} days ago`;
}

/** Completion comes only from real recorded data. The "Soon" item is never counted. */
export function buildChecklist(f: SetupFacts, now = Date.now()): ChecklistItem[] {
  return [
    { key: "profile", title: "Review your product profile", done: f.profiled && f.profileReviewed, result: f.profiled && f.profileReviewed ? "Reviewed by you" : f.profiled ? "Written by AI, waiting for your check" : undefined, to: "/overview#profile", action: "Review the profile" },
    { key: "tracking", title: "Install website tracking", done: f.eventCount > 0, result: f.eventCount > 0 && f.lastEventAt ? `Receiving data, last visit ${relativeTime(f.lastEventAt, now)}` : undefined, to: "/integrations", action: "Install tracking" },
    { key: "visitors", title: `Collect ${VISITOR_GOAL} visitors`, done: f.visitors30d >= VISITOR_GOAL, result: `${Math.min(f.visitors30d, VISITOR_GOAL)} of ${VISITOR_GOAL} in the last 30 days`, to: "/conversion-leaks", action: "See your funnel" },
    { key: "audit", title: "Run a page audit", done: f.hasAudit, result: f.hasAudit ? "Audit saved" : undefined, to: "/conversion-leaks", action: "Run a page audit" },
    { key: "visibility", title: "Run an AI visibility check", done: !!f.lastCheck && f.lastCheck.usableRuns > 0, result: f.lastCheck && f.lastCheck.usableRuns > 0 ? `Last check ${new Date(f.lastCheck.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : undefined, to: "/ai-search-visibility", action: "Run a check" },
    { key: "opportunities", title: "Find people asking for your kind of product", done: false, to: "/overview", action: "", soon: true },
  ];
}

export function progress(items: ChecklistItem[]) {
  const counted = items.filter(i => !i.soon);
  return { done: counted.filter(i => i.done).length, total: counted.length };
}

export const nextAction = (items: ChecklistItem[]) => items.find(i => !i.soon && !i.done) ?? null;
