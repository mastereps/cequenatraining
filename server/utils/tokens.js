import crypto from "crypto";

const VERIFY_TOKEN_BYTES = 32;

const tokenSecret = process.env.VERIFY_TOKEN_SECRET || "local-dev-secret";

export const generateVerificationToken = () =>
  crypto.randomBytes(VERIFY_TOKEN_BYTES).toString("base64url");

export const hashToken = (token) =>
  crypto
    .createHmac("sha256", tokenSecret)
    .update(String(token), "utf8")
    .digest("hex");

export const hashIdempotencyKey = (value) =>
  crypto
    .createHmac("sha256", tokenSecret)
    .update(String(value), "utf8")
    .digest("hex");
