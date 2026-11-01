import { cookies } from "next/headers";
import { getDb } from "../db";
import { DomainError, type Identity } from "../service";
export async function sessionIdentity() {
  const db = await getDb();
  const token = (await cookies()).get("demo_session")?.value;
  const row = (
    await db.query<{ identity: Identity }>(
      "SELECT identity FROM demo_sessions WHERE token=$1 AND expires_at>now()",
      [token ?? ""],
    )
  ).rows[0];
  if (!row) throw new DomainError("Hãy chọn tài khoản demo", 401);
  return { db, who: row.identity };
}
