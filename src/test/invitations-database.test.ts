import { describe, expect, it } from "vitest";
import postgres from "postgres";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../integrations/supabase/types";

const ROLLBACK = "growloop_test_rollback";
async function withRollback(run: (sql: postgres.TransactionSql) => Promise<void>) {
  const url = process.env['SUPABASE_DB_URL'];
  if (!url) throw new Error("Missing database integration configuration");
  const sql = postgres(url, { max: 1, connect_timeout: 10 });
  try {
    await expect(sql.begin(async tx => {
      await run(tx);
      throw new Error(ROLLBACK);
    })).rejects.toThrow(ROLLBACK);
  } finally { await sql.end(); }
}

describe.skipIf(process.env['PROFILE_INTEGRATION_TEST'] !== '1')("invite-only database rules", () => {
  it("stores exactly the initial invitation, lowercase-only, with RLS and no policies", async () => {
    await withRollback(async sql => {
      const rows = await sql`select email from public.allowed_emails order by email`;
      expect(rows.map(row => row.email)).toEqual(["mcileneveloria@gmail.com"]);
      expect((await sql`select relrowsecurity from pg_class where oid='public.allowed_emails'::regclass`)[0].relrowsecurity).toBe(true);
      expect((await sql`select count(*)::int as n from pg_policy where polrelid='public.allowed_emails'::regclass`)[0].n).toBe(0);
      await expect(sql.savepoint(tx => tx`insert into public.allowed_emails(email) values ('Upper@Example.com')`)).rejects.toMatchObject({ code: "23514" });
    });
  });

  it("allows listed emails case-insensitively and still creates the owner workspace", async () => {
    await withRollback(async sql => {
      const email = `invite-${randomUUID()}@example.com`, id = randomUUID();
      await sql`insert into public.allowed_emails(email) values (${email})`;
      await sql`insert into auth.users(id,email) values (${id},${email.toUpperCase()})`;
      const members = await sql`select m.role,w.name from public.members m join public.workspaces w on w.id=m.workspace_id where m.user_id=${id}`;
      expect(members).toHaveLength(1);
      expect(members[0].role).toBe("owner");
      expect(members[0].name.toLowerCase()).toBe(email.split("@")[0]);
    });
  });

  it("blocks an unlisted signup without creating an account or workspace", async () => {
    await withRollback(async sql => {
      const id = randomUUID();
      const before = (await sql`select count(*)::int as n from public.workspaces`)[0].n;
      await expect(sql.savepoint(tx => tx`insert into auth.users(id,email) values (${id},${`uninvited-${id}@example.com`})`)).rejects.toMatchObject({ message: "signup_not_allowed" });
      expect((await sql`select count(*)::int as n from auth.users where id=${id}`)[0].n).toBe(0);
      expect((await sql`select count(*)::int as n from public.workspaces`)[0].n).toBe(before);
    });
  });

  it("does not gate existing account updates after its invitation is removed", async () => {
    await withRollback(async sql => {
      const id = randomUUID(), email = `existing-${randomUUID()}@example.com`;
      await sql`insert into public.allowed_emails(email) values (${email})`;
      await sql`insert into auth.users(id,email) values (${id},${email})`;
      await sql`delete from public.allowed_emails where email=${email}`;
      await sql`update auth.users set last_sign_in_at=now() where id=${id}`;
      expect((await sql`select last_sign_in_at is not null as signed_in from auth.users where id=${id}`)[0].signed_in).toBe(true);
      expect((await sql`select count(*)::int as n from public.members where user_id=${id}`)[0].n).toBe(1);
    });
  });

  it("keeps the existing user's real session valid", async () => {
    const minted = JSON.parse(readFileSync(`${homedir()}/.cache/lovable-auth/session.json`, "utf8"));
    const url = process.env['SUPABASE_URL'], key = process.env['SUPABASE_PUBLISHABLE_KEY'];
    if (!url || !key) throw new Error("Missing authentication test configuration");
    const client = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const result = await client.auth.getUser(minted.session.access_token);
    expect(result.error).toBeNull();
    expect(result.data.user?.id).toBe(minted.session.user.id);
  });

  for (const role of ["anon", "authenticated"]) {
    it(`denies ${role} all allow-list reads and writes`, async () => {
      await withRollback(async sql => {
        for (const privilege of ["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE", "REFERENCES", "TRIGGER"]) {
          expect((await sql`select has_table_privilege(${role},'public.allowed_emails',${privilege}) as allowed`)[0].allowed).toBe(false);
        }
        await sql.unsafe(`set local role ${role}`);
        for (const query of [
          "select * from public.allowed_emails",
          "insert into public.allowed_emails(email) values ('permission-check@example.com')",
          "update public.allowed_emails set note='test' where email='permission-check@example.com'",
          "delete from public.allowed_emails where email='permission-check@example.com'",
        ]) await expect(sql.savepoint(tx => tx.unsafe(query))).rejects.toMatchObject({ code: "42501" });
      });
    });
  }
});

