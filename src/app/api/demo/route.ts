import { localOrigin } from "../../../server/privacy/origin";
import { deployment } from "../../../server/deployment";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { getDb } from "../../../server/db";
import { config } from "../../../server/config";
import { demoIdentities } from "../../../server/service";
export async function POST(req: Request) {
  try {
    config();
    if (!localOrigin(req))
      return Response.json({ error: "Origin không hợp lệ" }, { status: 403 });
    const { id } = z
      .object({ id: z.string() })
      .strict()
      .parse(await req.json());
    const identity = demoIdentities.find((x) => x.id === id);
    if (!identity)
      return Response.json(
        { error: "Danh tính demo không hợp lệ" },
        { status: 400 },
      );
    const token = randomBytes(32).toString("hex");
    await (
      await getDb()
    ).query(
      "INSERT INTO demo_sessions VALUES($1,$2,now()+interval '2 hours')",
      [token, JSON.stringify(identity)],
    );
    (await cookies()).set("demo_session", token, {
      httpOnly: true,
      sameSite: "strict",
      secure: Boolean(deployment().origin) || new URL(req.url).protocol === "https:",
      path: "/",
      maxAge: 7200,
    });
    return Response.json({ ok: true });
  } catch {
    return Response.json(
      { error: "Demo bị chặn hoặc đầu vào không hợp lệ" },
      { status: 400 },
    );
  }
}
