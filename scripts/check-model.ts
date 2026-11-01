import { createModel, modelStatus } from "../src/server/model/factory";
import { config } from "../src/server/config";
import { outputSchema } from "../src/server/model/adapter";
async function main() {
  if (config().MODEL_MODE !== "live")
    throw Error("MODEL_MODE phải là live để kiểm tra LLM thật.");
  const status = await modelStatus();
  if (!status.ready) throw Error(status.error ?? "LLM chưa sẵn sàng");
  const started = Date.now();
  const result = outputSchema.parse(
    await createModel().generate(
      "DỮ LIỆU GIẢ: Bảy ngày qua em dùng AI để tìm ý tưởng. Có hai tối em định dừng nhưng vẫn trò chuyện thêm, nên đi ngủ muộn. Em muốn thử một khoảng nghỉ.",
      "G01",
    ),
  );
  console.log(
    JSON.stringify(
      {
        status:
          config().MODEL_PROVIDER === "openai"
            ? "openai_llm_ok"
            : "real_local_llm_ok",
        model: status.model,
        duration_ms: Date.now() - started,
        reply: result.reply,
        groups: result.proposed_observations.map((x) => x.group_id),
        sources: result.source_ids,
      },
      null,
      2,
    ),
  );
}
void main().catch(() => {
  console.error(
    "Chưa xác nhận kết nối LLM thật. Kiểm tra API key, nhà cung cấp, model và cấu hình; không dùng mock thay thế.",
  );
  process.exitCode = 1;
});
