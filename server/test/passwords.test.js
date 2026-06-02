import test from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "../utils/passwords.js";

test("hashPassword creates a verifiable salted scrypt hash", () => {
  const hash = hashPassword("correct horse battery staple");

  assert.match(hash, /^scrypt\$[0-9a-f]+\$[0-9a-f]+$/);
  assert.equal(verifyPassword("correct horse battery staple", hash), true);
  assert.equal(verifyPassword("wrong password", hash), false);
});

test("verifyPassword rejects malformed hashes", () => {
  assert.equal(verifyPassword("password", null), false);
  assert.equal(verifyPassword("password", "sha256$salt$hash"), false);
  assert.equal(verifyPassword("password", "scrypt$missing-derived-value"), false);
});
