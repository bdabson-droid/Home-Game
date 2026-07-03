# PokerNight — Home Game Manager

A full-stack mobile-first web app for managing poker home games. Hosts can create games, invite players by phone number or invite code, and track buy-ins, rebuys, and cash outs in real time.

## Features

### For Players (Free)
- Sign up with phone number (OTP verification)
- Join games using a 6-digit invite code
- View game history and track your winnings

### For Hosts (Subscription — $9.99/month)
- Create unlimited home games
- Invite players directly by phone number (SMS)
- Generate unique 6-character invite codes per game
- Manage the player list in real time
- Record buy-ins, rebuys, and cash outs
- Track chip counts
- View profit/loss leaderboard
- Full transaction history

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| Database | SQLite (better-sqlite3) |
| Auth | JWT + bcrypt |
| Payments | Stripe Subscriptions |
| SMS | Pluggable (console mock in dev, Twilio in prod) |

## Project Structure

```
pokernight/
├── backend/          # Express API
│   ├── src/
│   │   ├── db/       # SQLite database + schema
│   │   ├── middleware/ # JWT auth middleware
│   │   └── routes/   # auth, games, subscription
│   └── .env          # Environment variables
└── frontend/         # React mobile-first app
    └── src/
        ├── pages/    # All app pages
        ├── components/ # Reusable components
        ├── context/  # Auth context
        └── utils/    # API client, formatters
```

## Quick Start

### 1. Install dependencies
```bash
npm run install:all
```

### 2. Configure environment
Edit `backend/.env`:
```env
PORT=3001
JWT_SECRET=your-secret-key
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=http://localhost:5173
```

### 3. Run in development
```bash
npm run dev
```
- Backend API: http://localhost:3001
- Frontend: http://localhost:5173

### 4. Development mode features
- OTP codes are returned in the API response (not sent via SMS)
- Use **"Activate Free Dev Subscription"** button on the Subscription page to skip Stripe
- Backend auto-creates the SQLite database on first run

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register with phone + password |
| POST | `/api/auth/verify` | Verify OTP |
| POST | `/api/auth/resend-otp` | Resend OTP |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/profile` | Update profile |

### Games
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/games` | List all games for user |
| POST | `/api/games` | Create a game (host only) |
| GET | `/api/games/:id` | Get game details |
| PUT | `/api/games/:id` | Update game |
| DELETE | `/api/games/:id` | Cancel game |
| POST | `/api/games/:id/invite` | Invite by phone numbers |
| POST | `/api/games/join` | Join with invite code |
| POST | `/api/games/:id/players/:pid/buyin` | Record buy-in/rebuy |
| POST | `/api/games/:id/players/:pid/cashout` | Record cash out |

### Subscription
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/subscription/create-checkout` | Start Stripe checkout |
| POST | `/api/subscription/webhook` | Stripe webhook |
| POST | `/api/subscription/cancel` | Cancel subscription |
| GET | `/api/subscription/status` | Get subscription status |
| POST | `/api/subscription/activate-dev` | Dev-only activation |

## Production Setup

### Stripe
1. Create a product and monthly recurring price in Stripe Dashboard
2. Set `STRIPE_PRICE_ID` to the price ID
3. Set up a webhook endpoint pointing to `/api/subscription/webhook`
4. Configure `STRIPE_WEBHOOK_SECRET`

### SMS (Twilio)
Replace the `sendSMS` function in `backend/src/routes/auth.ts` and `backend/src/routes/games.ts` with Twilio:
```typescript
import twilio from 'twilio';
const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);

async function sendSMS(phone: string, message: string) {
  await client.messages.create({
    body: message,
    from: process.env.TWILIO_FROM,
    to: `+${phone}`,
  });
}
```

### Environment variables (production)
```env
NODE_ENV=production
PORT=3001
JWT_SECRET=<strong-random-secret>
DB_PATH=/data/poker.db
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=https://your-domain.com
```

## Mobile App Feel

The frontend is built as a Progressive Web App (PWA) with:
- Mobile-first responsive design (max-width: 448px)
- Bottom navigation bar
- Bottom sheet modals
- Dark poker theme (green felt colors)
- Smooth animations
- Support for "Add to Home Screen" on iOS/Android

## Database Schema

```sql
users (id, phone, name, email, password_hash, subscription_status, ...)
games (id, host_id, name, invite_code, status, buy_in_amount, ...)
game_players (id, game_id, user_id, phone, status, buy_in_total, cash_out_amount, ...)
transactions (id, game_id, player_id, type, amount, chips, ...)
invites (id, game_id, invited_phone, invited_by, status, ...)
```
