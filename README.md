# Poker Home Game

A mobile app for running poker home games. Hosts create games, invite players by phone number, and share 6-digit join codes. Players join for free; hosts pay a monthly subscription.

## Architecture

```
mobile/     Expo React Native app (iOS & Android)
server/     Node.js REST API with SQLite
```

## Features

- **Phone-based accounts** with OTP verification
- **Host subscription** ($9.99/mo) — required to create and manage home games
- **Create home games** with name, description, location, and seat limit
- **6-digit join codes** — players enter a code to join a specific game
- **Waiting list** — when all seats are full, players join a first-come-first-served waitlist
- **Phone invites** — hosts invite players by phone number
- **Player management** — view roster, remove players (host only)
- **Share join codes** via native share sheet

## Quick Start

### 1. Start the API server

```bash
cd server
npm install
npm run seed    # optional: creates demo accounts
npm start       # runs on http://localhost:3001
```

### 2. Start the mobile app

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with Expo Go on your phone, or press `a` for Android emulator / `i` for iOS simulator.

### 3. Configure API URL (physical device)

If testing on a real phone, set your machine's local IP:

```bash
# mobile/.env
EXPO_PUBLIC_API_URL=http://192.168.1.100:3001
```

## Demo Accounts

After running `npm run seed` in the server:

| Role   | Phone        | Password  |
|--------|--------------|-----------|
| Host   | 5551234567   | demo1234  |
| Player | 5559876543   | demo1234  |

Join code for the demo game: **123456**

## User Flows

### Host flow
1. Register with phone → select "I want to host home games"
2. Activate subscription (demo mode or Stripe)
3. Create a home game → receive a 6-digit join code
4. Invite players by phone or share the join code

### Player flow
1. Register or sign in with phone
2. Join via **Join** tab (enter 6-digit code) OR accept a phone invite from the **Games** tab
3. View game details and player list

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/send-otp` | Send verification code |
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in |
| GET | `/api/games` | List user's games |
| POST | `/api/games` | Create game (host) |
| POST | `/api/games/join` | Join by code |
| POST | `/api/games/:id/invite` | Invite by phone |
| GET | `/api/games/invites/pending` | Pending invites |
| POST | `/api/subscriptions/checkout` | Start subscription |

## Production Setup

### Stripe payments
Copy `server/.env.example` to `server/.env` and set:
- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID`
- `STRIPE_WEBHOOK_SECRET`

### SMS (Twilio)
Replace the OTP/invite console logs in `server/src/routes/auth.js` and `games.js` with Twilio SMS calls.

### Database
Swap SQLite for PostgreSQL in production by replacing `better-sqlite3` with `pg`.

## Tech Stack

- **Mobile:** Expo SDK 57, React Native, Expo Router, TypeScript
- **Backend:** Node.js, Express, SQLite, JWT, Stripe
- **Auth:** Phone + OTP + password, secure token storage
