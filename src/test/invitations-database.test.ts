import { describe, expect, it } from "vitest";
import postgres from "postgres";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../integrations/supabase/types";

function client(admin = false, token?: string) {
  const url = process.env['SUPABASE_URL'];
  const key = process.env[admin ? 'SUPABASE_SERVICE_ROLE_KEY' : 'SUPABASE_PUBLISHABLE_KEY'];
  if (!url || !key) throw new Error("Missing integration test configuration");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storageKey: `test-${randomUUID()}` },
    global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (token) headers.set("Authorization", `Bearer ${token}`);
      else if (key.startsWith('sb_')) headers.delete("Authorization");
      headers.set("apikey", key);
      return fetch(input, { ...init, headers });
    } },
  });
}

// Auth uses its real admin API, not SQL writes to managed tables. Every fixture is
// removed in finally; tests never send an email or invoke an AI provider.
async function withInvitedUser(run: (admin: ReturnType<typeof client>, email: string, password: string, id: string) => Promise<void>) {
  const admin = client(true), email = `invite-${randomUUID()}@example.com`, password = randomUUID();
  let userId: string | undefined;
  const workspaceIds: string[] = [];
  try {
    expect((await admin.from("allowed_emails").insert({ email })).error).toBeNull();
    const created = await admin.auth.admin.createUser({ email: email.toUpperCase(), password, email_confirm: true });
    expect(created.error).toBeNull();
    if (!created.data.user) throw new Error("Allowed signup did not create a user");
    userId = created.data.user.id;
    const memberships = await admin.from("members").select("workspace_id").eq("user_id", userId);
    expect(memberships.error).toBeNull();
    workspaceIds.push(...(memberships.data ?? []).map(row => row.workspace_id));
    await run(admin, email, password, userId);
  } finally {
    if (userId) expect((await admin.auth.admin.deleteUser(userId)).error).toBeNull();
    for (const id of workspaceIds) expect((await admin.from("workspaces").delete().eq("id", id)).error).toBeNull();
    expect((await admin.from("allowed_emails").delete().eq("email", email)).error).toBeNull();
  }
}

describe.skipIf(process.env['PROFILE_INTEGRATION_TEST'] !== '1')("invite-only database rules", () => {
  it("starts with exactly the specified lowercase invitation and rejects uppercase storage", async () => {
    const admin = client(true);
    expect((await admin.from("allowed_emails").select("email")).data).toEqual([{ email: "mcileneveloria@gmail.com" }]);
    expect((await admin.from("allowed_emails").insert({ email: "Upper@Example.com" })).error?.code).toBe("23514");
  });

  it("allows listed emails case-insensitively and still creates the owner workspace", async () => {
    await withInvitedUser(async (admin, email, _password, id) => {
      const members = await admin.from("members").select("role,workspace_id").eq("user_id", id);
      expect(members.data).toHaveLength(1);
      const owner = members.data?.[0];
      expect(owner?.role).toBe("owner");
      if (!owner) throw new Error("Missing owner workspace");
      const workspace = await admin.from("workspaces").select("name").eq("id", owner.workspace_id).single();
      expect(workspace.data?.name.toLowerCase()).toBe(email.split("@")[0]);
    });
  }, 30000);

  it("blocks an unlisted signup without creating an account", async () => {
    const admin = client(true), email = `uninvited-${randomUUID()}@example.com`;
    const result = await admin.auth.admin.createUser({ email });
    // Clean even if the guard regresses and creates a user.
    if (result.data.user) {
      const ws = await admin.from("members").select("workspace_id").eq("user_id", result.data.user.id);
      await admin.auth.admin.deleteUser(result.data.user.id);
      for (const row of ws.data ?? []) await admin.from("workspaces").delete().eq("id", row.workspace_id);
    }
    expect(result.data.user).toBeNull();
    expect(result.error?.message).toMatch(/signup_not_allowed|database error creating new user|database error saving new user/i);
  });

  it("allows a real existing-user sign-in after its invitation is removed", async () => {
    await withInvitedUser(async (admin, email, password, id) => {
      expect((await admin.from("allowed_emails").delete().eq("email", email)).error).toBeNull();
      const member = client();
      const result = await member.auth.signInWithPassword({ email, password });
      expect(result.error).toBeNull();
      expect(result.data.user?.id).toBe(id);
      expect(result.data.session?.access_token).toBeTypeOf("string");
      await member.auth.signOut();
    });
  }, 30000);

  it("keeps RLS enabled, has no policies and denies every client table privilege", async () => {
    const url = process.env['SUPABASE_DB_URL'];
    if (!url) throw new Error("Missing database test configuration");
    const sql = postgres(url, { max: 1 });
    try {
      expect((await sql`select relrowsecurity as enabled from pg_class where oid='public.allowed_emails'::regclass`)[0]?.['enabled']).toBe(true);
      expect((await sql`select count(*)::int as n from pg_policy where polrelid='public.allowed_emails'::regclass`)[0]?.['n']).toBe(0);
      for (const role of ["anon", "authenticated"]) for (const privilege of ["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE", "REFERENCES", "TRIGGER"]) {
        expect((await sql`select has_table_privilege(${role},'public.allowed_emails',${privilege}) as allowed`)[0]?.['allowed']).toBe(false);
      }
    } finally { await sql.end(); }
  });

  for (const role of ["anon", "authenticated"]) it(`denies ${role} actual allow-list reads and writes`, async () => {
    const minted = JSON.parse(readFileSync(`${homedir()}/.cache/lovable-auth/session.json`, "utf8"));
    const restricted = client(false, role === "authenticated" ? minted.session.access_token : undefined);
    for (const result of [
      await restricted.from("allowed_emails").select("email"),
      await restricted.from("allowed_emails").insert({ email: "permission-check@example.com" }),
      await restricted.from("allowed_emails").update({ note: "test" }).eq("email", "permission-check@example.com"),
      await restricted.from("allowed_emails").delete().eq("email", "permission-check@example.com"),
    ]) expect(result.error?.code).toBe("42501");
  });
});

