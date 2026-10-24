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
    try { await sql.begin(async tx => {
      await tx`select pg_advisory_xact_lock(713590241)`;
      await run(tx); throw rollback;
    }); }
    catch (error) { if (error !== rollback) throw error; }
    finally { await sql.end(); }
  }
  async function submit(sql: postgres.TransactionSql, entry: Record<string, string>) {
    // The SQL test role can access fixture rows but cannot invoke service-only
    // RPCs. Execute the live function's body in this rollback transaction, while
    // independently asserting the real function's role grants above.
    const definition = (await sql`select pg_get_functiondef('public.submit_waitlist(jsonb)'::regprocedure) as definition`)[0]?.['definition'];
    if (typeof definition !== 'string') throw new Error('Missing live function');
    const body = definition.match(/AS \$function\$([\s\S]*?)\$function\$/)?.[1];
    if (!body) throw new Error('Cannot read live function body');
    await sql`select set_config('growloop.test_entry', ${JSON.stringify(entry)}, true)`;
    await sql.unsafe(`DO $test$ DECLARE entry jsonb := current_setting('growloop.test_entry')::jsonb; ${body.replace(/RETURN false;/g, "PERFORM set_config('growloop.test_result', 'false', true); RETURN;").replace(/RETURN true;/g, "PERFORM set_config('growloop.test_result', 'true', true); RETURN;")} $test$;`);
    return (await sql`select current_setting('growloop.test_result') as accepted`)[0]?.['accepted'] === 'true';
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
      expect(await submit(sql, entry)).toBe(true);
      expect(await submit(sql, { ...entry, email: email.toUpperCase(), website: 'changed.com' })).toBe(true);
      const rows = await sql`select email,website,consent_at,consent_text from public.waitlist_signups where email=${email}`;
      expect(rows).toHaveLength(1); expect(rows[0]?.['website']).toBe('example.com'); expect(rows[0]?.['consent_text']).toBe(WAITLIST_CONSENT); expect(rows[0]?.['consent_at']).toBeTruthy();
    });
  });
  it('enforces exactly 20 submissions per rolling minute, counting duplicates', async () => {
    await rollbackTest(async sql => {
      const count = Number((await sql`select count(*)::int as n from public.waitlist_submissions where created_at > now()-interval '1 minute'`)[0]?.['n']);
      if (count >= 20) throw new Error('Existing waitlist traffic prevents isolated minute test');
      const entry = { email: `waitlist-limit-${randomUUID()}@example.com`, consent_text: WAITLIST_CONSENT };
      for (let i = count; i < 20; i++) expect(await submit(sql, entry)).toBe(true);
      expect(await submit(sql, entry)).toBe(false);
    });
  });
  it('enforces exactly 200 submissions per rolling hour and ignores expired submissions', async () => {
    await rollbackTest(async sql => {
      const count = Number((await sql`select count(*)::int as n from public.waitlist_submissions where created_at > now()-interval '1 hour'`)[0]?.['n']);
      if (count >= 200) throw new Error('Existing waitlist traffic prevents isolated hour test');
      await sql`insert into public.waitlist_submissions(created_at) select now()-interval '2 minutes' from generate_series(1,${199-count})`;
      await sql`insert into public.waitlist_submissions(created_at) select now()-interval '2 hours' from generate_series(1,20)`;
      const entry = { email: `waitlist-hour-${randomUUID()}@example.com`, consent_text: WAITLIST_CONSENT };
      expect(await submit(sql, entry)).toBe(true);
      expect(await submit(sql, entry)).toBe(false);
    });
  });
});