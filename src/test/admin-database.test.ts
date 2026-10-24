import { describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

function keyedClient(key: string, token?: string) {
  const url = process.env['SUPABASE_URL'];
  if (!url || !key) throw new Error('Missing test configuration');
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith('sb_')) headers.delete('Authorization');
        if (token) headers.set('Authorization', `Bearer ${token}`);
        headers.set('apikey', key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}
function adminClient() {
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  if (!key) throw new Error('Missing test configuration');
  return keyedClient(key);
}
function anonClient() {
  const key = process.env['SUPABASE_PUBLISHABLE_KEY'] ?? process.env['SUPABASE_ANON_KEY'];
  if (!key) throw new Error('Missing test configuration');
  return keyedClient(key);
}
function userClient(token: string) {
  const key = process.env['SUPABASE_PUBLISHABLE_KEY'] ?? process.env['SUPABASE_ANON_KEY'];
  if (!key) throw new Error('Missing test configuration');
  return keyedClient(key, token);
}
function founderClient() {
  const session = JSON.parse(readFileSync(`${homedir()}/.cache/lovable-auth/session.json`, 'utf8'));
  return userClient(session.session.access_token as string);
}
const tempEmail = () => `admin-test-${randomUUID()}@example.com`;

// Create a temporary invited user with a workspace, always cleaned up in finally.
async function withTempUser(run: (client: SupabaseClient<Database>, email: string) => Promise<void>) {
  const a = adminClient(), email = tempEmail();
  let userId: string | null = null;
  try {
    expect((await a.from('allowed_emails').insert({ email })).error).toBeNull();
    const created = await a.auth.admin.createUser({ email, password: 'test-password-123', email_confirm: true });
    if (created.error) throw created.error;
    userId = created.data.user.id;
    const signed = await a.auth.signInWithPassword({ email, password: 'test-password-123' });
    if (signed.error || !signed.data.session) throw signed.error ?? new Error('No session');
    await run(userClient(signed.data.session.access_token), email);
  } finally {
    if (userId) {
      const admin = adminClient();
      const memberships = await admin.from('members').select('workspace_id').eq('user_id', userId);
      for (const m of memberships.data ?? []) await admin.from('workspaces').delete().eq('id', m.workspace_id);
      await admin.auth.admin.deleteUser(userId);
    }
    await adminClient().from('allowed_emails').delete().eq('email', email);
  }
}

// Create a temporary product row in a temporary workspace, cleaned up in finally.
async function withTempProduct(run: (productId: string) => Promise<void>) {
  const a = adminClient();
  const ws = await a.from('workspaces').insert({ name: 'admin-test' }).select('id').single();
  if (ws.error) throw ws.error;
  const product = await a.from('products').insert({ workspace_id: ws.data.id, name: 'Admin test', url: 'example.com', description: 'Temporary test product', stage: 'live' }).select('id').single();
  if (product.error) throw product.error;
  try {
    await run(product.data.id);
  } finally {
    await a.from('products').delete().eq('id', product.data.id);
    await a.from('workspaces').delete().eq('id', ws.data.id);
  }
}

describe.skipIf(process.env['PROFILE_INTEGRATION_TEST'] !== '1')('admin invitations database', () => {
  it('keeps admin tables private with RLS, no policies and no client privileges', async () => {
    const url = process.env['SUPABASE_DB_URL']; if (!url) throw new Error('Missing test connection');
    const sql = postgres(url, { max: 1 });
    try {
      for (const table of ['app_admins', 'app_settings']) {
        expect((await sql`select relrowsecurity as enabled from pg_class where oid=${'public.' + table}::regclass`)[0]?.['enabled']).toBe(true);
        expect((await sql`select count(*)::int as n from pg_policy where polrelid=${'public.' + table}::regclass`)[0]?.['n']).toBe(0);
        for (const role of ['anon', 'authenticated']) {
          for (const privilege of ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']) {
            expect((await sql`select has_table_privilege(${role}, ${'public.' + table}, ${privilege}) as allowed`)[0]?.['allowed']).toBe(false);
          }
        }
      }
      for (const fn of ['public.is_app_admin()', 'public.admin_summary()', 'public.admin_list_waitlist()', 'public.admin_list_invites()', 'public.admin_set_setting(text,integer)', 'public.admin_invite_email(text,text)', 'public.admin_uninvite_email(text)', 'public.admin_delete_waitlist_entry(uuid)']) {
        expect((await sql`select has_function_privilege('anon', ${fn}, 'EXECUTE') as allowed`)[0]?.['allowed']).toBe(false);
        expect((await sql`select has_function_privilege('authenticated', ${fn}, 'EXECUTE') as allowed`)[0]?.['allowed']).toBe(true);
      }
    } finally { await sql.end(); }
  });

  it('seeds the founder as admin and the two settings', async () => {
    const founder = founderClient();
    const isAdmin = await founder.rpc('is_app_admin');
    expect(isAdmin.error).toBeNull();
    expect(isAdmin.data).toBe(true);
    const summary = await founder.rpc('admin_summary');
    expect(summary.error).toBeNull();
    expect(summary.data).toMatchObject({ beta_seat_limit: 20, platform_ai_runs_per_day: 100 });
  });

  it('rejects every admin RPC for signed-in non-admins and anon callers', async () => {
    await withTempUser(async (client, email) => {
      expect((await client.rpc('is_app_admin')).data).toBe(false);
      const calls = [
        client.rpc('admin_summary'),
        client.rpc('admin_list_waitlist'),
        client.rpc('admin_list_invites'),
        client.rpc('admin_set_setting', { setting_key: 'beta_seat_limit', val: 20 }),
        client.rpc('admin_invite_email', { addr: email }),
        client.rpc('admin_uninvite_email', { addr: email }),
        client.rpc('admin_delete_waitlist_entry', { entry_id: randomUUID() }),
      ];
      for (const call of calls) {
        const { error } = await call;
        expect(error?.message).toContain('forbidden');
      }
    });
    const anon = anonClient();
    expect((await anon.rpc('admin_summary')).error?.code).toBe('42501');
    expect((await anon.rpc('is_app_admin')).error?.code).toBe('42501');
  });

  it('invites with normalized case, keeps the note idempotently and marks the waitlist row invited', async () => {
    const a = adminClient(), founder = founderClient(), email = tempEmail();
    try {
      expect((await a.from('waitlist_signups').insert({ email, consent_at: new Date().toISOString(), consent_text: 'test' })).error).toBeNull();
      const first = await founder.rpc('admin_invite_email', { addr: email.toUpperCase(), note: 'first note' });
      expect(first.error).toBeNull();
      const row = await a.from('allowed_emails').select('*').eq('email', email).single();
      expect(row.data?.email).toBe(email);
      expect(row.data?.note).toBe('first note');
      const waiting = await a.from('waitlist_signups').select('invited_at').eq('email', email).single();
      expect(waiting.data?.invited_at).toBeTruthy();

      expect((await founder.rpc('admin_invite_email', { addr: email, note: 'updated note' })).error).toBeNull();
      expect((await a.from('allowed_emails').select('note').eq('email', email).single()).data?.note).toBe('updated note');
      expect((await founder.rpc('admin_invite_email', { addr: email, note: null })).error).toBeNull();
      expect((await a.from('allowed_emails').select('note').eq('email', email).single()).data?.note).toBe('updated note');
    } finally {
      await a.from('allowed_emails').delete().eq('email', email);
      await a.from('waitlist_signups').delete().eq('email', email);
    }
  });

  it('rejects implausible and overlong invitation emails', async () => {
    const founder = founderClient();
    for (const addr of ['not-an-email', 'no-at-sign.com', `${'a'.repeat(260)}@example.com`, '']) {
      expect((await founder.rpc('admin_invite_email', { addr })).error?.message).toContain('invalid_email');
    }
  });

  it('uninvite removes the invitation, clears invited_at, and refuses accounts and admins', async () => {
    const a = adminClient(), founder = founderClient(), email = tempEmail();
    try {
      expect((await a.from('waitlist_signups').insert({ email, consent_at: new Date().toISOString(), consent_text: 'test' })).error).toBeNull();
      expect((await founder.rpc('admin_invite_email', { addr: email })).error).toBeNull();
      expect((await founder.rpc('admin_uninvite_email', { addr: email })).error).toBeNull();
      expect((await a.from('allowed_emails').select('email').eq('email', email)).data).toHaveLength(0);
      expect((await a.from('waitlist_signups').select('invited_at').eq('email', email).single()).data?.invited_at).toBeNull();

      expect((await founder.rpc('admin_uninvite_email', { addr: 'mcileneveloria@gmail.com' })).error?.message).toContain('cannot_remove_admin');
    } finally {
      await a.from('allowed_emails').delete().eq('email', email);
      await a.from('waitlist_signups').delete().eq('email', email);
    }
    await withTempUser(async (_client, userEmail) => {
      expect((await founder.rpc('admin_uninvite_email', { addr: userEmail })).error?.message).toContain('already_has_account');
    });
  });

  it('enforces the seat limit excluding admins, and raising it allows invites again', async () => {
    const founder = founderClient(), email = tempEmail();
    const summary = await founder.rpc('admin_summary');
    if (summary.error) throw summary.error;
    const used = (summary.data as { invited_count: number }).invited_count;
    try {
      expect((await founder.rpc('admin_set_setting', { setting_key: 'beta_seat_limit', val: used })).error).toBeNull();
      expect((await founder.rpc('admin_invite_email', { addr: email })).error?.message).toContain('beta_seat_limit_reached');
      expect((await founder.rpc('admin_set_setting', { setting_key: 'beta_seat_limit', val: used + 1 })).error).toBeNull();
      expect((await founder.rpc('admin_invite_email', { addr: email })).error).toBeNull();
    } finally {
      await founder.rpc('admin_set_setting', { setting_key: 'beta_seat_limit', val: 20 });
      await adminClient().from('allowed_emails').delete().eq('email', email);
    }
  });

  it('rejects unknown settings and out-of-range values', async () => {
    const founder = founderClient();
    expect((await founder.rpc('admin_set_setting', { setting_key: 'nope', val: 5 })).error?.message).toContain('unknown_setting');
    for (const val of [0, 101]) {
      expect((await founder.rpc('admin_set_setting', { setting_key: 'beta_seat_limit', val })).error?.message).toContain('invalid_setting_value');
    }
    for (const val of [9, 1001]) {
      expect((await founder.rpc('admin_set_setting', { setting_key: 'platform_ai_runs_per_day', val })).error?.message).toContain('invalid_setting_value');
    }
    expect((await founder.rpc('admin_set_setting', { setting_key: 'beta_seat_limit', val: 20 })).error).toBeNull();
  });

  it('makes the shared AI run cap follow the setting with a 100 fallback', async () => {
    const url = process.env['SUPABASE_DB_URL']; if (!url) throw new Error('Missing test connection');
    await withTempProduct(async (productId) => {
      const sql = postgres(url, { max: 1 });
      try {
        await sql.begin(async (tx) => {
          const count = (await tx`select (select count(*) from public.profile_runs where created_at > now() - interval '24 hours') + (select count(*) from public.audit_runs where created_at > now() - interval '24 hours') as n`)[0]?.['n'] as number;
          await tx`update public.app_settings set value = ${count} where key = 'platform_ai_runs_per_day'`;
          await expect(tx`select public.reserve_ai_run(${productId}::uuid, 'profile-product')`).rejects.toThrow('platform_profile_run_limit_reached');
          throw new Error('rollback');
        }).catch(e => { if ((e as Error).message !== 'rollback') throw e; });
        await sql.begin(async (tx) => {
          await tx`delete from public.app_settings where key = 'platform_ai_runs_per_day'`;
          const reserved = await tx`select public.reserve_ai_run(${productId}::uuid, 'profile-product') as id`;
          expect(reserved[0]?.['id']).toBeTruthy();
          throw new Error('rollback');
        }).catch(e => { if ((e as Error).message !== 'rollback') throw e; });
      } finally { await sql.end(); }
    });
  });

  it('deletes a waitlist entry on request', async () => {
    const a = adminClient(), founder = founderClient(), email = tempEmail();
    const row = await a.from('waitlist_signups').insert({ email, consent_at: new Date().toISOString(), consent_text: 'test' }).select('id').single();
    if (row.error) throw row.error;
    try {
      expect((await founder.rpc('admin_delete_waitlist_entry', { entry_id: row.data.id })).error).toBeNull();
      expect((await a.from('waitlist_signups').select('id').eq('id', row.data.id)).data).toHaveLength(0);
    } finally {
      await a.from('waitlist_signups').delete().eq('id', row.data.id);
    }
  });

  it('lists waitlist and invites with status flags for the founder only', async () => {
    const a = adminClient(), founder = founderClient(), email = tempEmail();
    try {
      expect((await a.from('waitlist_signups').insert({ email, consent_at: new Date().toISOString(), consent_text: 'test', website: 'example.com', stage: 'idea' })).error).toBeNull();
      expect((await founder.rpc('admin_invite_email', { addr: email, note: 'met online' })).error).toBeNull();

      const waitlist = await founder.rpc('admin_list_waitlist');
      expect(waitlist.error).toBeNull();
      const entry = (waitlist.data as { email: string; on_allow_list: boolean; has_account: boolean; invited_at: string | null }[]).find(r => r.email === email);
      expect(entry).toMatchObject({ on_allow_list: true, has_account: false });
      expect(entry?.invited_at).toBeTruthy();

      const invites = await founder.rpc('admin_list_invites');
      expect(invites.error).toBeNull();
      const invite = (invites.data as { email: string; note: string | null; has_account: boolean }[]).find(r => r.email === email);
      expect(invite).toMatchObject({ note: 'met online', has_account: false });
      expect((invites.data as { email: string }[]).some(r => r.email === 'mcileneveloria@gmail.com')).toBe(false);
    } finally {
      await a.from('allowed_emails').delete().eq('email', email);
      await a.from('waitlist_signups').delete().eq('email', email);
    }
  });
});
