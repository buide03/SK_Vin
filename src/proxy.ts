import { NextRequest, NextResponse } from "next/server";
import { demoAccess } from "./server/deployment";

export function proxy(req: NextRequest) {
  return demoAccess(req) ?? NextResponse.next();
}
export const config = { matcher: ["/((?!api/health$|_next/static|_next/image|favicon.ico).*)"] };
