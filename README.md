# Home Game

An Expo React Native mobile app prototype for managing private poker home
games.

## What it does

- Gives the host a master account console.
- Requires the host to activate a subscription before sending invites.
- Lets the host configure a specific private home game.
- Invites players to that specific game by phone number.
- Shows a numeric game code that players can use to sign up.
- Tracks seated players, pending invites, waitlist entries, and open seats.

## Run locally

```bash
npm install
npm start
```

Then use the Expo CLI options to open the app on iOS, Android, or web.

## Useful commands

```bash
npm run typecheck
npm run android
npm run ios
npm run web
```

The current implementation is a front-end prototype with local in-memory state.
A production version would connect the subscription button to a payment provider
and back the game lists, phone invites, and code signups with an authenticated
API.
