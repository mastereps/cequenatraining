import type { AuthUser } from "./types";

/** Role ladder: customer < admin < super_admin. */
export const ADMIN_ROLES = ["admin", "super_admin"] as const;

const normalizeRole = (user: AuthUser | null | undefined) =>
  String(user?.role || "").trim().toLowerCase();

/** True for both elevated roles - anything on the /admin dashboard. */
export const isAdminUser = (user: AuthUser | null | undefined) =>
  (ADMIN_ROLES as readonly string[]).includes(normalizeRole(user));

/** True only for super admins - content management. */
export const isSuperAdmin = (user: AuthUser | null | undefined) =>
  normalizeRole(user) === "super_admin";

export const roleLabel = (user: AuthUser | null | undefined) => {
  const role = normalizeRole(user);
  if (role === "super_admin") return "Super Admin";
  if (role === "admin") return "Admin";
  return "Member";
};
