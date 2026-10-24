import { describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

function keyedClient(key: string, token?: string): SupabaseClient<Database> {
  const url = process.env['SUPABASE_URL'];
  if (!url || !key) throw new Error('Missing test configuration');
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith('sb_')) headers.delete('Authorization');
        if (token) headers.set('Authorization', `Bearer ${token}`);
        headers.set('apikey', key);
        return fetch(input, { ...init, headers });
      },
    },
  }) as SupabaseClient<Database>;
}
const adminClient = () => keyedClient(process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '');
const anonClient = () => keyedClient(process.env['SUPABASE_PUBLISHABLE_KEY'] ?? process.env['SUPABASE_ANON_KEY'] ?? '');
const userClient = (token: string) => keyedClient(process.env['SUPABASE_PUBLISHABLE_KEY'] ?? process.env['SUPABASE_ANON_KEY'] ?? '', token);
const founderClient = () => {
  const session = JSON.parse(readFileSync(`${homedir()}/.cache/lovable-auth/session.json`, 'utf8'));
  return userClient(session.session.access_token as string);
};

// Temporary user with their own workspace and product; everything is removed in finally.
async function withTempUserProduct(run: (client: SupabaseClient<Database>, productId: string) => Promise<void>) {
  const a = adminClient();
  const email = `sov-test-${randomUUID()}@example.com`;
  const password = `Test-${randomUUID()}!x`;
  let userId: string | null = null;
  let productId: string | null = null;
  try {
    expect((await a.from('allowed_emails').insert({ email })).error).toBeNull();
    const created = await a.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error) throw created.error;
    userId = created.data.user.id;
    const signed = await a.auth.signInWithPassword({ email, password });
    if (signed.error || !signed.data.session) throw signed.error ?? new Error('No session');
    const client = userClient(signed.data.session.access_token);
    const { data: ws } = await a.from('members').select('workspace_id').eq('user_id', userId).single();
    const product = await a
      .from('products')
      .insert({ workspace_id: ws!.workspace_id, name: 'Sov test', url: 'sov-test.example.com', description: 'Temporary test product', stage: 'live' })
      .select('id')
      .single();
    if (product.error) throw product.error;
    productId = product.data.id;
    await run(client, productId);
  } finally {
    if (productId) await adminClient().from('products').delete().eq('id', productId);
    if (userId) {
      const admin = adminClient();
      const memberships = await admin.from('members').select('workspace_id').eq('user_id', userId);
      for (const m of memberships.data ?? []) await admin.from('workspaces').delete().eq('id', m.workspace_id);
      await admin.auth.admin.deleteUser(userId);
    }
    await adminClient().from('allowed_emails').delete().eq('email', email);
  }
}

