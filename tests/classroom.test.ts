import { test } from "node:test";
import assert from "node:assert/strict";
import { makeDb } from "../src/server/db";
import {
  classRoster,
  seedClassroom,
  classroomSummary,
} from "../src/server/classroom";
import { Service, demoIdentities } from "../src/server/service";
import { observationWindow } from "../src/server/assessment/window";
import { ModelQueue } from "../src/server/model/queue";
test("40 independent students, seeded once, class counts and SQL match reference", async () => {
  const db = await makeDb();
  try {
    assert.ok(classRoster.every(s=>demoIdentities.some(identity=>identity.id===s.id&&identity.role==='student')));
    assert.equal(new Set(classRoster.map((x) => x.id)).size, 40);
    await seedClassroom(db, demoIdentities[4]);
    const before = (await db.query("SELECT id FROM records")).rows.length;
    await seedClassroom(db, demoIdentities[4]);
    assert.equal(
      (await db.query("SELECT id FROM records")).rows.length,
      before,
    );
    const summary = await classroomSummary(db, demoIdentities[3]);
    assert.deepEqual(summary.counts, {
      consented: 40,
      confirmed: 40,
      plans: 20,
      responded: 10,
    });
    const s = new Service(db);
    const window = observationWindow();
    const report = await s.report(
      demoIdentities[3],
      window.period_start,
      window.period_end,
      classRoster.map((x) => x.id),
    );
    assert.equal(report.suppressed, false);
    assert.equal(report.rows?.length, 2);
    for (const row of report.rows ?? [])
      assert.deepEqual(
        { numerator: row.numerator, denominator: row.denominator },
        { numerator: 20, denominator: 40 },
      );
    await assert.rejects(classroomSummary(db, demoIdentities[0]));
    await assert.rejects(
      classroomSummary(db, { ...demoIdentities[3], org: "other" }),
    );
    await assert.rejects(seedClassroom(db, demoIdentities[3]));
    await s.profile(demoIdentities[2], classRoster[2].id);
    await assert.rejects(s.profile(demoIdentities[2], classRoster[3].id));
  } finally {
    await db.close();
  }
});
test("40 mock calls use at most four concurrent model requests; canceled waiters leave queue", async () => {
  const queue = new ModelQueue(4),
    results: number[] = [];
  let active = 0,
    peak = 0;
  await Promise.all(
    Array.from({ length: 40 }, (_, i) =>
      queue.run(async () => {
        active++;
        peak = Math.max(peak, active);
        await new Promise((r) => setTimeout(r, 5));
        results.push(i);
        active--;
      }),
    ),
  );
  assert.equal(results.length, 40);
  assert.equal(peak, 4);
  const q = new ModelQueue(1);
  let release!: () => void;
  const first = q.run(() => new Promise<void>((r) => (release = r)));
  const abort = new AbortController();
  const second = q.run(
    async () => assert.fail("aborted job ran"),
    abort.signal,
  );
  abort.abort();
  await assert.rejects(second);
  release();
  await first;
  await q.run(async () => {});
});
