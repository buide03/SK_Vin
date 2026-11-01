import { PGlite } from "@electric-sql/pglite";
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { config } from "./config";
import { deployment } from "./deployment";
import type { Database, SqlExecutor } from "./sql";
declare global {
  var skdb: Promise<Database> | undefined;
}
export async function makeDb(location?: string) {
  if (location) await mkdir(path.dirname(location), { recursive: true });
  // PostgreSQL defaults include 128 MiB of shared buffers. This is a small
  // demo database, so cap its caches/workspaces separately from V8's heap.
  const db = new PGlite(location, {
    startParams: [
      ...PGlite.defaultStartParams,
      "-c", "shared_buffers=8MB",
      "-c", "work_mem=1MB",
      "-c", "maintenance_work_mem=16MB",
      "-c", "wal_buffers=1MB",
    ],
  });
  await db.waitReady;
  await db.transaction((tx) => migrateDb(tx));
  return db;
}
export async function migrateDb(db: SqlExecutor) {
  const exists = await db.query("SELECT to_regclass('public.records') AS name");
  if (!(exists.rows[0] as { name: string | null }).name)
    await db.exec(
      await readFile(
        path.join(process.cwd(), "db/migrations/001_initial.sql"),
        "utf8",
      ),
    );
  const partitions = await db.query(
    "SELECT to_regclass('public.observations') AS name",
  );
  if (!(partitions.rows[0] as { name: string | null }).name)
      await db.exec(
        await readFile(
          path.join(process.cwd(), "db/migrations/002_domain_partitions.sql"),
          "utf8",
        ),
      );
}
export function getDb() {
  const c = config();
  return (globalThis.skdb ??= (c.DB_BACKEND === "postgres" && process.env.SK_E2E !== "1"
    ? import("./postgres").then(({ makePostgres }) => makePostgres(c.DATABASE_URL!))
    : makeDb(
    path.join(
      deployment().dataDir,
      process.env.SK_E2E === "1" ? "e2e-pg" : "pg",
    ),
  )).catch((error) => { globalThis.skdb = undefined; throw error; }));
}
