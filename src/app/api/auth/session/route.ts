import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, currentUser, sessionToken } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!process.env.DATABASE_URL)
    return NextResponse.json(
      { mode: "demo", authenticated: false },
      { headers: { "Cache-Control": "no-store" } },
    );
  try {
    const user = await currentUser(req);
    const response = NextResponse.json(
      user
        ? { mode: "live", authenticated: true, user }
        : { mode: "live", authenticated: false },
      { headers: { "Cache-Control": "no-store" } },
    );
    // Remove a stale cookie after an account was deactivated or a session
    // was revoked, so the browser does not keep sending an unusable token.
    return user || !sessionToken(req) ? response : clearSessionCookie(response);
  } catch (error) {
    console.error(
      "Auth session read failed",
      error instanceof Error ? error.name : "UnknownError",
    );
    return NextResponse.json(
      { error: "Chưa kiểm tra được phiên đăng nhập." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
