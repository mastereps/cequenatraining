import crypto from "crypto";

const PAYMONGO_API = "https://api.paymongo.com/v1/checkout_sessions";

const getAuthHeader = () => {
  const key = process.env.PAYMONGO_SECRET_KEY;
  if (!key) {
    throw new Error("Missing PAYMONGO_SECRET_KEY.");
  }
  return `Basic ${Buffer.from(`${key}:`).toString("base64")}`;
};

export const createGcashCheckout = async ({
  lineItems,
  successUrl,
  cancelUrl,
  description,
}) => {
  const response = await fetch(PAYMONGO_API, {
    method: "POST",
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: {
        attributes: {
          line_items: lineItems,
          payment_method_types: ["gcash"],
          success_url: successUrl,
          cancel_url: cancelUrl,
          description,
        },
      },
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    const message =
      payload?.errors?.[0]?.detail || "PayMongo checkout failed.";
    throw new Error(message);
  }

  return {
    checkoutUrl: payload.data.attributes.checkout_url,
    checkoutId: payload.data.id,
  };
};

export const verifyPaymongoSignature = ({ signature, payload, secret }) => {
  const parts = String(signature)
    .split(",")
    .map((part) => part.trim());
  const timestampPart = parts.find((part) => part.startsWith("t="));
  const signaturePart = parts.find((part) => part.startsWith("v1="));

  if (!timestampPart || !signaturePart) return false;

  const timestamp = timestampPart.slice(2);
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`, "utf8")
    .digest("hex");
  const received = signaturePart.slice(3);

  if (expected.length !== received.length) return false;

  return crypto.timingSafeEqual(
    Buffer.from(expected, "utf8"),
    Buffer.from(received, "utf8")
  );
};
