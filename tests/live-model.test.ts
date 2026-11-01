import { test } from "node:test";
import assert from "node:assert/strict";
import { config } from "../src/server/config";
import { LiveModelAdapter, OLLAMA_URL } from "../src/server/model/live";
const output = {
  reply: "Em muốn chọn một khoảng nghỉ phù hợp vào lúc nào?",
  proposed_observations: [
    {
      group_id: "G01",
      status: "needs_clarification",
      summary: "Em muốn tìm hiểu thói quen dùng AI",
      frequency: null,
      reported_impact: null,
    },
  ],
  missing_information: ["Chưa rõ tần suất"],
  suggested_actions: [],
  source_ids: ["SRC-DOCX-1"],
  support_route: "none",
};
test("real LLM: config requires local tagged model and blocks cloud/pilot", () => {
  assert.throws(() => config({ MODEL_MODE: "live" }));
  assert.throws(() =>
    config({ MODEL_MODE: "live", OLLAMA_MODEL: "qwen3:cloud" }),
  );
  assert.throws(() =>
    config({ MODEL_MODE: "live", OLLAMA_MODEL: "https://evil/model" }),
  );
  assert.throws(() =>
    config({ MODEL_MODE: "live", OLLAMA_MODEL: "qwen3:4b", APP_MODE: "live" }),
  );
  assert.equal(
    config({ MODEL_MODE: "live", OLLAMA_MODEL: "qwen3:4b" }).MODEL_MODE,
    "live",
  );
});
test("real adapter pins loopback, sends grounded schema, validates output and propagates cancellation", async () => {
  const previous = {
    mode: process.env.MODEL_MODE,
    model: process.env.OLLAMA_MODEL,
  };
  process.env.MODEL_MODE = "live";
  process.env.OLLAMA_MODEL = "qwen3:4b";
  try {
    let calls = 0;
    const controller = new AbortController();
    const transport: typeof fetch = async (url, init) => {
      calls++;
      assert.equal(url, OLLAMA_URL + "/api/chat");
      assert.equal(init?.signal, controller.signal);
      assert.equal(init?.redirect, "error");
      const body = JSON.parse(String(init?.body));
      assert.equal(body.model, "qwen3:4b");
      assert.equal(body.stream, false);
      assert.equal(body.think, false);
      assert.equal(body.format.additionalProperties, false);
      assert.match(body.messages[0].content, /Không chẩn đoán/);
      assert.equal(
        body.messages[1].content,
        JSON.stringify({ selected_group: "G01", user_data: "DỮ LIỆU GIẢ" }),
      );
      assert.doesNotMatch(
        JSON.stringify(body),
        /demo-student|demo-school|api.key/i,
      );
      return Response.json({
        done: true,
        done_reason: "stop",
        message: { content: JSON.stringify(output) },
      });
    };
    const adapter = new LiveModelAdapter("qwen3:4b", transport);
    assert.deepEqual(
      await adapter.generate("DỮ LIỆU GIẢ", "G01", controller.signal),
      output,
    );
    assert.equal(calls, 1);
    for (const envelope of [
      { done: true, message: { content: "not JSON" } },
      {
        done: true,
        done_reason: "length",
        message: { content: JSON.stringify(output) },
      },
      {
        done: true,
        message: {
          content: JSON.stringify({ ...output, source_ids: ["FAKE"] }),
        },
      },
      {
        done: true,
        message: {
          content: JSON.stringify({
            ...output,
            proposed_observations: [
              { ...output.proposed_observations[0], group_id: "E01" },
            ],
          }),
        },
      },
    ])
      await assert.rejects(
        new LiveModelAdapter("qwen3:4b", async () =>
          Response.json(envelope),
        ).generate("fake", "G01"),
      );
    await assert.rejects(
      new LiveModelAdapter(
        "qwen3:4b",
        async () =>
          new Response("upstream secret/internal details", { status: 500 }),
      ).generate("fake", "G01"),
      /LLM_UNAVAILABLE/,
    );
  } finally {
    if (previous.mode === undefined) delete process.env.MODEL_MODE;
    else process.env.MODEL_MODE = previous.mode;
    if (previous.model === undefined) delete process.env.OLLAMA_MODEL;
    else process.env.OLLAMA_MODEL = previous.model;
  }
});
