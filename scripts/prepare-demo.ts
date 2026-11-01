import { request } from "@playwright/test";
async function main() {
  const api = await request.newContext({
    baseURL: "http://127.0.0.1:3000",
    extraHTTPHeaders: { Origin: "http://127.0.0.1:3000" },
  });
  try {
    const mode = await (await api.get("/api/model")).json();
    if (mode.mode !== "mock")
      throw Error("Chỉ nạp lớp mẫu khi đang chạy mock.");
    const login = await api.post("/api/demo", { data: { id: "demo-admin" } });
    if (!login.ok())
      throw Error("Chưa đăng nhập được tài khoản quản trị demo.");
    const seed = await api.post("/api/classroom");
    if (!seed.ok()) throw Error("Chưa nạp được dữ liệu giả.");
    const classroom = await (await api.get("/api/classroom")).json();
    const knowledge = await (await api.get("/api/knowledge")).json();
    console.log(
      JSON.stringify(
        {
          mode: mode.mode,
          class_size: classroom.roster.length,
          counts: classroom.counts,
          knowledge_groups: knowledge.entries.length,
          reference_sources: knowledge.sources.length,
        },
        null,
        2,
      ),
    );
  } finally {
    await api.dispose();
  }
}
void main().catch((e) => {
  console.error(e instanceof Error ? e.message : "Chưa chuẩn bị được demo.");
  process.exitCode = 1;
});
