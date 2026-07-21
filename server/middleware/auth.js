import {
  getAuthSessionCookieName,
  readAuthSessionToken,
} from "../utils/authSession.js";
import { pool } from "../db.js";
import { logger } from "../utils/logger.js";

const parseCookies = (cookieHeader) => {
  const entries = String(cookieHeader || "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separator = part.indexOf("=");
      if (separator < 0) return [part, ""];
      return [part.slice(0, separator), part.slice(separator + 1)];
    });

  return Object.fromEntries(entries);
};

/**
 * Authenticates the signed cookie, then refreshes the identity from the database.
 *
 * The cookie payload carries a role, but it is only as fresh as the last login -
 * trusting it would let a demoted admin keep access until the cookie expired.
 * The row is the authority: a deleted user or a failed lookup is treated as
 * anonymous rather than falling back to the cookie's claim.
 */
/** Verified session claims from the request cookie, or null. Does not touch the DB. */
export const readSessionFromRequest = (req) => {
  const cookies = parseCookies(req?.headers?.cookie);
  const token = cookies[getAuthSessionCookieName()];
  return token ? readAuthSessionToken(token) : null;
};

export const attachAuthUser = async (req, _res, next) => {
  const session = readSessionFromRequest(req);

  if (!session) {
    req.authUser = null;
    return next();
  }

  try {
    const { rows } = await pool.query(
      "SELECT id, name, email, role FROM users WHERE id = $1 LIMIT 1",
      [session.id],
    );
    const row = rows[0];
    req.authUser = row
      ? {
          id: Number(row.id),
          name: row.name || "",
          email: row.email || "",
          role: row.role || "customer",
        }
      : null;
  } catch (error) {
    logger.error("auth_session_lookup_failed", { error });
    req.authUser = null;
  }

  return next();
};

export const requireAuth = (req, res, next) => {
  if (!req.authUser) {
    return res.status(401).json({ error: "Authentication required." });
  }
  return next();
};

// Role ladder: customer < admin < super_admin. Every admin surface accepts both
// elevated roles; content management is the one thing reserved for super admins.
export const ADMIN_ROLES = ["admin", "super_admin"];

export const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.authUser) {
    return res.status(401).json({ error: "Authentication required." });
  }

  const role = String(req.authUser.role || "").trim().toLowerCase();
  const normalizedAllowedRoles = allowedRoles.map((value) => String(value || "").trim().toLowerCase());
  if (!normalizedAllowedRoles.includes(role)) {
    return res.status(403).json({ error: "You are not allowed to perform this action." });
  }

  return next();
};

export const requireAdmin = requireRole(...ADMIN_ROLES);

export const requireSuperAdmin = requireRole("super_admin");
