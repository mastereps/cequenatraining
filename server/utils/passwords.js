import crypto from "crypto";

const SCRYPT_KEYLEN = 64;

export const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(String(password), salt, SCRYPT_KEYLEN).toString("hex");
  return `scrypt$${salt}$${derived}`;
};

export const verifyPassword = (password, storedHash) => {
  if (!storedHash || typeof storedHash !== "string") return false;
  const [scheme, salt, expected] = storedHash.split("$");
  if (scheme !== "scrypt" || !salt || !expected) return false;

  const expectedBuffer = Buffer.from(expected, "hex");
  const candidateBuffer = crypto.scryptSync(String(password), salt, expectedBuffer.length);
  if (expectedBuffer.length !== candidateBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, candidateBuffer);
};
