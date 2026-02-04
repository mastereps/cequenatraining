import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  fetchAuthSessionUser,
  loginAuthUser,
  logoutAuthUser,
  registerAuthUser,
} from "../features/auth/api";
import type { AuthUser } from "../features/auth/types";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (name: string, email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const syncAuthSession = async () => {
      try {
        const response = await fetchAuthSessionUser();
        if (active) {
          setUser(response.user);
        }
      } catch {
        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void syncAuthSession();
    return () => {
      active = false;
    };
  }, []);

  const persistUser = (nextUser: AuthUser | null) => {
    setUser(nextUser);
  };

  const login = async (email: string, password: string) => {
    const response = await loginAuthUser(email, password);
    setLoading(false);
    persistUser(response.user);
    return response.user;
  };

  const register = async (name: string, email: string, password: string) => {
    const response = await registerAuthUser(name, email, password);
    setLoading(false);
    persistUser(response.user);
    return response.user;
  };

  const logout = () => {
    setLoading(false);
    persistUser(null);
    void logoutAuthUser();
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
