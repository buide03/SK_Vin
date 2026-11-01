import { randomUUID } from "node:crypto";
import { getDb } from "../../src/server/db";
import { seedContent } from "./content";
async function main() {
  const db = await getDb();
  try {
    await seedContent(db);
    await db.transaction(async (tx) => {
      for (const [id, states] of Object.entries({
        "fixture-multiple": [
          ["G01", "reported_present"],
          ["G02", "reported_present"],
        ],
        "fixture-absent": [
          ["G01", "reported_absent"],
          ["G02", "reported_absent"],
        ],
        "fixture-skipped": [["G01", "skipped"]],
        "fixture-conflicting": [["G01", "needs_clarification"]],
      })) {
        const existing = await tx.query(
          "SELECT id FROM records WHERE student_id=$1",
          [id],
        );
        if (existing.rows.length) continue;
        const put = async (kind: string, data: unknown) =>
          tx.query(
            "INSERT INTO records(id,organization_id,student_id,kind,data) VALUES($1,$2,$3,$4,$5)",
            [randomUUID(), "demo-school", id, kind, JSON.stringify(data)],
          );
        await put("consent", { active: true, notice_version: "fixture-only" });
        for (const [group, status] of states)
          await put("observation", {
            group_id: group,
            indicator_id: group + "-I1",
            status,
            current: true,
            summary: "DỮ LIỆU GIẢ: " + id,
            frequency: null,
            reported_impact: null,
            period_start: "2026-10-26",
            period_end: "2026-11-01",
            source_type: "student_report",
            student_confirmed_at: "2026-11-01T00:00:00Z",
            rule_version: "1",
          });
      }
    });
    console.log("Đã seed bốn hồ sơ hoàn toàn giả, idempotent.");
  } finally {
    await db.close();
  }
}
void main().catch(() => {
  console.error("Seed thất bại; không ghi dữ liệu ngoài giao dịch.");
  process.exitCode = 1;
});
