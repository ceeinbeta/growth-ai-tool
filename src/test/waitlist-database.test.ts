import { describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { WAITLIST_CONSENT } from '@/lib/waitlist';

describe.skipIf(process.env['PROFILE_INTEGRATION_TEST'] !== '1')('private waitlist database', () => {
  async function rollbackTest(run: (sql: postgres.TransactionSql) => Promise<void>) {
    const url = process.env['SUPABASE_DB_URL'];
    if (!url) throw new Error('Missing database test configuration');
    const sql = postgres(url, { max: 1 });
    const rollback = new Error('intentional rollback');
    try { await sql.begin(async tx => { await tx`set local role service_role`; await tx`select pg_advisory_xact_lock(713590241)`; await run(tx); throw rollback; }); }
    catch (error) { if (error !== rollback) throw error; }
    finally { await sql.end(); }
  }
  it('keeps both tables private with RLS and no policies or client privileges', async () => {
    await rollbackTest(async sql => {
      for (const table of ['waitlist_signups', 'waitlist_submissions']) {
        expect((await sql`select relrowsecurity as enabled from pg_class where oid=${'public.' + table}::regclass`)[0]?.['enabled']).toBe(true);
        expect((await sql`select count(*)::int as n from pg_policy where polrelid=${'public.' + table}::regclass`)[0]?.['n']).toBe(0);
        for (const role of ['anon', 'authenticated']) {
          for (const privilege of ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']) expect((await sql`select has_table_privilege(${role},${'public.' + table},${privilege}) as allowed`)[0]?.['allowed']).toBe(false);
          expect((await sql`select has_function_privilege(${role}, 'public.submit_waitlist(jsonb)', 'EXECUTE') as allowed`)[0]?.['allowed']).toBe(false);
        }
      }
    });
  });
  it('deduplicates casing and preserves the original consent and details', async () => {
    await rollbackTest(async sql => {
      const email = `waitlist-test-${randomUUID()}@example.com`;
      const entry = { email, consent_text: WAITLIST_CONSENT, website: 'example.com', stage: 'idea' };
      expect((await sql`select public.submit_waitlist(${sql.json(entry)}::jsonb) as accepted`)[0]?.['accepted']).toBe(true);
      expect((await sql`select public.submit_waitlist(${sql.json({ ...entry, email: email.toUpperCase(), website: 'changed.com' })}::jsonb) as accepted`)[0]?.['accepted']).toBe(true);
      const rows = await sql`select email,website,consent_at,consent_text from public.waitlist_signups where email=${email}`;
      expect(rows).toHaveLength(1); expect(rows[0]?.['website']).toBe('example.com'); expect(rows[0]?.['consent_text']).toBe(WAITLIST_CONSENT); expect(rows[0]?.['consent_at']).toBeTruthy();
    });
  });
  it('enforces exactly 20 submissions per rolling minute, counting duplicates', async () => {
    await rollbackTest(async sql => {
      const count = Number((await sql`select count(*)::int as n from public.waitlist_submissions where created_at > now()-interval '1 minute'`)[0]?.['n']);
      if (count >= 20) throw new Error('Existing waitlist traffic prevents isolated minute test');
      const entry = { email: `waitlist-limit-${randomUUID()}@example.com`, consent_text: WAITLIST_CONSENT };
      for (let i = count; i < 20; i++) expect((await sql`select public.submit_waitlist(${sql.json(entry)}::jsonb) as accepted`)[0]?.['accepted']).toBe(true);
      expect((await sql`select public.submit_waitlist(${sql.json(entry)}::jsonb) as accepted`)[0]?.['accepted']).toBe(false);
    });
  });
  it('enforces exactly 200 submissions per rolling hour and ignores expired submissions', async () => {
    await rollbackTest(async sql => {
      const count = Number((await sql`select count(*)::int as n from public.waitlist_submissions where created_at > now()-interval '1 hour'`)[0]?.['n']);
      if (count >= 200) throw new Error('Existing waitlist traffic prevents isolated hour test');
      await sql`insert into public.waitlist_submissions(created_at) select now()-interval '2 minutes' from generate_series(1,${199-count})`;
      await sql`insert into public.waitlist_submissions(created_at) select now()-interval '2 hours' from generate_series(1,20)`;
      const entry = { email: `waitlist-hour-${randomUUID()}@example.com`, consent_text: WAITLIST_CONSENT };
      expect((await sql`select public.submit_waitlist(${sql.json(entry)}::jsonb) as accepted`)[0]?.['accepted']).toBe(true);
      expect((await sql`select public.submit_waitlist(${sql.json(entry)}::jsonb) as accepted`)[0]?.['accepted']).toBe(false);
    });
  });
});