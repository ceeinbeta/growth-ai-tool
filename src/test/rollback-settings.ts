import postgres from "postgres";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";

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