import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import type { Role } from "../lib/permissions";

export type User = { id: string; name: string; email: string; role: Role; status: string };

const AuthContext = createContext<{
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}>({
  user: null,
  loading: true,
  login: async () => {
    throw new Error("uninitialized");
  },
  logout: async () => undefined,
  refresh: async () => undefined,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const data = await api<{ user: User }>("/api/auth/me");
      setUser(data.user);
    } catch {
      setUser(null);
      localStorage.removeItem("token");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login: async (email: string, password: string) => {
        const data = await api<{ user: User; token: string }>("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        localStorage.setItem("token", data.token);
        setUser(data.user);
        return data.user;
      },
      logout: async () => {
        await api("/api/auth/logout", { method: "POST" });
        localStorage.removeItem("token");
        setUser(null);
      },
      refresh,
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
