import { test } from "node:test";
import assert from "node:assert/strict";
import { makeDb } from "../src/server/db";
import { ensureBackendPolicy } from "../src/server/postgres";

test("non-superuser backend may write while app_reader remains scoped by student", async () => {
  const db = await makeDb();
  try {
    await db.exec(`CREATE ROLE demo_backend NOLOGIN NOSUPERUSER NOBYPASSRLS;
      GRANT app_reader TO demo_backend WITH ADMIN OPTION;
      ALTER TABLE records OWNER TO demo_backend;
      SET ROLE demo_backend;`);
    await ensureBackendPolicy(db);
    await ensureBackendPolicy(db);
    await db.query("INSERT INTO records(id,organization_id,student_id,kind,data) VALUES ('a','org','a','observation','{}'),('b','org','b','observation','{}')");
    assert.equal((await db.query("SELECT * FROM records")).rows.length, 2);
    let scoped: { student_id: string }[] = [];
    await assert.rejects(db.transaction(async (tx) => {
      await tx.query("SELECT set_config('app.organization_id','org',true),set_config('app.student_id','a',true)");
      await tx.exec("SET LOCAL ROLE app_reader");
      scoped = (await tx.query<{ student_id: string }>("SELECT student_id FROM records")).rows;
      await tx.query("INSERT INTO records(id,organization_id,student_id,kind,data) VALUES ('cross','org','b','observation','{}')");
    }), /row-level security/);
    assert.deepEqual(scoped, [{ student_id: "a" }]);
    assert.equal((await db.query("SELECT * FROM records")).rows.length, 2);
  } finally { await db.close(); }
});
