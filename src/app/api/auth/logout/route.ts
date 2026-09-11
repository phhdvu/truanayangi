import { NextRequest, NextResponse } from "next/server";
import {
  clearSessionCookie,
  hashSessionToken,
  isSameOrigin,
  sessionToken,
} from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req))
    return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
  try {
    const token = sessionToken(req);
    if (token && process.env.DATABASE_URL)
      await db()`DELETE FROM public.auth_sessions WHERE token_hash = ${hashSessionToken(token)}`;
    const response = NextResponse.json(
      { authenticated: false },
      { headers: { "Cache-Control": "no-store" } },
    );
    return clearSessionCookie(response);
  } catch (error) {
    console.error(
      "Auth logout failed",
      error instanceof Error ? error.name : "UnknownError",
    );
    const response = NextResponse.json(
      { authenticated: false },
      { headers: { "Cache-Control": "no-store" } },
    );
    return clearSessionCookie(response);
  }
}
