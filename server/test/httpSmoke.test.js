import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { app } from "../server.js";

let server;
let baseUrl;

before(async () => {
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
});

const requestJson = async (path, options) => {
  const response = await fetch(`${baseUrl}${path}`, options);
  return {
    status: response.status,
    body: await response.json(),
  };
};

test("GET /api/health reports API availability", async () => {
  assert.deepEqual(await requestJson("/api/health"), {
    status: 200,
    body: { status: "ok" },
  });
});

test("GET /api/auth/me returns an anonymous session without a cookie", async () => {
  assert.deepEqual(await requestJson("/api/auth/me"), {
    status: 200,
    body: { ok: true, user: null },
  });
});

test("POST /api/contact validates required fields and email format", async () => {
  assert.deepEqual(
    await requestJson("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }),
    {
      status: 400,
      body: { error: "Email and message are required." },
    },
  );

  assert.deepEqual(
    await requestJson("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "not-an-email", message: "Hello" }),
    }),
    {
      status: 400,
      body: { error: "Please enter a valid email." },
    },
  );
});

test("protected payment routes reject anonymous requests", async () => {
  assert.deepEqual(
    await requestJson("/api/payments/gcash", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ id: 1, quantity: 1 }] }),
    }),
    {
      status: 401,
      body: { error: "Authentication required." },
    },
  );

  assert.deepEqual(
    await requestJson("/api/webinars/sample-webinar/payment-proofs"),
    {
      status: 401,
      body: { error: "Authentication required." },
    },
  );
});

test("webinar management routes reject anonymous requests", async () => {
  const unauthorized = { status: 401, body: { error: "Authentication required." } };

  assert.deepEqual(await requestJson("/api/admin/webinars"), unauthorized);
  assert.deepEqual(
    await requestJson("/api/admin/webinars", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Anything" }),
    }),
    unauthorized,
  );
  assert.deepEqual(
    await requestJson("/api/admin/webinars/some-id", { method: "DELETE" }),
    unauthorized,
  );
  assert.deepEqual(
    await requestJson("/api/admin/webinars/some-id/reschedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ start_at: "2027-01-01T00:00:00Z" }),
    }),
    unauthorized,
  );
});
