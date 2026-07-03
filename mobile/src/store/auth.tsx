import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api, setAuthToken } from '../api/client';
import type { Subscription, User } from '../api/types';

const TOKEN_KEY = 'homegame.token';

interface AuthState {
  loading: boolean;
  token: string | null;
  user: User | null;
  subscription: Subscription | null;
  signedIn: boolean;
  hasActiveSubscription: boolean;
  signIn: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  const refresh = useCallback(async () => {
    try {
      const me = await api.me();
      setUser(me.user);
      setSubscription(me.subscription);
    } catch {
      // Token likely invalid/expired; clear it.
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      setAuthToken(null);
      setToken(null);
      setUser(null);
      setSubscription(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const stored = await SecureStore.getItemAsync(TOKEN_KEY);
        if (stored) {
          setAuthToken(stored);
          setToken(stored);
          await refresh();
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [refresh]);

  const signIn = useCallback(
    async (newToken: string, newUser: User) => {
      await SecureStore.setItemAsync(TOKEN_KEY, newToken);
      setAuthToken(newToken);
      setToken(newToken);
      setUser(newUser);
      await refresh();
    },
    [refresh]
  );

  const signOut = useCallback(async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setAuthToken(null);
    setToken(null);
    setUser(null);
    setSubscription(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      loading,
      token,
      user,
      subscription,
      signedIn: Boolean(token),
      hasActiveSubscription: subscription?.status === 'active',
      signIn,
      signOut,
      refresh,
      setUser,
    }),
    [loading, token, user, subscription, signIn, signOut, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
