import { modelStatus } from "../../../server/model/factory";
export async function GET() {
  try {
    return Response.json(await modelStatus(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(
      { ready: false, error: "Cấu hình model không hợp lệ; chưa kết nối LLM." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
