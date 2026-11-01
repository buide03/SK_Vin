import { request } from "@playwright/test";
import { randomUUID } from "node:crypto";
async function main() {
  const api = await request.newContext({
    baseURL: "http://127.0.0.1:3000",
    extraHTTPHeaders: { Origin: "http://127.0.0.1:3000" },
    timeout: 120000,
  });
  try {
    const state = await (await api.get("/api/model")).json();
    if (state.mode !== "live" || state.provider !== "openai" || !state.ready)
      throw Error("OpenAI chưa sẵn sàng.");
    let profile: any,
      code = "";
    for (let i = 40; i >= 1; i--) {
      const id = `demo-class40-${String(i).padStart(2, "0")}`;
      const login = await api.post("/api/demo", { data: { id } });
      if (!login.ok()) continue;
      const candidate = await (await api.get("/api/app")).json();
      if (
        Array.isArray(candidate.rows) &&
        candidate.rows.every((r: any) => r.data.demo === true)
      ) {
        profile = candidate;
        code = `HS${String(i).padStart(2, "0")}`;
        break;
      }
    }
    if (!profile)
      throw Error("Không có hồ sơ mẫu sạch; giữ nguyên các hồ sơ đã dùng.");
    let version =
      profile.rows.find((r: any) => r.kind === "revision")?.version ?? 0;
    async function go(op: string, payload: unknown = {}) {
      const r = await api.post("/api/app", {
        data: { op, key: randomUUID(), version, payload },
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error ?? "Lỗi API ứng dụng");
      version = d.version;
      return d;
    }
    const before = new Set(
      profile.rows
        .filter((r: any) => r.kind === "observation")
        .map((r: any) => r.id),
    );
    await go("consent", { accepted: true });
    const session = await go("session");
    const started = Date.now();
    const message = await go("message", {
      session_id: session.id,
      sequence: 0,
      text: "Em muốn sửa thông tin trước đây: trong bảy ngày gần nhất em dùng AI tâm sự mỗi tối. Em nhiều lần định dừng lúc 22 giờ nhưng vẫn chat thêm khoảng 30 phút. Sau đó em ngủ muộn, sáng hôm sau mệt. Em muốn thử một khoảng nghỉ.",
      group: "G01",
    });
    if (message.response_origin !== "openai")
      throw Error("Phản hồi không đến từ OpenAI.");
    const after = await (await api.get("/api/app")).json();
    const observations = after.rows.filter(
      (r: any) => r.kind === "observation",
    );
    if (
      observations.length !== before.size ||
      observations.some((r: any) => !before.has(r.id))
    )
      throw Error("Quan sát được lưu khi chưa xác nhận.");
    console.log(
      JSON.stringify(
        {
          step: "chat",
          student_demo: code,
          reply: message.reply,
          groups: message.proposed_observations.map((o: any) => o.group_id),
        },
        null,
        2,
      ),
    );
    const proposal = after.rows.find(
      (r: any) => r.kind === "proposal" && r.data.group_id === "G01",
    );
    if (!proposal)
      throw Error(
        "Model đang cần thêm thông tin; chưa có nhận xét G01 để xác nhận.",
      );
    await go("confirm", {
      proposal_id: proposal.id,
      observation: {
        group_id: "G01",
        status: "reported_present",
        summary:
          "DỮ LIỆU GIẢ ĐÃ XÁC NHẬN: Khó dừng trò chuyện với AI vào buổi tối, ngủ muộn và mệt sáng hôm sau.",
        frequency: "Một số tối trong tuần",
        reported_impact: "Ngủ muộn, mệt vào buổi sáng",
      },
    });
    await go("plan", {
      group: "G01",
      option: 0,
      goal: "DỮ LIỆU GIẢ: thử một khoảng nghỉ buổi tối",
      frequency: "Ba tối trong tuần",
      tracking: "Tự đánh dấu sau mỗi lần",
      fallback: "Thử khoảng nghỉ ngắn hơn",
    });
    const withPlan = await (await api.get("/api/app")).json();
    const plan = withPlan.rows.filter((r: any) => r.kind === "plan").at(-1);
    if (!plan) throw Error("Chưa lưu được kế hoạch.");
    await go("checkin", {
      plan_id: plan.id,
      outcome: "partly",
      note: "DỮ LIỆU GIẢ: đã thử một lần.",
    });
    const verified = await (await api.get("/api/model")).json();
    console.log(
      JSON.stringify(
        {
          status: "app_openai_journey_ok",
          student_demo: code,
          model: message.model,
          response_origin: message.response_origin,
          chat_duration_ms: Date.now() - started,
          reply: message.reply,
          source_ids: message.source_ids,
          unconfirmed_auto_saved: false,
          confirmation: true,
          plan: true,
          checkin: true,
          connection_verified: verified.verified,
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
  console.error(
    e instanceof Error ? e.message : "Chưa hoàn tất kiểm tra luồng OpenAI.",
  );
  process.exitCode = 1;
});
