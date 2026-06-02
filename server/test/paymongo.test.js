import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  createGcashCheckout,
  verifyPaymongoSignature,
} from "../services/paymongo.js";

test("verifyPaymongoSignature accepts valid signatures and rejects tampering", () => {
  const payload = '{"data":{"id":"event-1"}}';
  const secret = "webhook-secret";
  const timestamp = "1710000000";
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`, "utf8")
    .digest("hex");

  assert.equal(
    verifyPaymongoSignature({
      signature: `t=${timestamp},v1=${signature}`,
      payload,
      secret,
    }),
    true,
  );
  assert.equal(
    verifyPaymongoSignature({
      signature: `t=${timestamp},v1=${signature}`,
      payload: `${payload} `,
      secret,
    }),
    false,
  );
});

test("createGcashCheckout sends the provider request and maps the response", async () => {
  const originalFetch = globalThis.fetch;
  const originalSecret = process.env.PAYMONGO_SECRET_KEY;
  let request;

  try {
    process.env.PAYMONGO_SECRET_KEY = "test-secret";
    globalThis.fetch = async (url, options) => {
      request = { url, options };
      return new Response(
        JSON.stringify({
          data: {
            id: "checkout-1",
            attributes: { checkout_url: "https://checkout.example/session" },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    };

    const result = await createGcashCheckout({
      lineItems: [{ name: "Book", amount: 10000, currency: "PHP", quantity: 1 }],
      successUrl: "https://app.example/success",
      cancelUrl: "https://app.example/cancel",
      description: "Book order",
      metadata: { order_id: "order-1" },
    });

    assert.deepEqual(result, {
      checkoutUrl: "https://checkout.example/session",
      checkoutId: "checkout-1",
    });
    assert.equal(request.url, "https://api.paymongo.com/v1/checkout_sessions");
    assert.equal(request.options.method, "POST");
    assert.equal(
      request.options.headers.Authorization,
      `Basic ${Buffer.from("test-secret:").toString("base64")}`,
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (originalSecret === undefined) delete process.env.PAYMONGO_SECRET_KEY;
    else process.env.PAYMONGO_SECRET_KEY = originalSecret;
  }
});

test("createGcashCheckout exposes provider validation errors", async () => {
  const originalFetch = globalThis.fetch;
  const originalSecret = process.env.PAYMONGO_SECRET_KEY;

  try {
    process.env.PAYMONGO_SECRET_KEY = "test-secret";
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ errors: [{ detail: "Invalid line items." }] }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });

    await assert.rejects(
      createGcashCheckout({
        lineItems: [],
        successUrl: "https://app.example/success",
        cancelUrl: "https://app.example/cancel",
        description: "Book order",
      }),
      /Invalid line items\./,
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (originalSecret === undefined) delete process.env.PAYMONGO_SECRET_KEY;
    else process.env.PAYMONGO_SECRET_KEY = originalSecret;
  }
});

test("createGcashCheckout rejects missing provider configuration", async () => {
  const originalSecret = process.env.PAYMONGO_SECRET_KEY;

  try {
    delete process.env.PAYMONGO_SECRET_KEY;

    await assert.rejects(
      createGcashCheckout({
        lineItems: [],
        successUrl: "https://app.example/success",
        cancelUrl: "https://app.example/cancel",
        description: "Book order",
      }),
      /Missing PAYMONGO_SECRET_KEY\./,
    );
  } finally {
    if (originalSecret === undefined) delete process.env.PAYMONGO_SECRET_KEY;
    else process.env.PAYMONGO_SECRET_KEY = originalSecret;
  }
});
