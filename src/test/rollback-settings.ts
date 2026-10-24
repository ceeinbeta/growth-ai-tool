import postgres from "postgres";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";

export const canRollbackSettings = await (async () => {
  const url = process.env["SUPABASE_DB_URL"];
  if (!url || process.env["PROFILE_INTEGRATION_TEST"] !== "1") return false;
  const sql = postgres(url, { max: 1 });
  try {
    const rows = await sql`select has_function_privilege(current_user, 'public.admin_set_setting(text,integer)', 'EXECUTE') as allowed`;
    return rows[0]?.["allowed"] === true;
  } finally { await sql.end(); }
})();

// Settings checks never commit writes to shared rows, even on assertion failure.
export async function rollbackSettings(run: (sql: any) => Promise<void>) {
  const url = process.env["SUPABASE_DB_URL"];
  if (!url) throw new Error("Missing test connection");
  const session = JSON.parse(readFileSync(`${homedir()}/.cache/lovable-auth/session.json`, "utf8"));
  const sql = postgres(url, { max: 1 });
  const rollback = new Error("test rollback");
  try {
    await sql.begin(async (tx) => {
      await tx`select set_config('request.jwt.claim.sub', ${session.session.user.id}, true)`;
      await run(tx);
      throw rollback;
    }).catch((error) => { if (error !== rollback) throw error; });
  } finally { await sql.end(); }
}