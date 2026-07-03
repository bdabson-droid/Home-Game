import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';
import { generateId } from '../utils/id';
import { requestOtp, verifyOtp } from '../services/phoneAuth';
import { createAsyncStorage } from './persist';

type PendingOtp = {
  requestId: string;
  phone: string;
  requestedAt: number;
};

type AuthState = {
  user: User | null;
  pendingOtp: PendingOtp | null;
  hydrated: boolean;
  sendOtp: (phoneE164: string) => Promise<void>;
  confirmOtp: (code: string, displayName?: string) => Promise<User>;
  updateProfile: (patch: Partial<Pick<User, 'displayName'>>) => void;
  signOut: () => void;
  _setHydrated: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      pendingOtp: null,
      hydrated: false,

      sendOtp: async (phoneE164) => {
        const res = await requestOtp(phoneE164);
        set({
          pendingOtp: {
            requestId: res.requestId,
            phone: phoneE164,
            requestedAt: Date.now(),
          },
        });
      },

      confirmOtp: async (code, displayName) => {
        const pending = get().pendingOtp;
        if (!pending) {
          throw new Error('Request a code first.');
        }
        await verifyOtp(pending.requestId, code);
        const existing = get().user;
        const user: User =
          existing && existing.phone === pending.phone
            ? { ...existing, displayName: displayName?.trim() || existing.displayName }
            : {
                id: generateId('usr'),
                phone: pending.phone,
                displayName: displayName?.trim() || 'Player',
              };
        set({ user, pendingOtp: null });
        return user;
      },

      updateProfile: (patch) => {
        const u = get().user;
        if (!u) return;
        set({ user: { ...u, ...patch } });
      },

      signOut: () => set({ user: null, pendingOtp: null }),

      _setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'homegame.auth.v1',
      storage: createAsyncStorage(),
      partialize: (state) => ({ user: state.user }),
      onRehydrateStorage: () => (state) => {
        state?._setHydrated();
      },
    },
  ),
);
