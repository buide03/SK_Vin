import { sessionIdentity } from "../../../server/privacy/session";
import { classroomSummary, seedClassroom } from "../../../server/classroom";
import { localOrigin } from "../../../server/privacy/origin";
import { DomainError } from "../../../server/service";
function failure(error: unknown) {
  return Response.json(
    {
      error:
        error instanceof DomainError
          ? error.message
          : "Không thể đọc dữ liệu lớp.",
    },
    {
      status: error instanceof DomainError ? error.status : 400,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
export async function GET() {
  try {
    const { db, who } = await sessionIdentity();
    return Response.json(await classroomSummary(db, who), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request) {
  try {
    if (!localOrigin(req)) throw new DomainError("Origin không hợp lệ", 403);
    const { db, who } = await sessionIdentity();
    return Response.json(await seedClassroom(db, who), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return failure(e);
  }
}
