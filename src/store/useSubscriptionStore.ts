import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Subscription, SubscriptionPlan } from '../types';
import { purchase as purchaseService, cancel as cancelService } from '../services/subscription';
import { createAsyncStorage } from './persist';

type SubscriptionState = {
  subscriptions: Record<string, Subscription>;
  isHost: (userId: string | null | undefined) => boolean;
  getSubscription: (userId: string | null | undefined) => Subscription | undefined;
  purchase: (userId: string, plan: SubscriptionPlan) => Promise<Subscription>;
  cancel: (userId: string) => Promise<void>;
};

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      subscriptions: {},

      isHost: (userId) => {
        if (!userId) return false;
        const sub = get().subscriptions[userId];
        if (!sub) return false;
        if (sub.status !== 'active' && sub.status !== 'trialing') return false;
        if (sub.renewsAt && sub.renewsAt < Date.now()) return false;
        return true;
      },

      getSubscription: (userId) => (userId ? get().subscriptions[userId] : undefined),

      purchase: async (userId, plan) => {
        const result = await purchaseService(plan);
        const sub: Subscription = { userId, ...result };
        set((s) => ({ subscriptions: { ...s.subscriptions, [userId]: sub } }));
        return sub;
      },

      cancel: async (userId) => {
        await cancelService();
        set((s) => {
          const current = s.subscriptions[userId];
          if (!current) return s;
          return {
            subscriptions: {
              ...s.subscriptions,
              [userId]: { ...current, status: 'cancelled' },
            },
          };
        });
      },
    }),
    {
      name: 'homegame.subs.v1',
      storage: createAsyncStorage(),
    },
  ),
);
