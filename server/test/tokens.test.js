import test from "node:test";
import assert from "node:assert/strict";
import {
  generateVerificationToken,
  hashIdempotencyKey,
  hashToken,
} from "../utils/tokens.js";

test("generateVerificationToken returns a URL-safe random token", () => {
  const first = generateVerificationToken();
  const second = generateVerificationToken();

  assert.match(first, /^[A-Za-z0-9_-]+$/);
  assert.notEqual(first, second);
});

test("token hashing is deterministic and separates input values", () => {
  assert.equal(hashToken("token"), hashToken("token"));
  assert.notEqual(hashToken("token"), hashToken("other-token"));
  assert.equal(hashIdempotencyKey("request-key"), hashIdempotencyKey("request-key"));
});
