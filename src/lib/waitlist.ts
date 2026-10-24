import { z } from 'zod';
import { normalizeWebsite, WEBSITE_ERROR } from './website';

export const WAITLIST_SUCCESS = "You're on the list. We'll email you when there's a seat. Nothing else will be sent.";
export const WAITLIST_LIMIT = 'Lots of people are joining right now. Please try again in a few minutes.';
export const WAITLIST_CONSENT = 'Email me about the Growloop beta. I can ask for my details to be deleted at any time.';
export const WAITLIST_MAX_BYTES = 2048;
const campaign = z.string().trim().max(80).regex(/^[a-zA-Z0-9 ._~-]*$/, 'Use a plain, short campaign value.').optional();
export const waitlistSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.').max(255).transform(s => s.toLowerCase()),
  website: z.string().trim().max(255).optional().refine(s => !s || normalizeWebsite(s) !== null, WEBSITE_ERROR)
    .transform(s => s ? normalizeWebsite(s) : null),
  stage: z.enum(['live', 'prelaunch', 'idea']).optional(),
  consent: z.literal(true, { errorMap: () => ({ message: 'Please agree to receive beta emails.' }) }),
  utm_source: campaign, utm_medium: campaign, utm_campaign: campaign,
  company: z.string().max(200).optional(),
}).strict();

export const waitlistInputSchema = waitlistSchema;
export type WaitlistEntry = { email: string; website: string | null; stage: string | null; utm_source: string | null; utm_medium: string | null; utm_campaign: string | null; consent_text: string };
export function campaignFromSearch(search: string) {
  const params = new URLSearchParams(search);
  const result: Record<string, string> = {};
  for (const name of ['utm_source', 'utm_medium', 'utm_campaign']) {
    const value = params.get(name);
    if (value) {
      const parsed = campaign.safeParse(value);
      if (parsed.success && parsed.data) result[name] = parsed.data;
    }
  }
  return result;
}

export function isSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin || request.headers.get('sec-fetch-site') === 'cross-site') return false;
  try {
    const url = new URL(request.url);
    if (origin === url.origin) return true;
    const forwarded = url.hostname === 'localhost' ? request.headers.get('x-forwarded-host') : null;
    return !!forwarded && origin === `https://${forwarded}`;
  } catch { return false; }
}