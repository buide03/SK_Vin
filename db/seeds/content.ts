import type { PGlite } from "@electric-sql/pglite";
import { groups, sources } from "../../src/content/catalog";
import { demoIdentities } from "../../src/server/service";
export async function seedContent(db: PGlite) {
  await db.transaction(async (tx) => {
    const put = async (id: string, kind: string, data: unknown) =>
      tx.query(
        "INSERT INTO records(id,organization_id,student_id,kind,data) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id,kind) DO NOTHING",
        [id, "demo-school", "__catalog", kind, JSON.stringify(data)],
      );
    await put("org-demo", "organization", {
      name: "Tổ chức giả lập",
      demo: true,
    });
    for (const who of demoIdentities) {
      await put("user-" + who.id, "user", { ...who, demo: true });
      await put("member-" + who.id, "membership", { ...who, demo: true });
    }
    await put("assignment-demo", "assignment", {
      counselor: "demo-counselor",
      student: "demo-student-a",
      demo: true,
    });
    for (const source of sources) await put(source.id, "source", source);
    for (const g of groups) {
      await put(g.id, "group_definition", {
        ...g,
        questions: undefined,
        actions: undefined,
      });
      await put(g.id + "-I1", "indicator", {
        group_id: g.id,
        core: true,
        status: "draft",
        version: 1,
        description: "Trải nghiệm tự báo cáo theo chủ đề, chưa được kiểm định",
      });
      for (const q of g.questions)
        await put(q.id, "question", { ...q, group_id: g.id });
      for (const [i, action] of g.actions.entries())
        await put(g.id + "-S" + i, "strategy", {
          group_id: g.id,
          text: action,
          status: "draft",
          version: 1,
          source_id: g.source_id,
          limitations: "Gợi ý nháp cần được duyệt",
        });
    }
  });
}
