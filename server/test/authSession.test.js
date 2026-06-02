import test from "node:test";
import assert from "node:assert/strict";
import {
  createAuthSessionToken,
  getAuthSessionCookieName,
  readAuthSessionToken,
} from "../utils/authSession.js";

const user = {
  id: 42,
  name: "Teacher Example",
  email: "teacher@example.com",
  role: "admin",
};

test("auth session tokens round-trip signed user data", () => {
  const token = createAuthSessionToken(user);

  assert.deepEqual(readAuthSessionToken(token), user);
  assert.equal(typeof getAuthSessionCookieName(), "string");
});

test("auth session reader rejects malformed and tampered tokens", () => {
  const token = createAuthSessionToken(user);
  const [payload] = token.split(".");

  assert.equal(readAuthSessionToken("not-a-token"), null);
  assert.equal(readAuthSessionToken(`${payload}.invalid-signature`), null);
});

test("auth session reader rejects expired tokens", () => {
  const originalNow = Date.now;
  const token = createAuthSessionToken(user);

  try {
    Date.now = () => originalNow() + 8 * 24 * 60 * 60 * 1000;
    assert.equal(readAuthSessionToken(token), null);
  } finally {
    Date.now = originalNow;
  }
});
