import { config } from "../../../server/config";
import { deployment } from "../../../server/deployment";
import { getDb } from "../../../server/db";
import { ZodError } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  let phase = "config";
  try {
    config();
    phase = "deployment";
    deployment();
    phase = "database";
    await (await getDb()).query("SELECT 1");
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const code = error instanceof Error && error.message === "Thiếu hoặc sai DATABASE_URL cho PostgreSQL."
      ? "DATABASE_URL_INVALID" : `${phase.toUpperCase()}_UNAVAILABLE`;
    const fields = error instanceof ZodError ? [...new Set(error.issues.map((issue) => issue.path.join(".")))] : undefined;
    return Response.json({ ok: false, code, ...(fields ? { fields } : {}) }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
