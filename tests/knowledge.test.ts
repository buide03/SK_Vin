import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  knowledgeEntries,
  referenceSources,
  knowledgeMatrix,
} from "../src/content/knowledge";
import {
  selectKnowledge,
  ensureKnowledge,
  retrieveKnowledge,
} from "../src/server/knowledge/repository";
import { makeDb } from "../src/server/db";
import { Service, demoIdentities } from "../src/server/service";
import { MockModelAdapter } from "../src/server/model/adapter";
test("six groups have traceable references, boundaries and counter-examples; drafts cannot pass approved-only retrieval", () => {
  assert.equal(knowledgeEntries.length, 6);
  assert.equal(knowledgeMatrix.length, 6);
  assert.equal(referenceSources.length, 9);
  const ids = new Set(referenceSources.map((s) => s.id));
  assert.equal(ids.size, 9);
  for (const e of knowledgeEntries) {
    assert.equal(e.status, "draft");
    assert.ok(e.source_ids.length >= 2);
    assert.ok(e.source_ids.every((id) => ids.has(id)));
    assert.ok(e.insufficient_alone.length >= 2);
    assert.ok(e.differentiate.length >= 2);
  }
  for (const s of referenceSources) {
    assert.equal(new URL(s.url).protocol, "https:");
    assert.ok(s.population);
    assert.ok(s.limitations);
    assert.equal(s.status, "draft");
  }
  assert.equal(
    selectKnowledge(knowledgeEntries, "khó dừng AI", [], false).length,
    0,
  );
  assert.equal(
    selectKnowledge(knowledgeEntries, "khó dừng AI ngủ muộn")[0].group_id,
    "G01",
  );
  assert.equal(
    selectKnowledge(knowledgeEntries, "cô đơn, ít gặp bạn bè")[0].group_id,
    "G02",
  );
});
test("knowledge is SQL-persisted once per organization, query-safe and excludes student records", async () => {
  const db = await makeDb();
  try {
    await ensureKnowledge(db, "demo-school");
    await ensureKnowledge(db, "demo-school");
    assert.equal(
      (await db.query("SELECT * FROM records WHERE student_id='__knowledge'"))
        .rows.length,
      15,
    );
    await ensureKnowledge(db, "other");
    assert.equal(
      (await db.query("SELECT * FROM records WHERE student_id='__knowledge'"))
        .rows.length,
      30,
    );
    const bundle = await retrieveKnowledge(
      db,
      demoIdentities[0],
      "AI hỏi sức khỏe nhiều lần rồi lo lắng",
    );
    assert.ok(bundle.entries.some((x) => x.group_id === "G03"));
    assert.ok(bundle.sources.some((s) => s.id === "REF-ZHAI-2026"));
    assert.ok(bundle.entries.length <= 3);
    const malicious = await retrieveKnowledge(
      db,
      demoIdentities[0],
      "'; DROP TABLE records; --",
    );
    assert.equal(malicious.entries.length, 0);
    assert.equal((await db.query("SELECT * FROM records")).rows.length, 30);
  } finally {
    await db.close();
  }
});
test("orchestrator passes retrieved comparison context and rejects a known but unretrieved citation", async () => {
  const db = await makeDb();
  try {
    const who = demoIdentities[0];
    let context: any;
    let bad = false;
    const s = new Service(db, {
      generate: async (_text, _group, _signal, c) => {
        context = c;
        return {
          reply: "Em cảm thấy thế nào sau khi hỏi AI?",
          proposed_observations: [],
          missing_information: [],
          suggested_actions: [],
          support_route: "none",
          source_ids: [bad ? "REF-FOLK-2026" : "REF-ZHAI-2026"],
        };
      },
    });
    let version = 0;
    async function go(op: string, payload: unknown = {}) {
      const r = await s.execute(who, {
        op,
        payload,
        version,
        key: randomUUID(),
      });
      version = r.version;
      return r;
    }
    await go("consent", { accepted: true });
    const session = await go("session");
    await go("message", {
      session_id: session.id,
      sequence: 0,
      text: "Em hỏi AI về sức khỏe rồi lo lắng thêm",
      group: "G01",
    });
    assert.equal(context.knowledge.comparison_matrix.length, 6);
    assert.ok(context.knowledge.entries.some((e: any) => e.group_id === "G03"));
    assert.doesNotMatch(JSON.stringify(context), /demo-student|demo-school/);
    bad = true;
    await assert.rejects(
      go("message", {
        session_id: session.id,
        sequence: 1,
        text: "Em hỏi AI về sức khỏe",
        group: "G01",
      }),
    );
    assert.equal(
      (await s.profile(who)).filter((x) => x.kind === "observation").length,
      0,
    );
  } finally {
    await db.close();
  }
});
test("general distress stays outside AI framework; mock supports overlapping groups without confirming them", async () => {
  const m = new MockModelAdapter();
  const context = { stage: "initial_context", confirmed_observations: [] };
  const general = await m.generate(
    "Em buồn vì vừa chuyển trường",
    "G01",
    undefined,
    context,
  );
  assert.equal(general.proposed_observations.length, 0);
  const multiple = await m.generate(
    "Em dùng AI khó dừng, ngủ muộn, ít gặp bạn bè và cô đơn",
    "G01",
    undefined,
    context,
  );
  assert.ok(multiple.proposed_observations.some((o) => o.group_id === "G01"));
  assert.ok(multiple.proposed_observations.some((o) => o.group_id === "G02"));
  assert.ok(
    multiple.proposed_observations.every(
      (o) => o.status === "needs_clarification",
    ),
  );
});
