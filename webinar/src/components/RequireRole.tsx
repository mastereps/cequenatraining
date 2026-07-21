import { Navigate } from "react-router-dom";
import { useAuth } from "../store/AuthContext";
import type { AuthUser } from "../features/auth/types";

interface RequireRoleProps {
  allow: (user: AuthUser | null) => boolean;
  redirectTo?: string;
  children: React.ReactNode;
}

/**
 * Gates a route behind a role predicate. Renders nothing while the session is
 * still resolving so an authorized reload never flashes a redirect.
 */
const RequireRole = ({ allow, redirectTo = "/", children }: RequireRoleProps) => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!allow(user)) return <Navigate to={redirectTo} replace />;

  return <>{children}</>;
};

export default RequireRole;
