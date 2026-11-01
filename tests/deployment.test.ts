import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { deployment, demoAccess } from "../src/server/deployment";
import { localOrigin } from "../src/server/privacy/origin";
import { PGlite } from "@electric-sql/pglite";
import { mkdtemp, cp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { makeDb } from "../src/server/db";

test("empty build-time cluster resumes at a new location and applies runtime migrations", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "sk-vin-cluster-"));
  assert.equal(path.dirname(path.resolve(root)), path.resolve(tmpdir()));
  try {
    const template = await PGlite.create(path.join(root, "template"));
    assert.deepEqual((await template.query("SELECT tablename FROM pg_tables WHERE schemaname='public'")).rows, []);
    await template.close();
    await cp(path.join(root, "template"), path.join(root, "runtime"), { recursive: true });
    const resumed = await makeDb(path.join(root, "runtime"));
    try {
      assert.deepEqual((await resumed.query("SELECT * FROM records")).rows, []);
      assert.equal((await resumed.query<{ shared_buffers: string }>("SHOW shared_buffers")).rows[0].shared_buffers, "8MB");
      assert.equal((await resumed.query<{ work_mem: string }>("SHOW work_mem")).rows[0].work_mem, "1MB");
      assert.deepEqual((await resumed.query("SELECT * FROM demo_sessions")).rows, []);
      assert.equal((await resumed.query<{ name: string }>("SELECT to_regclass('public.observations') AS name")).rows[0].name, "observations");
    } finally { await resumed.close(); }
  } finally {
    // root is the mkdtemp child verified above, never an input data directory.
    await rm(root, { recursive: true, force: true });
  }
});

const hosted = { RENDER: "true", RENDER_EXTERNAL_URL: "https://demo.onrender.com", DATA_DIR: "/var/data", DEMO_ACCESS_PASSWORD: "test-password-only-1234567890" };
test("hosted demo fails closed and requires the shared credential", () => {
  const req = (value?: string) => new Request("https://demo.onrender.com", { headers: value ? { authorization: value } : {} });
  assert.equal(demoAccess(req(), hosted)?.status, 401);
  for (const value of ["Bearer x", "Basic !!", `Basic ${Buffer.from("demo:wrong").toString("base64")}`])
    assert.equal(demoAccess(req(value), hosted)?.status, 401);
  assert.equal(demoAccess(req(`Basic ${Buffer.from(`demo:${hosted.DEMO_ACCESS_PASSWORD}`).toString("base64")}`), hosted), undefined);
  assert.equal(demoAccess(req(), { ...hosted, DEMO_REQUIRE_ACCESS: "false", DEMO_ACCESS_PASSWORD: "" })?.status, 503);
  assert.equal(demoAccess(req(), {}), undefined);
});
test("deployment validates origin, disk path and isolates browser-test storage", () => {
  assert.equal(deployment(hosted).origin, hosted.RENDER_EXTERNAL_URL);
  assert.equal(deployment({ ...hosted, SK_E2E: "1" }).dataDir, path.join(process.cwd(), ".data"));
  for (const APP_ORIGIN of ["http://demo.example", "https://user:pass@demo.example", "https://demo.example/path", "https://demo.example?x=1"])
    assert.throws(() => deployment({ ...hosted, APP_ORIGIN }));
  assert.throws(() => deployment({ DATA_DIR: "relative" }));
  assert.throws(() => deployment({ ...hosted, DATA_DIR: "/tmp" }));
});
test("deployed writes accept only configured origin, ignoring spoofed forwarding headers", () => {
  const before = process.env.APP_ORIGIN;
  process.env.APP_ORIGIN = "https://demo.example";
  try {
    const req = (origin: string) => new Request("http://localhost/api/demo", { headers: { origin, host: "localhost", "x-forwarded-host": "evil.example" } });
    assert.equal(localOrigin(req("https://demo.example")), true);
    for (const origin of ["https://evil.example", "http://localhost", "https://demo.example.evil", "https://demo.example/"])
      assert.equal(localOrigin(req(origin)), false);
  } finally {
    if (before === undefined) delete process.env.APP_ORIGIN;
    else process.env.APP_ORIGIN = before;
  }
});
