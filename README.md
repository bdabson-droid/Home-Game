# Home Game

A cross-platform mobile app (iOS + Android via Expo / React Native) for running
poker home games.

- **Hosts** sign up, subscribe, and create a home game. Each game gets a unique
  6-digit invite code. Hosts can invite players by phone number or share the
  code.
- **Players** sign in with their phone number and either enter a 6-digit code
  or accept an invite sent to their number. Joining is always free.
- **Sessions** track buy-ins, cash-outs, and settle-up standings for each night
  of play.

The app is written in TypeScript with Expo SDK 51, React Navigation, and
Zustand for state (persisted to `AsyncStorage`).

## Feature highlights

- Phone-based sign-in with SMS OTP (mocked; drop-in ready for Firebase Auth or
  Twilio Verify)
- Master ("host") account with a paid subscription (mocked; drop-in ready for
  RevenueCat or Stripe)
- Free player accounts
- Multiple home games per user (as host and/or player)
- Invite by phone number (SMS invite) or by 6-digit numeric code
- Session tracking with buy-ins, rebuys, cash-outs and automatic net standings
- Local persistence so the app survives cold starts

## Running the app

```bash
npm install
npm start
```

Then press `i` (iOS Simulator), `a` (Android emulator), or scan the QR code
with Expo Go on a real device.

Because the demo build uses mocked phone verification, **any 6-digit code
will validate successfully**. This makes the app fully playable without a
backend.

## Project structure

```
App.tsx                    Root component
index.ts                   Expo entry
app.json                   Expo config
src/
  components/              Reusable UI: Button, Input, Card, Avatar, Pill, Screen, EmptyState
  navigation/              Root / Auth / App navigators + typed param lists
  screens/
    auth/                  Welcome, PhoneEntry, OtpVerify, JoinWithCode
    app/                   Games list, Create/Edit game, Game detail, Invite players,
                           New session, Session detail, Subscription, Profile, Join tab
  services/
    phoneAuth.ts           SMS OTP (mock; swap for Firebase/Twilio)
    invites.ts             SMS invites (mock; swap for Twilio via your backend)
    subscription.ts        In-app purchase (mock; swap for RevenueCat/Stripe)
  store/
    useAuthStore.ts        Signed-in user + OTP flow
    useGamesStore.ts       Games, members, sessions, invites
    useSubscriptionStore.ts Host subscription status
    persist.ts             Zustand <-> AsyncStorage adapter
  theme/                   Colors, spacing, radius, typography
  types/                   Shared TypeScript models
  utils/                   Phone/currency/date formatting, id generation
```

## Wiring up real services

The `src/services/` folder is the only place you need to change to move from
the demo mocks to production integrations.

### Phone authentication (`src/services/phoneAuth.ts`)

Replace the two mock functions with a real provider:

- **Firebase Auth** (recommended): `firebase/auth` phone provider handles
  SMS delivery, rate limiting, and abuse protection for free.
  https://firebase.google.com/docs/auth/web/phone-auth
- **Twilio Verify** (via your own thin backend so you don't ship API keys in
  the app): https://www.twilio.com/docs/verify/api
- **Auth0 SMS passwordless**.

The store (`useAuthStore`) only calls `requestOtp(phoneE164)` and
`verifyOtp(requestId, code)`, so any drop-in replacement is fine.

### SMS invites (`src/services/invites.ts`)

Invites should be sent from a small backend (Cloud Function, Vercel handler,
etc.) using Twilio, MessageBird, or a similar SMS provider so credentials stay
off the device.

### Host subscription (`src/services/subscription.ts`)

For iOS + Android, use **RevenueCat** on top of StoreKit/Play Billing — it
gives you cross-platform receipts, entitlement checks, and analytics for free.
Replace `purchase(plan)` with a `Purchases.purchasePackage()` call and read the
entitlement back out to update `useSubscriptionStore`.

If you only ship to the web, Stripe Checkout / Billing is a good fit.

## Notes / limitations

- All state lives on-device. A real deployment needs a synced backend so
  players see the same game/session state (Firebase Firestore, Supabase, or
  your own API). The stores are structured so they can be replaced with a
  networked data source without touching the UI.
- Session cash-outs use an inline picker + amount input, which works on both
  iOS and Android. On iOS you could optionally swap this for `Alert.prompt`.
- The demo bypasses IAP; do not ship as-is to the App Store, or Apple will
  reject the build.