describe.skipIf(process.env['PROFILE_INTEGRATION_TEST'] !== '1')("atomic shared profiling limit", () => {
  it("allows 100 rolling runs, blocks the 101st, and ignores expired reservations", async () => {
    await withRollback(async sql => {
      await sql`select pg_advisory_xact_lock(hashtextextended('growloop:profile-reservation',0))`;
      const ws = randomUUID(), pid = randomUUID();
      await sql`insert into public.workspaces(id,name,max_products) values (${ws},'Temporary limit verification',100)`;
      await sql`insert into public.products(id,workspace_id,name,url,description,stage) values (${pid},${ws},'Limit target','example.com','Temporary test','prelaunch')`;
      const current = (await sql`select count(*)::int as n from public.profile_runs where created_at>now()-interval '24 hours'`)[0].n;
      expect(current).toBeLessThan(100);
      // Spread fixtures across products; no fixture exceeds the per-product cap.
      let remaining = 99 - current;
      while (remaining > 0) {
        const fixture = randomUUID(), count = Math.min(5, remaining);
        await sql`insert into public.products(id,workspace_id,name,url,description,stage) values (${fixture},${ws},'Limit fixture','example.com','Temporary test','prelaunch')`;
        await sql`insert into public.profile_runs(product_id) select ${fixture}::uuid from generate_series(1,${count})`;
        remaining -= count;
      }
      await sql`insert into public.profile_runs(product_id,created_at) select ${pid}::uuid,now()-interval '24 hours' from generate_series(1,100)`;
      const reservation = await sql`select public.reserve_profile_run(${pid}::uuid) as id`;
      expect(reservation[0].id).toMatch(/^[0-9a-f-]{36}$/);
      expect((await sql`select count(*)::int as n from public.profile_runs where created_at>now()-interval '24 hours'`)[0].n).toBe(100);
      await expect(sql.savepoint(tx => tx`select public.reserve_profile_run(${pid}::uuid)`)).rejects.toMatchObject({ message: "platform_profile_run_limit_reached" });
      expect((await sql`select count(*)::int as n from public.profile_runs where product_id=${pid} and created_at>now()-interval '24 hours'`)[0].n).toBe(1);
    });
  }, 60000);

  it("preserves the five-per-product rolling limit", async () => {
    await withRollback(async sql => {
      const ws = randomUUID(), pid = randomUUID();
      await sql`insert into public.workspaces(id,name) values (${ws},'Temporary product limit test')`;
      await sql`insert into public.products(id,workspace_id,name,url,description,stage) values (${pid},${ws},'Limit target','example.com','Temporary test','prelaunch')`;
      for (let i = 0; i < 5; i++) await sql`select public.reserve_profile_run(${pid}::uuid)`;
      await expect(sql.savepoint(tx => tx`select public.reserve_profile_run(${pid}::uuid)`)).rejects.toMatchObject({ message: "profile_run_limit_reached" });
      expect((await sql`select count(*)::int as n from public.profile_runs where product_id=${pid}`)[0].n).toBe(5);
    });
  });
});