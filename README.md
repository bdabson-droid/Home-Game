# Poker Home Game

A cross-platform mobile app for running poker **home games**. Hosts subscribe to
create and manage a game, invite players by phone number, and share a 6-digit
join code. Players sign in with their phone and join a specific home game.

The project has two parts:

| Folder     | What it is                                                        |
| ---------- | ----------------------------------------------------------------- |
| `server/`  | Node.js + Express + SQLite REST API (auth, subscriptions, games)  |
| `mobile/`  | Expo (React Native + TypeScript) app using expo-router            |

## Features

- **Phone-number sign in** with a 6-digit SMS verification code (OTP).
- **Host subscription** — a host must sign up and pay a subscription before they
  can create a home game (Stripe Checkout in production, instant activation in
  dev).
- **Create & manage home games** — name, stakes, location, description.
- **Invite players by phone number.** If the invitee already has an account they
  are added instantly; otherwise they receive a text with the join code and are
  auto-added to the game the moment they sign up with that number.
- **Join by number code** — every game has a unique 6-digit code players can use
  to sign up for that specific home game.
- **Members management** — hosts see the roster (with phone numbers) and can
  remove players or regenerate the join code.
- **Game nights** — hosts schedule sessions (date, buy-in, location) and members
  RSVP (in / maybe / out).

## Architecture

```
mobile (Expo app)  ─────HTTP/JSON────▶  server (Express API)  ────▶  SQLite
   expo-router                             JWT auth                    (better-sqlite3)
   secure token store                      Twilio (SMS)  [optional]
                                           Stripe (billing) [optional]
```

Auth uses a phone → OTP → JWT flow. The JWT is stored securely on device
(`expo-secure-store`, or AsyncStorage on web) and sent as a Bearer token.

## Getting started

### 1. Run the backend

```bash
cd server
cp .env.example .env      # optional: add Twilio / Stripe keys for production
npm install
npm start                 # http://localhost:4000
```

Without Twilio/Stripe credentials the server runs in **dev mode**:

- OTP codes are printed to the server log **and returned in the API response**,
  so you can sign in without receiving a real text.
- Subscriptions activate instantly (no real charge).

Run the API test suite:

```bash
cd server
npm test
```

### 2. Run the mobile app

```bash
cd mobile
npm install
npx expo start
```

Then press `i` (iOS simulator), `a` (Android emulator), `w` (web), or scan the
QR code with **Expo Go** on your phone.

#### Pointing the app at your API

The app defaults to `http://localhost:4000` (and `http://10.0.2.2:4000` on the
Android emulator). When testing on a **physical device**, start the app with
your computer's LAN IP so the phone can reach the server:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.50:4000 npx expo start
```

## Configuration (server `.env`)

| Variable                | Purpose                                                        |
| ----------------------- | -------------------------------------------------------------- |
| `PORT`                  | API port (default `4000`)                                      |
| `JWT_SECRET`            | Secret used to sign auth tokens (**change in production**)     |
| `DATABASE_PATH`         | SQLite file path (default `./data/home-game.db`)               |
| `TWILIO_ACCOUNT_SID`    | Twilio SID — enables real SMS delivery when set                |
| `TWILIO_AUTH_TOKEN`     | Twilio auth token                                              |
| `TWILIO_FROM_NUMBER`    | Twilio sending number                                          |
| `STRIPE_SECRET_KEY`     | Stripe secret key — enables real subscription checkout         |
| `STRIPE_PRICE_ID`       | Stripe recurring price ID for the host subscription           |
| `STRIPE_WEBHOOK_SECRET` | Verifies Stripe webhook signatures                            |
| `SUBSCRIPTION_PRICE_LABEL` | Price text shown in the app                                 |
| `PUBLIC_APP_URL`        | Deep-link base used in invite texts (default `homegame://`)    |

When Twilio and Stripe variables are empty the app automatically runs in dev
mode, so the whole flow can be exercised locally without external accounts.

## API overview

| Method & path                              | Description                                  |
| ------------------------------------------ | -------------------------------------------- |
| `POST /api/auth/request-otp`               | Send a verification code to a phone number   |
| `POST /api/auth/verify-otp`                | Verify code, create/return account + token   |
| `GET  /api/auth/me`                         | Current user + subscription                  |
| `GET  /api/subscription`                   | Subscription status                          |
| `POST /api/subscription/subscribe`         | Start/activate the host subscription         |
| `POST /api/subscription/cancel`            | Cancel the subscription                      |
| `GET  /api/games`                          | List the games you belong to                 |
| `POST /api/games`                          | Create a game (requires active subscription) |
| `GET  /api/games/:id`                      | Game details                                 |
| `PATCH /api/games/:id`                     | Edit a game (host)                           |
| `DELETE /api/games/:id`                    | Delete a game (host)                         |
| `POST /api/games/:id/regenerate-code`      | New join code (host)                         |
| `GET  /api/games/:id/members`              | Roster                                       |
| `DELETE /api/games/:id/members/:userId`    | Remove a member (host)                       |
| `POST /api/games/:id/invitations`          | Invite by phone (host)                       |
| `GET  /api/games/:id/invitations`          | Pending invitations (host)                   |
| `DELETE /api/games/:id/invitations/:invId` | Revoke an invitation (host)                  |
| `GET  /api/invitations/mine`               | Invitations addressed to my phone            |
| `POST /api/invitations/:invId/accept`      | Accept an invitation                         |
| `POST /api/join`                           | Join a game by 6-digit code                  |
| `GET  /api/games/:id/sessions`             | Scheduled game nights                        |
| `POST /api/games/:id/sessions`             | Schedule a game night (host)                 |
| `POST /api/sessions/:id/rsvp`              | RSVP to a game night                         |
| `POST /api/stripe/webhook`                 | Stripe webhook (keeps billing in sync)       |

## Notes on production

- Plug in Twilio credentials to send real OTP and invite texts.
- Plug in Stripe credentials + a recurring price to charge host subscriptions;
  point a Stripe webhook at `/api/stripe/webhook` so subscription status stays in
  sync.
- Swap SQLite for a hosted database if you need multi-instance deployments.
