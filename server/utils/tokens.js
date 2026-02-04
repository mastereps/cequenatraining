import crypto from "crypto";

const VERIFY_TOKEN_BYTES = 32;

const isProduction = process.env.NODE_ENV === "production";
const tokenSecret = process.env.VERIFY_TOKEN_SECRET || null;

if (!tokenSecret && isProduction) {
  throw new Error("Missing VERIFY_TOKEN_SECRET in production.");
}

const resolvedTokenSecret = tokenSecret || "local-dev-secret";

export const generateVerificationToken = () =>
  crypto.randomBytes(VERIFY_TOKEN_BYTES).toString("base64url");

export const hashToken = (token) =>
  crypto
    .createHmac("sha256", resolvedTokenSecret)
    .update(String(token), "utf8")
    .digest("hex");

export const hashIdempotencyKey = (value) =>
  crypto
    .createHmac("sha256", resolvedTokenSecret)
    .update(String(value), "utf8")
    .digest("hex");
