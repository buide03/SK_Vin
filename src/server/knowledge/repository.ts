import type { Database } from "../sql";
import {
  referenceSources,
  knowledgeEntries,
  knowledgeMatrix,
  knowledgeVersion,
  type KnowledgeEntry,
} from "../../content/knowledge";
import type { Identity } from "../service";
import { config } from "../config";
const initialized = new WeakMap<Database, Map<string, Promise<void>>>();
export function ensureKnowledge(db: Database, org: string) {
  let organizations = initialized.get(db);
  if (!organizations) {
    organizations = new Map();
    initialized.set(db, organizations);
  }
  let pending = organizations.get(org);
  if (!pending) {
    pending = db
      .transaction(async (tx) => {
        for (const source of referenceSources)
          await tx.query(
            "INSERT INTO records(id,organization_id,student_id,kind,data) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id,kind) DO NOTHING",
            [
              `kb:${org}:${source.id}:${knowledgeVersion}`,
              org,
              "__knowledge",
              "source",
              JSON.stringify(source),
            ],
          );
        for (const entry of knowledgeEntries)
          await tx.query(
            "INSERT INTO records(id,organization_id,student_id,kind,data) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id,kind) DO NOTHING",
            [
              `kb:${org}:${entry.id}:${knowledgeVersion}`,
              org,
              "__knowledge",
              "knowledge",
              JSON.stringify(entry),
            ],
          );
      })
      .catch((e) => {
        organizations!.delete(org);
        throw e;
      });
    organizations.set(org, pending);
  }
  return pending;
}
function normalize(text: string) {
  return text
    .toLocaleLowerCase("vi")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}
export function selectKnowledge(
  entries: KnowledgeEntry[],
  query: string,
  confirmedGroups: string[] = [],
  allowDraft = true,
) {
  const text = normalize(query);
  return entries
    .filter(
      (e) => e.status === "approved" || (allowDraft && e.status === "draft"),
    )
    .map((e) => ({
      entry: e,
      matches:
        e.keywords.filter((k) => text.includes(normalize(k))).length +
        (confirmedGroups.includes(e.group_id) ? 1 : 0),
    }))
    .filter((x) => x.matches > 0)
    .sort(
      (a, b) => b.matches - a.matches || a.entry.id.localeCompare(b.entry.id),
    )
    .slice(0, 3)
    .map((x) => x.entry);
}
export async function retrieveKnowledge(
  db: Database,
  who: Identity,
  query: string,
  confirmedGroups: string[] = [],
) {
  const c = config();
  await ensureKnowledge(db, who.org);
  const rows = (
    await db.query<{ data: KnowledgeEntry }>(
      "SELECT data FROM records WHERE organization_id=$1 AND student_id='__knowledge' AND kind='knowledge' AND data->>'version'=$2 ORDER BY id",
      [who.org, knowledgeVersion],
    )
  ).rows;
  const entries = selectKnowledge(
    rows.map((x) => x.data),
    query.slice(0, 2000),
    confirmedGroups,
    c.APP_MODE === "demo",
  );
  const sourceIds = new Set([
    "REF-WHO-ADOLESCENT",
    "REF-UNICEF-AI",
    ...entries.flatMap((e) => e.source_ids),
  ]);
  return {
    version: knowledgeVersion,
    status: "draft",
    entries,
    sources: referenceSources.filter((s) => sourceIds.has(s.id)),
    comparison_matrix: knowledgeMatrix,
    limits:
      "Khung quan sát có thể chồng lấp, không là thang chẩn đoán; chưa đủ dữ liệu phải hỏi thêm. Từ khóa chỉ truy xuất tài liệu, không xác nhận dấu hiệu. Câu hỏi/hành động là bản nháp biên soạn, chưa được chuyên gia duyệt.",
  };
}
