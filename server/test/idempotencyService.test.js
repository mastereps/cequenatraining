import test from "node:test";
import assert from "node:assert/strict";
import {
  findIdempotentResponse,
  persistIdempotentResponse,
} from "../services/idempotencyService.js";
import { hashIdempotencyKey } from "../utils/tokens.js";

test("findIdempotentResponse returns null without a request key", async () => {
  const dbClient = {
    async query() {
      assert.fail("query should not run");
    },
  };

  assert.equal(await findIdempotentResponse(dbClient, { idempotencyKey: null }), null);
});

test("findIdempotentResponse maps a stored response", async () => {
  const dbClient = {
    async query(_sql, params) {
      assert.equal(params[1], hashIdempotencyKey("request-key"));
      return {
        rows: [{ response_status: 200, response_body_json: { ok: true } }],
      };
    },
  };

  assert.deepEqual(
    await findIdempotentResponse(dbClient, { idempotencyKey: "request-key" }),
    { status: 200, body: { ok: true } },
  );
});

test("persistIdempotentResponse stores JSON response data", async () => {
  let params;
  const dbClient = {
    async query(_sql, values) {
      params = values;
    },
  };

  await persistIdempotentResponse(dbClient, {
    idempotencyKey: "request-key",
    webinarId: "webinar-1",
    email: "teacher@example.com",
    status: 200,
    body: { ok: true },
    ttlHours: 12,
  });

  assert.equal(params[1], hashIdempotencyKey("request-key"));
  assert.equal(params[2], "webinar-1");
  assert.equal(params[5], JSON.stringify({ ok: true }));
  assert.equal(params[6], 12);
});