async function withProducts(run: (admin: ReturnType<typeof client>, createProduct: () => Promise<string>, ids: string[]) => Promise<void>) {
  const admin = client(true), ws = randomUUID(), ids: string[] = [];
  expect((await admin.from("workspaces").insert({ id: ws, name: "Temporary limit verification", max_products: 100 })).error).toBeNull();
  try {
    const createProduct = async () => {
      const id = randomUUID();
      expect((await admin.from("products").insert({ id, workspace_id: ws, name: "Limit fixture", url: "example.com", description: "Temporary test", stage: "prelaunch" })).error).toBeNull();
      ids.push(id);
      return id;
    };
    await run(admin, createProduct, ids);
  } finally {
    for (const id of ids) expect((await admin.from("products").delete().eq("id", id)).error).toBeNull();
    expect((await admin.from("workspaces").delete().eq("id", ws)).error).toBeNull();
  }
}

describe.skipIf(process.env['PROFILE_INTEGRATION_TEST'] !== '1')("atomic shared profiling limit", () => {
  it("preserves the five-per-product rolling limit", async () => {
    await withProducts(async (admin, createProduct) => {
      const pid = await createProduct();
      for (let i = 0; i < 5; i++) expect((await admin.rpc("reserve_profile_run", { pid })).error).toBeNull();
      expect((await admin.rpc("reserve_profile_run", { pid })).error?.message).toBe("profile_run_limit_reached");
      expect((await admin.from("profile_runs").select("id").eq("product_id", pid)).data).toHaveLength(5);
    });
  }, 30000);

  it("allows 100 rolling runs, atomically blocks the 101st across products, and ignores expired runs", async () => {
    await withProducts(async (admin, createProduct) => {
      const a = await createProduct(), b = await createProduct();
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const baseline = await admin.from("profile_runs").select("id", { count: "exact", head: true }).gt("created_at", since);
      expect(baseline.error).toBeNull();
      if (baseline.count === null) throw new Error("Missing reservation count");
      expect(baseline.count).toBeLessThan(100);
      let remaining = 99 - baseline.count;
      while (remaining > 0) {
        const pid = await createProduct(), n = Math.min(5, remaining);
        expect((await admin.from("profile_runs").insert(Array.from({ length: n }, () => ({ product_id: pid })))).error).toBeNull();
        remaining -= n;
      }
      const expired = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
      expect((await admin.from("profile_runs").insert(Array.from({ length: 100 }, () => ({ product_id: a, created_at: expired })))).error).toBeNull();
      const outcomes = await Promise.all([admin.rpc("reserve_profile_run", { pid: a }), admin.rpc("reserve_profile_run", { pid: b })]);
      expect(outcomes.filter(result => !result.error)).toHaveLength(1);
      expect(outcomes.filter(result => result.error?.message === "platform_profile_run_limit_reached")).toHaveLength(1);
      expect((await admin.from("profile_runs").select("id", { count: "exact", head: true }).gt("created_at", since)).count).toBe(100);
      expect((await admin.rpc("reserve_profile_run", { pid: b })).error?.message).toBe("platform_profile_run_limit_reached");
    });
  }, 90000);
});