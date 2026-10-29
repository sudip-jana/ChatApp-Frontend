import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { authApi } from "../services/api";

interface Session { token: string; username: string; exp: number }

interface AuthValue {
  token: string | null;
  username: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthCtx = createContext<AuthValue | null>(null);

// sessionStorage survives a refresh but is cleared when the tab closes.
const KEY = "relay-session";

function load(): Session | null {
  try {
    const s = JSON.parse(sessionStorage.getItem(KEY) ?? "null") as Session | null;
    if (s && typeof s.token === "string" && typeof s.username === "string" && s.exp > Date.now()) return s;
  } catch { /* corrupt entry */ }
  sessionStorage.removeItem(KEY);
  return null;
}

function subjectOf(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(load);

  const logout = useCallback(() => {
    sessionStorage.removeItem(KEY);
    setSession(null);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await authApi.login(username, password);
    const s: Session = {
      token: res.accessToken,
      username: subjectOf(res.accessToken) ?? username,
      exp: Date.now() + Math.max(res.expiresIn - 5, 1) * 1000,
    };
    sessionStorage.setItem(KEY, JSON.stringify(s));
    setSession(s);
  }, []);

  useEffect(() => {
    if (!session) return;
    const t = window.setTimeout(logout, Math.max(session.exp - Date.now(), 0));
    return () => window.clearTimeout(t);
  }, [session, logout]);

  const value = useMemo(
      () => ({ token: session?.token ?? null, username: session?.username ?? null, login, logout }),
      [session, login, logout],
  );
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}