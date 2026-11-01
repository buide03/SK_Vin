import { createHash } from "node:crypto";
import type { PGlite } from "@electric-sql/pglite";
import type { Identity } from "./service";
import { DomainError } from "./errors";
import { observationWindow } from "./assessment/window";
export const classroom = {
  id: "demo-class-40",
  name: "Lớp mẫu",
  capacity: 40,
  organization_id: "demo-school",
};
export const classRoster = Array.from({ length: 40 }, (_, i) => ({
  id: `demo-class40-${String(i + 1).padStart(2, "0")}`,
  code: `HS${String(i + 1).padStart(2, "0")}`,
  demo: true,
}));
export function assignedStudents(who: Identity) {
  return who.role === "counselor" && who.org === classroom.organization_id
    ? classRoster.filter((_, i) => i % 2 === 0)
    : [];
}
function scope(who: Identity) {
  if (
    !["teacher", "counselor", "admin"].includes(who.role) ||
    who.org !== classroom.organization_id
  )
    throw new DomainError("Không có quyền xem lớp", 403);
}
export async function classroomSummary(db: PGlite, who: Identity) {
  scope(who);
  const ids = classRoster.map((x) => x.id);
  const rows = (
    await db.query<{
      kind: string;
      student_id: string;
      data: Record<string, any>;
    }>(
      "SELECT kind,student_id,data FROM records WHERE organization_id=$1 AND student_id=ANY($2::text[]) AND kind IN ('consent','observation','plan','checkin')",
      [who.org, ids],
    )
  ).rows;
  const unique = (kind: string, condition = (d: Record<string, any>) => true) =>
    new Set(
      rows
        .filter((r) => r.kind === kind && condition(r.data))
        .map((r) => r.student_id),
    ).size;
  const hide = (n: number) =>
    (n > 0 && n < 10) || (40 - n > 0 && 40 - n < 10) ? null : n;
  return {
    ...classroom,
    demo: true,
    roster: classRoster,
    assigned: assignedStudents(who),
    counts: {
      consented: hide(unique("consent", (d) => d.active)),
      confirmed: hide(
        unique("observation", (d) => d.current && !!d.student_confirmed_at),
      ),
      plans: hide(unique("plan", (d) => d.status === "selected")),
      responded: hide(unique("checkin")),
    },
    period: observationWindow(),
    privacy: "Ô nhỏ được ẩn. Giáo viên chỉ xem số liệu tổng hợp.",
  };
}
export async function seedClassroom(db: PGlite, who: Identity) {
  scope(who);
  if (who.role !== "admin")
    throw new DomainError("Chỉ quản trị được nạp dữ liệu giả", 403);
  await db.transaction(async (tx) => {
    for (const [index, student] of classRoster.entries()) {
      const existing = (
        await tx.query(
          "SELECT id FROM records WHERE organization_id=$1 AND student_id=$2 AND kind IN ('observation','consent') LIMIT 1",
          [who.org, student.id],
        )
      ).rows;
      if (existing.length) continue;
      const hash = createHash("sha256")
        .update("class40:" + student.id + ":plan")
        .digest("hex");
      const planId =
        hash.slice(0, 8) +
        "-" +
        hash.slice(8, 12) +
        "-4" +
        hash.slice(13, 16) +
        "-a" +
        hash.slice(17, 20) +
        "-" +
        hash.slice(20, 32);
      const put = async (kind: string, suffix: string, data: unknown) =>
        tx.query(
          "INSERT INTO records(id,organization_id,student_id,kind,data) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id,kind) DO NOTHING",
          [
            kind === "plan" ? planId : `class40:${student.id}:${suffix}`,
            who.org,
            student.id,
            kind,
            JSON.stringify(data),
          ],
        );
      await put("consent", "consent", {
        active: true,
        notice_version: "demo-1",
        external_model_allowed: false,
        demo: true,
      });
      for (const group of ["G01", "G02"])
        await put("observation", group, {
          group_id: group,
          indicator_id: group + "-I1",
          status: (group === "G01" ? index < 20 : index >= 10 && index < 30)
            ? "reported_present"
            : "reported_absent",
          summary: "Thông tin hoàn toàn giả để kiểm tra lớp 40 học sinh.",
          frequency: null,
          reported_impact: null,
          ...observationWindow(),
          source_type: "student_report",
          student_confirmed_at: new Date().toISOString(),
          current: true,
          rule_version: "1",
          demo: true,
        });
      if (index < 20) {
        await put("plan", "plan", {
          goal: "Chọn một khoảng nghỉ",
          action: "Thử một khoảng nghỉ tự chọn",
          frequency: "Một lần mỗi ngày",
          tracking: "Tự ghi nhận",
          fallback: "Thử khoảng ngắn hơn",
          group: "G01",
          status: "selected",
          review_at: new Date(Date.now() - 86400000).toISOString(),
          content_version: 1,
          content_status: "draft",
          demo: true,
        });
        if (index < 10)
          await put("checkin", "checkin", {
            plan_id: planId,
            outcome: "partly",
            note: "Dữ liệu giả",
            demo: true,
          });
      }
    }
  });
  return { ok: true, demo: true, capacity: 40 };
}
