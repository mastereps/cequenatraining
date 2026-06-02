import test from "node:test";
import assert from "node:assert/strict";
import { assertWithinRateLimit } from "../services/rateLimitService.js";

test("assertWithinRateLimit allows requests inside the configured limit", async () => {
  const calls = [];
  const dbClient = {
    async query(sql, params) {
      calls.push({ sql, params });
      return { rows: [{ request_count: 2 }] };
    },
  };

  const result = await assertWithinRateLimit(dbClient, {
    actionKey: "register",
    webinarId: "webinar-1",
    email: "teacher@example.com",
    maxRequests: 5,
    windowSeconds: 3600,
  });

  assert.deepEqual(result, { allowed: true, retryAfterSeconds: 0, count: 2 });
  assert.equal(calls[0].params[0], "register");
});

test("assertWithinRateLimit reports blocked requests", async () => {
  const dbClient = {
    async query() {
      return { rows: [{ request_count: 6 }] };
    },
  };

  assert.deepEqual(
    await assertWithinRateLimit(dbClient, {
      actionKey: "register",
      webinarId: "webinar-1",
      email: "teacher@example.com",
      maxRequests: 5,
      windowSeconds: 3600,
    }),
    { allowed: false, retryAfterSeconds: 3600, count: 6 },
  );
});
