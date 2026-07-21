import test from "node:test";
import assert from "node:assert/strict";
import {
  attachAuthUser,
  requireAdmin,
  requireAuth,
  readSessionFromRequest,
  requireRole,
  requireSuperAdmin,
} from "../middleware/auth.js";
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

test("readSessionFromRequest reads a valid signed cookie", () => {
  const token = createAuthSessionToken({
    id: 7,
    name: "Admin",
    email: "admin@example.com",
    role: "admin",
  });
  const session = readSessionFromRequest({
    headers: { cookie: `theme=dark; ${getAuthSessionCookieName()}=${token}` },
  });

  assert.equal(session.id, 7);
  assert.equal(session.email, "admin@example.com");
});

test("readSessionFromRequest rejects a tampered or absent cookie", () => {
  const token = createAuthSessionToken({ id: 7, name: "A", email: "a@b.c", role: "customer" });
  const [payload] = token.split(".");

  assert.equal(readSessionFromRequest({ headers: {} }), null);
  assert.equal(readSessionFromRequest({ headers: { cookie: "other=1" } }), null);
  assert.equal(
    readSessionFromRequest({
      headers: { cookie: `${getAuthSessionCookieName()}=${payload}.deadbeef` },
    }),
    null,
  );
});

test("attachAuthUser leaves anonymous requests unauthenticated", async () => {
  const req = { headers: {} };
  let nextCalled = false;

  await attachAuthUser(req, {}, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(req.authUser, null);
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

test("requireAdmin allows admin and super_admin", () => {
  for (const role of ["admin", "super_admin"]) {
    let nextCalled = false;
    requireAdmin({ authUser: { role } }, makeResponse(), () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, true, `${role} should pass requireAdmin`);
  }

  const res = makeResponse();
  requireAdmin({ authUser: { role: "customer" } }, res, () =>
    assert.fail("next should not run"),
  );
  assert.equal(res.statusCode, 403);
});

test("requireSuperAdmin rejects plain admins", () => {
  let nextCalled = false;
  requireSuperAdmin({ authUser: { role: "super_admin" } }, makeResponse(), () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, true);

  for (const role of ["admin", "customer"]) {
    const res = makeResponse();
    requireSuperAdmin({ authUser: { role } }, res, () =>
      assert.fail("next should not run"),
    );
    assert.equal(res.statusCode, 403, `${role} should be rejected`);
  }
});
