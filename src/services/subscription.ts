/**
 * Subscription service.
 *
 * Mocked in-app purchase flow gating the ability to *host* a home game.
 * Guests never need a subscription — they can join via phone invite or
 * numeric code for free.
 *
 * To ship this app to real users, swap the mock in `purchase` for one of:
 *
 *   - RevenueCat (recommended for cross-platform IAP)
 *     https://www.revenuecat.com/docs/getting-started/installation/reactnative
 *   - expo-in-app-purchases (deprecated in newer Expo SDKs)
 *   - Stripe (if you want to sell outside the App Store, web only)
 *
 * The rest of the app just calls `purchase(plan)` and reads status from
 * `useSubscriptionStore`.
 */

import type { SubscriptionPlan } from '../types';

export type PlanInfo = {
  id: SubscriptionPlan;
  title: string;
  priceLabel: string;
  cadence: string;
  perks: string[];
  highlight?: boolean;
};

export const PLANS: PlanInfo[] = [
  {
    id: 'monthly',
    title: 'Host Monthly',
    priceLabel: '$4.99',
    cadence: 'per month',
    perks: [
      'Host unlimited home games',
      'Invite by phone or share code',
      'Session tracking & auto settle-up',
    ],
  },
  {
    id: 'annual',
    title: 'Host Annual',
    priceLabel: '$39.99',
    cadence: 'per year · save 33%',
    perks: [
      'Everything in Monthly',
      'Priority support',
      'Early access to new features',
    ],
    highlight: true,
  },
];

export async function purchase(plan: SubscriptionPlan): Promise<{
  status: 'active';
  plan: SubscriptionPlan;
  startedAt: number;
  renewsAt: number;
}> {
  await new Promise((r) => setTimeout(r, 900));
  const now = Date.now();
  const days = plan === 'annual' ? 365 : 30;
  return {
    status: 'active',
    plan,
    startedAt: now,
    renewsAt: now + days * 24 * 60 * 60 * 1000,
  };
}

export async function cancel(): Promise<{ status: 'cancelled' }> {
  await new Promise((r) => setTimeout(r, 400));
  return { status: 'cancelled' };
}
