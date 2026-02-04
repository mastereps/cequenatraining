import crypto from "crypto";

const isProduction = process.env.NODE_ENV === "production";

const authCookieName = process.env.AUTH_COOKIE_NAME || "app_session";
const sessionTtlSeconds = Math.max(Number(process.env.AUTH_SESSION_TTL_SECONDS || 604800) || 0, 300);
const sessionSecret = process.env.AUTH_SESSION_SECRET || null;

if (!sessionSecret && isProduction) {
  throw new Error("Missing AUTH_SESSION_SECRET in production.");
}

const fallbackSecret = "local-dev-auth-session-secret";
const resolvedSessionSecret = sessionSecret || fallbackSecret;

const encode = (value) => Buffer.from(value, "utf8").toString("base64url");
const decode = (value) => Buffer.from(value, "base64url").toString("utf8");

const sign = (value) =>
  crypto.createHmac("sha256", resolvedSessionSecret).update(value, "utf8").digest("base64url");

const parseJson = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

export const createAuthSessionToken = (user) => {
  const userId = Number(user?.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error("Invalid session user.");
  }

  const payload = {
    sub: userId,
    email: String(user?.email || ""),
    role: String(user?.role || "customer"),
    name: String(user?.name || ""),
    exp: Math.floor(Date.now() / 1000) + sessionTtlSeconds,
  };

  const encodedPayload = encode(JSON.stringify(payload));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
};

export const readAuthSessionToken = (token) => {
  const text = String(token || "");
  const [encodedPayload, encodedSignature] = text.split(".");
  if (!encodedPayload || !encodedSignature) {
    return null;
  }

  const expectedSignature = sign(encodedPayload);
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  const receivedBuffer = Buffer.from(encodedSignature, "utf8");
  if (expectedBuffer.length !== receivedBuffer.length) {
    return null;
  }
  if (!crypto.timingSafeEqual(expectedBuffer, receivedBuffer)) {
    return null;
  }

  let payload = null;
  try {
    payload = parseJson(decode(encodedPayload));
  } catch {
    return null;
  }
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const expiresAt = Number(payload.exp);
  const userId = Number(payload.sub);
  if (!Number.isFinite(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) {
    return null;
  }
  if (!Number.isInteger(userId) || userId <= 0) {
    return null;
  }

  return {
    id: userId,
    email: String(payload.email || ""),
    role: String(payload.role || "customer"),
    name: String(payload.name || ""),
  };
};

const cookieBaseOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: isProduction,
  path: "/",
};

export const setAuthSessionCookie = (res, user) => {
  const token = createAuthSessionToken(user);
  res.cookie(authCookieName, token, {
    ...cookieBaseOptions,
    maxAge: sessionTtlSeconds * 1000,
  });
};

export const clearAuthSessionCookie = (res) => {
  res.clearCookie(authCookieName, cookieBaseOptions);
};

export const getAuthSessionCookieName = () => authCookieName;
