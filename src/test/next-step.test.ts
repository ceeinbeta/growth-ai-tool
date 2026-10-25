import { describe, expect, it } from 'vitest';
import { loopSteps, pickNextStep, type NextStepFacts } from '@/lib/next-step';

const all: NextStepFacts = { profiled: true, profileReviewed: true, eventCount: 5, funnelSteps: 2, hasAudit: true, hasTechnicalAudit: true, usableVisibilityRuns: 3, leaksInProgressOrDone: 0 };

describe('next best step order', () => {
  it('asks for the profile first', () => expect(pickNextStep({ ...all, profiled: false, eventCount: 0 }).key).toBe('profile'));
  it('asks for an unreviewed AI profile to be checked', () => expect(pickNextStep({ ...all, profileReviewed: false }).key).toBe('profile'));
  it('then tracking', () => expect(pickNextStep({ ...all, eventCount: 0, funnelSteps: 0 }).key).toBe('tracking'));
  it('then funnel steps', () => expect(pickNextStep({ ...all, funnelSteps: 0, hasAudit: false }).key).toBe('funnel'));
  it('then a page audit', () => expect(pickNextStep({ ...all, hasAudit: false, hasTechnicalAudit: false, usableVisibilityRuns: 0 }).key).toBe('audit'));
  it('then a technical audit', () => expect(pickNextStep({ ...all, hasTechnicalAudit: false, usableVisibilityRuns: 0 }).key).toBe('technical'));
  it('then an AI visibility check', () => expect(pickNextStep({ ...all, usableVisibilityRuns: 0 }).key).toBe('visibility'));
  it('otherwise review the biggest leak', () => expect(pickNextStep(all).key).toBe('leak'));
});

describe('find / fix / prove strip', () => {
  it('starts on find with no data', () => expect(loopSteps({ ...all, eventCount: 0 }).map(s => s.status)).toEqual(['current', 'not-started', 'coming-next']));
  it('moves to fix once tracking and an audit exist', () => expect(loopSteps(all).map(s => s.status)).toEqual(['done', 'current', 'coming-next']));
  it('marks fix done once a leak is being worked on', () => expect(loopSteps({ ...all, leaksInProgressOrDone: 1 })[1]?.status).toBe('done'));
  it('never claims prove is done', () => expect(loopSteps({ ...all, leaksInProgressOrDone: 9 })[2]?.status).toBe('coming-next'));
});
