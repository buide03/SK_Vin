import { config } from "../config";
import { MockModelAdapter, type ModelAdapter } from "./adapter";
import { LiveModelAdapter, OLLAMA_URL } from "./live";
import { OpenAIModelAdapter } from "./openai";
import { openAIConnectionState } from "./connection-state";
export function createModel(): ModelAdapter {
  const c = config();
  return c.MODEL_MODE === "live"
    ? c.MODEL_PROVIDER === "openai"
      ? new OpenAIModelAdapter()
      : new LiveModelAdapter(c.OLLAMA_MODEL!)
    : new MockModelAdapter();
}
export async function modelStatus() {
  const c = config();
  if (c.MODEL_MODE === "mock")
    return {
      mode: "mock",
      ready: true,
      model: c.MODEL_PROVIDER === "openai" ? c.OPENAI_MODEL : null,
      local: true,
      provider: c.MODEL_PROVIDER,
    };
  if (c.MODEL_PROVIDER === "openai") {
    const connection = openAIConnectionState(c.OPENAI_API_KEY, c.OPENAI_MODEL);
    return {
      mode: "live",
      provider: "openai",
      ready: !!c.OPENAI_API_KEY && c.ALLOW_EXTERNAL_MODEL === "true",
      ...connection,
      model: c.OPENAI_MODEL,
      local: false,
      key_configured: !!c.OPENAI_API_KEY,
      error: !c.OPENAI_API_KEY
        ? "Chưa có API key. Thêm OPENAI_API_KEY vào .env.local."
        : c.ALLOW_EXTERNAL_MODEL !== "true"
          ? "Chưa bật ALLOW_EXTERNAL_MODEL=true."
          : connection.verified
            ? null
            : "Đã có cấu hình; cần kiểm tra kết nối thực.",
    };
  }
  try {
    const r = await fetch(OLLAMA_URL + "/api/tags", {
      signal: AbortSignal.timeout(3000),
      redirect: "error",
      cache: "no-store",
    });
    if (!r.ok) throw Error();
    const data = await r.json();
    const ready =
      Array.isArray(data.models) &&
      data.models.some(
        (m: { name?: string; model?: string }) =>
          m.name === c.OLLAMA_MODEL || m.model === c.OLLAMA_MODEL,
      );
    return {
      mode: "live",
      ready,
      model: c.OLLAMA_MODEL,
      local: true,
      error: ready ? null : "Chưa tải model đã cấu hình vào Ollama.",
    };
  } catch {
    return {
      mode: "live",
      ready: false,
      model: c.OLLAMA_MODEL,
      local: true,
      error: "Ollama chưa chạy tại 127.0.0.1:11434. Không tự chuyển về mock.",
    };
  }
}
