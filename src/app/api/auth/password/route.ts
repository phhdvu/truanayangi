import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  currentUser,
  isSameOrigin,
  sessionToken,
  hashSessionToken,
} from "@/lib/auth";
import {
  hashPassword,
  INITIAL_PASSWORD,
  verifyPassword,
} from "@/lib/password";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const passwordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(128),
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
    const user = await currentUser(req);
    if (!user)
      return NextResponse.json(
        { error: "Phiên đăng nhập đã hết. Hãy đăng nhập lại." },
        { status: 401 },
      );
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Mật khẩu mới cần có ít nhất 8 ký tự." },
        { status: 400 },
      );
    }
    const body = passwordSchema.safeParse(raw);
    if (!body.success)
      return NextResponse.json(
        { error: "Mật khẩu mới cần có ít nhất 8 ký tự." },
        { status: 400 },
      );
    if (body.data.newPassword === INITIAL_PASSWORD)
      return NextResponse.json(
        { error: "Hãy chọn mật khẩu mới, không dùng lại mật khẩu mặc định." },
        { status: 400 },
      );

    const rows = await db()`
      SELECT
        password_hash AS "passwordHash",
        password_salt AS "passwordSalt",
        password_algorithm AS "passwordAlgorithm"
      FROM public.internal_users
      WHERE id = ${user.id} AND is_active = true
      LIMIT 1
    `;
    const record = rows[0] as {
      passwordHash: string;
      passwordSalt: string;
      passwordAlgorithm: string;
    } | undefined;
    if (!record || record.passwordAlgorithm !== "scrypt-v1")
      return NextResponse.json(
        { error: "Tài khoản chưa có cấu hình mật khẩu hợp lệ." },
        { status: 400 },
      );
    if (!(await verifyPassword(body.data.currentPassword, record)))
      return NextResponse.json(
        { error: "Mật khẩu hiện tại không đúng." },
        { status: 400 },
      );
    if (await verifyPassword(body.data.newPassword, record))
      return NextResponse.json(
        { error: "Mật khẩu mới phải khác mật khẩu hiện tại." },
        { status: 400 },
      );

    const hashed = await hashPassword(body.data.newPassword);
    const token = sessionToken(req);
    const tokenHash = token ? hashSessionToken(token) : null;
    await db().begin(async (sql) => {
      await sql`
        UPDATE public.internal_users
        SET
          password_hash = ${hashed.passwordHash},
          password_salt = ${hashed.passwordSalt},
          password_algorithm = ${hashed.passwordAlgorithm},
          must_change_password = false,
          updated_at = now()
        WHERE id = ${user.id}
      `;
      if (tokenHash)
        await sql`
          DELETE FROM public.auth_sessions
          WHERE user_id = ${user.id} AND token_hash <> ${tokenHash}
        `;
    });

    return NextResponse.json(
      {
        mode: "live",
        authenticated: true,
        user: { ...user, mustChangePassword: false },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error(
      "Password change failed",
      error instanceof Error ? error.name : "UnknownError",
    );
    return NextResponse.json(
      { error: "Chưa đổi được mật khẩu. Hãy thử lại sau." },
      { status: 503 },
    );
  }
}
