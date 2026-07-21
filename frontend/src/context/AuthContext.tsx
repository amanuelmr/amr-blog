"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { api } from "@/lib/api";
import { User } from "@/lib/types";

const STORAGE_KEY = "amr_user";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<void>;
  verifyEmail: (email: string, otp: string) => Promise<void>;
  resendOtp: (email: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (email: string, otp: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  const persist = useCallback((u: User | null) => {
    setUser(u);
    try {
      if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api<{ user: User }>("/auth/login", {
        method: "POST",
        body: { email, password },
      });
      persist(res.user);
      return res.user;
    },
    [persist]
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      await api("/auth/register", { method: "POST", body: { name, email, password } });
    },
    []
  );

  const verifyEmail = useCallback(async (email: string, otp: string) => {
    await api("/auth/verify-email", { method: "POST", body: { email, otp } });
  }, []);

  const resendOtp = useCallback(async (email: string) => {
    await api("/auth/resend-verification-otp", { method: "POST", body: { email } });
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    await api("/auth/forgot-password", { method: "POST", body: { email } });
  }, []);

  const resetPassword = useCallback(
    async (email: string, otp: string, password: string) => {
      await api("/auth/reset-password", { method: "POST", body: { email, otp, password } });
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await api("/auth/logout", { method: "POST", body: {}, retryOnAuth: false });
    } catch {
      /* clear locally regardless */
    }
    persist(null);
  }, [persist]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        verifyEmail,
        resendOtp,
        forgotPassword,
        resetPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
