import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { makeDb } from "../src/server/db";
import { Service, demoIdentities } from "../src/server/service";
import { localOrigin } from "../src/server/privacy/origin";
import { MockModelAdapter } from "../src/server/model/adapter";
test("slow LLM does not lock withdrawal, and revoked consent rejects in-flight results", async () => {
  const db = await makeDb();
  try {
    let started!: () => void, release!: (value: unknown) => void;
    const began = new Promise<void>((resolve) => {
      started = resolve;
    });
    const s = new Service(db, {
        generate: () => {
          started();
          return new Promise((resolve) => {
            release = resolve;
          });
        },
      }),
      who = demoIdentities[0];
    const command = (op: string, version: number, payload: unknown = {}) => ({
      op,
      version,
      payload,
      key: randomUUID(),
    });
    await s.execute(who, command("consent", 0, { accepted: true }));
    const session = await s.execute(who, command("session", 1));
    const pending = s.execute(
      who,
      command("message", 2, {
        session_id: session.id,
        sequence: 0,
        text: "Dữ liệu giả",
        group: "G01",
      }),
    );
    await began;
    await s.execute(who, command("withdraw", 2));
    release(await new MockModelAdapter().generate("Dữ liệu giả", "G01"));
    await assert.rejects(pending);
    assert.equal((await s.profile(who)).length, 0);
  } finally {
    await db.close();
  }
});
test("origin: loopback Host matches browser Origin; untrusted origins denied", () => {
  assert.ok(
    localOrigin(
      new Request("http://localhost:3000/api/app", {
        headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000" },
      }),
    ),
  );
  for (const origin of ["http://evil.example", "null", "http://127.0.0.1:4000"])
    assert.equal(
      localOrigin(
        new Request("http://localhost:3000", {
          headers: { host: "127.0.0.1:3000", origin },
        }),
      ),
      false,
    );
});
test("replacement, snapshots, retries and deletion clear all derived data", async () => {
  const db = await makeDb();
  try {
    const s = new Service(db),
      a = demoIdentities[0];
    let v = 0;
    const go = async (op: string, payload: unknown = {}) => {
      const r = await s.execute(a, {
        op,
        payload,
        key: randomUUID(),
        version: v,
      });
      v = r.version;
      return r;
    };
    await go("consent", { accepted: true });
    const session = await go("session");
    for (let i = 0; i < 2; i++) {
      await go("message", {
        session_id: session.id,
        sequence: i,
        text: i ? "Thật ra em muốn sửa lời kể về AI" : "Em chưa rõ về AI",
        group: "G01",
      });
      const proposal = (await s.profile(a)).find((x) => x.kind === "proposal")!;
      await go("confirm", {
        proposal_id: proposal.id,
        observation: {
          group_id: "G01",
          summary: i ? "Em xác nhận không có" : "Em xác nhận có",
          status: i ? "reported_absent" : "reported_present",
          frequency: null,
          reported_impact: null,
        },
      });
    }
    let rows = await s.profile(a);
    assert.equal(rows.filter((x) => x.kind === "observation").length, 2);
    assert.equal(
      rows.filter((x) => x.kind === "observation" && x.data.current).length,
      1,
    );
    assert.equal(rows.filter((x) => x.kind === "snapshot").length, 2);
    await go("plan", {
      group: "G01",
      option: 0,
      goal: "Mục tiêu A",
      frequency: "một lần",
      tracking: "ghi chú",
      fallback: "thử lại",
    });
    rows = await s.profile(a);
    const plan = rows.find((x) => x.kind === "plan")!;
    await go("edit_plan", {
      plan_id: plan.id,
      status: "declined",
      goal: "Đổi ý",
      frequency: "không áp dụng",
      tracking: "không áp dụng",
      fallback: "chọn sau",
    });
    await go("support", { requested: true });
    await go("delete");
    assert.equal((await s.profile(a)).length, 0);
    assert.equal((await db.query("SELECT * FROM commands")).rows.length, 0);
  } finally {
    await db.close();
  }
});
test("DB failure returns no fabricated success", async () => {
  const db = await makeDb();
  const s = new Service(db);
  await db.close();
  await assert.rejects(s.profile(demoIdentities[0]));
});