describe.skipIf(process.env['PROFILE_INTEGRATION_TEST'] !== '1')('ai search visibility database', () => {
  it('locks sov tables with RLS: members read, nobody writes from clients', { timeout: 30000 }, async () => {
    const url = process.env['SUPABASE_DB_URL'];
    if (!url) throw new Error('Missing test connection');
    const sql = postgres(url, { max: 1 });
    try {
      for (const table of ['sov_checks', 'sov_runs', 'sov_mentions', 'sov_fixes', 'sov_schedule']) {
        expect((await sql`select relrowsecurity as enabled from pg_class where oid=${'public.' + table}::regclass`)[0]?.['enabled']).toBe(true);
        for (const privilege of ['INSERT', 'UPDATE', 'DELETE']) {
          expect((await sql`select has_table_privilege('authenticated', ${'public.' + table}, ${privilege}) as allowed`)[0]?.['allowed']).toBe(false);
          expect((await sql`select has_table_privilege('anon', ${'public.' + table}, ${privilege}) as allowed`)[0]?.['allowed']).toBe(false);
        }
        expect((await sql`select has_table_privilege('anon', ${'public.' + table}, 'SELECT') as allowed`)[0]?.['allowed']).toBe(false);
      }
      for (const fn of ['public.reserve_sov_check(uuid,integer,text[],numeric)', 'public.finish_sov_check(uuid,text,numeric)']) {
        expect((await sql`select has_function_privilege('anon', ${fn}, 'EXECUTE') as allowed`)[0]?.['allowed']).toBe(false);
        expect((await sql`select has_function_privilege('authenticated', ${fn}, 'EXECUTE') as allowed`)[0]?.['allowed']).toBe(false);
      }
      expect((await sql`select has_function_privilege('authenticated', 'public.sov_budget_info()', 'EXECUTE') as allowed`)[0]?.['allowed']).toBe(true);
    } finally {
      await sql.end();
    }
  });

  it('lets members read their own check rows but not write them', async () => {
    await withTempUserProduct(async (client, productId) => {
      const a = adminClient();
      const reserved = await a.rpc('reserve_sov_check', { pid: productId, p_runs_per_question: 1, p_engines: ['openai'], p_estimated_cost: 0.01 });
      expect(reserved.error).toBeNull();
      const checkId = reserved.data as string;
      const runRow = await a
        .from('sov_runs')
        .insert({ check_id: checkId, product_id: productId, engine: 'openai', question: 'q', run_index: 1, status: 'done' })
        .select('id')
        .single();
      expect(runRow.error).toBeNull();

      const readChecks = await client.from('sov_checks').select('id').eq('product_id', productId);
      expect(readChecks.error).toBeNull();
      expect(readChecks.data).toHaveLength(1);
      const readRuns = await client.from('sov_runs').select('id').eq('check_id', checkId);
      expect(readRuns.data).toHaveLength(1);

      const writeCheck = await client.from('sov_checks').insert({ product_id: productId, runs_per_question: 1, engines: ['openai'] });
      expect(writeCheck.error).not.toBeNull();
      const writeRun = await client.from('sov_runs').insert({ check_id: checkId, product_id: productId, engine: 'openai', question: 'q', run_index: 2 });
      expect(writeRun.error).not.toBeNull();
      const writeMention = await client.from('sov_mentions').insert({ run_id: runRow.data!.id, product_id: productId, name: 'x', rank: 1, kind: 'other' });
      expect(writeMention.error).not.toBeNull();
      const writeSchedule = await client.from('sov_schedule').upsert({ product_id: productId, enabled: true });
      expect(writeSchedule.error).not.toBeNull();

      await a.rpc('finish_sov_check', { check_id: checkId, new_status: 'done', final_cost: 0.01 });
    });
  });

  it('hides other workspaces’ rows from members and anon', async () => {
    await withTempUserProduct(async (client, productId) => {
      const a = adminClient();
      const otherWs = await a.from('workspaces').insert({ name: 'sov-other' }).select('id').single();
      const otherProduct = await a
        .from('products')
        .insert({ workspace_id: otherWs.data!.id, name: 'Other', url: 'other.example.com', description: 'temp', stage: 'live' })
        .select('id')
        .single();
      try {
        const reserved = await a.rpc('reserve_sov_check', { pid: otherProduct.data!.id, p_runs_per_question: 1, p_engines: ['openai'], p_estimated_cost: 0.01 });
        expect(reserved.error).toBeNull();
        const mine = await client.from('sov_checks').select('id').eq('product_id', otherProduct.data!.id);
        expect(mine.data).toHaveLength(0);
        const anon = await anonClient().from('sov_checks').select('id').eq('product_id', otherProduct.data!.id);
        expect(anon.data ?? []).toHaveLength(0);
        await a.rpc('finish_sov_check', { check_id: reserved.data as string, new_status: 'failed', final_cost: null as unknown as number });
      } finally {
        await a.from('products').delete().eq('id', otherProduct.data!.id);
        await a.from('workspaces').delete().eq('id', otherWs.data!.id);
      }
    });
  });

  it('enforces one running check, 1 per hour and 10 per week per product', async () => {
    await withTempUserProduct(async (_client, productId) => {
      const a = adminClient();
      const first = await a.rpc('reserve_sov_check', { pid: productId, p_runs_per_question: 1, p_engines: ['openai'], p_estimated_cost: 0.01 });
      expect(first.error).toBeNull();

      const second = await a.rpc('reserve_sov_check', { pid: productId, p_runs_per_question: 1, p_engines: ['openai'], p_estimated_cost: 0.01 });
      expect(second.error?.message).toContain('sov_check_running');

      await a.rpc('finish_sov_check', { check_id: first.data as string, new_status: 'done', final_cost: 0.01 });
      const third = await a.rpc('reserve_sov_check', { pid: productId, p_runs_per_question: 1, p_engines: ['openai'], p_estimated_cost: 0.01 });
      expect(third.error?.message).toContain('sov_check_hour_limit_reached');

      // Backdate the first check, then add 9 more backdated finished checks to hit the weekly cap.
      await a.from('sov_checks').update({ started_at: new Date(Date.now() - 2 * 3600_000).toISOString() }).eq('id', first.data as string);
      for (let i = 0; i < 9; i++) {
        const r = await a.rpc('reserve_sov_check', { pid: productId, p_runs_per_question: 1, p_engines: ['openai'], p_estimated_cost: 0.01 });
        expect(r.error).toBeNull();
        await a.rpc('finish_sov_check', { check_id: r.data as string, new_status: 'done', final_cost: 0.01 });
        await a.from('sov_checks').update({ started_at: new Date(Date.now() - (i + 3) * 3600_000).toISOString() }).eq('id', r.data as string);
      }
      const eleventh = await a.rpc('reserve_sov_check', { pid: productId, p_runs_per_question: 1, p_engines: ['openai'], p_estimated_cost: 0.01 });
      expect(eleventh.error?.message).toContain('sov_check_week_limit_reached');
    });
  });

  it('refuses checks that would exceed the monthly budget', async () => {
    await withTempUserProduct(async (_client, productId) => {
      const a = adminClient();
      const founder = founderClient();
      const set = await founder.rpc('admin_set_setting', { setting_key: 'visibility_monthly_budget_usd', val: 1 });
      expect(set.error).toBeNull();
      try {
        const over = await a.rpc('reserve_sov_check', { pid: productId, p_runs_per_question: 5, p_engines: ['openai', 'perplexity', 'claude'], p_estimated_cost: 2 });
        expect(over.error?.message).toContain('sov_budget_exceeded');
        const under = await a.rpc('reserve_sov_check', { pid: productId, p_runs_per_question: 1, p_engines: ['openai'], p_estimated_cost: 0.5 });
        expect(under.error).toBeNull();
        await a.rpc('finish_sov_check', { check_id: under.data as string, new_status: 'done', final_cost: 0.5 });
      } finally {
        await founder.rpc('admin_set_setting', { setting_key: 'visibility_monthly_budget_usd', val: 20 });
      }
    });
  });

  it('accepts the visibility budget setting within 1-500 and rejects outside values', async () => {
    const founder = founderClient();
    const ok = await founder.rpc('admin_set_setting', { setting_key: 'visibility_monthly_budget_usd', val: 50 });
    expect(ok.error).toBeNull();
    const low = await founder.rpc('admin_set_setting', { setting_key: 'visibility_monthly_budget_usd', val: 0 });
    expect(low.error?.message).toContain('invalid_setting_value');
    const high = await founder.rpc('admin_set_setting', { setting_key: 'visibility_monthly_budget_usd', val: 501 });
    expect(high.error?.message).toContain('invalid_setting_value');
    await founder.rpc('admin_set_setting', { setting_key: 'visibility_monthly_budget_usd', val: 20 });
    const summary = await founder.rpc('admin_summary');
    expect(summary.error).toBeNull();
    expect(summary.data).toMatchObject({ visibility_monthly_budget_usd: 20 });
    expect(typeof (summary.data as Record<string, unknown>)['visibility_spend_this_month']).toBe('number');
  });

  it('rejects admin_set_setting for non-admins on the new key too', async () => {
    await withTempUserProduct(async (client) => {
      const result = await client.rpc('admin_set_setting', { setting_key: 'visibility_monthly_budget_usd', val: 50 });
      expect(result.error?.message).toContain('forbidden');
    });
  });

  it('enforces the schedule per_week bounds', async () => {
    await withTempUserProduct(async (_client, productId) => {
      const a = adminClient();
      const ok = await a.from('sov_schedule').insert({ product_id: productId, enabled: true, per_week: 2 });
      expect(ok.error).toBeNull();
      const bad = await a.from('sov_schedule').update({ per_week: 4 }).eq('product_id', productId);
      expect(bad.error).not.toBeNull();
    });
  });
});
