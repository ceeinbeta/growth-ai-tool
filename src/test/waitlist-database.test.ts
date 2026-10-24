import { describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { WAITLIST_CONSENT } from '@/lib/waitlist';

function adminClient() {
  const url = process.env['SUPABASE_URL'], key = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  if (!url || !key) throw new Error('Missing test configuration');
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => { const headers = new Headers(init?.headers); if (key.startsWith('sb_')) headers.delete('Authorization'); headers.set('apikey', key); return fetch(input, { ...init, headers }); } } });
}
// Capture IDs before each RPC, then clean only newly-created submission IDs and
// unique fixture emails. Never touch pre-existing waitlist entries.
async function fixture(run: (a: ReturnType<typeof adminClient>, email: string) => Promise<void>) {
  const a = adminClient(), email = `waitlist-test-${randomUUID()}@example.com`;
  const before = await a.from('waitlist_submissions').select('id');
  if (before.error) throw before.error;
  const previous = new Set(before.data.map(row => row.id));
  try { await run(a, email); }
  finally {
    expect((await a.from('waitlist_signups').delete().eq('email', email)).error).toBeNull();
    const after = await a.from('waitlist_submissions').select('id');
    if (after.error) throw after.error;
    const added = after.data.filter(row => !previous.has(row.id)).map(row => row.id);
    if (added.length) expect((await a.from('waitlist_submissions').delete().in('id', added)).error).toBeNull();
  }
}
async function submit(a: ReturnType<typeof adminClient>, email: string, website = 'example.com') {
  const result = await a.rpc('submit_waitlist', { entry: { email, website, stage: 'idea', consent_text: WAITLIST_CONSENT } });
  expect(result.error).toBeNull(); return result.data;
}
describe.skipIf(process.env['PROFILE_INTEGRATION_TEST'] !== '1')('private waitlist database', () => {
  it('keeps both tables private with RLS and no policies or client privileges', async () => {
    const url = process.env['SUPABASE_DB_URL']; if (!url) throw new Error('Missing test connection');
    const sql = postgres(url, { max: 1 });
    try { for (const table of ['waitlist_signups', 'waitlist_submissions']) {
      expect((await sql`select relrowsecurity as enabled from pg_class where oid=${'public.' + table}::regclass`)[0]?.['enabled']).toBe(true);
      expect((await sql`select count(*)::int as n from pg_policy where polrelid=${'public.' + table}::regclass`)[0]?.['n']).toBe(0);
      for (const role of ['anon', 'authenticated']) {
        for (const privilege of ['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) expect((await sql`select has_table_privilege(${role},${'public.' + table},${privilege}) as allowed`)[0]?.['allowed']).toBe(false);
        expect((await sql`select has_function_privilege(${role},'public.submit_waitlist(jsonb)','EXECUTE') as allowed`)[0]?.['allowed']).toBe(false);
      }
    } } finally { await sql.end(); }
  });
  it('deduplicates casing and preserves original consent and details', async () => {
    await fixture(async (a,email) => {
      expect(await submit(a,email)).toBe(true); expect(await submit(a,email.toUpperCase(),'changed.com')).toBe(true);
      const rows=await a.from('waitlist_signups').select('*').eq('email',email);
      expect(rows.error).toBeNull(); expect(rows.data).toHaveLength(1); expect(rows.data?.[0]?.website).toBe('example.com'); expect(rows.data?.[0]?.consent_text).toBe(WAITLIST_CONSENT); expect(rows.data?.[0]?.consent_at).toBeTruthy();
    });
  });
  it('enforces exactly 20 submissions per rolling minute, counting duplicates', async () => {
    await fixture(async (a,email) => {
      const count=await a.from('waitlist_submissions').select('id',{count:'exact',head:true}).gt('created_at',new Date(Date.now()-60000).toISOString());
      expect(count.error).toBeNull();
      for(let i=count.count ?? 0;i<20;i++) expect(await submit(a,email)).toBe(true);
      expect(await submit(a,email)).toBe(false);
    });
  });
  it('enforces 200 per rolling hour and ignores expired attempts', async () => {
    await fixture(async (a,email) => {
      const count=await a.from('waitlist_submissions').select('id',{count:'exact',head:true}).gt('created_at',new Date(Date.now()-3600000).toISOString());
      expect(count.error).toBeNull();
      const rows=Array.from({length:199-(count.count ?? 0)},()=>({created_at:new Date(Date.now()-120000).toISOString()}));
      rows.push(...Array.from({length:20},()=>({created_at:new Date(Date.now()-7200000).toISOString()})));
      expect((await a.from('waitlist_submissions').insert(rows)).error).toBeNull();
      expect(await submit(a,email)).toBe(true); expect(await submit(a,email)).toBe(false);
    });
  });
});
