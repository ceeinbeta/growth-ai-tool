import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

export const isAdminQuery = queryOptions({
  queryKey: ['is-app-admin'],
  staleTime: 60000,
  queryFn: async () => {
    const { data, error } = await supabase.rpc('is_app_admin');
    if (error) throw error;
    return data === true;
  },
});

export const adminSummarySchema = z.object({
  waitlist_count: z.number(),
  invited_count: z.number(),
  accounts_count: z.number(),
  beta_seat_limit: z.number(),
  ai_runs_last_24h: z.number(),
  platform_ai_runs_per_day: z.number(),
  visibility_monthly_budget_usd: z.number(),
  visibility_spend_this_month: z.number(),
});
export type AdminSummary = z.infer<typeof adminSummarySchema>;

export const waitlistRowSchema = z.object({
  id: z.string(),
  email: z.string(),
  website: z.string().nullable(),
  stage: z.string().nullable(),
  utm_source: z.string().nullable(),
  utm_medium: z.string().nullable(),
  utm_campaign: z.string().nullable(),
  created_at: z.string(),
  invited_at: z.string().nullable(),
  on_allow_list: z.boolean(),
  has_account: z.boolean(),
});
export type WaitlistRow = z.infer<typeof waitlistRowSchema>;

export const inviteRowSchema = z.object({
  email: z.string(),
  note: z.string().nullable(),
  created_at: z.string(),
  has_account: z.boolean(),
  last_sign_in_at: z.string().nullable(),
});
export type InviteRow = z.infer<typeof inviteRowSchema>;

async function callAdmin<T>(name: 'admin_summary' | 'admin_list_waitlist' | 'admin_list_invites', schema: z.ZodType<T>): Promise<T> {
  const { data, error } = await supabase.rpc(name);
  if (error) throw error;
  return schema.parse(data);
}

export const adminSummaryQuery = queryOptions({
  queryKey: ['admin-summary'],
  queryFn: () => callAdmin('admin_summary', adminSummarySchema),
});
export const adminWaitlistQuery = queryOptions({
  queryKey: ['admin-waitlist'],
  queryFn: () => callAdmin('admin_list_waitlist', z.array(waitlistRowSchema)),
});
export const adminInvitesQuery = queryOptions({
  queryKey: ['admin-invites'],
  queryFn: () => callAdmin('admin_list_invites', z.array(inviteRowSchema)),
});

export function inviteMessage(origin: string, email: string) {
  return {
    subject: 'Your Growloop beta seat',
    body: `Hi,

You're in. Growloop is a growth app for solo founders: it shows where your visitors drop off, helps you fix it, and measures what happens next.

To sign in, open ${origin}/auth and use this email address (${email}). You'll get a one-time sign-in link, no password.

A few things to know:
- It's free during the beta.
- Growloop never posts or emails anything for you.
- AI features have daily limits while we're in beta.
- If anything is confusing or broken, just reply to this email.

Cilene`,
  };
}

export function adminErrorMessage(error: unknown, seatLimit?: number): string {
  const msg = error instanceof Error ? error.message : String(error);
  if (msg.includes('beta_seat_limit_reached')) return `You have used all ${seatLimit ?? ''} beta seats. Raise the limit or remove someone first.`;
  if (msg.includes('already_has_account')) return "This person already has an account, so they can't be removed.";
  if (msg.includes('cannot_remove_admin')) return "This email belongs to the founder and can't be removed.";
  if (msg.includes('invalid_email')) return 'Enter a valid email address.';
  if (msg.includes('invalid_setting_value')) return 'That number is outside the allowed range.';
  if (msg.includes('forbidden')) return 'This page is only for the Growloop founder.';
  return 'Something went wrong. Please try again.';
}

export function relativeTime(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export const stageText = (stage: string | null) =>
  stage === 'live' ? 'Live product' : stage === 'prelaunch' ? 'Pre-launch' : stage === 'idea' ? 'Just an idea' : '—';
