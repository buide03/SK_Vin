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
import { randomUUID } from "node:crypto";

test("teacher sees only current confirmed present groups after sharing consent, with no raw profile data", async () => {
  const db = await makeDb();
  try {
    const service = new Service(db), teacher = demoIdentities[3];
    const student = demoIdentities.find((who) => who.id === classRoster[0].id)!;
    let version = 0;
    const go = async (op: string, payload: unknown = {}) => {
      const result = await service.execute(student, { op, payload, version, key: randomUUID() });
      version = result.version;
      return result;
    };
    const visible = async () => (await classroomSummary(db, teacher)).student_groups!.find((r) => r.code === "HS01")!;
    assert.deepEqual((await visible()).groups, []);
    await go("consent", { accepted: true });
    const session = await go("session");
    await go("message", { session_id: session.id, sequence: 0, text: "Em dùng AI và khó dừng, ngủ muộn", group: "G01" });
    assert.deepEqual((await visible()).groups, []);
    let proposal = (await service.profile(student)).find((r) => r.kind === "proposal")!;
    const observation = { group_id: "G01", status: "reported_present", summary: "PRIVATE_SUMMARY_MARKER", frequency: "5 tối", reported_impact: "PRIVATE_IMPACT_MARKER" };
    await go("confirm", { proposal_id: proposal.id, observation });
    assert.deepEqual((await visible()).groups.map((g) => g.id), ["G01"]);
    assert.doesNotMatch(JSON.stringify((await classroomSummary(db, teacher)).student_groups), /PRIVATE_|summary|reported_impact|frequency/);
    assert.equal((await classroomSummary(db, demoIdentities[4])).student_groups, undefined);
    await db.query("UPDATE records SET data=data-'teacher_groups_allowed' WHERE student_id=$1 AND kind='consent'", [student.id]);
    assert.deepEqual((await visible()).groups, []);
    await go("consent", { accepted: true });
    assert.deepEqual((await visible()).groups.map((g) => g.id), ["G01"]);
    await go("message", { session_id: session.id, sequence: 1, text: "Em dùng AI và muốn sửa thông tin", group: "G01" });
    proposal = (await service.profile(student)).find((r) => r.kind === "proposal")!;
    await go("confirm", { proposal_id: proposal.id, observation: { ...observation, status: "reported_absent" } });
    assert.deepEqual((await visible()).groups, []);
    assert.equal((await visible()).reviewed, true);
    await go("withdraw");
    assert.equal((await visible()).reviewed, false);
    assert.deepEqual((await visible()).groups, []);
  } finally { await db.close(); }
});
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
