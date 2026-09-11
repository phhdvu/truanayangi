import postgres from "postgres";
let connection: ReturnType<typeof postgres> | undefined;
export function db() {
  if (!process.env.DATABASE_URL) throw new Error("Chưa cấu hình DATABASE_URL.");
  connection ??= postgres(process.env.DATABASE_URL, {
    max: 3,
    idle_timeout: 20,
    connect_timeout: 10,
    // Supabase's Transaction pooler does not support prepared statements.
    prepare: false,
  });
  return connection;
}
