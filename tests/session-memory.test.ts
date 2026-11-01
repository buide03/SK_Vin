import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  recentMessages,
  rememberTurn,
  forgetStudent,
  forgetSession,
} from "../src/server/agent/session-memory";
import { makeDb } from "../src/server/db";
import { Service, demoIdentities } from "../src/server/service";
test("ephemeral memory is bounded, replay-safe and isolated by student/organization/session", () => {
  const a = { org: "memory-test", id: "a" },
    b = { org: "memory-test", id: "b" },
    session = randomUUID();
  for (let i = 0; i < 6; i++)
    rememberTurn(a, session, String(i), "user " + i, "assistant " + i);
  assert.equal(recentMessages(a, session).length, 6);
  rememberTurn(a, session, "5", "duplicate", "duplicate");
  assert.equal(recentMessages(a, session).length, 6);
  assert.equal(recentMessages(b, session).length, 0);
  assert.equal(recentMessages({ ...a, org: "other" }, session).length, 0);
  assert.equal(recentMessages(a, "other").length, 0);
  const copy = recentMessages(a, session);
  copy[0].content = "mutated";
  assert.notEqual(recentMessages(a, session)[0].content, "mutated");
  rememberTurn(b, session, "b", "b", "b");
  forgetStudent(a);
  assert.equal(recentMessages(a, session).length, 0);
  assert.equal(recentMessages(b, session).length, 2);
  forgetSession(b, session);
  assert.equal(recentMessages(b, session).length, 0);
});
test("follow-up receives recent context, close and withdrawal erase it without storing raw chat", async () => {
  const db = await makeDb();
  try {
    let context: any;
    const who = demoIdentities[0];
    const s = new Service(db, {
      generate: async (_t, _g, _signal, c) => {
        context = c;
        return {
          reply: "Em thường dùng vào lúc nào?",
          proposed_observations: [],
          missing_information: [],
          suggested_actions: [],
          source_ids: ["SRC-DOCX-1"],
          support_route: "none",
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
      text: "Em dùng AI và thấy khó dừng",
      group: "G01",
    });
    await go("message", {
      session_id: session.id,
      sequence: 1,
      text: "Vào ban đêm",
      group: "G01",
    });
    assert.equal(context.recent_messages.length, 2);
    assert.match(context.recent_messages[0].content, /AI/);
    assert.ok(context.knowledge.entries.some((x: any) => x.group_id === "G01"));
    assert.equal(
      (await s.profile(who)).some((r) => r.kind === "message"),
      false,
    );
    await go("message", {
      session_id: session.id,
      sequence: 2,
      text: "kết thúc",
      group: "G01",
    });
    assert.equal(recentMessages(who, session.id).length, 0);
    const next = await go("session");
    await go("message", {
      session_id: next.id,
      sequence: 0,
      text: "Em dùng AI",
      group: "G01",
    });
    await go("withdraw");
    assert.equal(recentMessages(who, next.id).length, 0);
    assert.equal((await s.profile(who)).length, 0);
  } finally {
    await db.close();
  }
});
