import test from "node:test";
import assert from "node:assert/strict";
import { attachAuthUser, requireAuth, requireRole } from "../middleware/auth.js";
import {
  createAuthSessionToken,
  getAuthSessionCookieName,
} from "../utils/authSession.js";

const makeResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

test("attachAuthUser reads a valid signed cookie", () => {
  const token = createAuthSessionToken({
    id: 7,
    name: "Admin",
    email: "admin@example.com",
    role: "admin",
  });
  const req = {
    headers: {
      cookie: `theme=dark; ${getAuthSessionCookieName()}=${token}`,
    },
  };
  let nextCalled = false;

  attachAuthUser(req, {}, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(req.authUser.id, 7);
  assert.equal(req.authUser.role, "admin");
});

test("requireAuth rejects anonymous requests", () => {
  const res = makeResponse();

  requireAuth({}, res, () => assert.fail("next should not run"));

  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { error: "Authentication required." });
});

test("requireRole allows matching roles and rejects other roles", () => {
  let nextCalled = false;
  requireRole("admin")(
    { authUser: { role: " ADMIN " } },
    makeResponse(),
    () => {
      nextCalled = true;
    },
  );
  assert.equal(nextCalled, true);

  const res = makeResponse();
  requireRole("admin")(
    { authUser: { role: "customer" } },
    res,
    () => assert.fail("next should not run"),
  );
  assert.equal(res.statusCode, 403);
});
