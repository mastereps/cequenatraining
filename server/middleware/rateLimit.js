import rateLimit from "express-rate-limit";

// IP-based throttles for the unauthenticated endpoints. The DB-backed limiter in
// services/rateLimitService.js is per-email and webinar-scoped; this covers the
// brute-force and abuse cases that limiter cannot see.
const makeLimiter = ({ windowMs, max, message, skipSuccessfulRequests = false }) =>
  rateLimit({
    windowMs,
    max,
    skipSuccessfulRequests,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: message },
  });

/** Password guessing. Only failed attempts count, so a valid user is never locked out. */
export const loginLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  message: "Too many login attempts. Please try again later.",
});

/** Account-creation floods. */
export const registerLimiter = makeLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: "Too many accounts created from this address. Please try again later.",
});

/** The contact form sends mail inline, so an unthrottled caller is a spam relay. */
export const contactLimiter = makeLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: "Too many messages sent. Please try again later.",
});
