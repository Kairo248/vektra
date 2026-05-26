"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  clearSession,
  getAccessToken,
  getStoredUserId,
  setStoredSession,
} from "@/lib/session";
import { login as apiLogin } from "@/services/api";
import type { LoginRequest, UserResponse } from "@/types/vektra";

interface AuthState {
  userId: number | null;
  user: UserResponse | null;
  token: string | null;
  ready: boolean;
}

interface AuthContextValue extends AuthState {
  login: (body: LoginRequest) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    userId: null,
    user: null,
    token: null,
    ready: false,
  });

  useEffect(() => {
    const userId = getStoredUserId();
    const token = getAccessToken();
    const raw = typeof window !== "undefined"
      ? sessionStorage.getItem("vektra_user")
      : null;
    const user: UserResponse | null = raw ? JSON.parse(raw) : null;

    setState({ userId, user, token, ready: true });
  }, []);

  const login = useCallback(
    async (body: LoginRequest) => {
      const res = await apiLogin(body);

      if (res.user.userType !== "ADMIN") {
        throw new Error("This portal is for administrator accounts only.");
      }

      const token = res.accessToken ?? null;
      setStoredSession(res.user.id, token);
      sessionStorage.setItem("vektra_user", JSON.stringify(res.user));

      setState({ userId: res.user.id, user: res.user, token, ready: true });
      router.push("/");
    },
    [router],
  );

  const logout = useCallback(() => {
    clearSession();
    sessionStorage.removeItem("vektra_user");
    setState({ userId: null, user: null, token: null, ready: true });
    router.push("/login");
  }, [router]);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login, logout }),
    [state, login, logout],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
