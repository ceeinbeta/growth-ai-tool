// Opt-in integration tests use a minted session and a temporary product, never demo rows.
import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import type { Database } from "../integrations/supabase/types";

describe.skipIf(process.env['PROFILE_INTEGRATION_TEST'] !== '1')("profile database rules", () => {
  it("enforces item caps, user ownership and membership access", async () => {
    const minted = JSON.parse(readFileSync(`${homedir()}/.cache/lovable-auth/session.json`, "utf8"));
    const url = process.env['SUPABASE_URL'];
    const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
    if (!url || !key) throw new Error("Missing integration test configuration");
    const client = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${minted.session.access_token}` } } });
    const ws = await client.from("workspaces").select("id").limit(1).single();
    if (!ws.data) throw new Error("No test workspace");
    const row = await client.from("products").insert({ workspace_id: ws.data.id, name: "Database rule verification", url: "verification.example.com", description: "Temporary rule verification", stage: "prelaunch" }).select("id").single();
    if (!row.data) throw new Error(row.error?.message ?? "Couldn't create test product");
    const pid = row.data.id;
    try {
      for (let i = 0; i < 8; i++) expect((await client.from("competitors").insert({ product_id: pid, name: `Competitor ${i}`, source: "ai" })).error).toBeNull();
      expect((await client.from("competitors").insert({ product_id: pid, name: "Ninth" })).error?.message).toContain("profile_item_limit_reached");
      expect((await client.from("competitors").select("source").eq("product_id", pid)).data?.every(c => c.source === "user")).toBe(true);
      for (let i = 0; i < 10; i++) expect((await client.from("sov_questions").insert({ product_id: pid, question: `Question ${i}?` })).error).toBeNull();
      expect((await client.from("sov_questions").insert({ product_id: pid, question: "Eleventh?" })).error?.message).toContain("profile_item_limit_reached");
      expect((await client.from("products").update({ one_liner: "Founder-written summary" }).eq("id", pid)).error).toBeNull();
      const edited = await client.from("products").select("profile_edited_fields,profile_source").eq("id", pid).single();
      expect(edited.data?.profile_edited_fields).toContain("one_liner");
      expect(edited.data?.profile_source).toBe("edited");
      expect((await client.from("ai_usage").insert({ product_id: pid, feature: "profile-product", model: "test" })).error).not.toBeNull();
      expect((await client.rpc("reserve_profile_run", { pid })).error).not.toBeNull();
      const anon = createClient<Database>(url, key, { auth: { persistSession: false }, global: { fetch: (input, init) => { const headers = new Headers(init?.headers); headers.delete("Authorization"); return fetch(input, { ...init, headers }); } } });
      const hidden = await anon.from("competitors").select("id").eq("product_id", pid);
      expect(hidden.data ?? []).toHaveLength(0);
    } finally {
      expect((await client.from("products").delete().eq("id", pid)).error).toBeNull();
    }
  }, 60000);
});