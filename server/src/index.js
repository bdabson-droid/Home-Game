import { createApp } from './app.js';
import { config } from './config.js';
import './db.js';

const app = createApp();

app.listen(config.port, () => {
  console.log(`Poker Home Game API listening on http://localhost:${config.port}`);
  console.log(`  Environment : ${config.env}`);
  console.log(`  SMS delivery: ${config.twilio.enabled ? 'Twilio' : 'DEV (codes logged & returned)'}`);
  console.log(`  Billing     : ${config.stripe.enabled ? 'Stripe' : 'DEV (instant activation)'}`);
});
