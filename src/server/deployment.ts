import path from "node:path";
import { createHash, timingSafeEqual } from "node:crypto";

type Env = Record<string, string | undefined>;
export function deployment(env: Env = process.env) {
  const hosted = env.RENDER === "true";
  if (env.DEMO_REQUIRE_ACCESS && !["true", "false"].includes(env.DEMO_REQUIRE_ACCESS))
    throw new Error("DEMO_REQUIRE_ACCESS không hợp lệ");
  const protectedDemo = hosted || env.DEMO_REQUIRE_ACCESS === "true";
  if (protectedDemo && (env.DEMO_ACCESS_PASSWORD?.length ?? 0) < 24)
    throw new Error("DEMO_ACCESS_PASSWORD cần ít nhất 24 ký tự");
  const rawOrigin = env.APP_ORIGIN || env.RENDER_EXTERNAL_URL;
  let origin: string | undefined;
  if (rawOrigin) {
    const url = new URL(rawOrigin);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/")
      throw new Error("APP_ORIGIN cần origin HTTPS, không có đường dẫn");
    origin = url.origin;
  }
  if (hosted && !origin) throw new Error("Thiếu origin Render");
  if (env.DATA_DIR && !path.isAbsolute(env.DATA_DIR)) throw new Error("DATA_DIR cần đường dẫn tuyệt đối");
  if (hosted && env.DATA_DIR !== "/var/data") throw new Error("Render cần disk tại /var/data");
  return { protectedDemo, origin, dataDir: env.SK_E2E === "1" ? path.join(process.cwd(), ".data") : env.DATA_DIR || path.join(process.cwd(), ".data") };
}

export function demoAccess(req: Request, env: Env = process.env): Response | undefined {
  let settings;
  try { settings = deployment(env); }
  catch { return new Response("Cấu hình triển khai chưa hợp lệ", { status: 503 }); }
  if (!settings.protectedDemo) return;
  const header = req.headers.get("authorization") ?? "";
  const digest = (s: string) => createHash("sha256").update(s).digest();
  if (/^Basic [A-Za-z0-9+/]+={0,2}$/.test(header)) {
    const supplied = Buffer.from(header.slice(6), "base64").toString("utf8");
    if (timingSafeEqual(digest(supplied), digest(`demo:${env.DEMO_ACCESS_PASSWORD}`))) return;
  }
  return new Response("Đăng nhập bằng mật khẩu demo", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Agent tu van demo", charset="UTF-8"', "Cache-Control": "no-store" },
  });
}
