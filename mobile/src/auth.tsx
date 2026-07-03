import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { api, User, Subscription } from './api';
import { saveToken, getToken, clearToken } from './storage';

type AuthState = {
  loading: boolean;
  token: string | null;
  user: User | null;
  subscription: Subscription | null;
  signInWithToken: (token: string, user: User, subscription: Subscription) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  setSubscription: (sub: Subscription) => void;
  setUser: (user: User) => void;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  const bootstrap = useCallback(async () => {
    try {
      const stored = await getToken();
      if (stored) {
        const { user: u, subscription: sub } = await api.me(stored);
        setToken(stored);
        setUser(u);
        setSubscription(sub);
      }
    } catch {
      await clearToken();
      setToken(null);
      setUser(null);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const signInWithToken = useCallback(
    async (newToken: string, u: User, sub: Subscription) => {
      await saveToken(newToken);
      setToken(newToken);
      setUser(u);
      setSubscription(sub);
    },
    [],
  );

  const signOut = useCallback(async () => {
    await clearToken();
    setToken(null);
    setUser(null);
    setSubscription(null);
  }, []);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const { user: u, subscription: sub } = await api.me();
      setUser(u);
      setSubscription(sub);
    } catch {
      // ignore transient refresh errors
    }
  }, [token]);

  const value = useMemo<AuthState>(
    () => ({
      loading,
      token,
      user,
      subscription,
      signInWithToken,
      signOut,
      refresh,
      setSubscription,
      setUser,
    }),
    [loading, token, user, subscription, signInWithToken, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
