"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, setUnauthorizedHandler } from "./api";
import { getToken, setToken } from "./token";

interface AuthState {
  token: string | null;
  /** False until the stored token has been read on the client. */
  ready: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    setTokenState(getToken());
    setReady(true);
  }, []);

  const signOut = useCallback(() => {
    setToken(null);
    setTokenState(null);
    // Drop cached data so the next person on this browser never sees it.
    queryClient.clear();
    router.replace("/login");
  }, [queryClient, router]);

  useEffect(() => {
    setUnauthorizedHandler(signOut);
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  const value = useMemo<AuthState>(() => {
    const store = (accessToken: string) => {
      setToken(accessToken);
      setTokenState(accessToken);
    };
    return {
      token,
      ready,
      signIn: async (email, password) => store((await api.login(email, password)).access_token),
      signUp: async (email, password) => store((await api.register(email, password)).access_token),
      signOut,
    };
  }, [token, ready, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
