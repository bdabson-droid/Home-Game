# ♠ Home Game

A mobile app for running your **poker home game list**. Hosts subscribe, create
private games, and bring players in two ways:

- **Invite by phone number** — the app texts the invitee a link + join code, and
  the game appears automatically as soon as they sign in with that number.
- **Join by code** — anyone with the game's numeric code can self–sign up.

Hosting requires a paid **Host Pass** subscription. Joining and playing is free.

The repo is a small monorepo:

| Folder     | What it is                                                            |
| ---------- | -------------------------------------------------------------------- |
| `server/`  | Node/Express + Prisma REST API (auth, games, invites, subscriptions) |
| `mobile/`  | Expo (React Native + TypeScript) app using `expo-router`             |

---

## Features

- 📱 **Phone-number login** with one-time SMS passcodes (no passwords).
- 👑 **Master/host accounts** gated behind a subscription (Stripe, with a local
  mock mode for development).
- ✉️ **Invite players by phone** — invitees are auto-added when they sign up with
  the same number; existing users are added immediately.
- 🔢 **Numeric join codes** so players can self–sign up for a specific game.
- 🗓️ **Game nights (sessions)** with RSVPs and a buy-in / cash-out ledger.
- 🔒 Role-based access — only hosts can invite, schedule, and record results.

---

## Architecture at a glance

```
mobile (Expo/React Native)  ──HTTPS──▶  server (Express)  ──▶  SQLite / Postgres (Prisma)
        │                                     │
        │                                     ├─▶ Twilio  (SMS: OTP + invites)   [optional]
        └── SecureStore (JWT)                 └─▶ Stripe  (host subscription)    [optional]
```

Twilio and Stripe are **optional**. When their keys are absent the server runs in
developer-friendly fallbacks:

- **No Twilio** → verification/invite SMS are printed to the server console, and
  `POST /auth/request-otp` returns the code as `devCode` (non-production only).
- **No Stripe** → subscriptions run in **mock mode** and activate instantly on
  checkout, so you can exercise the full host flow locally.

---

## Quick start

### 1. Backend

```bash
cd server
cp .env.example .env            # tweak if you like; defaults use SQLite + mock modes
npm install
npx prisma db push              # create the SQLite schema
npm run seed                    # optional: demo host + game (phone +15550000001)
npm run dev                     # http://localhost:4000
```

Run the tests:

```bash
npm test
```

### 2. Mobile app

```bash
cd mobile
cp .env.example .env            # point EXPO_PUBLIC_API_URL at your backend
npm install
npm start                       # then press i / a, or scan the QR with Expo Go
```

> **Reaching the API from a device:** `localhost` refers to the phone, not your
> computer. Use your machine's LAN IP (e.g. `http://192.168.1.20:4000`) in
> `EXPO_PUBLIC_API_URL`. The Android emulator uses `http://10.0.2.2:4000`.

Because SMS is mocked by default, the verification code is shown to you: the login
screen forwards the `devCode` and the verify screen auto-fills it.

---

## Enabling real SMS (Twilio)

Set these in `server/.env`:

```
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxx
TWILIO_FROM_NUMBER=+1XXXXXXXXXX
```

## Enabling real billing (Stripe)

1. Create a recurring **Price** in Stripe for the Host Pass.
2. Set in `server/.env`:

```
STRIPE_SECRET_KEY=sk_live_or_test_xxx
STRIPE_PRICE_ID=price_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

3. Point a Stripe webhook at `POST /webhooks/stripe` (events:
   `checkout.session.completed`, `customer.subscription.*`). Locally:

```bash
stripe listen --forward-to localhost:4000/webhooks/stripe
```

With Stripe configured, `POST /subscription/checkout` returns a Checkout URL that
the app opens in the browser; the webhook flips the subscription to `active`.

---

## API overview

All endpoints return JSON. Authenticated routes require
`Authorization: Bearer <token>`.

### Auth
| Method | Path                | Description                                   |
| ------ | ------------------- | --------------------------------------------- |
| POST   | `/auth/request-otp` | Send an SMS code to a phone number            |
| POST   | `/auth/verify-otp`  | Verify code, create/login user, return a JWT  |
| GET    | `/auth/me`          | Current user, subscription, membership count  |
| PATCH  | `/auth/me`          | Update display name                            |

### Subscription (host)
| Method | Path                     | Description                              |
| ------ | ------------------------ | ---------------------------------------- |
| GET    | `/subscription`          | Current subscription + billing mode      |
| POST   | `/subscription/checkout` | Start checkout (Stripe) / activate (mock)|
| POST   | `/subscription/cancel`   | Cancel the subscription                  |

### Games
| Method | Path                                   | Description                          |
| ------ | -------------------------------------- | ------------------------------------ |
| POST   | `/games`                               | Create a game (host, needs sub)      |
| GET    | `/games`                               | List games you belong to             |
| GET    | `/games/:id`                           | Game detail (members, sessions, …)   |
| PATCH  | `/games/:id`                           | Update game (host)                   |
| DELETE | `/games/:id`                           | Delete game (host)                   |
| POST   | `/games/join`                          | Join by numeric code                 |
| POST   | `/games/:id/leave`                     | Leave a game (non-host)              |
| POST   | `/games/:id/invites`                   | Invite by phone (host)               |
| DELETE | `/games/:id/invites/:inviteId`         | Revoke a pending invite (host)       |
| DELETE | `/games/:id/members/:userId`           | Remove a player (host)               |

### Sessions
| Method | Path                                           | Description               |
| ------ | ---------------------------------------------- | ------------------------- |
| POST   | `/games/:id/sessions`                          | Schedule a game night     |
| PATCH  | `/games/:id/sessions/:sessionId`               | Update a session (host)   |
| POST   | `/games/:id/sessions/:sessionId/rsvp`          | RSVP / set your buy-in    |
| POST   | `/games/:id/sessions/:sessionId/results`       | Record buy-in/cash-out    |

---

## Tech stack

- **Mobile:** Expo SDK 57, React Native, TypeScript, `expo-router`,
  `expo-secure-store`.
- **Backend:** Node.js, Express, TypeScript, Prisma (SQLite by default,
  Postgres-ready), Zod, JWT, bcrypt.
- **Integrations:** Twilio (SMS) and Stripe (subscriptions), both optional.

## Notes & next steps

- Phone normalization is intentionally lightweight; production should use
  `libphonenumber` for full international support.
- The default datasource is SQLite for zero-config local dev. For production,
  switch the `datasource` provider in `server/prisma/schema.prisma` to
  `postgresql` and set `DATABASE_URL`.
- App Store / Play Store subscriptions: this project uses Stripe for billing. If
  you ship subscriptions through the native stores, you'll want to add
  StoreKit / Google Play Billing and validate receipts server-side.
