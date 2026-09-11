import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

export const INITIAL_PASSWORD = "@DST123";
export const PASSWORD_ALGORITHM = "scrypt-v1";

const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_OPTIONS = {
  N: 32_768,
  r: 8,
  p: 3,
  maxmem: 128 * 1024 * 1024,
};
const DUMMY_SALT = Buffer.alloc(16).toString("base64url");
const DUMMY_HASH = Buffer.alloc(SCRYPT_KEY_LENGTH).toString("base64url");

export type PasswordRecord = {
  passwordHash: string;
  passwordSalt: string;
  passwordAlgorithm: string;
};

function deriveKey(password: string, salt: string) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(
      password,
      salt,
      SCRYPT_KEY_LENGTH,
      SCRYPT_OPTIONS,
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(derivedKey as Buffer);
      },
    );
  });
}

export async function hashPassword(password: string): Promise<PasswordRecord> {
  const passwordSalt = randomBytes(16).toString("base64url");
  const derivedKey = await deriveKey(password, passwordSalt);
  return {
    passwordHash: derivedKey.toString("base64url"),
    passwordSalt,
    passwordAlgorithm: PASSWORD_ALGORITHM,
  };
}

export async function verifyPassword(
  password: string,
  record?: PasswordRecord,
) {
  const salt = record?.passwordSalt ?? DUMMY_SALT;
  const storedHash = record?.passwordHash ?? DUMMY_HASH;
  const derivedKey = await deriveKey(password, salt);
  let expected: Buffer;
  try {
    expected = Buffer.from(storedHash, "base64url");
  } catch {
    return false;
  }
  if (expected.length !== derivedKey.length) return false;
  return timingSafeEqual(expected, derivedKey);
}
