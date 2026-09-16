import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  attachSessionCookie,
  createSessionToken,
  hashSessionToken,
  isSameOrigin,
  normalizeUsername,
  SESSION_TTL_SECONDS,
} from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { db } from "@/lib/db";
import type { AuthUser } from "@/lib/auth-types";
import type { AuthUserRow } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const loginSchema = z.object({
  username: z.string().trim().min(3).max(50),
  password: z.string().min(1).max(128),
});

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req))
    return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
  if (!process.env.DATABASE_URL)
    return NextResponse.json(
      { error: "Database chưa được cấu hình." },
      { status: 503 },
    );

  try {
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Nhập đúng tài khoản và mật khẩu nhé." },
        { status: 400 },
      );
    }
    const body = loginSchema.safeParse(raw);
    if (!body.success)
      return NextResponse.json(
        { error: "Nhập đúng tài khoản và mật khẩu nhé." },
        { status: 400 },
      );
    const username = normalizeUsername(body.data.username);
    if (!/^[a-z0-9][a-z0-9._-]{2,49}$/.test(username))
      return NextResponse.json(
        { error: "Tài khoản không hợp lệ." },
        { status: 400 },
      );

    const rows = await db()`
      SELECT
        id,
        username,
        display_name AS "displayName",
        company_code AS "companyCode",
        password_hash AS "passwordHash",
        password_salt AS "passwordSalt",
        password_algorithm AS "passwordAlgorithm",
        must_change_password AS "mustChangePassword"
      FROM public.internal_users
      WHERE username = ${username} AND is_active = true
      LIMIT 1
    `;
    const candidate = rows[0] as AuthUserRow | undefined;
    const valid = await verifyPassword(
      body.data.password,
      candidate && candidate.passwordAlgorithm === "scrypt-v1"
        ? candidate
        : undefined,
    );
    if (!candidate || !valid)
      return NextResponse.json(
        { error: "Tài khoản hoặc mật khẩu không đúng." },
        { status: 401 },
      );

    const token = createSessionToken();
    const tokenHash = hashSessionToken(token);
    await db().begin(async (sql) => {
      await sql`DELETE FROM public.auth_sessions WHERE expires_at <= now()`;
      await sql`
        INSERT INTO public.auth_sessions
          (id, user_id, token_hash, expires_at)
        VALUES
          (${crypto.randomUUID()}, ${candidate.id}, ${tokenHash}, now() + (${SESSION_TTL_SECONDS} * interval '1 second'))
      `;
      await sql`
        UPDATE public.internal_users
        SET last_login_at = now(), updated_at = now()
        WHERE id = ${candidate.id}
      `;
    });

    const user: AuthUser = {
      id: candidate.id,
      username: candidate.username,
      displayName: candidate.displayName,
      companyCode: candidate.companyCode,
      mustChangePassword: candidate.mustChangePassword,
    };
    const response = NextResponse.json(
      { mode: "live", authenticated: true, user },
      { headers: { "Cache-Control": "no-store" } },
    );
    return attachSessionCookie(req, response, token);
  } catch (error) {
    console.error(
      "Auth login failed",
      error instanceof Error ? error.name : "UnknownError",
    );
    return NextResponse.json(
      { error: "Chưa đăng nhập được. Hãy thử lại sau." },
      { status: 503 },
    );
  }
}
