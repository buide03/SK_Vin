import { classRoster } from "../../../server/classroom";
import { professionalWrite } from "../../../server/professional";
import { localOrigin } from "../../../server/privacy/origin";
import { cookies } from "next/headers";
import { getDb } from "../../../server/db";
import { Service, DomainError, type Identity } from "../../../server/service";
import { config } from "../../../server/config";
import { groups, sources } from "../../../content/catalog";
import { modelStatus } from "../../../server/model/factory";
async function context() {
  config();
  const db = await getDb();
  const token = (await cookies()).get("demo_session")?.value;
  const row = (
    await db.query<{ identity: Identity }>(
      "SELECT identity FROM demo_sessions WHERE token=$1 AND expires_at>now()",
      [token ?? ""],
    )
  ).rows[0];
  if (!row) throw new DomainError("Hãy chọn danh tính giả lập", 401);
  return { service: new Service(db), who: row.identity };
}
function failure(e: unknown) {
  return Response.json(
    {
      error:
        e instanceof DomainError
          ? e.message
          : "Cấu hình hoặc đầu vào không hợp lệ; chưa ghi dữ liệu.",
    },
    {
      status: e instanceof DomainError ? e.status : 400,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
export async function GET(req: Request) {
  try {
    const { service, who } = await context();
    const u = new URL(req.url);
    if (u.searchParams.get("report"))
      return Response.json(
        await service.report(
          who,
          u.searchParams.get("start") ?? "",
          u.searchParams.get("end") ?? "",
          classRoster.map((x) => x.id),
        ),
        { headers: { "Cache-Control": "no-store" } },
      );
    let rows: unknown[] = [];
    if (who.role === "student" || who.role === "counselor")
      rows = await service.profile(
        who,
        u.searchParams.get("student") ??
          (who.role === "counselor" ? classRoster[0].id : who.id),
      );
    if (who.role === "admin")
      rows = (
        await service.db.query(
          "SELECT * FROM records WHERE organization_id=$1 AND student_id='__content' AND kind='content_draft'",
          [who.org],
        )
      ).rows;
    return Response.json(
      { who, rows, groups, sources, model: await modelStatus() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request) {
  try {
    if (!localOrigin(req)) throw new DomainError("Origin không hợp lệ", 403);
    if (Number(req.headers.get("content-length") ?? 0) > 16000)
      throw new DomainError("Yêu cầu quá lớn", 413);
    const { service, who } = await context();
    const input = await req.json();
    return Response.json(
      await (who.role === "student"
        ? service.execute(who, input)
        : professionalWrite(service.db, who, input)),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
