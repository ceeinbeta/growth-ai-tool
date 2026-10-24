// Temporary users, workspaces and products only; everything is removed in finally.
import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

function keyed(key: string, token?: string): SupabaseClient<Database> {
  return createClient<Database>(process.env['SUPABASE_URL']!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => { const h = new Headers(init?.headers); if (key.startsWith('sb_')) h.delete('Authorization'); if (token) h.set('Authorization', `Bearer ${token}`); h.set('apikey', key); return fetch(input, { ...init, headers: h }); } },
  }) as SupabaseClient<Database>;
}
const admin = () => keyed(process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '');
const pub = () => process.env['SUPABASE_PUBLISHABLE_KEY'] ?? process.env['SUPABASE_ANON_KEY'] ?? '';

type Temp = { client: SupabaseClient<Database>; productId: string };
async function withTempUsers(run: (a: Temp, b: Temp) => Promise<void>) {
  const a = admin();
  const users: { id: string | null; email: string }[] = [];
  try {
    const temps: Temp[] = [];
    for (let i = 0; i < 2; i++) {
      const email = `pm-test-${randomUUID()}@example.com`, password = `Test-${randomUUID()}!x`;
      const u = { id: null as string | null, email }; users.push(u);
      expect((await a.from('allowed_emails').insert({ email })).error).toBeNull();
      const c = await a.auth.admin.createUser({ email, password, email_confirm: true }); if (c.error) throw c.error;
      u.id = c.data.user.id;
      const s = await keyed(pub()).auth.signInWithPassword({ email, password }); if (!s.data.session) throw s.error;
      const client = keyed(pub(), s.data.session.access_token);
      const ws = await a.from('members').select('workspace_id').eq('user_id', u.id).single();
      const p = await client.from('products').insert({ workspace_id: ws.data!.workspace_id, name: `pm-test ${i}`, url: 'pm-test.example.com', description: 'Temporary test product', stage: 'live' }).select('id').single();
      if (p.error) throw p.error;
      temps.push({ client, productId: p.data.id });
    }
    await run(temps[0]!, temps[1]!);
  } finally {
    for (const u of users) {
      if (u.id) {
        const m = await a.from('members').select('workspace_id').eq('user_id', u.id);
        for (const r of m.data ?? []) { await a.from('products').delete().eq('workspace_id', r.workspace_id); await a.from('workspaces').delete().eq('id', r.workspace_id); }
        await a.auth.admin.deleteUser(u.id);
      }
      await a.from('allowed_emails').delete().eq('email', u.email);
    }
  }
}

describe.skipIf(process.env['PROFILE_INTEGRATION_TEST'] !== '1')('product management database', () => {
  it('blocks another workspace from editing or deleting, and owner delete cascades', async () => {
    await withTempUsers(async (a, b) => {
      // B cannot edit or delete A's product.
      await b.client.from('products').update({ name: 'hijacked' }).eq('id', a.productId);
      expect((await admin().from('products').select('name').eq('id', a.productId).single()).data?.name).toBe('pm-test 0');
      expect((await b.client.rpc('delete_product_as_owner', { pid: a.productId })).error?.message).toContain('forbidden');
      expect((await b.client.rpc('reserve_logo_fetch', { pid: a.productId })).error?.message).toContain('forbidden');
      // Dependent rows, then owner delete removes them all.
      expect((await a.client.from('competitors').insert({ product_id: a.productId, name: 'pm-test rival' })).error).toBeNull();
      expect((await a.client.from('sov_questions').insert({ product_id: a.productId, question: 'pm-test question?' })).error).toBeNull();
      expect((await a.client.rpc('reserve_logo_fetch', { pid: a.productId })).error).toBeNull();
      expect((await a.client.rpc('delete_product_as_owner', { pid: a.productId })).error).toBeNull();
      const ad = admin();
      for (const t of ['competitors', 'sov_questions', 'logo_fetches'] as const) expect((await ad.from(t).select('id', { count: 'exact', head: true }).eq('product_id', a.productId)).count).toBe(0);
      expect((await ad.from('products').select('id').eq('id', a.productId)).data).toHaveLength(0);
    });
  }, 90000);

  it('limits logo fetches to 10 per product per hour', async () => {
    await withTempUsers(async (a) => {
      for (let i = 0; i < 10; i++) expect((await a.client.rpc('reserve_logo_fetch', { pid: a.productId })).error).toBeNull();
      expect((await a.client.rpc('reserve_logo_fetch', { pid: a.productId })).error?.message).toContain('logo_fetch_limit_reached');
    });
  }, 90000);
});
