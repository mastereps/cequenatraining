import "../loadEnv.js";
import crypto from "crypto";
import { resolveSecret } from "./secrets.js";

const VERIFY_TOKEN_BYTES = 32;

const resolvedTokenSecret = resolveSecret("VERIFY_TOKEN_SECRET", {
  label: "Pending verification links",
});

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
