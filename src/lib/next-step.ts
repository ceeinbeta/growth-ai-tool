// Picks one next step and the Find / Fix / Prove status from real recorded data only.
export type NextStepFacts = {
  hasConversationScan?: boolean;
  profiled: boolean;
  profileReviewed: boolean;
  eventCount: number;
  funnelSteps: number;
  hasAudit: boolean;
  hasTechnicalAudit: boolean;
  usableVisibilityRuns: number;
  leaksInProgressOrDone: number;
};

export type NextStepKey = "profile" | "tracking" | "funnel" | "audit" | "technical" | "visibility" | "conversations" | "leak";

export type NextStep = { key: NextStepKey; title: string; text: string; action: string; to: string };

const STEPS: Record<NextStepKey, NextStep> = {
  profile: { key: "profile", title: "Check your product profile", text: "Brambly uses it for audits and AI checks. Make sure it describes your product correctly.", action: "Review the profile", to: "/overview#profile" },
  tracking: { key: "tracking", title: "Install website tracking", text: "No visits have been recorded yet. Add the tracking code to your site to start measuring.", action: "Install tracking", to: "/integrations#tracking" },
  funnel: { key: "funnel", title: "Set up your funnel steps", text: "You are using the default funnel. Add the pages and events that matter for your product.", action: "Edit the funnel", to: "/conversion-leaks" },
  audit: { key: "audit", title: "Run a page audit", text: "Get AI-written suggestions for the page where visitors drop off.", action: "Run a page audit", to: "/conversion-leaks" },
  technical: { key: "technical", title: "Run a technical audit", text: "Check whether Google and AI assistants can find, read and understand your site.", action: "Run a technical audit", to: "/technical-audit" },
  visibility: { key: "visibility", title: "Run an AI visibility check", text: "See whether AI assistants recommend your product when buyers ask.", action: "Run a check", to: "/ai-search-visibility" },
  conversations: { key: "conversations", title: "Scan for conversations", text: "Find public Hacker News posts where someone asks for your kind of product. You post any reply yourself.", action: "Scan Hacker News", to: "/conversations" },
  leak: { key: "leak", title: "Review your biggest leak", text: "Your setup is in place. Pick the top leak from your latest audit and work on it.", action: "Open conversion leaks", to: "/conversion-leaks" },
};

export function pickNextStep(f: NextStepFacts): NextStep {
  if (!f.profiled || !f.profileReviewed) return STEPS.profile;
  if (f.eventCount === 0) return STEPS.tracking;
  if (f.funnelSteps === 0) return STEPS.funnel;
  if (!f.hasAudit) return STEPS.audit;
  if (!f.hasTechnicalAudit) return STEPS.technical;
  if (f.usableVisibilityRuns === 0) return STEPS.visibility;
  if (!f.hasConversationScan) return STEPS.conversations;
  return STEPS.leak;
}

export type LoopStatus = "done" | "current" | "not-started" | "coming-next";
export type LoopStep = { key: "find" | "fix" | "prove"; label: string; status: LoopStatus };

export function loopSteps(f: NextStepFacts): LoopStep[] {
  const found = f.eventCount > 0 && (f.hasAudit || f.funnelSteps > 0);
  const fixing = f.leaksInProgressOrDone > 0;
  return [
    { key: "find", label: "Diagnose", status: found ? "done" : "current" },
    { key: "fix", label: "Improve", status: fixing ? "done" : found ? "current" : "not-started" },
    { key: "prove", label: "Grow", status: "coming-next" },
  ];
}

export const loopStatusText: Record<LoopStatus, string> = { done: "Done", current: "Current", "not-started": "Not started", "coming-next": "Soon" };
