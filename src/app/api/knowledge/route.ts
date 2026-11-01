import { sessionIdentity } from "../../../server/privacy/session";
import {
  retrieveKnowledge,
  ensureKnowledge,
} from "../../../server/knowledge/repository";
import {
  knowledgeEntries,
  referenceSources,
  knowledgeVersion,
} from "../../../content/knowledge";
import { DomainError } from "../../../server/errors";
export async function GET(req: Request) {
  try {
    const { db, who } = await sessionIdentity();
    if (!["admin", "counselor", "teacher"].includes(who.role))
      throw new DomainError("Không có quyền tra cứu kho kiến thức", 403);
    await ensureKnowledge(db, who.org);
    const query = new URL(req.url).searchParams.get("q");
    if (query && query.length > 400)
      throw new DomainError("Câu tra cứu quá dài");
    return Response.json(
      query
        ? await retrieveKnowledge(db, who, query)
        : {
            version: knowledgeVersion,
            status: "draft",
            entries: knowledgeEntries,
            sources: referenceSources,
          },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof DomainError ? e.message : "Chưa đọc được kho kiến thức.",
      },
      {
        status: e instanceof DomainError ? e.status : 400,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
