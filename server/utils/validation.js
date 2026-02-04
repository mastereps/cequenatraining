const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const sanitizeText = (value, maxLength = 5000) => {
  const normalized = String(value ?? "").trim().replace(/\s+/g, " ");
  if (!normalized) return "";
  return normalized.slice(0, maxLength);
};

export const normalizeEmail = (value) =>
  String(value ?? "").trim().toLowerCase();

export const isValidEmail = (value) => EMAIL_REGEX.test(normalizeEmail(value));

export const parseDateInput = (value) => {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
};

export const parseOptionalFields = (payload) => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {};
  }

  const next = {};
  for (const [key, raw] of Object.entries(payload)) {
    const safeKey = sanitizeText(key, 50);
    if (!safeKey) continue;

    if (typeof raw === "string") {
      next[safeKey] = sanitizeText(raw, 500);
      continue;
    }

    if (typeof raw === "number" || typeof raw === "boolean") {
      next[safeKey] = raw;
    }
  }

  return next;
};
