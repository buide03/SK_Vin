import { Pool, type PoolClient } from "pg";
import type { Database, SqlExecutor } from "./sql";
import { migrateDb } from "./db";

function executor(client: Pool | PoolClient): SqlExecutor {
  return {
    async query<T>(sql: string, params?: any[]) {
      const result = await client.query(sql, params);
      return { rows: result.rows as T[] };
    },
    async exec(sql: string) { await client.query(sql); },
  };
}

export async function ensureBackendPolicy(tx: SqlExecutor) {
  // Managed Postgres's owner is not a superuser. app_reader never inherits
  // this backend-only policy, so SET LOCAL ROLE retains student-scoped RLS.
  const owner = (await tx.query<{ name: string }>("SELECT current_user AS name")).rows[0].name;
  const identifier = `"${owner.replaceAll('"', '""')}"`;
  await tx.exec(`GRANT app_reader TO ${identifier}`);
  const policy = await tx.query("SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='records' AND policyname='service_backend_owner'");
  if (!policy.rows.length) {
    await tx.exec(`CREATE POLICY service_backend_owner ON records FOR ALL TO ${identifier} USING (true) WITH CHECK (true)`);
  }
}

export async function makePostgres(connectionString: string): Promise<Database> {
  const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000, statement_timeout: 15000, application_name: "sk-vin-demo" });
  pool.on("error", () => console.warn("PG_IDLE_CONNECTION_FAILED"));
  const db: Database = {
    ...executor(pool),
    async transaction(run) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        // Match PGlite's serialized writes, including during overlapping deploys.
        await client.query("SELECT pg_advisory_xact_lock(21760305)");
        const result = await run(executor(client));
        await client.query("COMMIT");
        return result;
      } catch (error) {
        try { await client.query("ROLLBACK"); } catch {}
        throw error;
      } finally { client.release(); }
    },
    async close() { await pool.end(); },
  };
  try {
    await db.transaction(async (tx) => {
      await migrateDb(tx);
      await ensureBackendPolicy(tx);
    });
    return db;
  } catch (error) {
    await db.close();
    // Codes aid deployment debugging without logging SQL, credentials or data.
    const code = (error as { code?: string }).code;
    console.warn("PG_INITIALIZATION_FAILED", /^[A-Z0-9_]{2,30}$/.test(code ?? "") ? code : "UNKNOWN");
    throw new Error("PostgreSQL chưa kết nối hoặc khởi tạo được.");
  }
}
