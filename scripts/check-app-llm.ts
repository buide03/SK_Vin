import { request } from "@playwright/test";
import { randomUUID } from "node:crypto";
async function main() {
  const api = await request.newContext({
    baseURL: "http://127.0.0.1:3000",
    extraHTTPHeaders: { Origin: "http://127.0.0.1:3000" },
    timeout: 180000,
  });
  // This dedicated whitelist identity exists only in the local smoke test.
  try {
    const login = await api.post("/api/demo", {
      data: { id: "demo-student-b" },
    });
    if (!login.ok()) throw Error("Login failed");
    let profile = await (await api.get("/api/app")).json();
    if (profile.rows.length)
      throw Error(
        "Smoke test requires empty demo-student-b; existing data is left intact.",
      );
    let version = 0;
    async function go(op: string, payload: unknown = {}) {
      const response = await api.post("/api/app", {
        data: { op, key: randomUUID(), version, payload },
      });
      const result = await response.json();
      if (!response.ok()) throw Error(result.error ?? "App request failed");
      version = result.version;
      return result;
    }
    await go("consent", { accepted: true });
    const session = await go("session");
    const start = Date.now();
    const result = await go("message", {
      session_id: session.id,
      sequence: 0,
      text: "DỮ LIỆU GIẢ: Em dùng AI tìm ý tưởng, đôi khi muốn dừng nhưng vẫn trò chuyện thêm và ngủ muộn. Em muốn chọn một khoảng nghỉ.",
      group: "G01",
    });
    if (result.response_origin !== "local_llm" || result.model !== "qwen3:4b")
      throw Error("Not a real local LLM reply");
    profile = await (await api.get("/api/app")).json();
    if (profile.rows.some((x: { kind: string }) => x.kind === "observation"))
      throw Error("Unconfirmed observation was persisted");
    console.log(
      JSON.stringify(
        {
          status: "app_real_llm_ok",
          model: result.model,
          duration_ms: Date.now() - start,
          reply: result.reply,
          proposals: result.proposed_observations.length,
          confirmed_observations: 0,
        },
        null,
        2,
      ),
    );
    await go("delete");
  } finally {
    await api.dispose();
  }
}
void main().catch((e) => {
  console.error(e instanceof Error ? e.message : "App live smoke failed");
  process.exitCode = 1;
});
