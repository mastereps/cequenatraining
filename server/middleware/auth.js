import {
  getAuthSessionCookieName,
  readAuthSessionToken,
} from "../utils/authSession.js";

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

export const attachAuthUser = (req, _res, next) => {
  const cookies = parseCookies(req.headers.cookie);
  const cookieName = getAuthSessionCookieName();
  const token = cookies[cookieName];

  req.authUser = token ? readAuthSessionToken(token) : null;
  next();
};

export const requireAuth = (req, res, next) => {
  if (!req.authUser) {
    return res.status(401).json({ error: "Authentication required." });
  }
  return next();
};
