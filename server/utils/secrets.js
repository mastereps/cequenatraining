import crypto from "crypto";

// Values shipped in .env.example. A host that copied the template and never edited
// it is running on a secret published in this repo, which is no better than having
// no secret at all - treat these as unset.
const PLACEHOLDER_PATTERN = /^(replace-with-|change|your-|todo|xxx)/i;
const MIN_SECRET_LENGTH = 32;

const isPlaceholder = (value) =>
  PLACEHOLDER_PATTERN.test(value) || value.length < MIN_SECRET_LENGTH;

/**
 * Resolves a secret from the environment.
 *
 * Missing or placeholder values are fatal in production. Elsewhere they fall back
 * to a random per-boot secret: tokens signed with it stop working on restart, but
 * nothing can be forged from a constant an attacker can read in the repo.
 */
export const resolveSecret = (name, { label = name } = {}) => {
  const raw = String(process.env[name] || "").trim();
  const usable = raw && !isPlaceholder(raw);

  if (!usable && process.env.NODE_ENV === "production") {
    throw new Error(
      `${name} is missing or still set to a placeholder. ` +
        "Generate one with: openssl rand -hex 32",
    );
  }

  if (!usable) {
    console.warn(
      `[security] ${name} is ${raw ? "a placeholder" : "not set"} - using a random ` +
        `secret for this process. ${label} will not survive a restart.`,
    );
    return crypto.randomBytes(32).toString("hex");
  }

  return raw;
};
