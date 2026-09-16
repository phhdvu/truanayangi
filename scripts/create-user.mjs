import { randomBytes, scrypt } from "node:crypto";
import postgres from "postgres";

const INITIAL_PASSWORD = "@DST123";
const PASSWORD_ALGORITHM = "scrypt-v1";
const SCRYPT_OPTIONS = {
  N: 32_768,
  r: 8,
  p: 3,
  maxmem: 128 * 1024 * 1024,
};

function deriveKey(password, salt) {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      64,
      SCRYPT_OPTIONS,
      (error, derivedKey) => {
        if (error) reject(error);
        else resolve(derivedKey);
      },
    );
  });
}

const [rawUsername, ...displayNameParts] = process.argv.slice(2);
const username = rawUsername?.trim().toLowerCase();
const displayName = displayNameParts.join(" ").trim().replace(/\s+/g, " ");
const companyCode = username?.split(".")[0];
const localUsername = companyCode ? username.slice(companyCode.length + 1) : "";

if (
  !username ||
  !displayName ||
  !/^[a-z0-9][a-z0-9._-]{2,49}$/.test(username) ||
  !companyCode ||
  !/^[a-z0-9][a-z0-9-]{1,19}$/.test(companyCode) ||
  localUsername.length < 2
) {
  console.error(
    "Cách dùng: pnpm user:create -- dst.ten.tai.khoan \"Họ và tên\"",
  );
  process.exit(1);
}
if (displayName.length < 2 || displayName.length > 60) {
  console.error("Họ và tên cần có từ 2 đến 60 ký tự.");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("Thiếu DATABASE_URL. Hãy thêm URI Supabase vào .env.local.");
  process.exit(1);
}

const salt = randomBytes(16).toString("base64url");
const passwordHash = (await deriveKey(INITIAL_PASSWORD, salt)).toString(
  "base64url",
);
const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  connect_timeout: 10,
  prepare: false,
});

try {
  const existing = await sql`
    SELECT id FROM public.internal_users WHERE username = ${username} LIMIT 1
  `;
  if (existing.length) {
    console.error(`Tài khoản ${username} đã tồn tại.`);
    process.exitCode = 2;
  } else {
    await sql`
      INSERT INTO public.internal_users
        (id, username, display_name, company_code, password_hash, password_salt, password_algorithm)
      VALUES
        (${crypto.randomUUID()}, ${username}, ${displayName}, ${companyCode}, ${passwordHash}, ${salt}, ${PASSWORD_ALGORITHM})
    `;
    console.log(`Đã tạo tài khoản ${username} cho ${displayName}.`);
    console.log("Mật khẩu mặc định: @DST123 (bắt buộc đổi ở lần đăng nhập đầu).");
  }
} finally {
  await sql.end({ timeout: 5 });
}
