import postgres from "postgres";

const [rawAction, rawUsername] = process.argv.slice(2);
const action = rawAction?.trim().toLowerCase();
const username = rawUsername?.trim().toLowerCase();
const deactivate = action === "deactivate" || action === "deactive";
const activate = action === "activate";

if (
  (!deactivate && !activate) ||
  !username ||
  !/^[a-z0-9][a-z0-9._-]{2,49}$/.test(username)
) {
  console.error(
    "Cách dùng: pnpm user:status -- deactivate|activate dst.ten.tai.khoan",
  );
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("Thiếu DATABASE_URL. Hãy thêm URI Supabase vào .env.local.");
  process.exit(1);
}

const nextActive = activate;
const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  connect_timeout: 10,
  prepare: false,
});

try {
  const users = await sql`
    SELECT id, display_name AS "displayName", is_active AS "isActive"
    FROM public.internal_users
    WHERE username = ${username}
    LIMIT 1
  `;
  const user = users[0];

  if (!user) {
    console.error(`Không tìm thấy tài khoản ${username}.`);
    process.exitCode = 2;
  } else if (user.isActive === nextActive) {
    if (!nextActive)
      await sql`
        DELETE FROM public.auth_sessions
        WHERE user_id = ${user.id}
      `;
    console.log(
      `Tài khoản ${username} (${user.displayName}) đã ${nextActive ? "được kích hoạt" : "được vô hiệu hóa"}.`,
    );
  } else {
    await sql.begin(async (transaction) => {
      await transaction`
        UPDATE public.internal_users
        SET is_active = ${nextActive}, updated_at = now()
        WHERE id = ${user.id}
      `;

      // A deactivated account must lose every existing session immediately.
      // Orders and account history remain untouched for reconciliation.
      if (!nextActive)
        await transaction`
          DELETE FROM public.auth_sessions
          WHERE user_id = ${user.id}
        `;
    });

    console.log(
      `Đã ${nextActive ? "kích hoạt" : "vô hiệu hóa"} tài khoản ${username} (${user.displayName}).`,
    );
    if (!nextActive)
      console.log("Các phiên đăng nhập hiện tại đã bị thu hồi; lịch sử đặt món được giữ nguyên.");
  }
} catch (error) {
  console.error(
    "Không cập nhật được trạng thái tài khoản.",
    error instanceof Error ? error.message : "UnknownError",
  );
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
