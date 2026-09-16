import { createHash, randomBytes } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { AuthUser } from "@/lib/auth-types";

type AuthUserRow = AuthUser & {
  passwordHash: string;
  passwordSalt: string;
  passwordAlgorithm: string;
};

export const SESSION_COOKIE = "lunch_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function sessionToken(req: NextRequest) {
  const value = req.cookies.get(SESSION_COOKIE)?.value;
  return value && /^[A-Za-z0-9_-]{40,64}$/.test(value) ? value : null;
}

export async function currentUser(req: NextRequest): Promise<AuthUser | null> {
  const token = sessionToken(req);
  if (!token) return null;
  const tokenHash = hashSessionToken(token);
  const rows = await db()`
    SELECT
      u.id,
      u.username,
      u.display_name AS "displayName",
      u.company_code AS "companyCode",
      u.must_change_password AS "mustChangePassword"
    FROM public.auth_sessions AS s
    JOIN public.internal_users AS u ON u.id = s.user_id
    WHERE s.token_hash = ${tokenHash}
      AND s.expires_at > now()
      AND u.is_active = true
    LIMIT 1
  `;
  return rows.length ? (rows[0] as AuthUser) : null;
}

export function attachSessionCookie(
  req: NextRequest,
  response: NextResponse,
  token: string,
) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: req.nextUrl.protocol === "https:",
    sameSite: "lax",
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
  });
  return response;
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    expires: new Date(0),
    maxAge: 0,
    sameSite: "lax",
    path: "/",
  });
  return response;
}

export function isSameOrigin(req: NextRequest) {
  return req.headers.get("origin") === req.nextUrl.origin;
}

export type { AuthUserRow };
