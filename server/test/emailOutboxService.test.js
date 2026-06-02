import test from "node:test";
import assert from "node:assert/strict";
import { enqueueEmail } from "../services/emailOutboxService.js";

test("enqueueEmail inserts a pending outbox record", async () => {
  let params;
  const dbClient = {
    async query(_sql, values) {
      params = values;
      return {
        rows: [{
          id: "outbox-1",
          to_email: values[0],
          template_key: values[1],
          created_at: "2026-06-02T00:00:00.000Z",
        }],
      };
    },
  };

  const result = await enqueueEmail(dbClient, {
    toEmail: "teacher@example.com",
    templateKey: "webinar.verify",
    payload: { webinar_slug: "sample-webinar" },
  });

  assert.deepEqual(params, [
    "teacher@example.com",
    "webinar.verify",
    JSON.stringify({ webinar_slug: "sample-webinar" }),
  ]);
  assert.equal(result.id, "outbox-1");
});
