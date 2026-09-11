import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("Thiếu DATABASE_URL. Hãy thêm URI Supabase vào .env.local.");
  process.exit(1);
}

const sql = postgres(connectionString, {
  max: 1,
  connect_timeout: 10,
  prepare: false,
});

try {
  const [connection] = await sql`
    select current_database() as database, current_user as user
  `;
  const [tables] = await sql`
    select
      to_regclass('public.lunch_groups') is not null as groups,
      to_regclass('public.restaurants') is not null as restaurants,
      to_regclass('public.dishes') is not null as dishes,
      to_regclass('public.internal_users') is not null as users,
      to_regclass('public.auth_sessions') is not null as sessions,
      to_regclass('public.lunch_orders') is not null as orders
  `;

  console.log(`Đã kết nối Supabase PostgreSQL: ${connection.database} (${connection.user}).`);

  if (
    !tables.groups ||
    !tables.restaurants ||
    !tables.dishes ||
    !tables.users ||
    !tables.sessions ||
    !tables.orders
  ) {
    console.error(
      "Schema chưa đầy đủ (lunch_groups/lunch_orders/restaurants/dishes/internal_users/auth_sessions). Chạy pnpm db:setup để khởi tạo.",
    );
    process.exitCode = 2;
  } else {
    console.log(
      "Các bảng public.lunch_groups, public.lunch_orders, public.restaurants, public.dishes, public.internal_users và public.auth_sessions đã sẵn sàng.",
    );
  }
} catch (error) {
  const message = error instanceof Error ? error.message : "Lỗi không xác định";
  const safeMessage = message.replace(/postgres(?:ql)?:\/\/\S+/gi, "Supabase database URL");
  const name = error instanceof Error ? error.name : "UnknownError";
  const code =
    typeof error === "object" && error && "code" in error
      ? String(error.code)
      : "";
  console.error(
    `Không kết nối được Supabase PostgreSQL: ${name}${code ? ` (${code})` : ""} ${safeMessage || "Không có thêm chi tiết."}`,
  );
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
