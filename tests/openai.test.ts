import { test } from "node:test";
import assert from "node:assert/strict";
import { OpenAIModelAdapter, OPENAI_URL } from "../src/server/model/openai";
import { modelStatus } from "../src/server/model/factory";
import { makeDb } from "../src/server/db";
import { Service, demoIdentities } from "../src/server/service";
import { randomUUID } from "node:crypto";
const result = {
  reply: "Điều gì gần đây khiến em bận tâm nhất?",
  proposed_observations: [],
  missing_information: [],
  suggested_actions: [],
  source_ids: ["SRC-DOCX-1"],
  support_route: "none",
};
async function withEnv(run: () => Promise<void>) {
  const keys = [
    "MODEL_MODE",
    "MODEL_PROVIDER",
    "OPENAI_API_KEY",
    "ALLOW_EXTERNAL_MODEL",
  ];
  const previous = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  Object.assign(process.env, {
    MODEL_MODE: "live",
    MODEL_PROVIDER: "openai",
    OPENAI_API_KEY: "transport-test-placeholder-only",
    ALLOW_EXTERNAL_MODEL: "true",
  });
  try {
    await run();
  } finally {
    for (const k of keys) {
      if (previous[k] === undefined) delete process.env[k];
      else process.env[k] = previous[k];
    }
  }
}
test("OpenAI Responses request: key server-side, strict JSON, no stored response or identifiers", async () =>
  withEnv(async () => {
    let called = 0;
    const adapter = new OpenAIModelAdapter(async (url, options) => {
      called++;
      assert.equal(url, OPENAI_URL);
      assert.equal(options?.redirect, "error");
      const body = JSON.parse(String(options?.body));
      assert.equal(body.store, false);
      assert.equal(body.text.format.strict, true);
      assert.equal(body.text.format.schema.additionalProperties, false);
      assert.equal(body.reasoning.effort, "none");
      assert.ok(
        body.text.format.schema.properties.proposed_observations.items.required.includes(
          "frequency",
        ),
      );
      assert.doesNotMatch(
        JSON.stringify(body),
        /transport-test-placeholder|student_id|organization_id/,
      );
      return Response.json({
        status: "completed",
        output: [
          {
            type: "message",
            content: [{ type: "output_text", text: JSON.stringify(result) }],
          },
        ],
      });
    });
    assert.deepEqual(await adapter.generate("Dữ liệu giả", "G01"), result);
    assert.equal(called, 1);
    const status = await modelStatus();
    assert.equal(status.local, false);
    assert.doesNotMatch(JSON.stringify(status), /transport-test-placeholder/);
    for (const [code, message] of [
      [401, "không hợp lệ"],
      [429, "giới hạn"],
    ] as const)
      await assert.rejects(
        new OpenAIModelAdapter(
          async () => new Response("secret upstream details", { status: code }),
        ).generate("fake", "G01"),
        new RegExp(message),
      );
    delete process.env.OPENAI_API_KEY;
    await assert.rejects(
      adapter.generate("fake", "G01"),
      /Chưa có OPENAI_API_KEY/,
    );
    assert.equal(called, 1);
    process.env.OPENAI_API_KEY = "transport-test-placeholder-only";
    process.env.ALLOW_EXTERNAL_MODEL = "false";
    await assert.rejects(adapter.generate("fake", "G01"), /Chưa bật quyền/);
  }));
test("old local consent does not authorize OpenAI egress; student must reconfirm", async () =>
  withEnv(async () => {
    const db = await makeDb();
    try {
      await db.query(
        "INSERT INTO records(id,organization_id,student_id,kind,data) VALUES($1,$2,$3,$4,$5)",
        [
          randomUUID(),
          "demo-school",
          "demo-student-a",
          "consent",
          JSON.stringify({ active: true, notice_version: "demo-1" }),
        ],
      );
      let calls = 0;
      const s = new Service(db, {
          generate: async () => {
            calls++;
            return result;
          },
        }),
        who = demoIdentities[0];
      const go = (op: string, version: number, payload: unknown = {}) =>
        s.execute(who, { op, version, payload, key: randomUUID() });
      const session = await go("session", 0);
      await assert.rejects(
        go("message", 1, {
          session_id: session.id,
          sequence: 0,
          text: "Dữ liệu giả",
          group: "G01",
        }),
        /đồng ý/,
      );
      assert.equal(calls, 0);
      await go("consent", 1, { accepted: true });
      await go("message", 2, {
        session_id: session.id,
        sequence: 0,
        text: "Dữ liệu giả",
        group: "G01",
      });
      assert.equal(calls, 1);
    } finally {
      await db.close();
    }
  }));
