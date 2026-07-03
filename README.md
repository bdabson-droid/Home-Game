# Home Game

A mobile app for running poker home games with your friends. Hosts create a
game, invite players by phone number or share a 6-digit join code, and pay a
subscription to run games. Invited players sign up with the phone number that
was invited and their games appear automatically. Anyone else can join by
entering the numeric code.

The repository is a small monorepo:

```
server/   Node.js + Express + SQLite API
mobile/   Expo (React Native + expo-router) app
```

## Features

- **Phone-number auth** with a 6-digit OTP (dev mode logs the code and echoes
  it in the response so you can sign in without an SMS provider).
- **Master / host account** — signed-in users can create games they own.
- **Invite by phone number** — the host enters a phone number and Home Game
  either adds an existing user directly or files a pending invite that
  auto-redeems the next time that number signs in.
- **Numeric join code** — every game gets a unique 6-digit code. Anyone with
  the code can join from the “Join” tab.
- **Host subscription** — hosting is gated behind a Stripe subscription. The
  subscription screen launches Stripe Checkout in an in-app browser and the
  server updates status via Stripe webhooks.
- **Roster management** — hosts see the player list, pending invites, and can
  remove players or cancel invites.

## Backend (`server/`)

Node 20+ recommended.

```bash
cd server
cp .env.example .env
npm install
npm start          # http://localhost:4000
```

Configuration lives in `server/.env`:

| Variable | Purpose |
| --- | --- |
| `PORT` | Port to listen on (default `4000`). |
| `JWT_SECRET` | HMAC secret used for JWT signing. Change in production. |
| `DEV_MODE` | When `true` (default), `verify-otp` accepts `000000` for any phone, `request-otp` returns the code in its response, and the subscription gate is skipped so you can test hosting without Stripe. |
| `STRIPE_SECRET_KEY` / `STRIPE_PRICE_ID` | Enable real Stripe Checkout for the host subscription. |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret, required for `/subscription/webhook`. |
| `STRIPE_SUCCESS_URL` / `STRIPE_CANCEL_URL` | Deep-link URLs returned by Checkout. Defaults to the app’s `homegame://` scheme. |

SQLite data is written to `server/data/home-game.db`. Delete that file to
reset all users and games.

### SMS integration

`server/src/lib/sms.js` currently logs OTPs and invites to stdout. Swap the
implementation for Twilio (or any other provider) when you’re ready to send
real messages.

### API reference (short)

| Method + path | Purpose |
| --- | --- |
| `POST /auth/request-otp` | Send an OTP to a phone number. |
| `POST /auth/verify-otp` | Exchange an OTP for a JWT; creates the user if needed and auto-redeems any pending invites for that number. |
| `GET  /me` / `PATCH /me` | Read or update the current user. |
| `GET  /games` | List games the user hosts or belongs to. |
| `POST /games` | Host creates a game (requires subscription). |
| `GET  /games/:id` | Game detail + players + pending invites. |
| `POST /games/:id/invite` | Host invites a phone number. |
| `DELETE /games/:id/invite/:inviteId` | Cancel a pending invite. |
| `DELETE /games/:id/members/:userId` | Remove a player. |
| `POST /games/join` | Join a game by numeric code. |
| `POST /games/:id/leave` | Leave a game (players). |
| `DELETE /games/:id` | Delete a game (host). |
| `GET  /subscription/status` | Subscription status for the current user. |
| `POST /subscription/checkout` | Create a Stripe Checkout Session. |
| `POST /subscription/webhook` | Stripe webhook receiver. |

## Mobile app (`mobile/`)

Expo SDK 52 with expo-router.

```bash
cd mobile
npm install
npx expo start     # then press i / a / w
```

The app reads the API base URL from `expo.extra.apiBaseUrl` in
`mobile/app.json` (default `http://localhost:4000`). On a physical device,
change it to your machine’s LAN IP (e.g. `http://192.168.1.20:4000`) or set
`EXPO_PUBLIC_API_BASE_URL` before starting Expo.

### Screens

- **Login / OTP** — phone entry, 6-digit code. In dev mode the app shows the
  code returned by the API so you can sign in without SMS.
- **Onboarding** — sets your display name.
- **My Games** (tab) — lists games you host or belong to, with per-game join
  code and a `+` shortcut to create a new game.
- **Join** (tab) — enter any 6-digit code to join a game.
- **Account** (tab) — subscription status, sign out.
- **Game detail** — big join code, share sheet, invite-by-phone (host),
  roster with remove actions, pending invites list.
- **Subscription** — status and Stripe Checkout entry point.

## Trying it end-to-end (dev mode)

1. Start the API: `cd server && npm start`.
2. Start Expo: `cd mobile && npx expo start`, open the app.
3. Sign in as the host with any phone number. Use the dev code shown in the
   login screen (or `000000`).
4. Set a name, then create a game from the `+` on the “My Games” tab.
5. From the game detail screen, invite another phone number.
6. On a second device (or after signing out), sign in with that invited
   number — the game appears automatically.
7. Try joining a third phone number by pasting the join code into the “Join”
   tab.

## Enabling paid hosting

1. Create a recurring price in Stripe and grab the price ID.
2. Set `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, and (once you configure a
   webhook endpoint) `STRIPE_WEBHOOK_SECRET` in `server/.env`.
3. Set `DEV_MODE=false`.
4. Restart the server. New hosts will now be redirected to Stripe Checkout the
   first time they try to create a game.

## What’s intentionally out of scope

- Push notifications for invites — SMS is used instead.
- In-app chip counting or hand history.
- App store publishing artefacts (icons/splash images) — placeholders only.
