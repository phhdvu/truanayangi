import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

if (!process.env.DATABASE_URL) {
  throw new Error("Thêm DATABASE_URL vào .env.local trước.");
}

const migrationsPath = fileURLToPath(
  new URL("../supabase/migrations/", import.meta.url),
);
const migrationFiles = (await readdir(migrationsPath))
  .filter((file) => file.endsWith(".sql"))
  .sort();
if (!migrationFiles.length) throw new Error("Không tìm thấy migration Supabase.");
const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  connect_timeout: 10,
  prepare: false,
});

try {
  // These files are committed and contain no user input, so executing them in
  // filename order keeps local setup aligned with the SQL migration history.
  for (const migrationFile of migrationFiles) {
    const schema = await readFile(
      new URL(`../supabase/migrations/${migrationFile}`, import.meta.url),
      "utf8",
    );
    await sql.unsafe(schema);
  }
  console.log(
    `Đã chạy ${migrationFiles.length} migration Supabase. Dữ liệu hiện có được giữ nguyên.`,
  );
} finally {
  await sql.end({ timeout: 5 });
}
