import { assignedStudents } from "./classroom";
import type { PGlite } from "@electric-sql/pglite";
import { randomUUID, createHash } from "node:crypto";
import { z } from "zod";
import { DomainError, type Identity } from "./service";
import { groupIds } from "../content/catalog";
export async function professionalWrite(
  db: PGlite,
  who: Identity,
  input: unknown,
) {
  const r = z
    .object({
      op: z.enum(["review", "draft_content"]),
      key: z.string().uuid(),
      version: z.number().int().min(0),
      payload: z.record(z.string(), z.unknown()),
    })
    .strict()
    .parse(input);
  if (
    (r.op === "review" && who.role !== "counselor") ||
    (r.op === "draft_content" && who.role !== "admin")
  )
    throw new DomainError("Không có quyền thực hiện", 403);
  const p =
    r.op === "review"
      ? z
          .object({
            target: z
              .string()
              .refine(
                (value) =>
                  assignedStudents(who).some((x) => x.id === value) ||
                  (who.role === "counselor" &&
                    who.org === "demo-school" &&
                    value === "demo-student-a"),
                "Học sinh chưa được phân công",
              ),
            text: z.string().min(1).max(1000),
          })
          .strict()
          .parse(r.payload)
      : z
          .object({
            group: z.enum(groupIds),
            text: z.string().min(1).max(1000),
          })
          .strict()
          .parse(r.payload);
  const target = "target" in p ? p.target : "__content";
  const kind = r.op === "review" ? "review_note" : "content_draft";
  const key = who.org + ":" + who.id + ":" + r.key;
  const fingerprint = createHash("sha256")
    .update(JSON.stringify(r))
    .digest("hex");
  return db.transaction(async (tx) => {
    const prior = (
      await tx.query<{ fingerprint: string; result: unknown }>(
        "SELECT * FROM commands WHERE key=$1",
        [key],
      )
    ).rows[0];
    if (prior) {
      if (prior.fingerprint !== fingerprint)
        throw new DomainError("Khóa ghi lặp xung đột", 409);
      return prior.result;
    }
    const current = (
      await tx.query<{ n: number }>(
        "SELECT count(*)::int n FROM records WHERE organization_id=$1 AND student_id=$2 AND kind=$3",
        [who.org, target, kind],
      )
    ).rows[0].n;
    if (current !== r.version)
      throw new DomainError("Phiên bản đã thay đổi; tải lại", 409);
    if (
      r.op === "review" &&
      !(
        await tx.query(
          "SELECT id FROM records WHERE organization_id=$1 AND student_id=$2 AND kind='consent' AND data->>'active'='true'",
          [who.org, target],
        )
      ).rows.length
    )
      throw new DomainError("Hồ sơ chưa đồng thuận hoặc đã xóa", 403);
    await tx.query(
      "INSERT INTO records(id,organization_id,student_id,kind,data) VALUES($1,$2,$3,$4,$5)",
      [
        randomUUID(),
        who.org,
        target,
        kind,
        JSON.stringify({
          ...p,
          author: who.id,
          status: r.op === "draft_content" ? "draft" : "human_review",
          at: new Date().toISOString(),
        }),
      ],
    );
    const result = { ok: true, version: current + 1 };
    await tx.query("INSERT INTO commands VALUES($1,$2,$3,$4,$5)", [
      key,
      who.org,
      target,
      fingerprint,
      JSON.stringify(result),
    ]);
    return result;
  });
}
