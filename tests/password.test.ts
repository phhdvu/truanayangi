import test from "node:test";
import assert from "node:assert/strict";
import {
  hashPassword,
  INITIAL_PASSWORD,
  verifyPassword,
} from "../src/lib/password.ts";

test("password hashes use a unique salt and verify only the original password", async () => {
  const first = await hashPassword(INITIAL_PASSWORD);
  const second = await hashPassword(INITIAL_PASSWORD);

  assert.equal(first.passwordAlgorithm, "scrypt-v1");
  assert.notEqual(first.passwordSalt, second.passwordSalt);
  assert.notEqual(first.passwordHash, second.passwordHash);
  assert.equal(await verifyPassword(INITIAL_PASSWORD, first), true);
  assert.equal(await verifyPassword("wrong-password", first), false);
  assert.equal(await verifyPassword(INITIAL_PASSWORD), false);
});
