import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, ApiError, type CurrentUser } from './api';

type AuthState = {
  ready: boolean;
  token: string | null;
  user: CurrentUser | null;
  canHost: boolean;
};

type AuthContextValue = AuthState & {
  requestOtp: (phone: string) => Promise<{ devCode?: string }>;
  verifyOtp: (phone: string, code: string) => Promise<void>;
  updateName: (name: string) => Promise<void>;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const STORAGE_KEY = 'home-game/auth';

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    ready: false,
    token: null,
    user: null,
    canHost: false,
  });

  const persist = useCallback(async (token: string | null, user: CurrentUser | null) => {
    if (token && user) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const refresh = useCallback(async () => {
    setState((prev) => {
      if (!prev.token) return prev;
      // Fire-and-forget outside setState so we don't do async work inside it.
      api
        .me(prev.token)
        .then(({ user, canHost }) => {
          setState((s) => ({ ...s, user, canHost }));
          persist(prev.token, user);
        })
        .catch(async (err) => {
          if (err instanceof ApiError && err.status === 401) {
            await persist(null, null);
            setState({ ready: true, token: null, user: null, canHost: false });
          }
        });
      return prev;
    });
  }, [persist]);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) {
          setState({ ready: true, token: null, user: null, canHost: false });
          return;
        }
        const parsed = JSON.parse(raw) as { token: string; user: CurrentUser };
        try {
          const { user, canHost } = await api.me(parsed.token);
          setState({ ready: true, token: parsed.token, user, canHost });
        } catch (err) {
          if (err instanceof ApiError && err.status === 401) {
            await AsyncStorage.removeItem(STORAGE_KEY);
            setState({ ready: true, token: null, user: null, canHost: false });
          } else {
            // Network error — trust cached user until next refresh succeeds.
            setState({ ready: true, token: parsed.token, user: parsed.user, canHost: false });
          }
        }
      } catch {
        setState({ ready: true, token: null, user: null, canHost: false });
      }
    })();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      requestOtp: async (phone) => {
        const { devCode } = await api.requestOtp(phone);
        return { devCode };
      },
      verifyOtp: async (phone, code) => {
        const { token, user } = await api.verifyOtp(phone, code);
        const meRes = await api.me(token).catch(() => ({ user, canHost: false }));
        await persist(token, meRes.user);
        setState({ ready: true, token, user: meRes.user, canHost: meRes.canHost });
      },
      updateName: async (name) => {
        if (!state.token) throw new Error('Not signed in');
        const { user, canHost } = await api.updateProfile(state.token, name);
        await persist(state.token, user);
        setState((s) => ({ ...s, user, canHost }));
      },
      refresh,
      signOut: async () => {
        await persist(null, null);
        setState({ ready: true, token: null, user: null, canHost: false });
      },
    }),
    [state, persist, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export function useRequireAuth() {
  const auth = useAuth();
  if (!auth.token) throw new Error('Expected an authenticated user');
  return auth as AuthContextValue & { token: string; user: CurrentUser };
}
